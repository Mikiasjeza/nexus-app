/**
 * In-app notifications (the bell). Creating one never throws: a missed
 * notification must not break the action that caused it.
 */

import { prisma } from '@/lib/db'

export type NotificationType = 'shortlisted' | 'saved' | 'passport_view' | 'applied' | 'message'

export type NotificationInput = {
  type: NotificationType
  title: string
  body?: string
  href?: string
}

/** Notify these people. Duplicate ids are ignored. */
export async function notify(userIds: string[], input: NotificationInput): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: input.type,
        title: input.title.slice(0, 200),
        body: input.body?.slice(0, 500),
        href: input.href,
      })),
    })
  } catch (error) {
    console.error('Notification failed:', error)
  }
}

/** Notify everyone on a company's team, except the person who acted. */
export async function notifyCompany(
  companyId: string,
  input: NotificationInput,
  exceptUserId?: string
): Promise<void> {
  try {
    const members = await prisma.companyMember.findMany({
      where: { companyId, ...(exceptUserId ? { userId: { not: exceptUserId } } : {}) },
      select: { userId: true },
    })
    await notify(
      members.map((m) => m.userId),
      input
    )
  } catch (error) {
    console.error('Company notification failed:', error)
  }
}

/**
 * Notify once per window: skips if this person already has a notification of
 * this type and link newer than `withinMs`. Used for passport views.
 */
export async function notifyOnce(
  userId: string,
  input: NotificationInput,
  withinMs: number
): Promise<void> {
  try {
    const recent = await prisma.notification.findFirst({
      where: {
        userId,
        type: input.type,
        title: input.title,
        createdAt: { gt: new Date(Date.now() - withinMs) },
      },
      select: { id: true },
    })
    if (!recent) await notify([userId], input)
  } catch (error) {
    console.error('Notification failed:', error)
  }
}
