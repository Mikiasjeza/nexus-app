/**
 * GET /api/billing/plans
 * Public: which plans can be bought right now, the running founding-member
 * offer (only while it runs), and for a signed-in visitor their current plan,
 * allowance and whether the offer applies to them.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { planOffers, runningOffer, viewerBilling } from '@/lib/billing/summary'
import { billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const guest = await isGuestRequest()
    const userId = guest ? null : await getSessionUserId()
    const [offers, promotion, viewer] = await Promise.all([
      planOffers(),
      runningOffer('pro'),
      userId ? viewerBilling(userId) : Promise.resolve(null),
    ])
    return NextResponse.json({ plans: offers, promotion, viewer, guest })
  } catch (e) {
    return billingErrorResponse('api/billing/plans', e)
  }
}
