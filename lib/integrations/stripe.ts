/**
 * Stripe integration: checkout, the billing portal, plan changes, checkout
 * confirmation and webhooks. What plans exist, who may buy them and at what
 * price is decided in lib/plans.ts and lib/billing/*; this file talks to
 * Stripe. Prices always come from the server, never from the request.
 */

import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { assertStripeEnv, assertStripeWebhookEnv } from '@/lib/config/env'
import { PLAN_INFO, formatPlanPrice, normalizePlan, type SubscriptionPlan } from '@/lib/plans'
import { idOf, stripe } from '@/lib/billing/stripe-client'
import { BillingError } from '@/lib/billing/errors'
import { PURCHASE_BLOCK_MESSAGES, priceIdFor, purchasability } from '@/lib/billing/catalog'
import { effectivePlan, isLiveStatus, normalizeStatus } from '@/lib/billing/status'
import { ownerWhere, syncStripeSubscription, type BillingOwner } from '@/lib/billing/sync'
import {
  PromotionUnavailableError,
  attachCheckoutSession,
  cancelReservation,
  confirmRedemption,
  getRunningPromotion,
  promotionEligibility,
  promotionTerms,
  reservePromotion,
  setPromotionCoupon,
  type PromotionRecord,
} from '@/lib/billing/promotions'

export { stripe, BillingError }
export type { SubscriptionPlan }

/** Unpaid checkouts expire after this long, which also frees a held promotion slot. */
const CHECKOUT_MINUTES = 60
const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/

export type CheckoutState = 'confirmed' | 'pending' | 'expired'

class StripeService {
  private webhookEventCache = new Map<string, number>()
  private planChangeConfigurationId: string | null = null

