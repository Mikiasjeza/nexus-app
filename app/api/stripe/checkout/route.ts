import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUserId } from '@/lib/auth/session'
import { stripeService, SubscriptionPlan } from '@/lib/integrations/stripe'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  planId: z.enum(['pro', 'enterprise', 'professional']).transform((v) =>
    v === 'professional' ? 'pro' : v
  ),
})

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`stripe:checkout:${userId}:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many checkout attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { planId } = bodySchema.parse(body)

    const requestOrigin = new URL(request.url).origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin
    const url = await stripeService.createCheckoutSession(
      userId,
      planId as SubscriptionPlan,
      `${baseUrl}/settings?billing=success`,
      `${baseUrl}/pricing?billing=cancelled`
    )

    if (!url) {
      return NextResponse.json(
        { error: 'Unable to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Checkout failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 400 }
    )
  }
}
