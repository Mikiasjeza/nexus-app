/**
 * Subscription status rules: which Stripe statuses grant a paid plan, and
 * which still have a Stripe subscription behind them that can bill.
 */

import { normalizePlan, type SubscriptionPlan } from '@/lib/plans'

export type BillingStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'paused'

const KNOWN: BillingStatus[] = [
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'canceled',
  'paused',
]

/** Unknown statuses grant nothing: they read as incomplete. */
export function normalizeStatus(value: string | null | undefined): BillingStatus {
  return KNOWN.includes(value as BillingStatus) ? (value as BillingStatus) : 'incomplete'
}

/**
 * A Stripe subscription in one of these states can still bill or needs the
 * customer to act, so nobody may start a second one alongside it.
 */
export const LIVE_STATUSES: BillingStatus[] = [
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]

export function isLiveStatus(status: string | null | undefined): boolean {
  return LIVE_STATUSES.includes(normalizeStatus(status))
}

/** After a failed renewal, paid features stay on this long while Stripe retries the card. */
export const PAST_DUE_GRACE_DAYS = 14

export interface SubscriptionState {
  plan: string
  status: string
  currentPeriodStart?: Date | null
}

/**
 * The plan whose features and limits apply right now. Active and trialing
 * subscriptions get their plan; a past-due one keeps it for the grace period
 * after the failed renewal; everything else is Free.
 */
export function effectivePlan(
  subscription: SubscriptionState | null | undefined,
  now: Date = new Date()
): SubscriptionPlan {
  if (!subscription) return 'free'
  const plan = normalizePlan(subscription.plan)
  const status = normalizeStatus(subscription.status)
  if (status === 'active' || status === 'trialing') return plan
  if (status === 'past_due' && subscription.currentPeriodStart) {
    const graceEnds = subscription.currentPeriodStart.getTime() + PAST_DUE_GRACE_DAYS * 86_400_000
    return now.getTime() <= graceEnds ? plan : 'free'
  }
  return 'free'
}
