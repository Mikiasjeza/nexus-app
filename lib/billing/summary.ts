/**
 * What the pricing page and the billing dashboard show, assembled from the
 * real subscription, usage and promotion records. Nothing here is computed
 * in the browser.
 */

import { prisma } from '@/lib/db'
import {
  PLAN_INFO,
  PLAN_ORDER,
  normalizePlan,
  type Entitlement,
  type SubscriptionPlan,
} from '@/lib/plans'
import { PURCHASE_BLOCK_MESSAGES, purchasability, type PurchaseBlock } from './catalog'
import {
  PAST_DUE_GRACE_DAYS,
  effectivePlan,
  isLiveStatus,
  normalizeStatus,
  type BillingStatus,
} from './status'
import {
  getRunningPromotion,
  promotionEligibility,
  promotionView,
  type PromotionView,
} from './promotions'
import { getAllowanceSummary, usageHistory, type AllowanceSummary, type UsageMonth } from './usage'
import { usageWindow } from './period'

export interface PlanOffer {
  id: SubscriptionPlan
  purchasable: boolean
  block: PurchaseBlock | null
  /** Why it can't be bought, in words a visitor understands. */
  note: string | null
}

export async function planOffers(): Promise<PlanOffer[]> {
  return Promise.all(
    PLAN_ORDER.map(async (id): Promise<PlanOffer> => {
      if (id === 'free') return { id, purchasable: false, block: null, note: null }
      const sale = await purchasability(id)
      return {
        id,
        purchasable: sale.purchasable,
        block: sale.block,
        note: sale.block ? PURCHASE_BLOCK_MESSAGES[sale.block] : null,
      }
    })
  )
}

/** The running offer, or null. Never throws: the pricing page must load regardless. */
export async function runningOffer(plan: SubscriptionPlan = 'pro'): Promise<PromotionView | null> {
  try {
    const running = await getRunningPromotion(plan)
    return running ? promotionView(running.promotion, running.remaining) : null
  } catch (error) {
    console.error('Promotion lookup failed:', error)
    return null
  }
}

export interface SubscriptionView {
  /** The plan on the subscription; see ViewerBilling.plan for what applies now. */
  plan: SubscriptionPlan
  status: BillingStatus
  hasStripeSubscription: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  /** What they pay per month right now. */
  priceCents: number
  regularPriceCents: number
  promotion: { name: string; priceCents: number; endsAt: string | null } | null
  pastDue: boolean
  graceEndsAt: string | null
}

export interface ViewerBilling {
  /** The plan whose features and limits apply now. */
  plan: SubscriptionPlan
  subscription: SubscriptionView | null
  allowance: AllowanceSummary | null
  promotion: { eligible: boolean; reason: string | null } | null
  /** Plans not on sale yet that this person asked to hear about. */
  waitlist: SubscriptionPlan[]
}

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null

async function subscriptionView(userId: string, now: Date): Promise<SubscriptionView | null> {
  const row = await prisma.subscription.findUnique({ where: { userId } })
  if (!row) return null
  const plan = normalizePlan(row.plan)
  const status = normalizeStatus(row.status)
  const regular = PLAN_INFO[plan].price
  const promo =
    row.promotionId && row.discountEndsAt && row.discountEndsAt.getTime() > now.getTime()
      ? await prisma.promotion.findUnique({
          where: { id: row.promotionId },
          select: { name: true, priceCents: true },
        })
      : null
  const pastDue = status === 'past_due'
  return {
    plan,
    status,
    hasStripeSubscription: Boolean(row.stripeSubscriptionId) && isLiveStatus(status),
    currentPeriodStart: iso(row.currentPeriodStart),
    currentPeriodEnd: iso(row.currentPeriodEnd),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    canceledAt: iso(row.canceledAt),
    priceCents: promo ? promo.priceCents : regular,
    regularPriceCents: regular,
    promotion: promo ? { ...promo, endsAt: iso(row.discountEndsAt) } : null,
    pastDue,
    graceEndsAt:
      pastDue && row.currentPeriodStart
        ? new Date(
            row.currentPeriodStart.getTime() + PAST_DUE_GRACE_DAYS * 86_400_000
          ).toISOString()
        : null,
  }
}

/** The signed-in visitor's plan, allowance and offer eligibility, for the pricing page. */
export async function viewerBilling(
  userId: string,
  now: Date = new Date()
): Promise<ViewerBilling> {
  const subscription = await subscriptionView(userId, now)
  const plan = subscription
    ? effectivePlan(
        {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart
            ? new Date(subscription.currentPeriodStart)
            : null,
        },
        now
      )
    : 'free'

  let allowance: AllowanceSummary | null = null
  try {
    allowance = await getAllowanceSummary(userId, now)
  } catch (error) {
    // Usage tables not migrated yet: show the plan without the allowance.
    console.error('Allowance lookup failed:', error)
  }

  let promotion: ViewerBilling['promotion'] = null
  try {
    const running = await getRunningPromotion('pro', now)
    if (running) {
      const eligibility = await promotionEligibility(userId, running.promotion, now)
      promotion = eligibility.eligible
        ? { eligible: true, reason: null }
        : { eligible: false, reason: eligibility.reason }
    }
  } catch (error) {
    console.error('Promotion eligibility failed:', error)
  }

  const waitlist = await prisma.waitlistEntry
    .findMany({ where: { userId }, select: { plan: true } })
    .then((rows) => rows.map((r) => normalizePlan(r.plan)))
    .catch(() => [] as SubscriptionPlan[])

  return { plan, subscription, allowance, promotion, waitlist }
}

export interface BillingSummary extends ViewerBilling {
  history: UsageMonth[]
  aiVerifications: { used: number; limit: number }
  entitlements: Entitlement[]
}

/** Everything the billing section of Settings shows. */
export async function billingSummary(
  userId: string,
  now: Date = new Date()
): Promise<BillingSummary> {
  const viewer = await viewerBilling(userId, now)
  const [history, aiUsed] = await Promise.all([
    usageHistory(userId, 6, now).catch(() => []),
    prisma.aIAnalysis.count({ where: { userId, createdAt: { gte: usageWindow(now).start } } }),
  ])
  return {
    ...viewer,
    history,
    aiVerifications: { used: aiUsed, limit: PLAN_INFO[viewer.plan].limits.aiAnalyses },
    entitlements: PLAN_INFO[viewer.plan].entitlements,
  }
}
