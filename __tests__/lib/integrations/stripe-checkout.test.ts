/**
 * @jest-environment node
 */

import Stripe from 'stripe'

const mockStripe = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
  coupons: { retrieve: jest.fn(), create: jest.fn() },
  subscriptions: { retrieve: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
  prices: { retrieve: jest.fn() },
}
const mockDb = {
  subscription: { findUnique: jest.fn(), upsert: jest.fn() },
  user: { findUnique: jest.fn() },
  company: { findUnique: jest.fn() },
}
const mockPurchasability = jest.fn()
const mockSync = jest.fn()
const mockPromotions = {
  getRunningPromotion: jest.fn(),
  promotionEligibility: jest.fn(),
  reservePromotion: jest.fn(),
  attachCheckoutSession: jest.fn(),
  cancelReservation: jest.fn(),
  confirmRedemption: jest.fn(),
  setPromotionCoupon: jest.fn(),
}

jest.mock('@sentry/nextjs', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockDb
  },
}))
jest.mock('@/lib/billing/stripe-client', () => ({
  get stripe() {
    return mockStripe
  },
  stripeMode: () => 'test',
  idOf: (v: unknown) => (typeof v === 'string' ? v : ((v as { id?: string })?.id ?? null)),
}))
jest.mock('@/lib/billing/catalog', () => ({
  PURCHASE_BLOCK_MESSAGES: { not_for_sale: "This plan isn't on sale yet." },
  purchasability: (...a: unknown[]) => mockPurchasability(...a),
  priceIdFor: (plan: string) => (plan === 'pro' ? 'price_pro' : `price_${plan}`),
}))
jest.mock('@/lib/billing/sync', () => ({
  syncStripeSubscription: (...a: unknown[]) => mockSync(...a),
  ownerWhere: (owner: Record<string, string>) =>
    'userId' in owner ? { userId: owner.userId } : { companyId: owner.companyId },
}))
jest.mock('@/lib/billing/promotions', () => {
  const actual = jest.requireActual('@/lib/billing/promotions')
  return {
    PromotionUnavailableError: actual.PromotionUnavailableError,
    promotionTerms: actual.promotionTerms,
    getRunningPromotion: (...a: unknown[]) => mockPromotions.getRunningPromotion(...a),
    promotionEligibility: (...a: unknown[]) => mockPromotions.promotionEligibility(...a),
    reservePromotion: (...a: unknown[]) => mockPromotions.reservePromotion(...a),
    attachCheckoutSession: (...a: unknown[]) => mockPromotions.attachCheckoutSession(...a),
    cancelReservation: (...a: unknown[]) => mockPromotions.cancelReservation(...a),
    confirmRedemption: (...a: unknown[]) => mockPromotions.confirmRedemption(...a),
    setPromotionCoupon: (...a: unknown[]) => mockPromotions.setPromotionCoupon(...a),
  }
})

import { BillingError, stripeService } from '@/lib/integrations/stripe'
import { PromotionUnavailableError } from '@/lib/billing/promotions'

const founding = {
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
}

const base = { userId: 'u1', baseUrl: 'https://nexus.example' }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  mockPurchasability.mockResolvedValue({ plan: 'pro', purchasable: true, block: null })
  mockDb.subscription.findUnique.mockResolvedValue(null)
  mockDb.subscription.upsert.mockResolvedValue({})
  mockDb.user.findUnique.mockResolvedValue({ email: 'a@example.com', name: 'A' })
  mockStripe.customers.create.mockResolvedValue({ id: 'cus_1' })
  mockStripe.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/c/1',
  })
})

