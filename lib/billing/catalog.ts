/**
 * Which plans can be bought right now, and with which Stripe price.
 *
 * A plan is purchasable only when all of these hold:
 * 1. lib/plans.ts marks it 'available' (its features exist and are honest);
 * 2. Stripe is configured, and a live key is used only once someone has
 *    approved live billing (BILLING_LIVE_APPROVED=true);
 * 3. its price id is set for this environment;
 * 4. that Stripe price is active, monthly, in USD and costs exactly what the
 *    pricing page says. A mismatch blocks checkout and is reported, rather
 *    than charging people an amount they weren't shown.
 */

import * as Sentry from '@sentry/nextjs'
import { PLAN_INFO, type SubscriptionPlan } from '@/lib/plans'
import { stripe, stripeMode } from './stripe-client'

/** Environment variable holding each paid plan's Stripe price id. */
export const PRICE_ENV: Record<Exclude<SubscriptionPlan, 'free'>, string> = {
  pro: 'STRIPE_PRO_PRICE_ID',
  career_plus: 'STRIPE_CAREER_PLUS_PRICE_ID',
  business: 'STRIPE_BUSINESS_PRICE_ID',
}

export function priceIdFor(plan: SubscriptionPlan): string | null {
  if (plan === 'free') return null
  return process.env[PRICE_ENV[plan]]?.trim() || null
}

/** The plan a Stripe price belongs to in this environment. */
export function planForPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) return null
  const match = (Object.keys(PRICE_ENV) as Exclude<SubscriptionPlan, 'free'>[]).find(
    (plan) => priceIdFor(plan) === priceId
  )
  return match ?? null
}

export function liveBillingApproved(): boolean {
  return process.env.BILLING_LIVE_APPROVED === 'true'
}

export type PurchaseBlock =
  | 'not_for_sale'
  | 'stripe_not_configured'
  | 'live_mode_not_approved'
  | 'price_not_configured'
  | 'price_mismatch'

export interface Purchasability {
  plan: SubscriptionPlan
  purchasable: boolean
  block: PurchaseBlock | null
}

/** What a visitor is told when they can't buy a plan that should be on sale. */
export const PURCHASE_BLOCK_MESSAGES: Record<PurchaseBlock, string> = {
  not_for_sale: "This plan isn't on sale yet.",
  stripe_not_configured: "Payments aren't set up yet. Please try again soon.",
  live_mode_not_approved: "Payments aren't switched on yet. Please try again soon.",
  price_not_configured: "This plan's price isn't set up yet. Please try again soon.",
  price_mismatch: 'Payments for this plan are paused while we fix a pricing problem.',
}

interface PriceCheck {
  ok: boolean
  expiresAt: number
}

const PRICE_CACHE_MS = 10 * 60_000
/** A failed lookup (Stripe unreachable) is retried sooner than a real mismatch. */
const LOOKUP_FAILURE_CACHE_MS = 60_000
const priceChecks = new Map<string, PriceCheck>()

/** Forget cached price checks (tests, or after changing prices). */
export function resetPriceChecks() {
  priceChecks.clear()
}

async function priceMatches(plan: SubscriptionPlan, priceId: string): Promise<boolean> {
  const cached = priceChecks.get(priceId)
  if (cached && Date.now() < cached.expiresAt) return cached.ok
  let ok = false
  let problem = ''
  let lookupFailed = false
  try {
    const price = await stripe.prices.retrieve(priceId)
    const expected = PLAN_INFO[plan].price
    if (!price.active) problem = 'price is archived'
    else if (price.currency !== 'usd') problem = `currency is ${price.currency}`
    else if (price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1)
      problem = 'price is not monthly'
    else if (price.unit_amount !== expected)
      problem = `price is ${price.unit_amount} cents, pricing page says ${expected}`
    else ok = true
  } catch (error) {
    lookupFailed = true
    problem = error instanceof Error ? error.message : 'price lookup failed'
  }
  if (!ok) {
    Sentry.logger.error('Stripe price does not match the plan', { plan, priceId, problem })
  }
  const ttl = lookupFailed ? LOOKUP_FAILURE_CACHE_MS : PRICE_CACHE_MS
  priceChecks.set(priceId, { ok, expiresAt: Date.now() + ttl })
  return ok
}

export async function purchasability(plan: SubscriptionPlan): Promise<Purchasability> {
  const block = (reason: PurchaseBlock): Purchasability => ({
    plan,
    purchasable: false,
    block: reason,
  })
  if (plan === 'free' || PLAN_INFO[plan].availability !== 'available') return block('not_for_sale')
  const mode = stripeMode()
  if (!mode) return block('stripe_not_configured')
  if (mode === 'live' && !liveBillingApproved()) return block('live_mode_not_approved')
  const priceId = priceIdFor(plan)
  if (!priceId) return block('price_not_configured')
  if (!(await priceMatches(plan, priceId))) return block('price_mismatch')
  return { plan, purchasable: true, block: null }
}
