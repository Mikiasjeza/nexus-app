/**
 * Stripe integration for subscriptions and billing.
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertStripeEnv, assertStripeWebhookEnv, env } from '@/lib/config/env'

export const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

export interface PlanDetails {
  id: SubscriptionPlan
  name: string
  priceId: string // Stripe Price ID
  price: number // Monthly price in cents
  features: string[]
  limits: {
    skills: number
    aiAnalyses: number
    evidenceUploads: number
  }
}

export const PLANS: Record<SubscriptionPlan, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free',
    priceId: '', // No Stripe price for free plan
    price: 0,
    features: [
      'Up to 5 skills',
      'Basic analytics',
      'Public profile',
    ],
    limits: {
      skills: 5,
      aiAnalyses: 0, // No AI analysis on free plan
      evidenceUploads: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || '', // TODO: Set in .env
    price: 999, // $9.99/month in cents
    features: [
      'Unlimited skills',
      'AI-powered analysis',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      skills: -1, // Unlimited
      aiAnalyses: 50, // Per month
      evidenceUploads: 100,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '', // TODO: Set in .env
    price: 4999, // $49.99/month in cents
    features: [
      'Everything in Pro',
      'Unlimited AI analyses',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
    ],
    limits: {
      skills: -1,
      aiAnalyses: -1, // Unlimited
      evidenceUploads: -1,
    },
  },
}

class StripeService {
  private webhookEventCache = new Map<string, number>()

  private assertConfigured(): void {
    assertStripeEnv()
  }

  private assertPaidPlanPrice(plan: PlanDetails): void {
    if (plan.id !== 'free' && !plan.priceId) {
      throw new Error(`Missing Stripe price id for plan "${plan.id}"`)
    }
  }

  private async getOrCreateCustomer(userId: string): Promise<string> {
    const existing = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    })

    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })

    if (!user) {
      throw new Error('User not found for Stripe customer creation')
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    })

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        plan: 'free',
        status: 'active',
      },
      update: {
        stripeCustomerId: customer.id,
      },
    })

    return customer.id
  }

  private normalizeBaseUrl(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url
  }

  private ensureValidAppUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl)
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:'
      if (!isHttp) throw new Error('Invalid URL protocol')
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('NEXT_PUBLIC_APP_URL must be https in production')
      }
      return this.normalizeBaseUrl(parsed.toString())
    } catch {
      throw new Error('Invalid NEXT_PUBLIC_APP_URL')
    }
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
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
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
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    planId: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    this.assertConfigured()
    const plan = PLANS[planId]
    if (plan.id === 'free') {
      throw new Error('Cannot create checkout session for free plan')
    }
    this.assertPaidPlanPrice(plan)
    const customerId = await this.getOrCreateCustomer(userId)
    const success = this.ensureValidAppUrl(successUrl)
    const cancel = this.ensureValidAppUrl(cancelUrl)

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        success_url: success,
        cancel_url: cancel,
        metadata: {
          userId,
          planId: plan.id,
        },
        // TODO: Add tax calculation
        // automatic_tax: { enabled: true },
      })

      return session.url || ''
    } catch (error) {
      console.error('Stripe checkout error:', error)
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<string> {
    this.assertConfigured()
    const customerId = await this.getOrCreateCustomer(userId)
    const safeReturnUrl = this.ensureValidAppUrl(returnUrl)

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: safeReturnUrl,
      })

      return session.url
    } catch (error) {
      console.error('Stripe portal error:', error)
      throw new Error(`Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    this.assertConfigured()
    assertStripeWebhookEnv()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string

    let event: Stripe.Event | null = null

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      )
      const shouldSkip = await this.beginWebhookProcessing(event)
      if (shouldSkip) {
        return event
      }

      const {
        handleCheckoutCompleted,
        handleSubscriptionUpdated,
        handleSubscriptionDeleted,
        handlePaymentFailed,
      } = await import('./stripe-webhook-handlers')

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        case 'invoice.payment_succeeded':
          // Period updated via subscription.updated
          break
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice)
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
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      })
    } catch (error) {
      console.error('Stripe cancel error:', error)
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const stripeService = new StripeService()
