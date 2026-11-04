/**
 * @jest-environment node
 */

import { Prisma } from '@prisma/client'

const mockRetrieveSubscription = jest.fn()
const mockRetrieveCustomer = jest.fn()
const mockSubscription = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  upsert: jest.fn(),
}

jest.mock('@sentry/nextjs', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@/lib/db', () => ({
  prisma: {
    get subscription() {
      return mockSubscription
    },
  },
}))
jest.mock('@/lib/billing/stripe-client', () => ({
  stripe: {
    subscriptions: { retrieve: (...a: unknown[]) => mockRetrieveSubscription(...a) },
    customers: { retrieve: (...a: unknown[]) => mockRetrieveCustomer(...a) },
    prices: { retrieve: jest.fn() },
  },
  stripeMode: () => 'test',
  idOf: (v: unknown) => (typeof v === 'string' ? v : ((v as { id?: string })?.id ?? null)),
}))

import { syncStripeSubscription } from '@/lib/billing/sync'

const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)

function stripeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    metadata: { userId: 'u1', planId: 'pro' },
    items: { data: [{ id: 'si_1', price: { id: 'price_pro' } }] },
    current_period_start: seconds('2026-11-01T00:00:00Z'),
    current_period_end: seconds('2026-12-01T00:00:00Z'),
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    discount: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  mockSubscription.findUnique.mockResolvedValue(null)
  mockSubscription.findFirst.mockResolvedValue(null)
  mockSubscription.upsert.mockResolvedValue({})
})

describe('syncStripeSubscription', () => {
  it('copies an active subscription, reading the plan from its price', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub({ metadata: { userId: 'u1' } }))
    await expect(syncStripeSubscription('sub_1')).resolves.toMatchObject({
      synced: true,
      plan: 'pro',
      status: 'active',
    })
    const call = mockSubscription.upsert.mock.calls[0][0]
    expect(call.where).toEqual({ userId: 'u1' })
    expect(call.update).toMatchObject({
      plan: 'pro',
      status: 'active',
      stripeSubscriptionId: 'sub_1',
      stripePriceId: 'price_pro',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2026-12-01T00:00:00Z'),
    })
    expect(call.update.firstPaidAt).toBeInstanceOf(Date)
  })

  it('always re-reads the subscription from Stripe', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub())
    await syncStripeSubscription('sub_1')
    expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_1')
  })

  it('records a promotional discount and when it ends', async () => {
    mockRetrieveSubscription.mockResolvedValue(
      stripeSub({
        metadata: { userId: 'u1', promotionId: 'promo_founding_pro' },
        discount: { end: seconds('2027-11-01T00:00:00Z') },
      })
    )
    await syncStripeSubscription('sub_1')
    expect(mockSubscription.upsert.mock.calls[0][0].update).toMatchObject({
      promotionId: 'promo_founding_pro',
      discountEndsAt: new Date('2027-11-01T00:00:00Z'),
    })
  })

  it('moves a cancelled subscription to Free and clears its Stripe id', async () => {
    mockRetrieveSubscription.mockResolvedValue(
      stripeSub({ status: 'canceled', ended_at: seconds('2026-11-20T00:00:00Z') })
    )
    mockSubscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_1',
      status: 'active',
    })
    await expect(syncStripeSubscription('sub_1')).resolves.toMatchObject({
      synced: true,
      plan: 'free',
    })
    expect(mockSubscription.upsert.mock.calls[0][0].update).toMatchObject({
      plan: 'free',
      status: 'canceled',
      stripeSubscriptionId: null,
      canceledAt: new Date('2026-11-20T00:00:00Z'),
    })
  })

  it('ignores an old subscription ending after a newer one replaced it', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub({ id: 'sub_old', status: 'canceled' }))
    mockSubscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_new',
      status: 'active',
    })
    await expect(syncStripeSubscription('sub_old')).resolves.toEqual({
      synced: false,
      reason: 'stale_subscription',
    })
    expect(mockSubscription.upsert).not.toHaveBeenCalled()
  })

  it('keeps the subscription on file when a second live one appears for the same person', async () => {
    mockRetrieveSubscription.mockImplementation(async (id: string) =>
      id === 'sub_first' ? stripeSub({ id: 'sub_first' }) : stripeSub({ id: 'sub_second' })
    )
    mockSubscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_first',
      status: 'active',
    })
    await expect(syncStripeSubscription('sub_second')).resolves.toEqual({
      synced: false,
      reason: 'duplicate_subscription',
    })
    expect(mockSubscription.upsert).not.toHaveBeenCalled()
  })

  it('replaces a subscription on file that Stripe says has ended', async () => {
    mockRetrieveSubscription.mockImplementation(async (id: string) =>
      id === 'sub_first'
        ? stripeSub({ id: 'sub_first', status: 'canceled' })
        : stripeSub({ id: 'sub_second' })
    )
    mockSubscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_first',
      status: 'active',
    })
    await expect(syncStripeSubscription('sub_second')).resolves.toMatchObject({ synced: true })
  })

  it('refuses a price no plan knows rather than guessing', async () => {
    mockRetrieveSubscription.mockResolvedValue(
      stripeSub({ metadata: { userId: 'u1' }, items: { data: [{ price: { id: 'price_x' } }] } })
    )
    await expect(syncStripeSubscription('sub_1')).resolves.toEqual({
      synced: false,
      reason: 'unknown_price',
    })
  })

  it('finds the owner from an earlier row or the Stripe customer when metadata is missing', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub({ metadata: {} }))
    mockRetrieveCustomer.mockResolvedValue({ deleted: false, metadata: { userId: 'u9' } })
    await syncStripeSubscription('sub_1')
    expect(mockSubscription.upsert.mock.calls[0][0].where).toEqual({ userId: 'u9' })
  })

  it('writes organization subscriptions to the company', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub({ metadata: { companyId: 'c1' } }))
    await syncStripeSubscription('sub_1')
    expect(mockSubscription.upsert.mock.calls[0][0].where).toEqual({ companyId: 'c1' })
  })

  it('does not throw when the account was deleted before the event arrived', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub())
    mockSubscription.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: 'test' })
    )
    await expect(syncStripeSubscription('sub_1')).resolves.toEqual({
      synced: false,
      reason: 'owner_deleted',
    })
  })

  it('does not mark someone as having paid while their first payment is incomplete', async () => {
    mockRetrieveSubscription.mockResolvedValue(stripeSub({ status: 'incomplete' }))
    await syncStripeSubscription('sub_1')
    expect(mockSubscription.upsert.mock.calls[0][0].update.firstPaidAt).toBeNull()
  })
})
