/**
 * GET  /api/jobs/alerts   your job alerts
 * POST /api/jobs/alerts   create one (up to 5)
 */

import { NextResponse } from 'next/server'
import { createAlert, listAlerts } from '@/lib/jobs/alerts'
import { emailDeliveryConfigured } from '@/lib/auth/email-verification'
import { body, failure, signedIn } from '@/lib/jobs/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await signedIn('jobs:alerts')
    if (userId instanceof NextResponse) return userId
    return NextResponse.json({
      alerts: await listAlerts(userId),
      emailReady: emailDeliveryConfigured(),
    })
  } catch (e) {
    return failure(e)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await signedIn('jobs:alerts')
    if (userId instanceof NextResponse) return userId
    return NextResponse.json({ alert: await createAlert(userId, await body(request)) })
  } catch (e) {
    return failure(e)
  }
}
