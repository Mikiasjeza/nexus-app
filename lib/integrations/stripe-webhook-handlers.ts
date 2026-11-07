/**
 * Stripe webhook event handlers. Each one re-reads the subscription from
 * Stripe and copies its state (lib/billing/sync.ts), so they are idempotent
 * and safe to receive late, twice or out of order.
 */

import type Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'
import { idOf } from '@/lib/billing/stripe-client'
import { syncStripeSubscription } from '@/lib/billing/sync'
import { confirmRedemption, expireRedemption } from '@/lib/billing/promotions'

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription') return
  const subscriptionId = idOf(session.subscription)
  if (subscriptionId) {
    await syncStripeSubscription(subscriptionId, {
      userId: session.metadata?.userId ?? session.client_reference_id,
      companyId: session.metadata?.companyId,
    })
  }
  // A promotion slot becomes a redemption only once the first payment succeeded.
  if (session.metadata?.promotionId && session.payment_status === 'paid') {
    await confirmRedemption(session.id, subscriptionId)
  }
}

/** An unpaid checkout lapsed: any promotion slot it held is free again. */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  await expireRedemption(session.id)
}

/** Created, updated (renewals, plan changes, cancellations), deleted, paused, resumed. */
export async function handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
  await syncStripeSubscription(subscription.id)
}

/** Paid invoices move the billing period on; Stripe also says so in subscription events. */
export async function handleInvoiceEvent(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = idOf(invoice.subscription)
  if (subscriptionId) await syncStripeSubscription(subscriptionId)
}

/**
 * A renewal failed. Stripe retries the card and marks the subscription
 * past_due; paid features continue for the grace period (lib/billing/status.ts)
 * and the billing page asks the subscriber to update their card.
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = idOf(invoice.subscription)
  if (!subscriptionId) return
  Sentry.logger.warn('Stripe invoice payment failed', {
    subscriptionId,
    attempt: invoice.attempt_count,
  })
  await syncStripeSubscription(subscriptionId)
}
