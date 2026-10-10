/**
 * API Route: AI Evidence Analysis
 *
 * POST /api/ai/analyze
 *
 * Assesses evidence submitted on the verification page together with the
 * skill's stored evidence (see lib/ai/verify-skill.ts). GET lists past analyses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import { verifySkill } from '@/lib/ai/verify-skill'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { z } from 'zod'
import { env } from '@/lib/config/env'

export const dynamic = 'force-dynamic'
// AI assessment with reasoning can take longer than the platform default.
export const maxDuration = 60

// The skill's name and level are read from the database, never from the
// request, and the provider is server configuration, not a client choice.
const analyzeSchema = z.object({
  skillId: z.string(),
  evidence: z
    .array(
      z.object({
        type: z.enum(['text', 'code', 'link', 'file']),
        content: z.string().max(50_000),
        metadata: z
          .object({
            url: z.string().max(2048).optional(),
            language: z.string().max(50).optional(),
            fileName: z.string().max(255).optional(),
            mimeType: z.string().max(100).optional(),
          })
          .optional(),
      })
    )
    .min(1)
    .max(10),
  evidenceId: z.string().optional(),
})

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
    timeout = setTimeout(() => controller.abort(), 55000)
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

    const outcome = await Promise.race([
      verifySkill({
        userId,
        skillId: validated.skillId,
        submittedEvidence: validated.evidence,
        evidenceId: validated.evidenceId,
      }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('AI request timed out')))
      }),
    ])

    if (outcome.status === 'not_found') {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    if (outcome.status === 'no_evidence') {
      return NextResponse.json({ error: 'Add evidence to analyze' }, { status: 400 })
    }
    if (outcome.status === 'quota_exceeded') {
      return NextResponse.json(
        {
          error: `AI analysis quota reached for ${outcome.plan} plan`,
          plan: outcome.plan,
          limit: outcome.limit,
          used: outcome.used,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: outcome.analysisId,
        skillId: outcome.skillId,
        skillName: outcome.skillName,
        confidenceScore: outcome.confidenceScore,
        explanation: outcome.explanation,
        suggestedLevel: outcome.suggestedLevel,
        improvements: outcome.improvements,
        tokensUsed: outcome.tokensUsed,
        cost: outcome.cost,
        model: outcome.model,
        verified: outcome.verified,
        createdAt: outcome.createdAt,
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
