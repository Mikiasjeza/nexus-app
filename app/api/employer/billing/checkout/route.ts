/**
 * POST /api/employer/billing/checkout
 * Starts Stripe Checkout for the company's Business plan (owners and admins).
 * The price comes from the server's catalog; nothing is charged here.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canManageTeam, membershipFor } from '@/lib/employer/access'
import { stripeService } from '@/lib/integrations/stripe'
import { appBaseUrl, billingErrorResponse } from '@/lib/billing/http'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account to subscribe.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can change the plan.' },
        { status: 403 }
      )
    }
    if (
      !rateLimit(`company:checkout:${membership.companyId}`, { maxRequests: 10, windowMs: 60_000 })
        .allowed
    ) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a minute.' },
        { status: 429 }
      )
    }
    const { url } = await stripeService.createCompanyCheckoutSession({
      companyId: membership.companyId,
      baseUrl: appBaseUrl(request),
    })
    return NextResponse.json({ url })
  } catch (e) {
    return billingErrorResponse('api/employer/billing/checkout', e)
  }
}
