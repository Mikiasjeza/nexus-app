/**
 * @jest-environment node
 */

const mockSync = jest.fn()
const mockConfirm = jest.fn()
const mockExpire = jest.fn()

jest.mock('@sentry/nextjs', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@/lib/billing/sync', () => ({
  syncStripeSubscription: (...a: unknown[]) => mockSync(...a),
}))
jest.mock('@/lib/billing/promotions', () => ({
  confirmRedemption: (...a: unknown[]) => mockConfirm(...a),
  expireRedemption: (...a: unknown[]) => mockExpire(...a),
}))
jest.mock('@/lib/billing/stripe-client', () => ({
  idOf: (v: unknown) => (typeof v === 'string' ? v : ((v as { id?: string })?.id ?? null)),
}))

import {
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handleInvoiceEvent,
  handlePaymentFailed,
  handleSubscriptionChanged,
} from '@/lib/integrations/stripe-webhook-handlers'

beforeEach(() => jest.clearAllMocks())

describe('stripe webhook handlers', () => {
  it('syncs the new subscription when checkout completes, with the owner as a hint', async () => {
    await handleCheckoutCompleted({
      id: 'cs_test_1',
      mode: 'subscription',
      subscription: 'sub_1',
      client_reference_id: 'u1',
      payment_status: 'paid',
      metadata: { userId: 'u1', planId: 'pro' },
    } as never)
    expect(mockSync).toHaveBeenCalledWith('sub_1', { userId: 'u1', companyId: undefined })
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('turns a held promotion place into a redemption only after payment', async () => {
    const session = {
      id: 'cs_test_2',
      mode: 'subscription',
      subscription: 'sub_2',
      metadata: { userId: 'u1', planId: 'pro', promotionId: 'promo_founding_pro' },
    }
    await handleCheckoutCompleted({ ...session, payment_status: 'unpaid' } as never)
    expect(mockConfirm).not.toHaveBeenCalled()
    await handleCheckoutCompleted({ ...session, payment_status: 'paid' } as never)
    expect(mockConfirm).toHaveBeenCalledWith('cs_test_2', 'sub_2')
  })

  it('ignores one-off payment checkouts', async () => {
    await handleCheckoutCompleted({ id: 'cs', mode: 'payment', metadata: {} } as never)
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('frees a held promotion place when checkout expires', async () => {
    await handleCheckoutExpired({ id: 'cs_test_3' } as never)
    expect(mockExpire).toHaveBeenCalledWith('cs_test_3')
  })

  it('re-reads the subscription for every subscription event', async () => {
    await handleSubscriptionChanged({ id: 'sub_9', customer: 'cus_9' } as never)
    expect(mockSync).toHaveBeenCalledWith('sub_9')
  })

  it('syncs on paid and failed invoices, and skips invoices without a subscription', async () => {
    await handleInvoiceEvent({ subscription: 'sub_1' } as never)
    await handlePaymentFailed({ subscription: { id: 'sub_2' }, attempt_count: 2 } as never)
    await handleInvoiceEvent({ subscription: null } as never)
    expect(mockSync.mock.calls).toEqual([['sub_1'], ['sub_2']])
  })

  it('finds the subscription where newer Stripe API versions put it', async () => {
    // Webhooks on API versions from 2025-03-31 (e.g. 2026-01-28.clover) drop invoice.subscription.
    await handleInvoiceEvent({
      parent: { subscription_details: { subscription: 'sub_new' } },
    } as never)
    await handlePaymentFailed({
      parent: { subscription_details: { subscription: { id: 'sub_new_obj' } } },
      attempt_count: 1,
    } as never)
    await handleInvoiceEvent({ parent: { subscription_details: null } } as never)
    expect(mockSync.mock.calls).toEqual([['sub_new'], ['sub_new_obj']])
  })
})
