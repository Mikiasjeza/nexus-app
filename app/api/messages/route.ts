/**
 * GET  /api/messages                         your conversations, newest first
 * POST /api/messages { body, conversationId } reply in a conversation
 * POST /api/messages { body, candidateId }    (employers) start or continue one
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { membershipFor, canManageHiring } from '@/lib/employer/access'
import { MAX_MESSAGE, canContact, sideOf } from '@/lib/messaging'
import { notify, notifyCompany } from '@/lib/notifications'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (await isGuestRequest()) return NextResponse.json({ conversations: [] })
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const membership = await membershipFor(userId)

  const rows = await prisma.conversation.findMany({
    where: membership
      ? { OR: [{ companyId: membership.companyId }, { candidateId: userId }] }
      : { candidateId: userId },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    select: {
      id: true,
      companyId: true,
      candidateId: true,
      lastMessageAt: true,
      companyReadAt: true,
      candidateReadAt: true,
      company: { select: { name: true } },
      candidate: { select: { name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
    },
  })

  return NextResponse.json(
    {
      conversations: rows.map((c) => {
        const side = c.candidateId === userId ? 'candidate' : 'company'
        const readAt = side === 'candidate' ? c.candidateReadAt : c.companyReadAt
        return {
          id: c.id,
          side,
          with: side === 'candidate' ? c.company.name : c.candidate.name,
          preview: c.messages[0]?.body.slice(0, 120) ?? '',
          lastMessageAt: c.lastMessageAt.toISOString(),
          unread: !readAt || readAt < c.lastMessageAt,
        }
      }),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Guest preview is read-only.' }, { status: 403 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`messages:${userId}`, { maxRequests: 60, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 })
    }

    const payload = await request.json().catch(() => ({}))
    const body = typeof payload.body === 'string' ? payload.body.trim() : ''
    if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 })
    if (body.length > MAX_MESSAGE) {
      return NextResponse.json({ error: 'That message is too long.' }, { status: 400 })
    }

    let conversation: { id: string; companyId: string; candidateId: string } | null = null
    let side: 'company' | 'candidate'

    if (typeof payload.conversationId === 'string') {
      conversation = await prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { id: true, companyId: true, candidateId: true },
      })
      const found = conversation ? await sideOf(conversation, userId) : null
      if (!conversation || !found) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      side = found
    } else if (typeof payload.candidateId === 'string') {
      const membership = await membershipFor(userId)
      if (!membership || !canManageHiring(membership.role)) {
        return NextResponse.json(
          { error: 'Only employers can start a conversation.' },
          { status: 403 }
        )
      }
      if (
        payload.candidateId === userId ||
        !(await canContact(membership.companyId, payload.candidateId))
      ) {
        return NextResponse.json(
          { error: 'You can message people who applied to your jobs or are open to employers.' },
          { status: 403 }
        )
      }
      conversation = await prisma.conversation.upsert({
        where: {
          companyId_candidateId: {
            companyId: membership.companyId,
            candidateId: payload.candidateId,
          },
        },
        create: { companyId: membership.companyId, candidateId: payload.candidateId },
        update: {},
        select: { id: true, companyId: true, candidateId: true },
      })
      side = 'company'
    } else {
      return NextResponse.json({ error: 'Who is this message for?' }, { status: 400 })
    }

    const now = new Date()
    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: conversation.id, senderId: userId, body } }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          ...(side === 'company' ? { companyReadAt: now } : { candidateReadAt: now }),
        },
      }),
    ])

    const href = `/messages?c=${conversation.id}`
    if (side === 'company') {
      const company = await prisma.company.findUnique({
        where: { id: conversation.companyId },
        select: { name: true },
      })
      await notify([conversation.candidateId], {
        type: 'message',
        title: `New message from ${company?.name ?? 'a company'}`,
        body: body.slice(0, 140),
        href,
      })
    } else {
      const candidate = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      await notifyCompany(
        conversation.companyId,
        {
          type: 'message',
          title: `New message from ${candidate?.name ?? 'a candidate'}`,
          body: body.slice(0, 140),
          href,
        },
        userId
      )
    }

    return NextResponse.json({ ok: true, conversationId: conversation.id })
  } catch (e) {
    console.error('Message send error:', e)
    return NextResponse.json({ error: 'Could not send the message.' }, { status: 500 })
  }
}
