/**
 * @jest-environment node
 */

const mockRetrievePrice = jest.fn()

jest.mock('@sentry/nextjs', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@/lib/billing/stripe-client', () => ({
  stripe: { prices: { retrieve: (...args: unknown[]) => mockRetrievePrice(...args) } },
  stripeMode: (key = process.env.STRIPE_SECRET_KEY || '') =>
    /^sk_live_/.test(key) ? 'live' : /^sk_test_/.test(key) ? 'test' : null,
}))

import { planForPriceId, priceIdFor, purchasability, resetPriceChecks } from '@/lib/billing/catalog'

const proPrice = (overrides: Record<string, unknown> = {}) => ({
  id: 'price_pro',
  active: true,
  currency: 'usd',
  unit_amount: 999,
  recurring: { interval: 'month', interval_count: 1 },
  ...overrides,
})

const ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_CAREER_PLUS_PRICE_ID',
  'STRIPE_BUSINESS_PRICE_ID',
  'BILLING_LIVE_APPROVED',
]
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))

beforeEach(() => {
  resetPriceChecks()
  mockRetrievePrice.mockReset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  delete process.env.STRIPE_CAREER_PLUS_PRICE_ID
  delete process.env.STRIPE_BUSINESS_PRICE_ID
  delete process.env.BILLING_LIVE_APPROVED
})

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('purchasability', () => {
  it('sells Pro when its Stripe price matches the pricing page', async () => {
    mockRetrievePrice.mockResolvedValue(proPrice())
    await expect(purchasability('pro')).resolves.toEqual({
      plan: 'pro',
      purchasable: true,
      block: null,
    })
  })

  it('never sells plans that are not available, whatever is configured', async () => {
    process.env.STRIPE_CAREER_PLUS_PRICE_ID = 'price_cp'
    process.env.STRIPE_BUSINESS_PRICE_ID = 'price_biz'
    for (const plan of ['free', 'career_plus', 'business'] as const) {
      expect((await purchasability(plan)).block).toBe('not_for_sale')
    }
    expect(mockRetrievePrice).not.toHaveBeenCalled()
  })

  it('needs Stripe to be configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect((await purchasability('pro')).block).toBe('stripe_not_configured')
  })

  it('refuses live billing until someone approves it', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_123'
    mockRetrievePrice.mockResolvedValue(proPrice())
    expect((await purchasability('pro')).block).toBe('live_mode_not_approved')
    process.env.BILLING_LIVE_APPROVED = 'true'
    expect((await purchasability('pro')).purchasable).toBe(true)
  })

  it('needs a price id for this environment', async () => {
    delete process.env.STRIPE_PRO_PRICE_ID
    expect((await purchasability('pro')).block).toBe('price_not_configured')
  })

  it.each([
    ['a different amount', { unit_amount: 1099 }],
    ['an archived price', { active: false }],
    ['another currency', { currency: 'eur' }],
    ['a yearly price', { recurring: { interval: 'year', interval_count: 1 } }],
  ])('blocks checkout for %s', async (_label, overrides) => {
    mockRetrievePrice.mockResolvedValue(proPrice(overrides))
    expect((await purchasability('pro')).block).toBe('price_mismatch')
  })

  it('blocks checkout when the price id does not exist', async () => {
    mockRetrievePrice.mockRejectedValue(new Error('No such price'))
    expect((await purchasability('pro')).block).toBe('price_mismatch')
  })

  it('caches a price check', async () => {
    mockRetrievePrice.mockResolvedValue(proPrice())
    await purchasability('pro')
    await purchasability('pro')
    expect(mockRetrievePrice).toHaveBeenCalledTimes(1)
  })
})

describe('price ids', () => {
  it('maps prices to plans in this environment only', () => {
    process.env.STRIPE_CAREER_PLUS_PRICE_ID = 'price_cp'
    expect(priceIdFor('pro')).toBe('price_pro')
    expect(priceIdFor('free')).toBeNull()
    expect(planForPriceId('price_pro')).toBe('pro')
    expect(planForPriceId('price_cp')).toBe('career_plus')
    expect(planForPriceId('price_unknown')).toBeNull()
    expect(planForPriceId(null)).toBeNull()
  })
})
