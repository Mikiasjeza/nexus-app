/**
 * GET /api/billing/checkout-status?session_id=cs_...
 * Whether a checkout has really started the plan, asked of Stripe directly.
 * The success page polls this and only says "you're subscribed" once it
 * answers 'confirmed'.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { stripeService } from '@/lib/integrations/stripe'
import { billingErrorResponse } from '@/lib/billing/http'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const rl = rateLimit(`billing:checkout-status:${userId}`, { maxRequests: 30, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const sessionId = new URL(request.url).searchParams.get('session_id') || ''
    return NextResponse.json(await stripeService.confirmCheckout(userId, sessionId))
  } catch (e) {
    return billingErrorResponse('api/billing/checkout-status', e)
  }
}
