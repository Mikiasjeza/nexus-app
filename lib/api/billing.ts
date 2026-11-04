import { fetchApi } from './fetcher'
import type { SubscriptionPlan } from '@/lib/plans'
import type { BillingSummary, PlanOffer, ViewerBilling } from '@/lib/billing/summary'
import type { PromotionView } from '@/lib/billing/promotions'
import type { CheckoutState } from '@/lib/integrations/stripe'

export type { BillingSummary, PlanOffer, PromotionView, ViewerBilling }

export type BillingPlanId = 'pro' | 'career_plus'

export interface PlansResponse {
  plans: PlanOffer[]
  promotion: PromotionView | null
  viewer: ViewerBilling | null
  guest: boolean
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export const billingApi = {
  getPlans: (): Promise<PlansResponse> => fetchApi<PlansResponse>('/api/billing/plans'),

  getSummary: (): Promise<BillingSummary> => fetchApi<BillingSummary>('/api/billing/summary'),

  createCheckoutSession: async (
    planId: BillingPlanId,
    options: { promotion?: boolean } = {}
  ): Promise<{ url: string; promotionApplied: boolean }> => {
    return fetchApi('/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId, promotion: options.promotion === true }),
    })
  },

  createPortalSession: async (): Promise<{ url: string }> => {
    return fetchApi<{ url: string }>('/api/stripe/portal', {
      method: 'POST',
    })
  },

  changePlan: (planId: BillingPlanId): Promise<{ url: string }> =>
    fetchApi('/api/billing/change-plan', { method: 'POST', body: JSON.stringify({ planId }) }),

  checkoutStatus: (sessionId: string): Promise<{ state: CheckoutState; plan: SubscriptionPlan }> =>
    fetchApi(`/api/billing/checkout-status?session_id=${encodeURIComponent(sessionId)}`),

  joinWaitlist: (
    plan: 'career_plus' | 'business',
    companyName?: string
  ): Promise<{ joined: boolean }> =>
    fetchApi('/api/billing/waitlist', {
      method: 'POST',
      body: JSON.stringify({ plan, companyName }),
    }),

  getSubscription: async (): Promise<SubscriptionInfo> => {
    const data = await fetchApi<{ subscription: SubscriptionInfo }>('/api/stripe/subscription')
    return data.subscription
  },
}
