/**
 * GET /api/messages/:id
 * One conversation's messages (oldest first); marks it read for your side.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { sideOf } from '@/lib/messaging'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      candidateId: true,
      company: { select: { name: true, slug: true } },
      candidate: { select: { name: true, shareableId: true } },
    },
  })
  const side = conversation ? await sideOf(conversation, userId) : null
  if (!conversation || !side) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: { id: true, senderId: true, body: true, createdAt: true },
  })
  await prisma.conversation.update({
    where: { id },
    data: side === 'company' ? { companyReadAt: new Date() } : { candidateReadAt: new Date() },
  })

  return NextResponse.json(
    {
      id: conversation.id,
      side,
      with:
        side === 'candidate'
          ? { name: conversation.company.name, href: `/company/${conversation.company.slug}` }
          : {
              name: conversation.candidate.name,
              href: `/share/${conversation.candidate.shareableId}`,
            },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        // Your side of the conversation (you or a teammate), shown on the right.
        mine:
          side === 'candidate' ? m.senderId === userId : m.senderId !== conversation.candidateId,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
