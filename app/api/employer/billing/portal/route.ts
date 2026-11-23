/**
 * POST /api/employer/billing/portal
 * Stripe's billing portal for the company: card, invoices, cancellation.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canManageTeam, membershipFor } from '@/lib/employer/access'
import { stripeService } from '@/lib/integrations/stripe'
import { appBaseUrl, billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Billing is off in the guest preview.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can manage billing.' },
        { status: 403 }
      )
    }
    const url = await stripeService.createCompanyPortalSession(
      membership.companyId,
      appBaseUrl(request)
    )
    return NextResponse.json({ url })
  } catch (e) {
    return billingErrorResponse('api/employer/billing/portal', e)
  }
}
