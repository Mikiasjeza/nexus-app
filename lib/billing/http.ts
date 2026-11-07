/**
 * Shared plumbing for the billing API routes: the app's base URL and one
 * place that turns errors into responses.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { ZodError } from 'zod'
import { dbErrorResponse } from '@/lib/db-error'
import { BillingError } from './errors'
import { PromotionUnavailableError } from './promotions'

/** Where Stripe sends people back to. NEXT_PUBLIC_APP_URL wins over the request's host. */
export function appBaseUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}

export function billingErrorResponse(route: string, error: unknown): NextResponse {
  if (error instanceof BillingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  if (error instanceof PromotionUnavailableError) {
    return NextResponse.json(
      { error: error.message, code: 'promotion_unavailable' },
      { status: error.status }
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Invalid request', code: 'invalid_request' }, { status: 400 })
  }
  const dbErr = dbErrorResponse(error)
  if (dbErr) return dbErr
  Sentry.logger.error('Billing request failed', {
    route,
    gateway: 'stripe',
    errorMessage: error instanceof Error ? error.message : 'unknown',
  })
  return NextResponse.json(
    { error: 'Something went wrong with billing. Please try again.', code: 'billing_error' },
    { status: 500 }
  )
}
