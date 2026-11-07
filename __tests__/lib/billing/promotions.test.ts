/**
 * @jest-environment node
 */

const mockRedemption = {
  findUnique: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
}
const mockPromotion = { findMany: jest.fn(), update: jest.fn() }
const mockSubscription = { findUnique: jest.fn() }
const mockQueryRaw = jest.fn()

jest.mock('@/lib/db', () => {
  const client = {
    get promotionRedemption() {
      return mockRedemption
    },
    get promotion() {
      return mockPromotion
    },
    get subscription() {
      return mockSubscription
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $transaction: async (fn: (tx: unknown) => unknown) => fn(client),
  }
  return { prisma: client }
})

import {
  PromotionUnavailableError,
  confirmRedemption,
  expireRedemption,
  getRunningPromotion,
  isRunning,
  promotionEligibility,
  promotionTerms,
  promotionView,
  reservePromotion,
  type PromotionRecord,
} from '@/lib/billing/promotions'

const now = new Date('2026-11-10T12:00:00Z')

function founding(overrides: Partial<PromotionRecord> = {}): PromotionRecord {
  return {
    id: 'promo_founding_pro',
    code: 'founding-pro',
    name: 'Founding member',
    planId: 'pro',
    priceCents: 699,
    durationMonths: 12,
    maxRedemptions: 100,
    startsAt: null,
    endsAt: null,
    active: true,
    stripeCouponId: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRedemption.findUnique.mockResolvedValue(null)
  mockRedemption.count.mockResolvedValue(0)
  mockRedemption.create.mockResolvedValue({ id: 'red_1' })
  mockRedemption.update.mockResolvedValue({ id: 'red_1' })
  mockRedemption.updateMany.mockResolvedValue({ count: 1 })
  mockSubscription.findUnique.mockResolvedValue(null)
})

describe('whether a promotion is running', () => {
  it('runs only while switched on and inside its dates', () => {
    expect(isRunning(founding(), now)).toBe(true)
    expect(isRunning(founding({ active: false }), now)).toBe(false)
    expect(isRunning(founding({ startsAt: new Date('2026-12-01T00:00:00Z') }), now)).toBe(false)
    expect(isRunning(founding({ endsAt: new Date('2026-11-10T11:59:59Z') }), now)).toBe(false)
    expect(isRunning(founding({ endsAt: new Date('2026-11-30T00:00:00Z') }), now)).toBe(true)
  })

  it('never runs at or above the regular price', () => {
    expect(isRunning(founding({ priceCents: 999 }), now)).toBe(false)
  })

  it('is hidden once every place is taken', async () => {
    mockPromotion.findMany.mockResolvedValue([founding({ maxRedemptions: 2 })])
    mockRedemption.count.mockResolvedValue(2)
    await expect(getRunningPromotion('pro', now)).resolves.toBeNull()
    mockRedemption.count.mockResolvedValue(1)
    await expect(getRunningPromotion('pro', now)).resolves.toMatchObject({ remaining: 1 })
  })
})

describe('eligibility', () => {
  it('lets a first-time subscriber use it', async () => {
    await expect(promotionEligibility('u1', founding(), now)).resolves.toEqual({ eligible: true })
  })

  it('refuses a second use', async () => {
    mockRedemption.findUnique.mockResolvedValue({ status: 'redeemed' })
    await expect(promotionEligibility('u1', founding(), now)).resolves.toMatchObject({
      eligible: false,
    })
  })

  it('refuses anyone who has paid before', async () => {
    mockSubscription.findUnique.mockResolvedValue({ firstPaidAt: new Date('2026-01-01') })
    await expect(promotionEligibility('u1', founding(), now)).resolves.toMatchObject({
      eligible: false,
      reason: 'This offer is for first-time subscribers.',
    })
  })

  it('lets someone retry after abandoning a checkout', async () => {
    mockRedemption.findUnique.mockResolvedValue({ status: 'expired' })
    await expect(promotionEligibility('u1', founding(), now)).resolves.toEqual({ eligible: true })
  })

  it('refuses once the cap is reached by other people', async () => {
    mockRedemption.count.mockResolvedValue(100)
    await expect(promotionEligibility('u1', founding(), now)).resolves.toMatchObject({
      eligible: false,
    })
  })
})

describe('reserving a place at checkout', () => {
  const expiresAt = new Date('2026-11-10T13:00:00Z')

  it('locks the promotion row and holds a place', async () => {
    await expect(reservePromotion('u1', founding(), expiresAt, now)).resolves.toBe('red_1')
    expect(mockQueryRaw).toHaveBeenCalled()
    expect(mockRedemption.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        promotionId: 'promo_founding_pro',
        userId: 'u1',
        status: 'pending',
        expiresAt,
      }),
    })
  })

  it('reuses the person’s own earlier row, keeping it once per person', async () => {
    mockRedemption.findUnique.mockResolvedValue({ id: 'red_old', status: 'expired' })
    await reservePromotion('u1', founding(), expiresAt, now)
    expect(mockRedemption.create).not.toHaveBeenCalled()
    expect(mockRedemption.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'red_old' } })
    )
  })

  it('refuses when the cap is full or the person already redeemed', async () => {
    mockRedemption.count.mockResolvedValue(100)
    await expect(reservePromotion('u1', founding(), expiresAt, now)).rejects.toBeInstanceOf(
      PromotionUnavailableError
    )
    mockRedemption.count.mockResolvedValue(0)
    mockRedemption.findUnique.mockResolvedValue({ id: 'red_old', status: 'redeemed' })
    await expect(reservePromotion('u1', founding(), expiresAt, now)).rejects.toBeInstanceOf(
      PromotionUnavailableError
    )
  })

  it('confirms and expires by checkout session, idempotently', async () => {
    await confirmRedemption('cs_test_1', 'sub_1')
    expect(mockRedemption.updateMany).toHaveBeenCalledWith({
      where: { checkoutSessionId: 'cs_test_1', status: { not: 'redeemed' } },
      data: expect.objectContaining({ status: 'redeemed', stripeSubscriptionId: 'sub_1' }),
    })
    await expireRedemption('cs_test_2')
    expect(mockRedemption.updateMany).toHaveBeenLastCalledWith({
      where: { checkoutSessionId: 'cs_test_2', status: 'pending' },
      data: { status: 'expired' },
    })
  })
})

describe('disclosure', () => {
  it('states the promotional price, its length and the price after', () => {
    expect(promotionTerms(founding())).toBe(
      '$6.99/month for your first 12 months, then $9.99/month until you cancel. For first-time subscribers, once per person.'
    )
    expect(promotionView(founding({ endsAt: new Date('2026-12-31T00:00:00Z') }), 40)).toMatchObject(
      {
        plan: 'pro',
        priceCents: 699,
        regularPriceCents: 999,
        remaining: 40,
        endsAt: '2026-12-31T00:00:00.000Z',
      }
    )
  })
})
