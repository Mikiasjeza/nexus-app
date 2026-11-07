/**
 * POST /api/stripe/checkout
 * Body: { planId: 'pro' | 'career_plus', promotion?: boolean }
 *
 * Starts Stripe Checkout for an individual plan. The price comes from the
 * server's catalog, never from the request, and nothing is charged here:
 * the visitor confirms and pays on Stripe's page.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { stripeService } from '@/lib/integrations/stripe'
import { appBaseUrl, billingErrorResponse } from '@/lib/billing/http'
import { normalizePlan } from '@/lib/plans'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  planId: z.enum(['pro', 'career_plus', 'professional']),
  promotion: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json(
        { error: 'Create an account to subscribe.', code: 'guest' },
        { status: 401 }
      )
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`stripe:checkout:${userId}:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Try again later.' },
        { status: 429 }
      )
    }

    const body = bodySchema.parse(await request.json().catch(() => ({})))
    const { url, promotionApplied } = await stripeService.createCheckoutSession({
      userId,
      plan: normalizePlan(body.planId),
      usePromotion: body.promotion === true,
      baseUrl: appBaseUrl(request),
    })
    return NextResponse.json({ url, promotionApplied })
  } catch (e) {
    return billingErrorResponse('api/stripe/checkout', e)
  }
}
