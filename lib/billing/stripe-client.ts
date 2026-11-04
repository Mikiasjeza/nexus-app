/**
 * The one Stripe client. Server-only: it holds the secret key.
 */

import Stripe from 'stripe'
import { env } from '@/lib/config/env'

export const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
})

/** Which Stripe mode the configured secret key belongs to, if any. */
export function stripeMode(key = process.env.STRIPE_SECRET_KEY || ''): 'test' | 'live' | null {
  if (/^(sk|rk)_live_/.test(key)) return 'live'
  if (/^(sk|rk)_test_/.test(key)) return 'test'
  return null
}

/** Stripe ids arrive either as strings or as expanded objects. */
export function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}
