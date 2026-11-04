/**
 * Copies a Stripe subscription's state into our Subscription row. Webhooks,
 * checkout confirmation and manual reconciliation all come through here, and
 * it always re-reads the subscription from Stripe first, so events that
 * arrive late, twice or out of order can't leave stale state behind.
 */

import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { isPlan, type SubscriptionPlan } from '@/lib/plans'
import { idOf, stripe } from './stripe-client'
import { planForPriceId } from './catalog'
import { isLiveStatus, normalizeStatus, type BillingStatus } from './status'

export type BillingOwner = { userId: string } | { companyId: string }

export interface SyncHints {
  userId?: string | null
  companyId?: string | null
}

export type SyncOutcome =
  | { synced: true; owner: BillingOwner; plan: SubscriptionPlan; status: BillingStatus }
  | { synced: false; reason: string }

const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null)

export const ownerWhere = (owner: BillingOwner) =>
  'userId' in owner ? { userId: owner.userId } : { companyId: owner.companyId }

async function resolveOwner(
  subscription: Stripe.Subscription,
  customerId: string,
  hints: SyncHints
): Promise<BillingOwner | null> {
  // Metadata is written by our own checkout on the server; customers can't change it.
  const meta = subscription.metadata ?? {}
  if (meta.companyId) return { companyId: meta.companyId }
  if (meta.userId) return { userId: meta.userId }
  if (hints.companyId) return { companyId: hints.companyId }
  if (hints.userId) return { userId: hints.userId }
  const known = await prisma.subscription.findFirst({
    where: { OR: [{ stripeSubscriptionId: subscription.id }, { stripeCustomerId: customerId }] },
    select: { userId: true, companyId: true },
  })
  if (known?.companyId) return { companyId: known.companyId }
  if (known?.userId) return { userId: known.userId }
  const customer = await stripe.customers.retrieve(customerId).catch(() => null)
  if (customer && !customer.deleted) {
    if (customer.metadata?.companyId) return { companyId: customer.metadata.companyId }
    if (customer.metadata?.userId) return { userId: customer.metadata.userId }
  }
  return null
}

export async function syncStripeSubscription(
  subscriptionId: string,
  hints: SyncHints = {}
): Promise<SyncOutcome> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = idOf(subscription.customer)
  if (!customerId) return { synced: false, reason: 'no_customer' }

  const owner = await resolveOwner(subscription, customerId, hints)
  if (!owner) {
    Sentry.logger.error('Stripe subscription has no Nexus owner', { subscriptionId, customerId })
    return { synced: false, reason: 'owner_not_found' }
  }

  const status = normalizeStatus(subscription.status)
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const metaPlan = subscription.metadata?.planId
  const plan = planForPriceId(priceId) ?? (isPlan(metaPlan) ? metaPlan : null)
  if (!plan) {
    Sentry.logger.error('Stripe subscription uses a price no plan knows', {
      subscriptionId,
      priceId,
    })
    return { synced: false, reason: 'unknown_price' }
  }

  const where = ownerWhere(owner)
  const existing = await prisma.subscription.findUnique({ where })

  try {
    if (status === 'canceled' || status === 'incomplete_expired') {
      // Only the subscription on file can end the plan; an older one ending changes nothing.
      if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== subscription.id) {
        return { synced: false, reason: 'stale_subscription' }
      }
      const canceledAt = toDate(subscription.ended_at ?? subscription.canceled_at) ?? new Date()
      const ended = {
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        stripePriceId: null,
        plan: 'free',
        status,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt,
        discountEndsAt: null,
        promotionId: null,
      }
      await prisma.subscription.upsert({ where, create: { ...owner, ...ended }, update: ended })
      return { synced: true, owner, plan: 'free', status }
    }

    if (
      existing?.stripeSubscriptionId &&
      existing.stripeSubscriptionId !== subscription.id &&
      isLiveStatus(existing.status)
    ) {
      // Two live subscriptions for one account. Keep the one on file unless Stripe says it ended.
      const onFile = await stripe.subscriptions
        .retrieve(existing.stripeSubscriptionId)
        .catch(() => null)
      if (onFile && isLiveStatus(onFile.status)) {
        Sentry.logger.error('Duplicate Stripe subscription for one account', {
          kept: existing.stripeSubscriptionId,
          duplicate: subscription.id,
          customerId,
        })
        return { synced: false, reason: 'duplicate_subscription' }
      }
    }

    const hasPaid = status === 'active' || status === 'past_due'
    const data = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodStart: toDate(subscription.current_period_start),
      currentPeriodEnd: toDate(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDate(subscription.canceled_at),
      discountEndsAt: toDate(subscription.discount?.end),
      promotionId: subscription.metadata?.promotionId || null,
      firstPaidAt: existing?.firstPaidAt ?? (hasPaid ? new Date() : null),
    }
    await prisma.subscription.upsert({ where, create: { ...owner, ...data }, update: data })
    return { synced: true, owner, plan, status }
  } catch (error) {
    // The account was deleted before Stripe's event arrived: nothing left to update.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return { synced: false, reason: 'owner_deleted' }
    }
    throw error
  }
}
