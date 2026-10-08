/**
 * AI Client - Real AI Integration
 * Supports Gemini, OpenAI, and Anthropic APIs
 *
 * TODO: Add API keys to environment variables:
 * - GEMINI_API_KEY
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 *
 * TODO: Decide on default model (gpt-4, claude-3-opus, etc.)
 * TODO: Implement cost tracking and limits
 * TODO: Add rate limiting
 */

import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { assertAIEnv, env } from '@/lib/config/env'
import { getSkillVerificationLens } from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'

// TODO: Choose default provider (gemini, openai, or anthropic)
const DEFAULT_PROVIDER = env.ai.provider

// TODO: Choose default model based on provider
const DEFAULT_MODEL = env.ai.model

export interface EvidenceInput {
  type: 'text' | 'code' | 'link' | 'file'
  content: string
  metadata?: {
    url?: string
    language?: string
    fileName?: string
    mimeType?: string
  }
}

export interface AIAnalysisResult {
  confidenceScore: number // 0-1
  explanation: string
  suggestedLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  improvements: string[]
  tokensUsed: number
  cost: number
  model: string
  rawResponse?: any
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

    // Initialize OpenAI if API key is provided
    if (env.ai.openAiKey) {
      this.openai = new OpenAI({
        apiKey: env.ai.openAiKey,
      })
    }

    // Initialize Anthropic if API key is provided
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
   * Analyze evidence for a skill
   * Returns confidence score, explanation, and suggestions
   */
  async analyzeEvidence(
    skillName: string,
    skillCategory: SkillCategory,
    skillLevel: string,
    evidence: EvidenceInput[],
    provider: 'gemini' | 'openai' | 'anthropic' = DEFAULT_PROVIDER as any
  ): Promise<AIAnalysisResult> {
    assertAIEnv()
    if (provider === 'gemini' && this.gemini) {
      return this.analyzeWithGemini(skillName, skillCategory, skillLevel, evidence)
    } else if (provider === 'openai' && this.openai) {
      return this.analyzeWithOpenAI(skillName, skillCategory, skillLevel, evidence)
    } else if (provider === 'anthropic' && this.anthropic) {
      return this.analyzeWithAnthropic(skillName, skillCategory, skillLevel, evidence)
    }

    throw new Error(`AI provider ${provider} not configured or unavailable`)
  }

  private async analyzeWithGemini(
    skillName: string,
    skillCategory: SkillCategory,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    if (!this.gemini) throw new Error('Gemini client not initialized')

    const evidenceText = evidence
      .map((e) => {
        if (e.type === 'code') {
          return `Code (${e.metadata?.language || 'unknown'}):\n${e.content}`
        } else if (e.type === 'link') {
          return `Link: ${e.metadata?.url}\nDescription: ${e.content}`
        } else {
          return e.content
        }
      })
      .join('\n\n---\n\n')

    const prompt = `You are an expert skill assessor. Analyze the following evidence for a skill claim.

Skill: ${skillName}
Skill Pillar: ${skillCategory}
Claimed Level: ${skillLevel}

Evidence:
${evidenceText}

Evaluation lens:
${getSkillVerificationLens(skillCategory)}

Provide:
1. A confidence score (0-1) for this skill claim based on the evidence
2. A clear explanation of why you assigned this score
3. A suggested skill level (beginner, intermediate, advanced, expert) if different from claimed
4. 2-3 specific, actionable improvements to strengthen this skill claim

Respond in strict JSON format:
{
  "confidenceScore": 0.0-1.0,
  "explanation": "detailed explanation",
  "suggestedLevel": "beginner|intermediate|advanced|expert" (optional),
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`

    try {
      const response = await this.gemini.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      })

      const content = response.text
      if (!content) throw new Error('No response from Gemini')

      const parsed = JSON.parse(content)

