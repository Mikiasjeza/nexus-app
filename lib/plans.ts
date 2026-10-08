/**
 * Plan catalogue shared by the pricing page (client) and billing/quota code
 * (server). Client-safe: no secrets, no Stripe SDK.
 *
 * `price` MUST equal the amount on the matching Stripe Price
 * (STRIPE_PRO_PRICE_ID / STRIPE_ENTERPRISE_PRICE_ID) — the pricing page shows
 * this number, Stripe charges the other one. `features` must only list things
 * the product actually does and enforces today.
 */

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

export interface PlanInfo {
  id: SubscriptionPlan
  name: string
  price: number // Monthly price in cents
  description: string
  features: string[]
  limits: {
    skills: number // -1 = unlimited. Not enforced anywhere: enforce in POST /api/skills before lowering.
    aiAnalyses: number // Per calendar month, -1 = unlimited. Enforced in /api/ai/analyze.
    evidenceUploads: number
  }
}

export const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Build your skill passport and try AI verification.',
    features: [
      '10 AI verifications per month',
      'Skill passport and progress tracking',
      'Optional public profile link',
      'Download or delete your data any time',
    ],
    limits: {
      skills: -1,
      aiAnalyses: 10,
      evidenceUploads: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    description: 'For professionals actively verifying their skills.',
    features: ['Everything in Free', '50 AI verifications per month', 'Priority email support'],
    limits: {
      skills: -1,
      aiAnalyses: 50,
      evidenceUploads: 100,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    description: 'For heavy usage and teams.',
    features: ['Everything in Pro', 'Unlimited AI verifications', 'Dedicated support contact'],
    limits: {
      skills: -1,
      aiAnalyses: -1,
      evidenceUploads: -1,
    },
  },
}

export function formatPlanPrice(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
}
