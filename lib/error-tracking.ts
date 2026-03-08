/**
 * Error tracking integration.
 *
 * Set SENTRY_DSN in .env to enable Sentry.
 * Install: npm install @sentry/nextjs
 *
 * Then run: npx @sentry/wizard@latest -i nextjs
 * Or manually add to next.config.js and instrumentation.ts
 */

let captureException: ((error: unknown) => void) | null = null
let initialized = false

export function initErrorTracking() {
  if (initialized) return
  initialized = true
  if (typeof window !== 'undefined') return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  try {
    const Sentry = require('@sentry/nextjs')
    if (Sentry?.captureException) {
      captureException = (error: unknown) => Sentry.captureException(error)
    }
  } catch {
    // @sentry/nextjs not installed
  }
}

export function reportError(error: unknown) {
  if (!initialized) {
    initErrorTracking()
  }
  if (captureException) {
    captureException(error)
  }
}
