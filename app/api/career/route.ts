/**
 * GET /api/career
 * Career+ overview: recommended roles, skills employers want, passport views.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canAccessCareerPlan, upgradeRequiredBody } from '@/lib/billing/entitlements'
import { careerOverview } from '@/lib/career/service'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account to use Career+.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const access = await canAccessCareerPlan(userId)
    if (!access.allowed) {
      return NextResponse.json(upgradeRequiredBody(access), { status: 402 })
    }
    if (!rateLimit(`career:overview:${userId}`, { maxRequests: 30, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }
    return NextResponse.json(await careerOverview(userId))
  } catch (e) {
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    console.error('Career overview error:', e)
    return NextResponse.json({ error: 'Could not load Career+' }, { status: 500 })
  }
}
