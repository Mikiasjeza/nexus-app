/**
 * POST /api/billing/change-plan
 * Body: { planId }
 *
 * Upgrade or downgrade between individual plans through Stripe's billing
 * portal, which shows the prorated amount and asks the subscriber to
 * confirm. Nothing changes until they do.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { stripeService } from '@/lib/integrations/stripe'
import { appBaseUrl, billingErrorResponse } from '@/lib/billing/http'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ planId: z.enum(['pro', 'career_plus']) })

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Billing is off in the guest preview.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const rl = rateLimit(`billing:change-plan:${userId}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { planId } = bodySchema.parse(await request.json().catch(() => ({})))
    const url = await stripeService.createPlanChangeSession(userId, planId, appBaseUrl(request))
    return NextResponse.json({ url })
  } catch (e) {
    return billingErrorResponse('api/billing/change-plan', e)
  }
}
