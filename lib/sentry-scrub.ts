/**
 * Shared Sentry privacy filters for client, server and edge configs.
 *
 * Page URLs can carry secrets (password-reset `token`, OAuth `code`/`state`)
 * and personal data (`email`). Strip their values before anything leaves the
 * app, from error events, transactions and breadcrumbs.
 */

import type { Breadcrumb, Event } from '@sentry/nextjs'

const SENSITIVE_PARAM = /([?&#](?:token|code|state|email|password|reset[^=&]*)=)[^&#]*/gi

export function scrubUrl<T extends string | undefined>(url: T): T {
  return (url ? url.replace(SENSITIVE_PARAM, '$1[Filtered]') : url) as T
}

function scrubEvent<E extends Event>(event: E): E {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url)
    event.request.query_string = undefined
    event.request.cookies = undefined
    event.request.data = undefined
  }
  if (event.transaction) event.transaction = scrubUrl(event.transaction)
  if (event.user) {
    // Never forward identity fields even if some integration sets them.
    event.user = event.user.id ? { id: event.user.id } : undefined
  }
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb)
  return event
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  if (crumb.data) {
    for (const key of ['url', 'to', 'from']) {
      const value = crumb.data[key]
      if (typeof value === 'string') crumb.data[key] = scrubUrl(value)
    }
  }
  if (crumb.message) crumb.message = scrubUrl(crumb.message)
  return crumb
}

/** Options to spread into every Sentry.init call. */
export const sentryPrivacyOptions = {
  // Don't attach IP addresses, cookies, headers or user identity.
  sendDefaultPii: false,
  // Generic so each hook keeps Sentry's exact event type (ErrorEvent /
  // TransactionEvent), which @sentry/nextjs doesn't all re-export.
  beforeSend: <E extends Event>(event: E): E => scrubEvent(event),
  beforeSendTransaction: <E extends Event>(event: E): E => scrubEvent(event),
  beforeBreadcrumb: (crumb: Breadcrumb) => scrubBreadcrumb(crumb),
}
