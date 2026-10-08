// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Privacy: no PII, URLs scrubbed (lib/sentry-scrub.ts), and Session Replay is
// only loaded after the visitor opts in to the "analytics" cookie category.

import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "@/lib/sentry-scrub";
import { CONSENT_CHANGED_EVENT, hasConsent, type ConsentChoices } from "@/lib/consent";

Sentry.init({
  dsn: "https://7a3e35930c4c317e018006f3fc868dbb@o4511005851910144.ingest.us.sentry.io/4511005858660352",

  ...sentryPrivacyOptions,

  // Only add tracing headers to our own API, never to third parties.
  tracePropagationTargets: ['localhost', /^\//],

  integrations: [
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) => {
        // Exclude health checks and Sentry tunnel from spans
        return !url.match(/\/health\/?$/) && !url.match(/\/monitoring\/?/);
      },
    }),
  ],

  // 100% in dev, 10% in production. Adjust based on traffic volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Never record whole sessions. With consent, keep a masked replay buffer and
  // send it only when an error happens.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

function enableReplay() {
  if (Sentry.getReplay()) return;
  Sentry.addIntegration(
    Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })
  );
}

if (hasConsent('analytics')) enableReplay();

window.addEventListener(CONSENT_CHANGED_EVENT, (event) => {
  const choices = (event as CustomEvent<ConsentChoices>).detail;
  if (choices.analytics) enableReplay();
  else void Sentry.getReplay()?.stop();
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
