/**
 * API Route: AI Evidence Analysis
 *
 * POST /api/ai/analyze
 *
 * Analyzes evidence for a skill using AI. Stores result in AIAnalysis table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import { aiClient, EvidenceInput } from '@/lib/ai/client'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { z } from 'zod'
import { env } from '@/lib/config/env'
import { PLAN_INFO } from '@/lib/plans'
import { normalizeSkillCategory } from '@/lib/skills-taxonomy'

export const dynamic = 'force-dynamic'

const analyzeSchema = z.object({
  skillId: z.string(),
  skillName: z.string().min(1),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  evidence: z
    .array(
      z.object({
        type: z.enum(['text', 'code', 'link', 'file']),
        content: z.string(),
        metadata: z
          .object({
            url: z.string().optional(),
            language: z.string().optional(),
            fileName: z.string().optional(),
            mimeType: z.string().optional(),
          })
          .optional(),
      })
    )
    .min(1),
  provider: z.enum(['gemini', 'openai', 'anthropic']).optional(),
  evidenceId: z.string().optional(),
})

const AI_ANALYSIS_LIMITS: Record<string, number> = {
  free: PLAN_INFO.free.limits.aiAnalyses,
  pro: PLAN_INFO.pro.limits.aiAnalyses,
  enterprise: PLAN_INFO.enterprise.limits.aiAnalyses,
}

export async function GET(request: NextRequest) {
  try {
    if (env.isGuestMode || (await hasGuestPreviewSession())) {
      return NextResponse.json({ data: [] })
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '6')
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(12, Math.floor(limitParam)))
      : 6

    const analyses = await prisma.aIAnalysis.findMany({
      where: { userId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            level: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      data: analyses.map((analysis) => ({
        id: analysis.id,
        skillId: analysis.skillId,
        skillName: analysis.skill.name,
        skillLevel: analysis.skill.level,
        confidenceScore: analysis.confidenceScore,
        explanation: analysis.explanation,
        suggestedLevel: analysis.suggestedLevel,
        improvements: analysis.improvements,
        tokensUsed: analysis.tokensUsed,
        cost: analysis.cost,
        model: analysis.model,
        verified: analysis.skill.verified,
        createdAt: analysis.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('AI analysis history error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load AI analyses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const controller = new AbortController()
  try {
    timeout = setTimeout(() => controller.abort(), env.isProd ? 25000 : 45000)
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`ai:${userId}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many AI requests. Try again later.' }, { status: 429 })
    }

    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('AI request timed out')))
      }),
    ])
    const validated = analyzeSchema.parse(body)

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    })
    const plan = subscription?.plan || 'free'
    const isActivePlan = !subscription || ['active', 'trialing'].includes(subscription.status)
    const monthlyLimit = AI_ANALYSIS_LIMITS[plan] ?? AI_ANALYSIS_LIMITS.free
    if (isActivePlan && monthlyLimit >= 0) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const usedThisMonth = await prisma.aIAnalysis.count({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
      })
      if (usedThisMonth >= monthlyLimit) {
        return NextResponse.json(
          {
            error: `AI analysis quota reached for ${plan} plan`,
            plan,
            limit: monthlyLimit,
            used: usedThisMonth,
          },
          { status: 403 }
        )
      }
    }

    const skill = await prisma.skill.findFirst({
      where: { id: validated.skillId, userId },
    })
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const result = (await Promise.race([
      aiClient.analyzeEvidence(
        skill.name,
        normalizeSkillCategory(skill.category),
        skill.level,
        validated.evidence as EvidenceInput[],
        validated.provider
      ),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('AI request timed out')))
      }),
    ])) as Awaited<ReturnType<typeof aiClient.analyzeEvidence>>

    const analysis = await prisma.$transaction(async (tx) => {
      const createdAnalysis = await tx.aIAnalysis.create({
        data: {
          skillId: validated.skillId,
          userId,
          evidenceId: validated.evidenceId ?? null,
          model: result.model,
          confidenceScore: result.confidenceScore,
          explanation: result.explanation,
          suggestedLevel: result.suggestedLevel ?? null,
          improvements: result.improvements,
          // Data minimisation: the provider's raw payload is not needed after parsing.
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        },
      })

      const shouldVerifySkill = result.confidenceScore >= 0.8
      let verified = skill.verified

      if (shouldVerifySkill && !skill.verified) {
        await tx.skill.update({
          where: { id: skill.id },
          data: { verified: true },
        })
        verified = true

        await tx.activity.create({
          data: {
            userId,
            type: 'skill_updated',
            skillId: skill.id,
            skillName: skill.name,
            message: `AI verified ${skill.name}`,
          },
        })
      }

      return { createdAnalysis, verified }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: analysis.createdAnalysis.id,
        skillId: skill.id,
        skillName: skill.name,
        confidenceScore: analysis.createdAnalysis.confidenceScore,
        explanation: analysis.createdAnalysis.explanation,
        suggestedLevel: analysis.createdAnalysis.suggestedLevel,
        improvements: analysis.createdAnalysis.improvements,
        tokensUsed: analysis.createdAnalysis.tokensUsed,
        cost: analysis.createdAnalysis.cost,
        model: analysis.createdAnalysis.model,
        verified: analysis.verified,
        createdAt: analysis.createdAnalysis.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('AI analysis error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: e.errors }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}
