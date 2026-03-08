/**
 * Stripe Webhook Handler
 * 
 * POST /api/stripe/webhook
 * 
 * Handles Stripe webhook events (subscription updates, payments, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
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
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify and handle webhook
    const event = await stripeService.handleWebhook(body, signature)

    return NextResponse.json({ received: true, event: event.type })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

// Disable body parsing for webhook route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
