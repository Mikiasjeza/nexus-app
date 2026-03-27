import * as Sentry from '@sentry/nextjs'
import { getLaunchReadinessIssues } from '@/lib/config/env'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production') {
      const issues = getLaunchReadinessIssues()
      if (issues.length > 0) {
        console.warn(
          `[launch-readiness] Production configuration issues detected: ${issues.join('; ')}`
        )
      }
    }
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