  private async getOrCreateCustomer(owner: BillingOwner): Promise<string> {
    const where = ownerWhere(owner)
    const existing = await prisma.subscription.findUnique({
      where,
      select: { stripeCustomerId: true },
    })
    if (existing?.stripeCustomerId) return existing.stripeCustomerId

    let params: Stripe.CustomerCreateParams
    if ('userId' in owner) {
      const user = await prisma.user.findUnique({
        where: { id: owner.userId },
        select: { email: true, name: true },
      })
      if (!user) throw new Error('User not found for Stripe customer creation')
      params = { email: user.email, name: user.name, metadata: { userId: owner.userId } }
    } else {
      const company = await prisma.company.findUnique({
        where: { id: owner.companyId },
        select: { name: true },
      })
      if (!company) throw new Error('Company not found for Stripe customer creation')
      params = { name: company.name, metadata: { companyId: owner.companyId } }
    }

    // The idempotency key makes a double click reuse one customer instead of creating two.
    const key = 'userId' in owner ? `user-${owner.userId}` : `company-${owner.companyId}`
    const customer = await stripe.customers.create(params, { idempotencyKey: `customer-${key}` })

    try {
      await prisma.subscription.upsert({
        where,
        create: { ...owner, stripeCustomerId: customer.id, plan: 'free', status: 'active' },
        update: { stripeCustomerId: customer.id },
      })
    } catch (error) {
      // A concurrent request saved the same customer first.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error
      }
    }
    return customer.id
  }

  private ensureValidAppUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl)
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:'
      if (!isHttp) throw new Error('Invalid URL protocol')
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('NEXT_PUBLIC_APP_URL must be https in production')
      }
      return parsed.origin
    } catch {
      throw new Error('Invalid NEXT_PUBLIC_APP_URL')
    }
  }

  /** The coupon that applies a promotion: amount off the regular price, for its months. */
  private async ensurePromotionCoupon(promotion: PromotionRecord): Promise<string> {
    const regular = PLAN_INFO[promotion.planId as SubscriptionPlan].price
    const amountOff = regular - promotion.priceCents
    const id = `nexus-${promotion.code}-${amountOff}c-${promotion.durationMonths}m`
    try {
      const coupon = await stripe.coupons.retrieve(id)
      const matches =
        coupon.valid &&
        coupon.amount_off === amountOff &&
        coupon.currency === 'usd' &&
        coupon.duration === 'repeating' &&
        coupon.duration_in_months === promotion.durationMonths
      if (!matches) {
        Sentry.logger.error('Promotion coupon does not match the promotion', { id })
        throw new BillingError(
          'The founding-member offer is paused while we fix a problem.',
          409,
          'promotion_misconfigured'
        )
      }
    } catch (error) {
      if (
        !(
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === 'resource_missing'
        )
      ) {
        throw error
      }
      await stripe.coupons.create({
        id,
        name: promotion.name,
        amount_off: amountOff,
        currency: 'usd',
        duration: 'repeating',
        duration_in_months: promotion.durationMonths,
        metadata: { promotionId: promotion.id },
      })
    }
    if (promotion.stripeCouponId !== id) await setPromotionCoupon(promotion.id, id)
    return id
  }

  /** A Stripe Checkout page for an individual plan, optionally at a promotional price. */
  async createCheckoutSession(input: {
    userId: string
    plan: SubscriptionPlan
    usePromotion: boolean
    baseUrl: string
  }): Promise<{ url: string; promotionApplied: boolean }> {
    assertStripeEnv()
    const { userId, plan } = input
    if (PLAN_INFO[plan].audience !== 'individual') {
      throw new BillingError('This plan is bought by an organization.', 400, 'wrong_audience')
    }
    const sale = await purchasability(plan)
    if (!sale.purchasable) {
      throw new BillingError(PURCHASE_BLOCK_MESSAGES[sale.block!], 409, sale.block!)
    }
    const current = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, status: true },
    })
    if (current?.stripeSubscriptionId && isLiveStatus(current.status)) {
      throw new BillingError(
        'You already have a subscription. Use Manage billing to change or cancel it.',
        409,
        'already_subscribed'
      )
    }

    const priceId = priceIdFor(plan)!
    const base = this.ensureValidAppUrl(input.baseUrl)
    const customerId = await this.getOrCreateCustomer({ userId })
    const expiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60_000)

    let promotion: PromotionRecord | null = null
    let couponId: string | null = null
    let reservationId: string | null = null
    if (input.usePromotion) {
      const running = await getRunningPromotion(plan)
      if (!running) throw new PromotionUnavailableError('This offer has ended.')
      const eligibility = await promotionEligibility(userId, running.promotion)
      if (!eligibility.eligible) throw new PromotionUnavailableError(eligibility.reason)
      couponId = await this.ensurePromotionCoupon(running.promotion)
      reservationId = await reservePromotion(userId, running.promotion, expiresAt)
      promotion = running.promotion
    }

    const metadata: Record<string, string> = { userId, planId: plan }
    if (promotion) metadata.promotionId = promotion.id
    const renewal = `${PLAN_INFO[plan].name} renews at ${formatPlanPrice(PLAN_INFO[plan].price)}/month until you cancel. Cancel any time in Settings.`

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        payment_method_types: ['card'],
        success_url: `${base}/settings?checkout={CHECKOUT_SESSION_ID}#billing`,
        cancel_url: `${base}/pricing?checkout=cancelled`,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        metadata,
        subscription_data: { metadata },
        custom_text: {
          submit: {
            message: promotion ? `Founding member price: ${promotionTerms(promotion)}` : renewal,
          },
        },
        // Stripe Tax must be set up in the Stripe dashboard first (origin
        // address, tax registrations), or checkout fails; hence the switch.
        ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' && {
          automatic_tax: { enabled: true },
          // Tax depends on the customer's address, so collect and save it.
          customer_update: { address: 'auto' as const, name: 'auto' as const },
        }),
      })
      if (!session.url) throw new Error('Stripe returned no checkout URL')
      if (reservationId) await attachCheckoutSession(reservationId, session.id)
      return { url: session.url, promotionApplied: Boolean(promotion) }
    } catch (error) {
      if (reservationId) {
        try {
          await cancelReservation(reservationId)
        } catch {
          // Best effort: an unfreed hold still lapses when its expiry passes.
        }
      }
      console.error('Stripe checkout error:', error)
      throw new BillingError(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'stripe_error'
      )
    }
  }

  /**
   * Whether a finished checkout has really started the plan. The success page
   * asks this instead of trusting the redirect, so nobody is told they've
   * subscribed until Stripe confirms it. Syncing here also covers a webhook
   * that hasn't arrived yet.
   */
  async confirmCheckout(
    userId: string,
    sessionId: string
  ): Promise<{ state: CheckoutState; plan: SubscriptionPlan }> {
    assertStripeEnv()
    if (!CHECKOUT_SESSION_ID.test(sessionId))
      throw new BillingError('Checkout not found', 404, 'not_found')
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const owner = session.client_reference_id ?? session.metadata?.userId
    if (owner !== userId) throw new BillingError('Checkout not found', 404, 'not_found')

    const subscriptionId = idOf(session.subscription)
    if (session.status === 'complete' && subscriptionId) {
      await syncStripeSubscription(subscriptionId, { userId })
      if (session.metadata?.promotionId && session.payment_status === 'paid') {
        await confirmRedemption(session.id, subscriptionId)
      }
    }
    const row = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, currentPeriodStart: true },
    })
    const plan = effectivePlan(row)
    if (session.status === 'expired') return { state: 'expired', plan }
    if (session.status === 'complete' && plan === session.metadata?.planId) {
      return { state: 'confirmed', plan }
    }
    return { state: 'pending', plan }
  }

  /** Stripe's billing portal: payment details, invoices, cancellation. */
  async createBillingPortalSession(userId: string, returnUrl: string): Promise<string> {
    assertStripeEnv()
    const customerId = await this.getOrCreateCustomer({ userId })
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${this.ensureValidAppUrl(returnUrl)}/settings#billing`,
      })
      return session.url
    } catch (error) {
      console.error('Stripe portal error:', error)
      throw new BillingError(
        `Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'stripe_error'
      )
    }
  }

  /**
   * A portal configuration that lets subscribers switch between the
   * individual plans on sale, with prorated charges. Reused when one exists.
   */
  private async planChangeConfiguration(base: string): Promise<string> {
    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID)
      return process.env.STRIPE_PORTAL_CONFIGURATION_ID
    if (this.planChangeConfigurationId) return this.planChangeConfigurationId

    const plans = (['pro', 'career_plus'] as const).filter(
      (plan) => PLAN_INFO[plan].availability === 'available' && priceIdFor(plan)
    )
    const prices = await Promise.all(plans.map((plan) => stripe.prices.retrieve(priceIdFor(plan)!)))
    const byProduct = new Map<string, string[]>()
    for (const price of prices) {
      const product = idOf(price.product)!
      byProduct.set(product, [...(byProduct.get(product) ?? []), price.id])
    }
    const products = Array.from(byProduct, ([product, ids]) => ({ product, prices: ids }))
    const signature = JSON.stringify(products)

    const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
    const reusable = existing.data.find(
      (config) =>
        config.metadata?.nexus === 'plan-changes' && config.metadata?.products === signature
    )
    if (reusable) return (this.planChangeConfigurationId = reusable.id)

    const created = await stripe.billingPortal.configurations.create({
      business_profile: {
        privacy_policy_url: `${base}/privacy`,
        terms_of_service_url: `${base}/terms`,
      },
      features: {
        customer_update: { enabled: true, allowed_updates: ['email', 'address', 'name'] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products,
        },
      },
      metadata: { nexus: 'plan-changes', products: signature.slice(0, 500) },
    })
    return (this.planChangeConfigurationId = created.id)
  }

  /**
   * Upgrade or downgrade between individual plans. Stripe's portal shows the
   * prorated amount and asks the subscriber to confirm; the webhook then
   * updates the plan here. Nothing changes until they confirm.
   */
  async createPlanChangeSession(
    userId: string,
    plan: SubscriptionPlan,
    returnUrl: string
  ): Promise<string> {
    assertStripeEnv()
    if (PLAN_INFO[plan].audience !== 'individual') {
      throw new BillingError('This plan is bought by an organization.', 400, 'wrong_audience')
    }
    const sale = await purchasability(plan)
    if (!sale.purchasable) {
      throw new BillingError(PURCHASE_BLOCK_MESSAGES[sale.block!], 409, sale.block!)
    }
    const current = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true, status: true, plan: true },
    })
    const status = normalizeStatus(current?.status)
    if (
      !current?.stripeSubscriptionId ||
      !current.stripeCustomerId ||
      !['active', 'trialing', 'past_due'].includes(status)
    ) {
      throw new BillingError(
        'You need an active subscription to change plans.',
        409,
        'no_subscription'
      )
    }
    if (normalizePlan(current.plan) === plan) {
      throw new BillingError(`You're already on ${PLAN_INFO[plan].name}.`, 409, 'already_on_plan')
    }

    const base = this.ensureValidAppUrl(returnUrl)
    const subscription = await stripe.subscriptions.retrieve(current.stripeSubscriptionId)
    const item = subscription.items.data[0]
    if (!item)
      throw new BillingError('Your subscription has no plan to change.', 409, 'no_subscription')

    const session = await stripe.billingPortal.sessions.create({
      customer: current.stripeCustomerId,
      configuration: await this.planChangeConfiguration(base),
      return_url: `${base}/settings#billing`,
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: subscription.id,
          items: [{ id: item.id, price: priceIdFor(plan)!, quantity: 1 }],
        },
        after_completion: {
          type: 'redirect',
          redirect: { return_url: `${base}/settings?plan_change=done#billing` },
        },
      },
    })
    return session.url
  }

  private async beginWebhookProcessing(event: Stripe.Event): Promise<boolean> {
    try {
      const existing = await prisma.stripeWebhookEvent.findUnique({
        where: { eventId: event.id },
        select: { id: true, status: true },
      })

      if (!existing) {
        try {
          await prisma.stripeWebhookEvent.create({
            data: {
              eventId: event.id,
              eventType: event.type,
              livemode: event.livemode,
              status: 'processing',
            },
          })
          return false
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return true
          }
          throw error
        }
      }

      if (existing.status === 'processed') {
        return true
      }

      await prisma.stripeWebhookEvent.update({
        where: { id: existing.id },
        data: {
          status: 'processing',
          attempts: { increment: 1 },
          lastError: null,
        },
      })
      return false
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2021' || error.code === 'P2022')
      ) {
        // Fallback so webhook processing works before migration is applied.
        const now = Date.now()
        const ttlMs = 1000 * 60 * 30
        this.webhookEventCache.forEach((ts, id) => {
          if (now - ts > ttlMs) this.webhookEventCache.delete(id)
        })
        if (this.webhookEventCache.has(event.id)) {
          return true
        }
        this.webhookEventCache.set(event.id, now)
        return false
      }
      throw error
    }
  }

  private async markWebhookProcessed(eventId: string): Promise<void> {
    try {
      await prisma.stripeWebhookEvent.update({
        where: { eventId },
        data: {
          status: 'processed',
          processedAt: new Date(),
          lastError: null,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2021' || error.code === 'P2022')
      ) {
        return
      }
      throw error
    }
  }

  private async markWebhookFailed(eventId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error'
    try {
      await prisma.stripeWebhookEvent.update({
        where: { eventId },
        data: {
          status: 'failed',
          lastError: message.slice(0, 2000),
        },
      })
    } catch (dbError) {
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        (dbError.code === 'P2021' || dbError.code === 'P2022')
      ) {
        return
      }
      throw dbError
    }
  }

  /**
   * Verify a webhook's signature, then apply it once. Every subscription and
   * invoice event re-reads the subscription from Stripe (lib/billing/sync.ts),
   * so retries, duplicates and out-of-order delivery all end in Stripe's
   * current state.
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    assertStripeEnv()
    assertStripeWebhookEnv()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string

    let event: Stripe.Event | null = null

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      const shouldSkip = await this.beginWebhookProcessing(event)
      if (shouldSkip) {
        return event
      }

      const handlers = await import('./stripe-webhook-handlers')

      switch (event.type) {
        case 'checkout.session.completed':
          await handlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        case 'checkout.session.expired':
          await handlers.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
          break
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.paused':
        case 'customer.subscription.resumed':
          await handlers.handleSubscriptionChanged(event.data.object as Stripe.Subscription)
          break
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_action_required':
          await handlers.handleInvoiceEvent(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_failed':
          await handlers.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      await this.markWebhookProcessed(event.id)
      return event
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new Error(`Webhook verification failed: ${error.message}`)
      }
      if (event?.id) {
        try {
          await this.markWebhookFailed(event.id, error)
        } catch {
          // Ignore bookkeeping failure and propagate original error.
        }
      }
      console.error('Stripe webhook error:', error)
      throw new Error(
        `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      })
    } catch (error) {
      console.error('Stripe cancel error:', error)
      throw new Error(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

export const stripeService = new StripeService()
