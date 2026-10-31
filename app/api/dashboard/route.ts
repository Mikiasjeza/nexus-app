import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import { env } from '@/lib/config/env'
import { dbErrorResponse } from '@/lib/db-error'
import {
  ACTIVITY_WINDOW_MS,
  buildDashboardSummary,
  verifiedChangesFromHistory,
} from '@/lib/dashboard/summary'
import { buildGuestDashboardInput } from '@/lib/dashboard/guest'

export const dynamic = 'force-dynamic'

/** Most checks a dashboard needs: latest per skill, recent list and a year of activity. */
const MAX_ANALYSES = 500

/** Everything the candidate dashboard shows, in one request. */
export async function GET() {
  try {
    const now = new Date()

    if (env.isGuestMode || (await hasGuestPreviewSession())) {
      return NextResponse.json(buildDashboardSummary(buildGuestDashboardInput(now)))
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const since = new Date(now.getTime() - ACTIVITY_WINDOW_MS)
    const [skills, analyses, history, activities] = await Promise.all([
      prisma.skill.findMany({
        where: { userId },
        select: { id: true, name: true, category: true, verified: true, createdAt: true },
      }),
      prisma.aIAnalysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_ANALYSES,
        select: {
          id: true,
          skillId: true,
          confidenceScore: true,
          improvements: true,
          createdAt: true,
        },
      }),
      // Verified-flag changes are needed in full: the chart works backwards from today.
      prisma.skillHistory.findMany({
        where: { skill: { userId } },
        select: { skillId: true, timestamp: true, changes: true },
      }),
      prisma.activity.findMany({
        where: { userId, timestamp: { gte: since } },
        select: { skillId: true, timestamp: true },
      }),
    ])

    return NextResponse.json(
      buildDashboardSummary({
        now,
        skills,
        analyses,
        verifiedChanges: verifiedChangesFromHistory(history),
        activities,
      })
    )
  } catch (e) {
    console.error('Dashboard summary error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load your dashboard' }, { status: 500 })
  }
}
