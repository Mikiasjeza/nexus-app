/**
 * Pre-launch ("Coming Soon") mode.
 *
 * Turned on by PRELAUNCH_MODE=true. While on:
 *  - ordinary visitors see the Coming Soon page and the legal/operational
 *    pages listed below; everything else sends them to /coming-soon
 *  - signed-in people only get in if they have pre-launch access: an admin
 *    (ADMIN_EMAILS, confirmed email), someone on PRELAUNCH_ALLOWLIST, or a
 *    customer with a live paid subscription (so nobody loses what they paid for)
 *  - new sign-ups are limited to those same admin/allowlisted emails
 * There is no secret bypass URL: access is decided on the server from the
 * signed-in account. Nothing is deleted; turning the switch off restores
 * everything as it was.
 */

import { adminEmails } from '@/lib/auth/admin'

export function prelaunchEnabled(): boolean {
  return process.env.PRELAUNCH_MODE === 'true'
}

/** Paths anyone can reach while pre-launch mode is on. Prefixes end with "/". */
const PUBLIC_EXACT = new Set([
  '/',
  '/coming-soon',
  '/privacy',
  '/terms',
  '/cookies',
  '/ai',
  '/accessibility',
  '/copyright',
  '/security',
  '/status',
  '/contact',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/icon',
  '/apple-icon',
  '/opengraph-image',
  // Sign-in stays open so admins and existing customers can get in.
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/two-factor',
  // Operational endpoints that check their own secrets or are harmless.
  '/api/health',
  '/api/version',
  '/api/contact',
  '/api/stripe/webhook',
])

const PUBLIC_PREFIXES = [
  '/.well-known/', // security.txt
  '/monitoring', // Sentry tunnel
  '/_vercel/', // Vercel Web Analytics
  '/api/auth/', // login, register, OAuth callbacks, 2FA, password reset
  '/api/cron/', // Vercel Cron, authorized by CRON_SECRET
  '/coming-soon/', // its share image
  '/api/waitlist/', // Coming Soon waitlist: join, confirm, unsubscribe
  '/api/jobs/alerts/unsubscribe', // one-click unsubscribe links in emails
]

export function isPrelaunchPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p))
}

const list = (v: string | undefined) =>
  (v || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

/** Emails allowed to sign up while pre-launch mode is on (admins + allowlist). */
export function prelaunchSignupAllowed(email: string): boolean {
  const e = email.trim().toLowerCase()
  return adminEmails().includes(e) || list(process.env.PRELAUNCH_ALLOWLIST).includes(e)
}

export interface AccessFacts {
  email: string
  emailVerified: boolean
  createdAt: Date
  /** Plans of live subscriptions the person has, directly or through their company. */
  livePaidPlans: string[]
}

/**
 * Who may use the full app while pre-launch mode is on. Pure, so it can be
 * tested; lib/auth/session.ts gathers the facts.
 */
export function decidePrelaunchAccess(f: AccessFacts): boolean {
  const email = f.email.toLowerCase()
  const confirmed = f.emailVerified
  if (adminEmails().includes(email) && confirmed) return true
  if (list(process.env.PRELAUNCH_ALLOWLIST).includes(email) && confirmed) return true
  // Paying customers keep what they bought.
  return f.livePaidPlans.some((p) => p !== 'free')
}

/**
 * The launch date shown on the Coming Soon page, or null. Set LAUNCH_DATE
 * (for example 2027-02-01T17:00:00Z) only once the date is approved; until
 * then the page shows no date and no countdown.
 */
export function approvedLaunchDate(): Date | null {
  const v = process.env.LAUNCH_DATE?.trim()
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
