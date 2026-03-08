// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7a3e35930c4c317e018006f3fc868dbb@o4511005851910144.ingest.us.sentry.io/4511005858660352",

  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        'localhost',
        /^\//, // Same-origin (API routes, etc.)
        /^https:\/\/api\.stripe\.com/,
        /^https:\/\/(.*\.)?sentry\.io/,
      ],
      shouldCreateSpanForRequest: (url) => {
        // Exclude health checks and Sentry tunnel from spans
        return !url.match(/\/health\/?$/) && !url.match(/\/monitoring\/?/);
      },
    }),
    Sentry.replayIntegration(),
  ],

  // 100% in dev, 10% in production. Adjust based on traffic volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
