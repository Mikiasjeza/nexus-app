/**
 * AI Client - Real AI Integration
 * Supports OpenAI and Anthropic APIs
 * 
 * TODO: Add API keys to environment variables:
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 * 
 * TODO: Decide on default model (gpt-4, claude-3-opus, etc.)
 * TODO: Implement cost tracking and limits
 * TODO: Add rate limiting
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { assertAIEnv, env } from '@/lib/config/env'

// TODO: Choose default provider (openai or anthropic)
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

class AIClient {
  private openai: OpenAI | null = null
  private anthropic: Anthropic | null = null

  constructor() {
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

    if (!this.openai && !this.anthropic) {
      console.warn('⚠️  No AI API keys configured. AI features will not work.')
      console.warn('   Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env')
    }
  }

  /**
   * Analyze evidence for a skill
   * Returns confidence score, explanation, and suggestions
   */
  async analyzeEvidence(
    skillName: string,
    skillLevel: string,
    evidence: EvidenceInput[],
    provider: 'openai' | 'anthropic' = DEFAULT_PROVIDER as any
  ): Promise<AIAnalysisResult> {
    assertAIEnv()
    if (provider === 'openai' && this.openai) {
      return this.analyzeWithOpenAI(skillName, skillLevel, evidence)
    } else if (provider === 'anthropic' && this.anthropic) {
      return this.analyzeWithAnthropic(skillName, skillLevel, evidence)
    }

    throw new Error(`AI provider ${provider} not configured or unavailable`)
  }

  private async analyzeWithOpenAI(
    skillName: string,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    if (!this.openai) throw new Error('OpenAI client not initialized')

    // Build evidence context
    const evidenceText = evidence.map(e => {
      if (e.type === 'code') {
        return `Code (${e.metadata?.language || 'unknown'}):\n${e.content}`
      } else if (e.type === 'link') {
        return `Link: ${e.metadata?.url}\nDescription: ${e.content}`
      } else {
        return e.content
      }
    }).join('\n\n---\n\n')

    const prompt = `You are an expert skill assessor. Analyze the following evidence for a skill claim.

Skill: ${skillName}
Claimed Level: ${skillLevel}

Evidence:
${evidenceText}

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
            content: 'You are an expert skill assessor. Analyze evidence objectively and provide constructive feedback.',
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
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async analyzeWithAnthropic(
    skillName: string,
    skillLevel: string,
    evidence: EvidenceInput[]
  ): Promise<AIAnalysisResult> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized')

    // Build evidence context
    const evidenceText = evidence.map(e => {
      if (e.type === 'code') {
        return `Code (${e.metadata?.language || 'unknown'}):\n${e.content}`
      } else if (e.type === 'link') {
        return `Link: ${e.metadata?.url}\nDescription: ${e.content}`
      } else {
        return e.content
      }
    }).join('\n\n---\n\n')

    const prompt = `You are an expert skill assessor. Analyze the following evidence for a skill claim.

Skill: ${skillName}
Claimed Level: ${skillLevel}

Evidence:
${evidenceText}

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
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Batch analyze multiple evidence items (cost optimization)
   */
  async batchAnalyze(
    analyses: Array<{ skillName: string; skillLevel: string; evidence: EvidenceInput[] }>,
    provider: 'openai' | 'anthropic' = DEFAULT_PROVIDER as any
  ): Promise<AIAnalysisResult[]> {
    // TODO: Implement batching logic to reduce API calls
    // For now, process sequentially
    const results: AIAnalysisResult[] = []
    for (const analysis of analyses) {
      const result = await this.analyzeEvidence(
        analysis.skillName,
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
