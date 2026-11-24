/**
 * POST /api/career/plan  { roleId }
 * Skill gap analysis and a learning plan for one role, with AI coaching.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canAccessCareerPlan, upgradeRequiredBody } from '@/lib/billing/entitlements'
import { careerPlan } from '@/lib/career/service'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ roleId: z.string().min(1).max(60) })

export async function POST(request: Request) {
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
    // Each plan asks the AI for coaching, so keep it to a sensible pace.
    if (!rateLimit(`career:plan:${userId}`, { maxRequests: 20, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json(
        { error: 'You have made a lot of plans this hour. Try again a bit later.' },
        { status: 429 }
      )
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Pick a role' }, { status: 400 })

    const plan = await careerPlan(userId, parsed.data.roleId)
    if (!plan) return NextResponse.json({ error: 'Unknown role' }, { status: 404 })
    return NextResponse.json(plan)
  } catch (e) {
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    console.error('Career plan error:', e)
    return NextResponse.json({ error: 'Could not build the plan' }, { status: 500 })
  }
}
