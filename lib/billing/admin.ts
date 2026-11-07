/**
 * Billing administration: the overview admins see, promotion controls, and
 * the daily health check (spending, webhooks, prices). Callers must check
 * the admin list first (requireReviewer in lib/assessments/http.ts).
 */

import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db'
import { normalizePlan } from '@/lib/plans'
import { liveBillingApproved } from './catalog'
import { stripeMode } from './stripe-client'
import { usageWindow } from './period'
import { planOffers } from './summary'

/** Optional monthly AI budget in USD (AI_MONTHLY_BUDGET_USD); alerts fire at 80% and 100%. */
export function aiMonthlyBudget(): number | null {
  const n = Number(process.env.AI_MONTHLY_BUDGET_USD)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Estimated AI spend this month: assessment grading plus evidence verification. */
export async function aiSpendThisMonth(now: Date = new Date()) {
  const since = usageWindow(now).start
  const [grading, verification] = await Promise.all([
    prisma.assessmentEvaluation.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { aiCostUsd: true },
      _count: { _all: true },
    }),
    prisma.aIAnalysis.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { cost: true },
      _count: { _all: true },
    }),
  ])
  const gradingUsd = grading._sum.aiCostUsd ?? 0
  const verificationUsd = verification._sum.cost ?? 0
  return {
    gradingUsd,
    gradingCalls: grading._count._all,
    verificationUsd,
    verificationCalls: verification._count._all,
    totalUsd: gradingUsd + verificationUsd,
  }
}

export async function billingOverview(now: Date = new Date()) {
  const window = usageWindow(now)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const [
    subscriptions,
    promotions,
    redemptions,
    usage,
    atLimit,
    waitlist,
    failedWebhooks,
    recentFailures,
    spend,
    offers,
  ] = await Promise.all([
    prisma.subscription.groupBy({ by: ['plan', 'status'], _count: { _all: true } }),
    prisma.promotion.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.promotionRedemption.groupBy({ by: ['promotionId', 'status'], _count: { _all: true } }),
    prisma.usagePeriod.aggregate({
      where: { periodStart: window.start, userId: { not: null } },
      _sum: { formalUsed: true, formalStarted: true, practiceRounds: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "UsagePeriod"
        WHERE "periodStart" = ${window.start} AND "formalLimit" > 0 AND "formalUsed" >= "formalLimit"`,
    prisma.waitlistEntry.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.stripeWebhookEvent.count({ where: { status: 'failed', updatedAt: { gte: weekAgo } } }),
    prisma.stripeWebhookEvent.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { eventType: true, lastError: true, attempts: true, updatedAt: true },
    }),
    aiSpendThisMonth(now),
    planOffers(),
  ])

  const budget = aiMonthlyBudget()
  return {
    periodStart: window.start.toISOString(),
    config: {
      stripeMode: stripeMode(),
      liveBillingApproved: liveBillingApproved(),
      plans: offers,
    },
    subscriptions: subscriptions
      .filter((row) => row.plan !== 'free')
      .map((row) => ({
        plan: normalizePlan(row.plan),
        status: row.status,
        count: row._count._all,
      })),
    promotions: promotions.map((promotion) => {
      const count = (status: string) =>
        redemptions.find((r) => r.promotionId === promotion.id && r.status === status)?._count
          ._all ?? 0
      return {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        plan: normalizePlan(promotion.planId),
        priceCents: promotion.priceCents,
        durationMonths: promotion.durationMonths,
        maxRedemptions: promotion.maxRedemptions,
        startsAt: promotion.startsAt?.toISOString() ?? null,
        endsAt: promotion.endsAt?.toISOString() ?? null,
        active: promotion.active,
        stripeCouponId: promotion.stripeCouponId,
        redeemed: count('redeemed'),
        pending: count('pending'),
      }
    }),
    usage: {
      accounts: usage._count._all,
      formalUsed: usage._sum.formalUsed ?? 0,
      formalStarted: usage._sum.formalStarted ?? 0,
      practiceRounds: usage._sum.practiceRounds ?? 0,
      accountsAtLimit: Number(atLimit[0]?.count ?? 0),
    },
    ai: { ...spend, budgetUsd: budget, budgetShare: budget ? spend.totalUsd / budget : null },
    waitlist: waitlist.map((row) => ({ plan: normalizePlan(row.plan), count: row._count._all })),
    webhooks: {
      failedLastWeek: failedWebhooks,
      recentFailures: recentFailures.map((f) => ({
        eventType: f.eventType,
        lastError: f.lastError,
        attempts: f.attempts,
        at: f.updatedAt.toISOString(),
      })),
    },
  }
}

export type BillingOverview = Awaited<ReturnType<typeof billingOverview>>

export interface PromotionPatch {
  active?: boolean
  startsAt?: string | null
  endsAt?: string | null
  maxRedemptions?: number | null
}

/** Admin changes to a promotion, written to the audit log. */
export async function updatePromotion(id: string, patch: PromotionPatch, actor: string) {
  const data: Record<string, unknown> = {}
  if (patch.active !== undefined) data.active = patch.active
  if (patch.startsAt !== undefined) data.startsAt = patch.startsAt ? new Date(patch.startsAt) : null
  if (patch.endsAt !== undefined) data.endsAt = patch.endsAt ? new Date(patch.endsAt) : null
  if (patch.maxRedemptions !== undefined) data.maxRedemptions = patch.maxRedemptions
  const updated = await prisma.promotion.update({ where: { id }, data })
  await prisma.auditLog.create({
    data: {
      actor,
      action: 'promotion.updated',
      targetType: 'promotion',
      targetId: id,
      data: JSON.parse(JSON.stringify(patch)),
    },
  })
  return updated
}

/**
 * The daily billing check (app/api/cron/billing-check): alerts on AI spend,
 * failing webhooks and prices that no longer match, and frees promotion
 * slots held by checkouts that lapsed without a webhook.
 */
export async function runBillingCheck(now: Date = new Date()) {
  const alerts: string[] = []
  const budget = aiMonthlyBudget()
  const spend = await aiSpendThisMonth(now)
  if (budget) {
    const share = spend.totalUsd / budget
    if (share >= 1)
      alerts.push(`AI spend $${spend.totalUsd.toFixed(2)} is over the $${budget} monthly budget`)
    else if (share >= 0.8)
      alerts.push(
        `AI spend $${spend.totalUsd.toFixed(2)} is ${Math.round(share * 100)}% of the $${budget} budget`
      )
  }
  const dayAgo = new Date(now.getTime() - 86_400_000)
  const failed = await prisma.stripeWebhookEvent.count({
    where: { status: 'failed', updatedAt: { gte: dayAgo } },
  })
  if (failed > 0) alerts.push(`${failed} Stripe webhook events failed in the last day`)
  const offers = await planOffers()
  for (const offer of offers) {
    if (offer.block === 'price_mismatch')
      alerts.push(`Stripe price for ${offer.id} does not match the pricing page`)
  }
  const expired = await prisma.promotionRedemption.updateMany({
    where: { status: 'pending', expiresAt: { lt: now } },
    data: { status: 'expired' },
  })
  for (const alert of alerts) Sentry.logger.error('Billing check alert', { alert })
  return {
    alerts,
    aiSpendUsd: spend.totalUsd,
    failedWebhooks: failed,
    expiredReservations: expired.count,
  }
}
