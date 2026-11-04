/**
 * Early-adopter pricing such as "Pro for $6.99/month for the first 12
 * months". Everything about it lives in the database (Promotion), so admins
 * can turn it on, cap it and end it without a deploy; eligibility is decided
 * here, on the server, at checkout.
 *
 * Rules:
 * - It applies only while active, after startsAt and before endsAt.
 * - Each person can redeem a promotion once (unique per promotion and user).
 * - It is for first-time subscribers: anyone who has held a paid plan before
 *   pays the regular price.
 * - maxRedemptions caps it. A checkout in progress holds a slot until its
 *   session expires, and slots are counted under a row lock, so the cap is
 *   exact even when many people check out at once.
 * - Stripe applies it as a coupon for durationMonths, after which the regular
 *   price applies automatically, as checkout says before anyone pays.
 */

import { prisma } from '@/lib/db'
import { PLAN_INFO, formatPlanPrice, type SubscriptionPlan } from '@/lib/plans'

export interface PromotionRecord {
  id: string
  code: string
  name: string
  planId: string
  priceCents: number
  durationMonths: number
  maxRedemptions: number | null
  startsAt: Date | null
  endsAt: Date | null
  active: boolean
  stripeCouponId: string | null
}

/** What the pricing page may show. Only ever sent while the promotion is running. */
export interface PromotionView {
  code: string
  name: string
  plan: SubscriptionPlan
  priceCents: number
  regularPriceCents: number
  durationMonths: number
  endsAt: string | null
  /** Slots left, or null when uncapped. */
  remaining: number | null
  terms: string
}

export class PromotionUnavailableError extends Error {
  readonly status = 409
  constructor(message = 'This offer is no longer available.') {
    super(message)
  }
}

export function promotionTerms(
  promotion: Pick<PromotionRecord, 'planId' | 'priceCents' | 'durationMonths'>
) {
  const plan = PLAN_INFO[promotion.planId as SubscriptionPlan]
  return `${formatPlanPrice(promotion.priceCents)}/month for your first ${promotion.durationMonths} months, then ${formatPlanPrice(plan.price)}/month until you cancel. For first-time subscribers, once per person.`
}

export function isRunning(promotion: PromotionRecord, now: Date = new Date()): boolean {
  if (!promotion.active) return false
  if (promotion.startsAt && promotion.startsAt.getTime() > now.getTime()) return false
  if (promotion.endsAt && promotion.endsAt.getTime() <= now.getTime()) return false
  return (
    promotion.planId in PLAN_INFO &&
    promotion.priceCents < PLAN_INFO[promotion.planId as SubscriptionPlan].price
  )
}

/** Redeemed slots plus checkouts still holding one, optionally not counting one person. */
async function slotsTaken(
  db: Pick<typeof prisma, 'promotionRedemption'>,
  promotionId: string,
  now: Date,
  exceptUserId?: string
): Promise<number> {
  return db.promotionRedemption.count({
    where: {
      promotionId,
      ...(exceptUserId ? { userId: { not: exceptUserId } } : {}),
      OR: [{ status: 'redeemed' }, { status: 'pending', expiresAt: { gt: now } }],
    },
  })
}

/** The running promotion for a plan, with the slots it has left. */
export async function getRunningPromotion(
  plan: SubscriptionPlan,
  now: Date = new Date()
): Promise<{ promotion: PromotionRecord; remaining: number | null } | null> {
  const candidates = await prisma.promotion.findMany({
    where: { planId: plan, active: true },
    orderBy: { createdAt: 'asc' },
  })
  for (const promotion of candidates) {
    if (!isRunning(promotion, now)) continue
    if (promotion.maxRedemptions === null) return { promotion, remaining: null }
    const remaining = promotion.maxRedemptions - (await slotsTaken(prisma, promotion.id, now))
    if (remaining > 0) return { promotion, remaining }
  }
  return null
}

export function promotionView(promotion: PromotionRecord, remaining: number | null): PromotionView {
  const plan = promotion.planId as SubscriptionPlan
  return {
    code: promotion.code,
    name: promotion.name,
    plan,
    priceCents: promotion.priceCents,
    regularPriceCents: PLAN_INFO[plan].price,
    durationMonths: promotion.durationMonths,
    endsAt: promotion.endsAt?.toISOString() ?? null,
    remaining,
    terms: promotionTerms(promotion),
  }
}

