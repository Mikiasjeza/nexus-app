/**
 * @jest-environment node
 */

import { openJobBlock, teamSeatBlock } from '@/lib/billing/company'
import { PLAN_INFO } from '@/lib/plans'

jest.mock('@/lib/db', () => ({
  prisma: {
    subscription: { findUnique: jest.fn() },
    jobListing: { count: jest.fn() },
    companyMember: { count: jest.fn() },
    companyInvite: { count: jest.fn() },
  },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    subscription: { findUnique: jest.Mock }
    jobListing: { count: jest.Mock }
    companyMember: { count: jest.Mock }
    companyInvite: { count: jest.Mock }
  }
}

const business = {
  plan: 'business',
  status: 'active',
  currentPeriodStart: new Date(Date.now() - 86_400_000),
}

describe('company plan limits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('Free allows one open job', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null)
    prisma.jobListing.count.mockResolvedValue(0)
    expect(await openJobBlock('c1')).toBeNull()
    prisma.jobListing.count.mockResolvedValue(PLAN_INFO.free.limits.openJobs)
    expect(await openJobBlock('c1')).toMatch(/upgrade to Business/i)
  })

  it('Business has no job limit', async () => {
    prisma.subscription.findUnique.mockResolvedValue(business)
    prisma.jobListing.count.mockResolvedValue(500)
    expect(await openJobBlock('c1')).toBeNull()
  })

  it('counts pending invites as seats', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null)
    prisma.companyMember.count.mockResolvedValue(1)
    prisma.companyInvite.count.mockResolvedValue(0)
    expect(await teamSeatBlock('c1')).toBeNull()
    prisma.companyInvite.count.mockResolvedValue(1)
    expect(await teamSeatBlock('c1')).toMatch(/Free plan includes 2 people/)
  })

  it('Business stops at its seat limit', async () => {
    prisma.subscription.findUnique.mockResolvedValue(business)
    prisma.companyMember.count.mockResolvedValue(PLAN_INFO.business.limits.teamSeats)
    prisma.companyInvite.count.mockResolvedValue(0)
    expect(await teamSeatBlock('c1')).toMatch(/Business includes/)
  })
})
