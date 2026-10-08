/**
 * Cookie consent state (client-only).
 *
 * Non-essential categories default to OFF and stay off until the visitor
 * explicitly opts in. Any future analytics/marketing SDK MUST be gated on
 * `hasConsent('analytics')` and should listen for CONSENT_CHANGED_EVENT so it
 * can load (or tear down) when the visitor changes their mind.
 */

import { CONSENT_VERSION, type CookieCategory } from '@/lib/legal'

const STORAGE_KEY = 'nexus-cookie-consent'
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export const CONSENT_CHANGED_EVENT = 'nexus:consent-changed'
export const OPEN_PREFERENCES_EVENT = 'nexus:open-cookie-preferences'

export type ConsentChoices = Record<Exclude<CookieCategory, 'essential'>, boolean>

type StoredConsent = {
  version: number
  decidedAt: string
  choices: ConsentChoices
}

export const DEFAULT_CHOICES: ConsentChoices = { analytics: false }

export function readConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    const expired = Date.now() - new Date(parsed.decidedAt).getTime() > MAX_AGE_MS
    if (parsed.version !== CONSENT_VERSION || expired) return null
    return parsed
  } catch {
    return null
  }
}

export function saveConsent(choices: ConsentChoices): void {
  const value: StoredConsent = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    choices,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    // Clean up keys written by the previous banner implementation.
    window.localStorage.removeItem('cookie-consent')
    window.localStorage.removeItem('cookie-consent-date')
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: choices }))
}

export function hasConsent(category: CookieCategory): boolean {
  if (category === 'essential') return true
  return readConsent()?.choices[category] === true
}

export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))
}
