/**
 * @jest-environment node
 */

import { POST as apply } from '@/app/api/jobs/[id]/apply/route'
import { POST as acceptInvite } from '@/app/api/employer/invites/accept/route'
import { hashInviteToken } from '@/lib/employer/access'

jest.mock('@/lib/db', () => ({
  prisma: {
    jobListing: { findUnique: jest.fn() },
    companyMember: { findFirst: jest.fn(), create: jest.fn() },
    jobApplication: { upsert: jest.fn() },
    companyInvite: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
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
    jobListing: { findUnique: jest.Mock }
    companyMember: { findFirst: jest.Mock; create: jest.Mock }
    jobApplication: { upsert: jest.Mock }
    companyInvite: { findUnique: jest.Mock; update: jest.Mock }
    user: { findUnique: jest.Mock; update: jest.Mock }
  }
}

const post = (body: unknown) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('applying to a job', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refuses closed or missing roles', async () => {
    prisma.jobListing.findUnique.mockResolvedValue({ id: 'j1', status: 'closed', companyId: 'c1' })
    expect((await apply(post({}), params('j1'))).status).toBe(404)
  })

  it("refuses people who work at the job's company", async () => {
    prisma.jobListing.findUnique.mockResolvedValue({ id: 'j1', status: 'active', companyId: 'c1' })
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'm1' })
    expect((await apply(post({}), params('j1'))).status).toBe(400)
  })

  it('applies once, with the note', async () => {
    prisma.jobListing.findUnique.mockResolvedValue({ id: 'j1', status: 'active', companyId: 'c1' })
    prisma.companyMember.findFirst.mockResolvedValue(null)
    prisma.jobApplication.upsert.mockResolvedValue({ id: 'a1', status: 'submitted' })
    const res = await apply(post({ message: ' Keen! ' }), params('j1'))
    expect(res.status).toBe(200)
    expect(prisma.jobApplication.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobId_userId: { jobId: 'j1', userId: 'me' } },
        create: { jobId: 'j1', userId: 'me', message: 'Keen!' },
      })
    )
  })
})

describe('accepting a team invite', () => {
  beforeEach(() => jest.clearAllMocks())
  const invite = (extra: object = {}) => ({
    id: 'i1',
    email: 'me@co.com',
    role: 'recruiter',
    companyId: 'c1',
    expiresAt: new Date(Date.now() + 60_000),
    acceptedAt: null,
    company: { name: 'Co' },
    ...extra,
  })

  it('looks the invite up by the hash of its token', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null)
    await acceptInvite(post({ token: 'tok' }))
    expect(prisma.companyInvite.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashInviteToken('tok') } })
    )
  })

  it('refuses used, expired and other-address invites', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(invite({ acceptedAt: new Date() }))
    expect((await acceptInvite(post({ token: 't' }))).status).toBe(400)

    prisma.companyInvite.findUnique.mockResolvedValue(invite({ expiresAt: new Date(0) }))
    expect((await acceptInvite(post({ token: 't' }))).status).toBe(400)

    prisma.companyInvite.findUnique.mockResolvedValue(invite())
    prisma.user.findUnique.mockResolvedValue({ email: 'someone@else.com' })
    expect((await acceptInvite(post({ token: 't' }))).status).toBe(403)
  })

  it('refuses someone already at another company', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(invite())
    prisma.user.findUnique.mockResolvedValue({ email: 'ME@co.com' })
    prisma.companyMember.findFirst.mockResolvedValue({ companyId: 'other' })
    expect((await acceptInvite(post({ token: 't' }))).status).toBe(409)
  })

  it('joins the company with the invited role', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(invite())
    prisma.user.findUnique.mockResolvedValue({ email: 'me@co.com' })
    prisma.companyMember.findFirst.mockResolvedValue(null)
    const res = await acceptInvite(post({ token: 't' }))
    expect(res.status).toBe(200)
    expect(prisma.companyMember.create).toHaveBeenCalledWith({
      data: { userId: 'me', companyId: 'c1', role: 'recruiter' },
    })
  })
})
