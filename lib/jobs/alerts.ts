/**
 * Personalized job alerts. People pick roles, locations, minimum salary,
 * job types and how often (daily or weekly). After each daily job sync,
 * due alerts email the new matching jobs they haven't been sent before.
 * Every email has a one-click unsubscribe link.
 */

import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email/client'
import { emailDeliveryConfigured } from '@/lib/auth/email-verification'
import { getAppUrl } from '@/lib/config/env'
import { notify } from '@/lib/notifications'

const DAY = 86_400_000
export const MAX_ALERTS = 5
const PER_EMAIL = 10

const textList = (maxItems: number) =>
  z
    .array(z.string().trim().min(1).max(100))
    .max(maxItems)
    .transform((l) => Array.from(new Set(l)))

export const alertSchema = z.object({
  roles: textList(10),
  locations: textList(10).default([]),
  salaryMin: z.number().int().min(0).max(2_000_000).nullable().default(null),
  jobTypes: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'internship']))
    .max(4)
    .default([]),
  remoteOnly: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly']).default('weekly'),
  enabled: z.boolean().default(true),
})

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')

export class AlertError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export async function createAlert(userId: string, input: unknown) {
  const data = alertSchema.parse(input)
  if (data.roles.length === 0 && data.locations.length === 0) {
    throw new AlertError('Add at least one role or location.')
  }
  if ((await prisma.jobAlert.count({ where: { userId } })) >= MAX_ALERTS) {
    throw new AlertError(`You can have up to ${MAX_ALERTS} alerts.`)
  }
  // The raw token is only ever in the emailed link; we keep its hash.
  return prisma.jobAlert.create({
    data: { ...data, userId, unsubscribeToken: hashToken(randomBytes(24).toString('base64url')) },
    select: alertSelect,
  })
}

const alertSelect = {
  id: true,
  roles: true,
  locations: true,
  salaryMin: true,
  jobTypes: true,
  remoteOnly: true,
  frequency: true,
  enabled: true,
  lastSentAt: true,
} as const

export function listAlerts(userId: string) {
  return prisma.jobAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: alertSelect,
  })
}

export async function updateAlert(userId: string, id: string, input: unknown) {
  const data = alertSchema.partial().parse(input)
  const { count } = await prisma.jobAlert.updateMany({ where: { id, userId }, data })
  if (count === 0) throw new AlertError('Not found', 404)
}

export async function deleteAlert(userId: string, id: string) {
  const { count } = await prisma.jobAlert.deleteMany({ where: { id, userId } })
  if (count === 0) throw new AlertError('Not found', 404)
}

/** One-click unsubscribe from an email link. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false
  const { count } = await prisma.jobAlert.updateMany({
    where: { unsubscribeToken: hashToken(token) },
    data: { enabled: false },
  })
  return count > 0
}

type AlertRow = Prisma.JobAlertGetPayload<{
  include: { user: { select: { email: true; name: true } } }
}>

/** The filter for jobs an alert wants, new since `since`. */
export function alertWhere(
  alert: Pick<AlertRow, 'roles' | 'locations' | 'salaryMin' | 'jobTypes' | 'remoteOnly'>,
  since: Date
): Prisma.ExternalJobWhereInput {
  const and: Prisma.ExternalJobWhereInput[] = [{ active: true }, { firstSeenAt: { gt: since } }]
  if (alert.roles.length) {
    and.push({
      OR: alert.roles.map((r) => ({ title: { contains: r, mode: 'insensitive' as const } })),
    })
  }
  if (alert.remoteOnly) and.push({ remote: true })
  else if (alert.locations.length) {
    and.push({
      OR: [
        { remote: true },
        ...alert.locations.map((l) => ({
          location: { contains: l.split(',')[0].trim(), mode: 'insensitive' as const },
        })),
      ],
    })
  }
  if (alert.jobTypes.length) and.push({ employmentType: { in: alert.jobTypes } })
  if (alert.salaryMin)
    and.push({ OR: [{ salaryMax: { gte: alert.salaryMin } }, { salaryMax: null }] })
  return { AND: and }
}