describe('createCheckoutSession', () => {
  it('uses the server’s price for the plan and sends the visitor to Stripe', async () => {
    const result = await stripeService.createCheckoutSession({
      ...base,
      plan: 'pro',
      usePromotion: false,
    })
    expect(result).toEqual({ url: 'https://checkout.stripe.com/c/1', promotionApplied: false })
    const params = mockStripe.checkout.sessions.create.mock.calls[0][0]
    expect(params).toMatchObject({
      mode: 'subscription',
      customer: 'cus_1',
      client_reference_id: 'u1',
      line_items: [{ price: 'price_pro', quantity: 1 }],
      metadata: { userId: 'u1', planId: 'pro' },
      subscription_data: { metadata: { userId: 'u1', planId: 'pro' } },
      success_url: 'https://nexus.example/settings?checkout={CHECKOUT_SESSION_ID}#billing',
      cancel_url: 'https://nexus.example/pricing?checkout=cancelled',
    })
    expect(params.discounts).toBeUndefined()
    expect(params.custom_text.submit.message).toContain('renews at $9.99/month')
    // One customer per person, even on a double click.
    expect(mockStripe.customers.create.mock.calls[0][1]).toEqual({
      idempotencyKey: 'customer-user-u1',
    })
  })

  it('refuses a second subscription while one can still bill', async () => {
    mockDb.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_1',
      status: 'past_due',
    })
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'pro', usePromotion: false })
    ).rejects.toMatchObject({ status: 409, code: 'already_subscribed' })
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('refuses plans that are not for sale', async () => {
    mockPurchasability.mockResolvedValue({
      plan: 'career_plus',
      purchasable: false,
      block: 'not_for_sale',
    })
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'career_plus', usePromotion: false })
    ).rejects.toMatchObject({ status: 409, code: 'not_for_sale' })
  })

  it('refuses organization plans for a person', async () => {
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'business', usePromotion: false })
    ).rejects.toBeInstanceOf(BillingError)
  })

  it('applies the founding price as a 12-month coupon and holds a place', async () => {
    mockPromotions.getRunningPromotion.mockResolvedValue({ promotion: founding, remaining: 10 })
    mockPromotions.promotionEligibility.mockResolvedValue({ eligible: true })
    mockPromotions.reservePromotion.mockResolvedValue('red_1')
    mockStripe.coupons.retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: 'No such coupon',
        code: 'resource_missing',
        type: 'invalid_request_error',
      })
    )
    mockStripe.coupons.create.mockResolvedValue({ id: 'nexus-founding-pro-300c-12m' })

    const result = await stripeService.createCheckoutSession({
      ...base,
      plan: 'pro',
      usePromotion: true,
    })

    expect(result.promotionApplied).toBe(true)
    expect(mockStripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'nexus-founding-pro-300c-12m',
        amount_off: 300,
        currency: 'usd',
        duration: 'repeating',
        duration_in_months: 12,
      })
    )
    const params = mockStripe.checkout.sessions.create.mock.calls[0][0]
    expect(params.discounts).toEqual([{ coupon: 'nexus-founding-pro-300c-12m' }])
    expect(params.metadata.promotionId).toBe('promo_founding_pro')
    expect(params.custom_text.submit.message).toContain(
      '$6.99/month for your first 12 months, then $9.99/month'
    )
    expect(mockPromotions.attachCheckoutSession).toHaveBeenCalledWith('red_1', 'cs_test_1')
  })

  it('says so instead of charging full price when the offer no longer applies', async () => {
    mockPromotions.getRunningPromotion.mockResolvedValue({ promotion: founding, remaining: 10 })
    mockPromotions.promotionEligibility.mockResolvedValue({
      eligible: false,
      reason: "You've already used this offer.",
    })
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'pro', usePromotion: true })
    ).rejects.toBeInstanceOf(PromotionUnavailableError)
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('frees the held place when Stripe fails to create the checkout', async () => {
    mockPromotions.getRunningPromotion.mockResolvedValue({ promotion: founding, remaining: 10 })
    mockPromotions.promotionEligibility.mockResolvedValue({ eligible: true })
    mockPromotions.reservePromotion.mockResolvedValue('red_1')
    mockStripe.coupons.retrieve.mockResolvedValue({
      valid: true,
      amount_off: 300,
      currency: 'usd',
      duration: 'repeating',
      duration_in_months: 12,
    })
    mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe is down'))
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'pro', usePromotion: true })
    ).rejects.toMatchObject({ status: 502, code: 'stripe_error' })
    expect(mockPromotions.cancelReservation).toHaveBeenCalledWith('red_1')
  })

  it('refuses a coupon that no longer matches the offer', async () => {
    mockPromotions.getRunningPromotion.mockResolvedValue({ promotion: founding, remaining: 10 })
    mockPromotions.promotionEligibility.mockResolvedValue({ eligible: true })
    mockStripe.coupons.retrieve.mockResolvedValue({
      valid: true,
      amount_off: 500,
      currency: 'usd',
      duration: 'repeating',
      duration_in_months: 12,
    })
    await expect(
      stripeService.createCheckoutSession({ ...base, plan: 'pro', usePromotion: true })
    ).rejects.toMatchObject({ code: 'promotion_misconfigured' })
  })
})

