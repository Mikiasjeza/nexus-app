/**
 * Launch waitlist. Double opt-in: joining stores the email as "pending" and
 * emails a confirmation link; only confirmed, subscribed addresses count and
 * get launch news. Every email has a one-click unsubscribe link. Duplicate
 * signups never create a second row and never reveal whether an email is on
 * the list.
 */

import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email/client'
import { emailDeliveryConfigured } from '@/lib/auth/email-verification'
import { getAppUrl } from '@/lib/config/env'

export const CONSENT_TEXT =
  'Email me when Nexus launches, with occasional launch updates. I can unsubscribe at any time.'

export const joinSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email('Enter a valid email address'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please tick the box to agree.' }) }),
  source: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9_.-]*$/i)
    .optional(),
  /**
   * Honeypot: a hidden field real people never fill in. Accepted here so a
   * bot gets the normal answer; joinWaitlist then quietly drops it.
   */
  website: z.string().max(500).optional(),
})

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')
const newToken = () => randomBytes(24).toString('base64url')
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/

const today = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

async function bump(field: 'views' | 'signups' | 'confirmations') {
  const day = today()
  await prisma.launchStat.upsert({
    where: { day },
    create: { day, [field]: 1 },
    update: { [field]: { increment: 1 } },
  })
}

/** Counts a Coming Soon page view (no personal data). Never throws. */
export async function recordView(): Promise<void> {
  await bump('views').catch(() => {})
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )

async function sendConfirmation(email: string, confirmToken: string, unsubToken: string) {
  if (!emailDeliveryConfigured()) return
  const base = getAppUrl()
  const confirm = `${base}/api/waitlist/confirm?token=${confirmToken}`
  const unsub = `${base}/api/waitlist/unsubscribe?token=${unsubToken}`
  await emailService.sendEmail({
    to: email,
    subject: 'Confirm your spot on the Nexus waitlist',
    html: `<p>Thanks for your interest in Nexus.</p><p><a href="${esc(confirm)}">Confirm your email</a> to join the waitlist. We'll email you when Nexus launches.</p><p style="color:#777;font-size:12px">If you didn't ask for this, ignore this email and you won't hear from us. <a href="${esc(unsub)}">Unsubscribe</a></p>`,
    text: `Thanks for your interest in Nexus.\n\nConfirm your email to join the waitlist:\n${confirm}\n\nIf you didn't ask for this, ignore this email.\nUnsubscribe: ${unsub}`,
  })
}

export type JoinResult = 'ok' | 'spam'

/**
 * Adds or refreshes a signup. Always answers the same way, so the response
 * never reveals whether an email was already on the list.
 */
export async function joinWaitlist(input: z.infer<typeof joinSchema>): Promise<JoinResult> {
  if (input.website) return 'spam' // honeypot filled in: silently ignore
  const existing = await prisma.launchWaitlist.findUnique({
    where: { email: input.email },
    select: { status: true },
  })
  if (existing?.status === 'confirmed') return 'ok' // already in: nothing to do
  const confirmToken = newToken()
  const unsubToken = newToken()
  await prisma.launchWaitlist.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      confirmTokenHash: hashToken(confirmToken),
      unsubscribeTokenHash: hashToken(unsubToken),
      consentText: CONSENT_TEXT,
      source: input.source || 'direct',
    },
    // Pending or unsubscribed: new consent, new links, back to pending.
    update: {
      status: 'pending',
      confirmTokenHash: hashToken(confirmToken),
      unsubscribeTokenHash: hashToken(unsubToken),
      consentText: CONSENT_TEXT,
      consentAt: new Date(),
      unsubscribedAt: null,
    },
  })
  if (!existing) await bump('signups').catch(() => {})
  await sendConfirmation(input.email, confirmToken, unsubToken)
  return 'ok'
}

export async function confirmSignup(token: string): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  const row = await prisma.launchWaitlist.findUnique({
    where: { confirmTokenHash: hashToken(token) },
    select: { id: true, status: true },
  })
  if (!row || row.status === 'unsubscribed') return false
  if (row.status !== 'confirmed') {
    await prisma.launchWaitlist.update({
      where: { id: row.id },
      data: { status: 'confirmed', confirmedAt: new Date(), confirmTokenHash: null },
    })
    await bump('confirmations').catch(() => {})
  }
  return true
}

export async function unsubscribeSignup(token: string): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  const { count } = await prisma.launchWaitlist.updateMany({
    where: { unsubscribeTokenHash: hashToken(token) },
    data: { status: 'unsubscribed', unsubscribedAt: new Date(), confirmTokenHash: null },
  })
  return count > 0
}

/** Numbers for the admin page. */
export async function waitlistStats(days = 30) {
  const since = new Date(today().getTime() - (days - 1) * 86_400_000)
  const [byStatus, stats, sources] = await Promise.all([
    prisma.launchWaitlist.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.launchStat.findMany({ where: { day: { gte: since } }, orderBy: { day: 'asc' } }),
    prisma.launchWaitlist.groupBy({
      by: ['source'],
      where: { status: 'confirmed' },
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
      take: 10,
    }),
  ])
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0
  const views = stats.reduce((a, s) => a + s.views, 0)
  const signups = stats.reduce((a, s) => a + s.signups, 0)
  return {
    confirmed: count('confirmed'),
    pending: count('pending'),
    unsubscribed: count('unsubscribed'),
    period: { days, views, signups, conversion: views ? signups / views : null },
    daily: stats.map((s) => ({
      day: s.day.toISOString().slice(0, 10),
      views: s.views,
      signups: s.signups,
      confirmations: s.confirmations,
    })),
    sources: sources.map((s) => ({ source: s.source ?? 'direct', count: s._count._all })),
  }
}

/** Confirmed, still-subscribed signups as CSV, for an admin export. */
export async function exportConfirmedCsv(): Promise<string> {
  const rows = await prisma.launchWaitlist.findMany({
    where: { status: 'confirmed' },
    orderBy: { confirmedAt: 'asc' },
    select: { email: true, confirmedAt: true, consentAt: true, source: true },
    take: 100_000,
  })
  const cell = (v: string) =>
    /[",\n]/.test(v) || /^[=+\-@]/.test(v)
      ? `"${v.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`
      : v
  return [
    'email,confirmed_at,consent_at,source',
    ...rows.map((r) =>
      [r.email, r.confirmedAt?.toISOString() ?? '', r.consentAt.toISOString(), r.source ?? '']
        .map(cell)
        .join(',')
    ),
  ].join('\n')
}
