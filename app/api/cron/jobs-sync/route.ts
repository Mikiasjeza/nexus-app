/**
 * GET /api/cron/jobs-sync: run daily by Vercel Cron (vercel.json).
 * Pulls real listings from USAJOBS, Greenhouse and Lever into ExternalJob.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without it, refuses.
 */

import { NextResponse } from 'next/server'
import { syncJobs } from '@/lib/jobs/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const report = await syncJobs()
    console.log('Job sync:', JSON.stringify(report))
    return NextResponse.json(report)
  } catch (error) {
    console.error('Job sync failed:', error)
    return NextResponse.json({ error: 'Job sync failed' }, { status: 500 })
  }
}
