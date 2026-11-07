/**
 * GET /api/cron/billing-check — run daily by Vercel Cron (vercel.json).
 * Alerts (to Sentry) on AI spend against AI_MONTHLY_BUDGET_USD, failing
 * Stripe webhooks and mismatched prices, and frees lapsed promotion holds.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without the secret
 * configured, the check refuses to run.
 */

import { NextResponse } from 'next/server'
import { runBillingCheck } from '@/lib/billing/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await runBillingCheck())
  } catch (error) {
    console.error('Billing check failed:', error)
    return NextResponse.json({ error: 'Billing check failed' }, { status: 500 })
  }
}
