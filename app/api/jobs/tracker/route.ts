/**
 * GET  /api/jobs/tracker   your saved and tracked jobs
 * POST /api/jobs/tracker   save a job or add an application
 */

import { NextResponse } from 'next/server'
import { listTracked, trackJob } from '@/lib/jobs/tracker'
import { body, failure, signedIn } from '@/lib/jobs/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await signedIn('jobs:tracker')
    if (userId instanceof NextResponse) return userId
    return NextResponse.json({ jobs: await listTracked(userId) })
  } catch (e) {
    return failure(e)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await signedIn('jobs:tracker')
    if (userId instanceof NextResponse) return userId
    return NextResponse.json({ job: await trackJob(userId, await body(request)) })
  } catch (e) {
    return failure(e)
  }
}
