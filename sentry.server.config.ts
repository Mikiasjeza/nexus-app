// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { sentryPrivacyOptions } from '@/lib/sentry-scrub'

Sentry.init({
  dsn: 'https://7a3e35930c4c317e018006f3fc868dbb@o4511005851910144.ingest.us.sentry.io/4511005858660352',

  // 100% in dev, 10% in production. Adjust based on traffic volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Privacy: no IPs/cookies/headers, and secrets/emails scrubbed from URLs.
  ...sentryPrivacyOptions,
})
