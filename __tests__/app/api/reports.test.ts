/**
 * @jest-environment node
 */

import { POST } from '@/app/api/reports/route'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    jobListing: { findUnique: jest.fn() },
    company: { findFirst: jest.fn() },
    report: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('@/lib/auth/session', () => ({
  getSessionUserId: jest.fn(),
  isGuestRequest: jest.fn(async () => false),
}))
jest.mock('@/lib/utils/rateLimit', () => ({ rateLimit: jest.fn(() => ({ allowed: true })) }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    user: { findFirst: jest.Mock }
    jobListing: { findUnique: jest.Mock }
    company: { findFirst: jest.Mock }
    report: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  }
}
const { getSessionUserId } = jest.requireMock('@/lib/auth/session') as {
  getSessionUserId: jest.Mock
}

const send = (body: unknown) =>
  POST(new Request('http://x/api/reports', { method: 'POST', body: JSON.stringify(body) }))

describe('POST /api/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getSessionUserId.mockResolvedValue('me')
  })

  it('needs a signed-in person', async () => {
    getSessionUserId.mockResolvedValue(null)
    expect((await send({})).status).toBe(401)
  })

  it('needs a known reason and target type', async () => {
    expect((await send({ targetType: 'profile', targetId: 'x', reason: 'nope' })).status).toBe(400)
    expect((await send({ targetType: 'planet', targetId: 'x', reason: 'spam' })).status).toBe(400)
  })

  it('refuses things that do not exist, and reporting yourself', async () => {
    prisma.jobListing.findUnique.mockResolvedValue(null)
    expect((await send({ targetType: 'job', targetId: 'j1', reason: 'scam' })).status).toBe(404)

    prisma.user.findFirst.mockResolvedValue({ id: 'me', name: 'Me', shareableId: 's1' })
    expect((await send({ targetType: 'profile', targetId: 's1', reason: 'fake' })).status).toBe(400)
  })

  it('files a report, and updates it rather than duplicating', async () => {
    prisma.company.findFirst.mockResolvedValue({ name: 'Acme', slug: 'acme' })
    prisma.report.findFirst.mockResolvedValue(null)
    const res = await send({
      targetType: 'company',
      targetId: 'acme',
      reason: 'scam',
      details: ' asks for fees ',
    })
    expect(res.status).toBe(200)
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: {
        reporterId: 'me',
        targetType: 'company',
        targetId: 'acme',
        reason: 'scam',
        details: 'asks for fees',
      },
    })

    prisma.report.findFirst.mockResolvedValue({ id: 'r1' })
    await send({ targetType: 'company', targetId: 'acme', reason: 'fake' })
    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { reason: 'fake', details: null },
    })
  })
})
