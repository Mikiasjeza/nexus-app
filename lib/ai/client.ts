/**
 * AI client: Gemini, OpenAI or Anthropic, chosen by AI_PROVIDER / AI_MODEL
 * (see lib/config/env.ts). Skill verification prompts, parsing and the
 * verified/not-verified policy live in ./verification.ts; costs in ./pricing.ts.
 */

import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { assertAIEnv, env } from '@/lib/config/env'
import { getSkillVerificationLens } from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'
import { estimateCostUsd } from './pricing'
import {
  VERIFICATION_SYSTEM_PROMPT,
  buildVerificationPrompt,
  parseVerificationResult,
  verificationJsonSchema,
  type EvidenceInput,
  type VerificationResult,
} from './verification'

export type { EvidenceInput } from './verification'

type Provider = 'gemini' | 'openai' | 'anthropic'

const DEFAULT_PROVIDER = env.ai.provider as Provider
const DEFAULT_MODEL = env.ai.model

export interface AIAnalysisResult extends VerificationResult {
  tokensUsed: number
  cost: number
  model: string
}

export interface JobMatchInput {
  id: string
  title: string
  description?: string
  skills: string[]
  location?: string
  type: string
  companyName: string
}

export interface SkillMatchInput {
  name: string
  level: string
  verified?: boolean
}

export interface AIJobMatch {
  jobId: string
  matchScore: number
  reason: string
  matchingSkills: string[]
  gaps: string[]
  recommended: boolean
}

export interface AIJobMatchResult {
  summary: string
  matches: AIJobMatch[]
  model: string
  tokensUsed: number
  cost: number
  rawResponse?: any
}

export interface AICareerChatResult {
  reply: string
  suggestedPrompts: string[]
  model: string
  tokensUsed: number
  cost: number
  rawResponse?: any
}

type RawReply = { text: string; inputTokens: number; outputTokens: number; model: string }

class AIClient {
  private gemini: GoogleGenAI | null = null
  private openai: OpenAI | null = null
  private anthropic: Anthropic | null = null

