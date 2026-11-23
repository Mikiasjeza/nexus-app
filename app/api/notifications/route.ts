/**
 * GET   /api/notifications          newest 30, plus the unread count
 * PATCH /api/notifications { ids? } mark these (or all) as read
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (await isGuestRequest()) return NextResponse.json({ notifications: [], unread: 0 })
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])
  return NextResponse.json(
    {
      unread,
      notifications: notifications.map((n) => ({
        ...n,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 100)
    : null
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
