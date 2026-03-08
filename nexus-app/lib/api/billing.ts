import { fetchApi } from './fetcher'

export type BillingPlanId = 'pro' | 'enterprise' | 'professional'

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export const billingApi = {
  createCheckoutSession: async (planId: BillingPlanId): Promise<{ url: string }> => {
    return fetchApi<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    })
  },

  createPortalSession: async (): Promise<{ url: string }> => {
    return fetchApi<{ url: string }>('/api/stripe/portal', {
      method: 'POST',
    })
  },

  getSubscription: async (): Promise<SubscriptionInfo> => {
    const data = await fetchApi<{ subscription: SubscriptionInfo }>('/api/stripe/subscription')
    return data.subscription
  },
}
