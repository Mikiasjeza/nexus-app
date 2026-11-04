/**
 * GET /api/billing/summary
 * The signed-in person's plan, price, renewal, cancellation status, this
 * month's allowance, usage history and premium features, from the real
 * subscription and usage records.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { billingSummary } from '@/lib/billing/summary'
import { billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Billing is off in the guest preview.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json(await billingSummary(userId))
  } catch (e) {
    return billingErrorResponse('api/billing/summary', e)
  }
}