export function isDue(alert: { frequency: string; lastSentAt: Date | null }, now: Date): boolean {
  if (!alert.lastSentAt) return true
  const gap = alert.frequency === 'daily' ? 0.9 * DAY : 6.5 * DAY
  return now.getTime() - alert.lastSentAt.getTime() >= gap
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )

/** Sends every due alert. Returns how many emails went out. */
export async function sendDueAlerts(now = new Date()): Promise<{ sent: number; skipped: number }> {
  if (!emailDeliveryConfigured()) return { sent: 0, skipped: 0 }
  const alerts = await prisma.jobAlert.findMany({
    where: { enabled: true },
    include: { user: { select: { email: true, name: true } } },
    take: 2000,
  })
  let sent = 0
  let skipped = 0
  const base = getAppUrl()
  for (const alert of alerts) {
    if (!isDue(alert, now)) continue
    const since = alert.lastSentAt ?? new Date(now.getTime() - 7 * DAY)
    const delivered = await prisma.alertDelivery.findMany({
      where: { alertId: alert.id },
      select: { externalJobId: true },
    })
    const jobs = await prisma.externalJob.findMany({
      where: { ...alertWhere(alert, since), id: { notIn: delivered.map((d) => d.externalJobId) } },
      orderBy: { firstSeenAt: 'desc' },
      take: PER_EMAIL,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        applyUrl: true,
        remote: true,
      },
    })
    if (jobs.length === 0) {
      skipped += 1
      continue
    }
    // A fresh token per email: the old link stops working, the new one works once stored.
    const token = randomBytes(24).toString('base64url')
    const unsub = `${base}/api/jobs/alerts/unsubscribe?token=${token}`
    const list = jobs
      .map(
        (j) =>
          `<li><a href="${esc(j.applyUrl)}">${esc(j.title)}</a> · ${esc(j.company)}${j.location ? ` · ${esc(j.location)}` : ''}${j.remote ? ' · Remote' : ''}</li>`
      )
      .join('')
    try {
      await prisma.jobAlert.update({
        where: { id: alert.id },
        data: { unsubscribeToken: hashToken(token) },
      })
      await emailService.sendEmail({
        to: alert.user.email,
        subject: `${jobs.length} new ${jobs.length === 1 ? 'job' : 'jobs'} for you on Nexus`,
        html: `<p>Hi ${esc(alert.user.name.split(' ')[0] || 'there')},</p><p>New jobs that match your alert${alert.roles.length ? ` (${esc(alert.roles.join(', '))})` : ''}:</p><ul>${list}</ul><p><a href="${base}/marketplace">See all your matches on Nexus</a></p><p style="color:#777;font-size:12px">You get this because you set up a job alert. <a href="${unsub}">Unsubscribe from this alert</a> or change it in <a href="${base}/settings/career">Career settings</a>.</p>`,
        text: `New jobs that match your alert:\n\n${jobs.map((j) => `- ${j.title} · ${j.company}${j.location ? ` · ${j.location}` : ''}\n  ${j.applyUrl}`).join('\n')}\n\nSee all your matches: ${base}/marketplace\nUnsubscribe from this alert: ${unsub}`,
      })
      await prisma.$transaction([
        prisma.alertDelivery.createMany({
          data: jobs.map((j) => ({ alertId: alert.id, externalJobId: j.id })),
          skipDuplicates: true,
        }),
        prisma.jobAlert.update({ where: { id: alert.id }, data: { lastSentAt: now } }),
      ])
      await notify([alert.userId], {
        type: 'job_alert',
        title: `${jobs.length} new ${jobs.length === 1 ? 'job matches' : 'jobs match'} your alert`,
        href: '/marketplace',
      })
      sent += 1
    } catch (error) {
      console.error('Job alert failed:', error instanceof Error ? error.message : error)
    }
  }
  // Forget deliveries older than 90 days; those jobs are long closed.
  await prisma.alertDelivery.deleteMany({
    where: { sentAt: { lt: new Date(now.getTime() - 90 * DAY) } },
  })
  return { sent, skipped }
}
