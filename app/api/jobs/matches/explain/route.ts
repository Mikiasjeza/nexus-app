/**
 * POST /api/jobs/matches/explain  { ref }
 * An AI explanation of why a job was recommended, grounded in the
 * eligibility checks and the person's own data.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { explainMatch } from '@/lib/jobs/matching'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ ref: z.string().regex(/^(ext|nexus):[a-z0-9]{10,40}$/) })

export async function POST(request: Request) {
  if (await isGuestRequest()) {
    return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
  }
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!rateLimit(`jobs:explain:${userId}`, { maxRequests: 30, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json(
      { error: 'You have asked for a lot of explanations. Try later.' },
      { status: 429 }
    )
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
  const explanation = await explainMatch(userId, parsed.data.ref)
  if (!explanation) {
    return NextResponse.json({ error: 'Could not explain this one right now.' }, { status: 502 })
  }
  return NextResponse.json({ explanation })
}
