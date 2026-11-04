import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { stripeService } from '@/lib/integrations/stripe'
import { appBaseUrl, billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

/** Stripe's billing portal: payment details, invoices and cancellation. */
export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Billing is off in the guest preview.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const url = await stripeService.createBillingPortalSession(userId, appBaseUrl(request))
    return NextResponse.json({ url })
  } catch (e) {
    return billingErrorResponse('api/stripe/portal', e)
  }
}
