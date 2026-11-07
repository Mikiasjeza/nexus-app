/**
 * GET /api/analytics/assessment-growth
 * Skill growth analytics (a paid feature): each skill's formal assessment
 * scores over time, with the best, the latest and the change since the first.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { getAssessment } from '@/lib/assessments/catalog'
import { canAccessGrowthAnalytics, upgradeRequiredBody } from '@/lib/billing/entitlements'
import { billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

export interface GrowthSkill {
  slug: string
  skillName: string
  points: { at: string; score: number; result: string | null }[]
  best: number
  latest: number
  /** Latest minus first; 0 with a single attempt. */
  change: number
}

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json(
        { error: 'Create an account to track your growth.', code: 'guest' },
        { status: 401 }
      )
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const access = await canAccessGrowthAnalytics(userId)
    if (!access.allowed) {
      return NextResponse.json(upgradeRequiredBody(access), { status: 402 })
    }

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId, status: 'COMPLETED', score: { not: null }, completedAt: { not: null } },
      select: { assessmentSlug: true, score: true, result: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
      take: 500,
    })

    const bySkill = new Map<string, GrowthSkill['points']>()
    for (const attempt of attempts) {
      const points = bySkill.get(attempt.assessmentSlug) ?? []
      points.push({
        at: attempt.completedAt!.toISOString(),
        score: attempt.score!,
        result: attempt.result,
      })
      bySkill.set(attempt.assessmentSlug, points)
    }

    const skills: GrowthSkill[] = Array.from(bySkill, ([slug, points]) => ({
      slug,
      skillName: getAssessment(slug)?.skillName ?? slug,
      points,
      best: Math.max(...points.map((p) => p.score)),
      latest: points[points.length - 1].score,
      change: points[points.length - 1].score - points[0].score,
    })).sort((a, b) => b.points.length - a.points.length || a.skillName.localeCompare(b.skillName))

    return NextResponse.json({ skills })
  } catch (e) {
    return billingErrorResponse('api/analytics/assessment-growth', e)
  }
}