      return {
        confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0.5)),
        explanation: parsed.explanation || 'Analysis completed',
        suggestedLevel: parsed.suggestedLevel,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        tokensUsed: 0,
        cost: 0,
        model: DEFAULT_MODEL,
        rawResponse: response,
      }
    } catch (error) {
      console.error('Gemini analysis error:', error)
      throw new Error(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async analyzeWithOpenAI(
    skillName: string,
    skillCategory: SkillCategory,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    if (!this.openai) throw new Error('OpenAI client not initialized')

    // Build evidence context
    const evidenceText = evidence
      .map((e) => {
        if (e.type === 'code') {
          return `Code (${e.metadata?.language || 'unknown'}):\n${e.content}`
        } else if (e.type === 'link') {
          return `Link: ${e.metadata?.url}\nDescription: ${e.content}`
        } else {
          return e.content
        }
      })
      .join('\n\n---\n\n')

    const prompt = `You are an expert skill assessor. Analyze the following evidence for a skill claim.

Skill: ${skillName}
Skill Pillar: ${skillCategory}
Claimed Level: ${skillLevel}

Evidence:
${evidenceText}

Evaluation lens:
${getSkillVerificationLens(skillCategory)}

Provide:
1. A confidence score (0-1) for this skill claim based on the evidence
2. A clear explanation of why you assigned this score
3. A suggested skill level (beginner, intermediate, advanced, expert) if different from claimed
4. 2-3 specific, actionable improvements to strengthen this skill claim

Respond in JSON format:
{
  "confidenceScore": 0.0-1.0,
  "explanation": "detailed explanation",
  "suggestedLevel": "beginner|intermediate|advanced|expert" (optional),
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert skill assessor. Analyze evidence objectively and provide constructive feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No response from OpenAI')

      const parsed = JSON.parse(content)
      const tokensUsed = response.usage?.total_tokens || 0

      // TODO: Calculate actual cost based on model pricing
      // This is approximate for gpt-4-turbo-preview
      const cost = (tokensUsed / 1000) * 0.01 // Rough estimate

      return {
        confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0.5)),
        explanation: parsed.explanation || 'Analysis completed',
        suggestedLevel: parsed.suggestedLevel,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        tokensUsed,
        cost,
        model: DEFAULT_MODEL,
        rawResponse: response,
      }
    } catch (error) {
      console.error('OpenAI analysis error:', error)
      throw new Error(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async analyzeWithAnthropic(
    skillName: string,
    skillCategory: SkillCategory,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized')

    // Build evidence context
    const evidenceText = evidence
      .map((e) => {
        if (e.type === 'code') {
          return `Code (${e.metadata?.language || 'unknown'}):\n${e.content}`
        } else if (e.type === 'link') {
          return `Link: ${e.metadata?.url}\nDescription: ${e.content}`
        } else {
          return e.content
        }
      })
      .join('\n\n---\n\n')

    const prompt = `You are an expert skill assessor. Analyze the following evidence for a skill claim.

Skill: ${skillName}
Skill Pillar: ${skillCategory}
Claimed Level: ${skillLevel}

Evidence:
${evidenceText}

Evaluation lens:
${getSkillVerificationLens(skillCategory)}

Provide:
1. A confidence score (0-1) for this skill claim based on the evidence
2. A clear explanation of why you assigned this score
3. A suggested skill level (beginner, intermediate, advanced, expert) if different from claimed
4. 2-3 specific, actionable improvements to strengthen this skill claim

Respond in JSON format:
{
  "confidenceScore": 0.0-1.0,
  "explanation": "detailed explanation",
  "suggestedLevel": "beginner|intermediate|advanced|expert" (optional),
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`

    try {
      const response = await (this.anthropic as any).messages.create({
        model: 'claude-3-opus-20240229', // TODO: Make configurable
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') throw new Error('Unexpected response type from Anthropic')

      const parsed = JSON.parse(content.text)
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

      // TODO: Calculate actual cost based on model pricing
      // This is approximate for claude-3-opus
      const cost = (tokensUsed / 1000) * 0.015 // Rough estimate

      return {
        confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0.5)),
        explanation: parsed.explanation || 'Analysis completed',
        suggestedLevel: parsed.suggestedLevel,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        tokensUsed,
        cost,
        model: 'claude-3-opus-20240229',
        rawResponse: response,
      }
    } catch (error) {
      console.error('Anthropic analysis error:', error)
      throw new Error(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
      const cost = (tokensUsed / 1000) * 0.01

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
      const cost = (tokensUsed / 1000) * 0.01

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

  /**
   * Batch analyze multiple evidence items (cost optimization)
   */
  async batchAnalyze(
    analyses: Array<{ skillName: string; skillLevel: string; evidence: EvidenceInput[] }>,
    provider: 'gemini' | 'openai' | 'anthropic' = DEFAULT_PROVIDER as any
  ): Promise<AIAnalysisResult[]> {
    // TODO: Implement batching logic to reduce API calls
    // For now, process sequentially
    const results: AIAnalysisResult[] = []
    for (const analysis of analyses) {
      const result = await this.analyzeEvidence(
        analysis.skillName,
        'Technical Skills',
        analysis.skillLevel,
        analysis.evidence,
        provider
      )
      results.push(result)
    }
    return results
  }
}

// Singleton instance
export const aiClient = new AIClient()