export type Eligibility = { eligible: true } | { eligible: false; reason: string }

/** Whether this person may use this promotion now. */
export async function promotionEligibility(
  userId: string,
  promotion: PromotionRecord,
  now: Date = new Date()
): Promise<Eligibility> {
  if (!isRunning(promotion, now)) return { eligible: false, reason: 'This offer has ended.' }
  const [redemption, subscription] = await Promise.all([
    prisma.promotionRedemption.findUnique({
      where: { promotionId_userId: { promotionId: promotion.id, userId } },
      select: { status: true },
    }),
    prisma.subscription.findUnique({ where: { userId }, select: { firstPaidAt: true } }),
  ])
  if (redemption?.status === 'redeemed') {
    return { eligible: false, reason: "You've already used this offer." }
  }
  if (subscription?.firstPaidAt) {
    return { eligible: false, reason: 'This offer is for first-time subscribers.' }
  }
  if (promotion.maxRedemptions !== null) {
    const taken = await slotsTaken(prisma, promotion.id, now, userId)
    if (taken >= promotion.maxRedemptions) {
      return { eligible: false, reason: 'All founding-member places have been taken.' }
    }
  }
  return { eligible: true }
}

/**
 * Holds a slot for a checkout until `expiresAt`. Reuses this person's earlier
 * row (an abandoned checkout), so the unique constraint still means once each.
 */
export async function reservePromotion(
  userId: string,
  promotion: PromotionRecord,
  expiresAt: Date,
  now: Date = new Date()
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Serialize reservations for this promotion so the cap can't be overshot.
    await tx.$queryRaw`SELECT "id" FROM "Promotion" WHERE "id" = ${promotion.id} FOR UPDATE`
    const existing = await tx.promotionRedemption.findUnique({
      where: { promotionId_userId: { promotionId: promotion.id, userId } },
    })
    if (existing?.status === 'redeemed') {
      throw new PromotionUnavailableError("You've already used this offer.")
    }
    if (promotion.maxRedemptions !== null) {
      const taken = await slotsTaken(tx, promotion.id, now, userId)
      if (taken >= promotion.maxRedemptions) {
        throw new PromotionUnavailableError('All founding-member places have been taken.')
      }
    }
    const data = {
      status: 'pending',
      expiresAt,
      checkoutSessionId: null,
      stripeSubscriptionId: null,
    }
    const row = existing
      ? await tx.promotionRedemption.update({ where: { id: existing.id }, data })
      : await tx.promotionRedemption.create({
          data: { ...data, promotionId: promotion.id, userId },
        })
    return row.id
  })
}

export async function attachCheckoutSession(redemptionId: string, checkoutSessionId: string) {
  await prisma.promotionRedemption.update({
    where: { id: redemptionId },
    data: { checkoutSessionId },
  })
}

/** Frees a held slot when checkout couldn't be created. */
export async function cancelReservation(redemptionId: string) {
  await prisma.promotionRedemption.updateMany({
    where: { id: redemptionId, status: 'pending' },
    data: { status: 'expired', expiresAt: new Date() },
  })
}

/** Checkout completed: the slot becomes a redemption. Idempotent. */
export async function confirmRedemption(
  checkoutSessionId: string,
  stripeSubscriptionId: string | null
) {
  await prisma.promotionRedemption.updateMany({
    where: { checkoutSessionId, status: { not: 'redeemed' } },
    data: { status: 'redeemed', redeemedAt: new Date(), stripeSubscriptionId },
  })
}

/** Checkout expired unpaid: the slot is free again. */
export async function expireRedemption(checkoutSessionId: string) {
  await prisma.promotionRedemption.updateMany({
    where: { checkoutSessionId, status: 'pending' },
    data: { status: 'expired' },
  })
}

export async function setPromotionCoupon(promotionId: string, stripeCouponId: string) {
  await prisma.promotion.update({ where: { id: promotionId }, data: { stripeCouponId } })
}