  constructor() {
    if (env.ai.geminiKey) {
      this.gemini = new GoogleGenAI({
        apiKey: env.ai.geminiKey,
      })
    }

    if (env.ai.openAiKey) {
      this.openai = new OpenAI({
        apiKey: env.ai.openAiKey,
      })
    }

    if (env.ai.anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: env.ai.anthropicKey,
      })
    }

    if (!this.gemini && !this.openai && !this.anthropic) {
      console.warn('⚠️  No AI API keys configured. AI features will not work.')
      console.warn('   Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env')
    }
  }

  /**
   * Assess evidence for a skill claim with the configured provider.
   * Throws if the provider fails or its reply doesn't match the schema;
   * callers must treat that as "not verified".
   */
  async analyzeEvidence(
    skillName: string,
    skillCategory: SkillCategory,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    assertAIEnv()
    const prompt = buildVerificationPrompt(
      skillName,
      skillCategory,
      skillLevel,
      evidence,
      getSkillVerificationLens(skillCategory)
    )

    let reply: RawReply
    try {
      reply = await this.verifyWith(DEFAULT_PROVIDER, prompt)
    } catch (error) {
      console.error(`${DEFAULT_PROVIDER} analysis error:`, error)
      throw new Error(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return {
      ...parseVerificationResult(reply.text),
      tokensUsed: reply.inputTokens + reply.outputTokens,
      cost: estimateCostUsd(reply.model, reply.inputTokens, reply.outputTokens),
      model: reply.model,
    }
  }

  private verifyWith(provider: Provider, prompt: string): Promise<RawReply> {
    if (provider === 'gemini' && this.gemini) return this.verifyWithGemini(prompt)
    if (provider === 'openai' && this.openai) return this.verifyWithOpenAI(prompt)
    if (provider === 'anthropic' && this.anthropic) return this.verifyWithAnthropic(prompt)
    throw new Error(`AI provider ${provider} not configured or unavailable`)
  }

  private async verifyWithGemini(prompt: string): Promise<RawReply> {
    const response = await this.gemini!.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: VERIFICATION_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
    })
    if (!response.text) throw new Error('No response from Gemini')
    return {
      text: response.text,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      model: DEFAULT_MODEL,
    }
  }

  private async verifyWithOpenAI(prompt: string): Promise<RawReply> {
    const response = await this.openai!.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return {
      text,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: DEFAULT_MODEL,
    }
  }

  private async verifyWithAnthropic(prompt: string): Promise<RawReply> {
    // `fallbacks: 'default'` re-runs a declined request on a fallback model
    // inside the same call. The installed SDK predates the parameter, hence
    // the cast; the API accepts it with the beta header below.
    const params = {
      model: DEFAULT_MODEL,
      max_tokens: 16000,
      system: VERIFICATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: verificationJsonSchema },
      },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    } as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming

    const response = await this.anthropic!.beta.messages.create(params)
    if (response.stop_reason === 'refusal') {
      throw new Error('The AI declined to assess this evidence')
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('The AI reply was cut off')
    }
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { text: string }).text)
      .join('')
    if (!text) throw new Error('No response from Anthropic')
    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    }
  }

  async matchJobsForUser(
    skills: SkillMatchInput[],
    jobs: JobMatchInput[]
  ): Promise<AIJobMatchResult> {
    assertAIEnv()
    if (DEFAULT_PROVIDER === 'gemini' && this.gemini) {
      return this.matchJobsWithGemini(skills, jobs)
    }
    if (!this.openai) throw new Error('OpenAI client not initialized')

    const compactSkills = skills.slice(0, 12).map((skill) => ({
      name: skill.name,
      level: skill.level,
      verified: Boolean(skill.verified),
    }))

    const compactJobs = jobs.slice(0, 8).map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      type: job.type,
      location: job.location,
      skills: job.skills,
      description: job.description?.slice(0, 500) || '',
    }))

    const prompt = `You are an expert AI recruiter for Nexus.

User skills:
${JSON.stringify(compactSkills, null, 2)}

Jobs to evaluate:
${JSON.stringify(compactJobs, null, 2)}

Evaluate which jobs best match the user's skills. Focus on actual alignment, not keyword stuffing.

Respond in JSON with this shape:
{
  "summary": "1-2 sentence overview of the strongest opportunities",
  "matches": [
    {
      "jobId": "job id",
      "matchScore": 0-100,
      "reason": "short explanation tailored to the candidate",
      "matchingSkills": ["skill 1", "skill 2"],
      "gaps": ["gap 1", "gap 2"],
      "recommended": true
    }
  ]
}

Rules:
- Return at most 5 matches.
- Only use the provided job ids.
- Keep reasons concise and specific.
- Set recommended to true for especially strong matches.`

    try {
      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a thoughtful recruiter who matches people to jobs based on evidence-backed skills.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1200,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No response from OpenAI')

      const parsed = JSON.parse(content)
      const knownJobIds = new Set(compactJobs.map((job) => job.id))
      const matches = Array.isArray(parsed.matches)
        ? parsed.matches
            .filter((item: { jobId?: string }) => item?.jobId && knownJobIds.has(item.jobId))
            .map(
              (item: {
                jobId: string
                matchScore?: number
                reason?: string
                matchingSkills?: string[]
                gaps?: string[]
                recommended?: boolean
              }) => ({
                jobId: item.jobId,
                matchScore: Math.max(0, Math.min(100, Math.round(item.matchScore ?? 0))),
                reason: item.reason || 'This role lines up with your current strengths.',
                matchingSkills: Array.isArray(item.matchingSkills)
                  ? item.matchingSkills.slice(0, 4)
                  : [],
                gaps: Array.isArray(item.gaps) ? item.gaps.slice(0, 3) : [],
                recommended: Boolean(item.recommended),
              })
            )
            .sort((a: AIJobMatch, b: AIJobMatch) => b.matchScore - a.matchScore)
        : []

      const tokensUsed = response.usage?.total_tokens || 0
      const cost = estimateCostUsd(
        DEFAULT_MODEL,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0
      )

      return {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : 'These opportunities are the strongest fit based on your current skill profile.',
        matches,
        model: DEFAULT_MODEL,
        tokensUsed,
        cost,
        rawResponse: response,
      }
    } catch (error) {
      console.error('OpenAI job matching error:', error)
      throw new Error(
        `AI job matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async matchJobsWithGemini(
    skills: SkillMatchInput[],
    jobs: JobMatchInput[]
  ): Promise<AIJobMatchResult> {
    if (!this.gemini) throw new Error('Gemini client not initialized')

    const compactSkills = skills.slice(0, 12).map((skill) => ({
      name: skill.name,
      level: skill.level,
      verified: Boolean(skill.verified),
    }))

    const compactJobs = jobs.slice(0, 8).map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      type: job.type,
      location: job.location,
      skills: job.skills,
      description: job.description?.slice(0, 500) || '',
    }))

    const prompt = `You are an expert AI recruiter for Nexus.

User skills:
${JSON.stringify(compactSkills, null, 2)}

Jobs to evaluate:
${JSON.stringify(compactJobs, null, 2)}

Evaluate which jobs best match the user's skills. Focus on actual alignment, not keyword stuffing.

Respond in strict JSON with this shape:
{
  "summary": "1-2 sentence overview of the strongest opportunities",
  "matches": [
    {
      "jobId": "job id",
      "matchScore": 0-100,
      "reason": "short explanation tailored to the candidate",
      "matchingSkills": ["skill 1", "skill 2"],
      "gaps": ["gap 1", "gap 2"],
      "recommended": true
    }
  ]
}

Rules:
- Return at most 5 matches.
- Only use the provided job ids.
- Keep reasons concise and specific.
- Set recommended to true for especially strong matches.`

    try {
      const response = await this.gemini.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: 1200,
        },
      })

      const content = response.text
      if (!content) throw new Error('No response from Gemini')

      const parsed = JSON.parse(content)
      const knownJobIds = new Set(compactJobs.map((job) => job.id))
      const matches = Array.isArray(parsed.matches)
        ? parsed.matches
            .filter((item: { jobId?: string }) => item?.jobId && knownJobIds.has(item.jobId))
            .map(
              (item: {
                jobId: string
                matchScore?: number
                reason?: string
                matchingSkills?: string[]
                gaps?: string[]
                recommended?: boolean
              }) => ({
                jobId: item.jobId,
                matchScore: Math.max(0, Math.min(100, Math.round(item.matchScore ?? 0))),
                reason: item.reason || 'This role lines up with your current strengths.',
                matchingSkills: Array.isArray(item.matchingSkills)
                  ? item.matchingSkills.slice(0, 4)
                  : [],
                gaps: Array.isArray(item.gaps) ? item.gaps.slice(0, 3) : [],
                recommended: Boolean(item.recommended),
              })
            )
            .sort((a: AIJobMatch, b: AIJobMatch) => b.matchScore - a.matchScore)
        : []

      return {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : 'These opportunities are the strongest fit based on your current skill profile.',
        matches,
        model: DEFAULT_MODEL,
        tokensUsed: 0,
        cost: 0,
        rawResponse: response,
      }
    } catch (error) {
      console.error('Gemini job matching error:', error)
      throw new Error(
        `AI job matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async chatCareerCoach(
    message: string,
    skills: SkillMatchInput[],
    jobs: JobMatchInput[] = []
  ): Promise<AICareerChatResult> {
    assertAIEnv()
    if (DEFAULT_PROVIDER === 'gemini' && this.gemini) {
      return this.chatCareerCoachWithGemini(message, skills, jobs)
    }
    if (!this.openai) throw new Error('OpenAI client not initialized')

    const prompt = `You are the Nexus AI career coach.

User skills:
${JSON.stringify(
  skills.slice(0, 12).map((skill) => ({
    name: skill.name,
    level: skill.level,
    verified: Boolean(skill.verified),
  })),
  null,
  2
)}

Relevant jobs:
${JSON.stringify(
  jobs.slice(0, 5).map((job) => ({
    title: job.title,
    companyName: job.companyName,
    type: job.type,
    skills: job.skills,
  })),
  null,
  2
)}

User message:
${message}

Respond in JSON:
{
  "reply": "helpful coaching response in under 140 words",
  "suggestedPrompts": ["follow up 1", "follow up 2", "follow up 3"]
}

Rules:
- Be specific, practical, and encouraging.
- Reference the user's skills or nearby jobs when useful.
- Give direct next steps.
- Suggested prompts should be short and clickable.`

    try {
      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise AI career coach helping users turn their skills into better job outcomes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 700,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No response from OpenAI')

      const parsed = JSON.parse(content)
      const tokensUsed = response.usage?.total_tokens || 0
      const cost = estimateCostUsd(
        DEFAULT_MODEL,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0
      )

      return {
        reply:
          typeof parsed.reply === 'string' && parsed.reply.trim()
            ? parsed.reply.trim()
            : 'Focus on presenting your strongest verified skills and the proof behind them.',
        suggestedPrompts: Array.isArray(parsed.suggestedPrompts)
          ? parsed.suggestedPrompts
              .filter((item: unknown): item is string => typeof item === 'string')
              .slice(0, 3)
          : [],
        model: DEFAULT_MODEL,
        tokensUsed,
        cost,
        rawResponse: response,
      }
    } catch (error) {
      console.error('OpenAI career chat error:', error)
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async chatCareerCoachWithGemini(
    message: string,
    skills: SkillMatchInput[],
    jobs: JobMatchInput[] = []
  ): Promise<AICareerChatResult> {
    if (!this.gemini) throw new Error('Gemini client not initialized')

    const prompt = `You are the Nexus AI career coach.

User skills:
${JSON.stringify(
  skills.slice(0, 12).map((skill) => ({
    name: skill.name,
    level: skill.level,
    verified: Boolean(skill.verified),
  })),
  null,
  2
)}

Relevant jobs:
${JSON.stringify(
  jobs.slice(0, 5).map((job) => ({
    title: job.title,
    companyName: job.companyName,
    type: job.type,
    skills: job.skills,
  })),
  null,
  2
)}

User message:
${message}

Respond in strict JSON:
{
  "reply": "helpful coaching response in under 140 words",
  "suggestedPrompts": ["follow up 1", "follow up 2", "follow up 3"]
}

Rules:
- Be specific, practical, and encouraging.
- Reference the user's skills or nearby jobs when useful.
- Give direct next steps.
- Suggested prompts should be short and clickable.`

    try {
      const response = await this.gemini.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
          maxOutputTokens: 700,
        },
      })

      const content = response.text
      if (!content) throw new Error('No response from Gemini')

      const parsed = JSON.parse(content)

      return {
        reply:
          typeof parsed.reply === 'string' && parsed.reply.trim()
            ? parsed.reply.trim()
            : 'Focus on presenting your strongest verified skills and the proof behind them.',
        suggestedPrompts: Array.isArray(parsed.suggestedPrompts)
          ? parsed.suggestedPrompts
              .filter((item: unknown): item is string => typeof item === 'string')
              .slice(0, 3)
          : [],
        model: DEFAULT_MODEL,
        tokensUsed: 0,
        cost: 0,
        rawResponse: response,
      }
    } catch (error) {
      console.error('Gemini career chat error:', error)
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Singleton instance
export const aiClient = new AIClient()