describe('confirmCheckout', () => {
  it('rejects malformed ids and other people’s checkouts', async () => {
    await expect(stripeService.confirmCheckout('u1', 'not-a-session')).rejects.toMatchObject({
      status: 404,
    })
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      status: 'complete',
      client_reference_id: 'someone-else',
      metadata: {},
    })
    await expect(stripeService.confirmCheckout('u1', 'cs_test_abc')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('confirms only once Stripe says the checkout is complete and the plan is active', async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_test_abc',
      status: 'complete',
      payment_status: 'paid',
      client_reference_id: 'u1',
      subscription: 'sub_1',
      metadata: { userId: 'u1', planId: 'pro', promotionId: 'promo_founding_pro' },
    })
    mockDb.subscription.findUnique.mockResolvedValue({ plan: 'pro', status: 'active' })
    await expect(stripeService.confirmCheckout('u1', 'cs_test_abc')).resolves.toEqual({
      state: 'confirmed',
      plan: 'pro',
    })
    expect(mockSync).toHaveBeenCalledWith('sub_1', { userId: 'u1' })
    expect(mockPromotions.confirmRedemption).toHaveBeenCalledWith('cs_test_abc', 'sub_1')
  })

  it('stays pending while the first payment is incomplete, and reports expiry', async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      status: 'complete',
      payment_status: 'unpaid',
      client_reference_id: 'u1',
      subscription: 'sub_1',
      metadata: { userId: 'u1', planId: 'pro' },
    })
    mockDb.subscription.findUnique.mockResolvedValue({ plan: 'pro', status: 'incomplete' })
    await expect(stripeService.confirmCheckout('u1', 'cs_test_abc')).resolves.toMatchObject({
      state: 'pending',
    })
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      status: 'expired',
      client_reference_id: 'u1',
      metadata: { planId: 'pro' },
    })
    await expect(stripeService.confirmCheckout('u1', 'cs_test_abc')).resolves.toMatchObject({
      state: 'expired',
    })
  })
})

describe('createPlanChangeSession', () => {
  it('only changes to plans on sale, and only for an active subscription', async () => {
    mockPurchasability.mockResolvedValue({
      plan: 'career_plus',
      purchasable: false,
      block: 'not_for_sale',
    })
    await expect(
      stripeService.createPlanChangeSession('u1', 'career_plus', base.baseUrl)
    ).rejects.toMatchObject({ code: 'not_for_sale' })

    mockPurchasability.mockResolvedValue({ plan: 'pro', purchasable: true, block: null })
    mockDb.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: null,
      stripeCustomerId: 'cus_1',
      status: 'active',
      plan: 'free',
    })
    await expect(
      stripeService.createPlanChangeSession('u1', 'pro', base.baseUrl)
    ).rejects.toMatchObject({ code: 'no_subscription' })
  })
})
