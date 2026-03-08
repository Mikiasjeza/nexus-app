import { handleSubscriptionUpdated, handleSubscriptionDeleted } from '@/lib/integrations/stripe-webhook-handlers'

jest.mock('@/lib/db', () => ({
  prisma: {
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/integrations/stripe', () => ({
  stripe: {
    customers: {
      retrieve: jest.fn(),
    },
  },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    subscription: {
      findFirst: jest.Mock
      update: jest.Mock
      upsert: jest.Mock
    }
  }
}

describe('stripe-webhook-handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates existing subscription on customer.subscription.updated', async () => {
    prisma.subscription.findFirst.mockResolvedValueOnce({ id: 'sub-db-1' })

    await handleSubscriptionUpdated({
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 3600,
      cancel_at_period_end: false,
    } as any)

    expect(prisma.subscription.update).toHaveBeenCalledTimes(1)
    expect(prisma.subscription.upsert).not.toHaveBeenCalled()
  })

  it('marks subscription canceled on delete event', async () => {
    prisma.subscription.findFirst.mockResolvedValueOnce({ id: 'sub-db-2' })

    await handleSubscriptionDeleted({
      id: 'sub_abc',
      customer: 'cus_abc',
    } as any)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'canceled',
          stripeSubscriptionId: null,
        }),
      })
    )
  })
})
