/**
 * GET /api/jobs/matches?section=qualified|growth|early&page=1
 * Personalized matches with eligibility checks and a relevance score
 * (relevance only, not a probability of being hired).
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { jobMatches } from '@/lib/jobs/matching'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const SECTIONS = new Set(['qualified', 'growth', 'early'])

export async function GET(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account to see matches.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`jobs:matches:${userId}`, { maxRequests: 40, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many requests. Slow down a little.' }, { status: 429 })
    }
    const p = new URL(request.url).searchParams
    const section = SECTIONS.has(p.get('section') ?? '')
      ? (p.get('section') as 'qualified')
      : 'qualified'
    const page = Math.max(1, Math.min(50, Number(p.get('page')) || 1))
    return NextResponse.json(await jobMatches(userId, section, page))
  } catch (e) {
    return (
      dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not load matches' }, { status: 500 })
    )
  }
}
