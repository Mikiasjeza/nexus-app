/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events (subscription updates, payments, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { stripeService } from '@/lib/integrations/stripe'
import { headers } from 'next/headers'
import { assertStripeWebhookEnv } from '@/lib/config/env'

export async function POST(request: NextRequest) {
  try {
    assertStripeWebhookEnv()
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      Sentry.logger.warn('Stripe webhook rejected: no signature header', {
        route: 'api/stripe/webhook',
        gateway: 'stripe',
      })
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    // Verify and handle webhook
    const event = await stripeService.handleWebhook(body, signature)

    Sentry.logger.info('Stripe webhook processed', {
      route: 'api/stripe/webhook',
      gateway: 'stripe',
      eventType: event.type,
    })

    return NextResponse.json({ received: true, event: event.type })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', error)
    Sentry.logger.error('Stripe webhook processing failed', {
      route: 'api/stripe/webhook',
      gateway: 'stripe',
      errorMessage: message,
    })
    // A bad or missing signature means the request didn't come from Stripe:
    // refuse it. Anything else is our failure: answer 500 so Stripe retries.
    // Neither reply says why, so nothing internal leaks to the caller.
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Disable body parsing for webhook route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
