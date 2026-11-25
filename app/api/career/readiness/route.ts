/**
 * GET /api/career/readiness
 * Career Readiness for the dashboard, from the person's own records.
 */

import { NextResponse } from 'next/server'
import { careerReadiness } from '@/lib/career/readiness'
import { failure, signedIn } from '@/lib/jobs/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await signedIn('career:readiness')
    if (userId instanceof NextResponse) return userId
    return NextResponse.json(await careerReadiness(userId))
  } catch (e) {
    return failure(e)
  }
}
