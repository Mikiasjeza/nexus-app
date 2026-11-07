import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { viewerBilling } from '@/lib/billing/summary'
import { billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

/** The signed-in person's subscription. /api/billing/summary has the full picture. */
export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { plan, subscription } = await viewerBilling(userId)
    return NextResponse.json({
      subscription: {
        plan,
        status: subscription?.status ?? 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
    })
  } catch (e) {
    return billingErrorResponse('api/stripe/subscription', e)
  }
}
