/**
 * GET /api/career/summary
 * Recommended assessments and first job matches for the Career Profile.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { careerSummary } from '@/lib/career/summary'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    return NextResponse.json(await careerSummary(userId))
  } catch (e) {
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not load' }, { status: 500 })
  }
}
