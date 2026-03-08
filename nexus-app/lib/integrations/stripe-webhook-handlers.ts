/**
 * Stripe webhook event handlers - persist to database.
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { stripe } from './stripe'

function toSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    default:
      return 'active'
  }
}

async function findUserIdForCustomer(customerId: string): Promise<string | null> {
  const knownSub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  })
  if (knownSub?.userId) return knownSub.userId

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer && !('deleted' in customer)) {
      return customer.metadata?.userId || null
    }
  } catch {
    // Ignore Stripe lookup failures to keep webhook handler resilient.
  }
  return null
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId as string | undefined
  const planId = session.metadata?.planId as string | undefined
  if (!userId || !planId) return

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id

  if (!subscriptionId || !customerId) return

  let currentPeriodEnd: Date | null = null
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    currentPeriodEnd = new Date(sub.current_period_end * 1000)
  } catch {
    // Ignore
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: planId,
      status: 'active',
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: planId,
      status: 'active',
      currentPeriodEnd,
    },
  })
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string
  const subscriptionId = typeof subscription.id === 'string' ? subscription.id : null
  if (!subscriptionId) return

  const subRecord = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscriptionId },
        { stripeCustomerId: customerId },
      ],
    },
  })

  const status = toSubscriptionStatus(subscription.status)
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false

  if (subRecord) {
    await prisma.subscription.update({
      where: { id: subRecord.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      },
    })
    return
  }

  const userId = await findUserIdForCustomer(customerId)
  if (!userId) return

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: 'pro',
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
  })
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string
  const subscriptionId = typeof subscription.id === 'string' ? subscription.id : null

  const subRecord = await prisma.subscription.findFirst({
    where: {
      OR: [
        ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
        { stripeCustomerId: customerId },
      ],
    },
  })

  if (subRecord) {
    await prisma.subscription.update({
      where: { id: subRecord.id },
      data: {
        status: 'canceled',
        stripeSubscriptionId: null,
      },
    })
    return
  }

  const userId = await findUserIdForCustomer(customerId)
  if (!userId) return

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      plan: 'free',
      status: 'canceled',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      status: 'canceled',
    },
  })
}

export async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id
  if (!subscriptionId) return

  const subRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })
  if (!subRecord) return

  await prisma.subscription.update({
    where: { id: subRecord.id },
    data: { status: 'past_due' },
  })
}
