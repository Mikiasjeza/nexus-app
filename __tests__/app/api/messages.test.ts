/**
 * @jest-environment node
 */

import { POST } from '@/app/api/messages/route'
import { notifyOnce } from '@/lib/notifications'

jest.mock('@/lib/db', () => ({
  prisma: {
    companyMember: { findFirst: jest.fn(), findMany: jest.fn(async () => []) },
    jobApplication: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn(async () => ({ name: 'Ada' })) },
    company: { findUnique: jest.fn(async () => ({ name: 'Acme' })) },
    conversation: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    message: { create: jest.fn() },
    notification: { createMany: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}))
jest.mock('@/lib/auth/session', () => ({
  getSessionUserId: jest.fn(async () => 'me'),
  isGuestRequest: jest.fn(async () => false),
}))
jest.mock('@/lib/utils/rateLimit', () => ({ rateLimit: jest.fn(() => ({ allowed: true })) }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    companyMember: { findFirst: jest.Mock }
    jobApplication: { findFirst: jest.Mock }
    user: { findFirst: jest.Mock }
    conversation: { findUnique: jest.Mock; upsert: jest.Mock }
    message: { create: jest.Mock }
    notification: { createMany: jest.Mock; findFirst: jest.Mock }
  }
}

const send = (body: unknown) =>
  POST(new Request('http://x/api/messages', { method: 'POST', body: JSON.stringify(body) }))

describe('POST /api/messages', () => {
  beforeEach(() => jest.clearAllMocks())

  it('needs a message', async () => {
    expect((await send({ conversationId: 'c1', body: '  ' })).status).toBe(400)
  })

  it('refuses conversations that are not yours', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'c1',
      companyId: 'co',
      candidateId: 'x',
    })
    prisma.companyMember.findFirst.mockResolvedValue(null)
    expect((await send({ conversationId: 'c1', body: 'hi' })).status).toBe(404)
  })

  it('stops candidates starting conversations', async () => {
    prisma.companyMember.findFirst.mockResolvedValue(null)
    expect((await send({ candidateId: 'someone', body: 'hi' })).status).toBe(403)
  })

  it('lets employers message only applicants or discoverable people', async () => {
    prisma.companyMember.findFirst.mockResolvedValue({
      id: 'm',
      role: 'recruiter',
      companyId: 'co',
      company: { name: 'Acme', slug: 'acme' },
    })
    prisma.jobApplication.findFirst.mockResolvedValue(null)
    prisma.user.findFirst.mockResolvedValue(null)
    expect((await send({ candidateId: 'cand', body: 'hi' })).status).toBe(403)

    prisma.jobApplication.findFirst.mockResolvedValue({ id: 'app' })
    prisma.conversation.upsert.mockResolvedValue({ id: 'c9', companyId: 'co', candidateId: 'cand' })
    const res = await send({ candidateId: 'cand', body: 'Hello!' })
    expect(res.status).toBe(200)
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { conversationId: 'c9', senderId: 'me', body: 'Hello!' },
    })
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'cand', type: 'message', href: '/messages?c=c9' })],
    })
  })
})

describe('notifyOnce', () => {
  beforeEach(() => jest.clearAllMocks())

  it('skips when a matching notification is recent', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'n1' })
    await notifyOnce('u1', { type: 'passport_view', title: 'Acme viewed your passport' }, 1000)
    expect(prisma.notification.createMany).not.toHaveBeenCalled()

    prisma.notification.findFirst.mockResolvedValue(null)
    await notifyOnce('u1', { type: 'passport_view', title: 'Acme viewed your passport' }, 1000)
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1)
  })
})
