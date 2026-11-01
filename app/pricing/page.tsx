'use client'

import React, { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { PLAN_INFO, formatPlanPrice } from '@/lib/plans'
import { authApi, billingApi } from '@/lib/api'
import { useToast } from '@/components/UI/ToastProvider'
import type { User } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { cn } from '@/lib/utils/cn'

// Prices, features and limits come from lib/plans.ts, the same source Stripe
// checkout and the AI quota use. Don't hard-code plan details here.
const plans = [
  {
    ...PLAN_INFO.free,
    displayPrice: formatPlanPrice(PLAN_INFO.free.price),
    period: 'forever',
  },
  {
    ...PLAN_INFO.pro,
    displayPrice: formatPlanPrice(PLAN_INFO.pro.price),
    period: 'month',
  },
  {
    ...PLAN_INFO.enterprise,
    displayPrice: 'Custom',
    period: '',
  },
]

const features = [
  {
    title: 'Evidence-based verification',
    description: 'AI reviews the evidence you submit and explains its score.',
  },
  {
    title: 'Private by default',
    description: 'Nothing is public, or visible to employers, until you turn it on.',
  },
  {
    title: 'Job matching',
    description: 'The AI ranks open roles against your skills and explains each match.',
  },
]

const faqs = [
  {
    q: 'How do I cancel?',
    a: 'Go to Settings, then Billing, then Manage Billing, and cancel. No call or email needed. You keep paid features until the end of the period you already paid for, and you won’t be charged again.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Not on paid plans. Instead, the Free plan has no time limit and includes 10 AI verifications every month, so you can try everything before paying.',
  },
  {
    q: 'How does billing work?',
    a: 'Paid plans are billed monthly by card through Stripe, at the price shown here plus any applicable tax. They renew automatically each month until you cancel. We’ll email you at least 30 days before any price change.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade or cancel any time from Settings, then Billing, then Manage Billing.',
  },
]

export default function PricingPage() {
  const { addToast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const isSignedIn = !!user && user.id !== 'guest-user'

  const linkButtonClass = (variant: 'primary' | 'outline' = 'primary') =>
    cn(
      'button-base min-h-12 w-full px-5 text-base',
      variant === 'primary' ? 'button-primary' : 'button-secondary'
    )

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const handleCheckout = async (planId: 'professional' | 'enterprise') => {
    try {
      setLoadingPlan(planId)
      const { url } = await billingApi.createCheckoutSession(planId)
      window.location.href = url
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Pricing"
          rule
          description={
            isSignedIn
              ? 'Start free and upgrade when you need more AI checks. Upgrades go straight to Stripe checkout.'
              : 'Start free and upgrade when you need more AI checks. Create an account first; paying is optional.'
          }
        />

        <div className="grid border-y border-line md:grid-cols-3">
          {plans.map((plan, i) => (
            <section
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={`flex flex-col py-10 md:px-8 ${i > 0 ? 'border-t border-line md:border-l md:border-t-0' : 'md:pl-0'} ${i === plans.length - 1 ? 'md:pr-0' : ''}`}
            >
              <h2 id={`plan-${plan.id}`} className="text-base font-medium">
                {plan.name}
              </h2>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="display-number text-[clamp(3rem,5vw,4.5rem)] leading-none">
                  {plan.displayPrice}
                </span>
                {plan.period && (
                  <span className="text-ink-faint">
                    {plan.period === 'forever' ? 'forever' : `/ ${plan.period}`}
                  </span>
                )}
              </p>
              <p className="mt-4 text-ink-muted">{plan.description}</p>

              <ul className="mt-8 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                {plan.id === 'free' ? (
                  <Link href="/auth/register" className={linkButtonClass('outline')}>
                    Start free
                  </Link>
                ) : plan.id === 'enterprise' ? (
                  <>
                    <Link href="/contact" className={linkButtonClass('outline')}>
                      Talk to us
                    </Link>
                    <p className="mt-3 text-sm text-ink-faint">Set up through a conversation.</p>
                  </>
                ) : (
                  <>
                    {isSignedIn ? (
                      <Button
                        fullWidth
                        size="lg"
                        onClick={() => handleCheckout('professional')}
                        isLoading={loadingPlan === 'professional'}
                        disabled={loadingPlan !== null}
                      >
                        Subscribe to {plan.name}
                      </Button>
                    ) : (
                      <Link href="/auth/register" className={linkButtonClass('primary')}>
                        Create an account first
                      </Link>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-ink-faint">
                      {plan.displayPrice}/month plus applicable tax, billed when you subscribe and
                      renewing monthly until you cancel. Cancel any time in Settings.
                    </p>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>

        <section aria-labelledby="included-heading" className="py-16">
          <h2 id="included-heading" className="text-base font-medium">
            Every plan includes
          </h2>
          <dl className="mt-8 grid gap-x-10 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="border-t border-line py-6">
                <dt className="font-medium">{feature.title}</dt>
                <dd className="mt-2 leading-relaxed text-ink-muted">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="faq-heading"
          className="grid gap-8 border-t border-line py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
        >
          <h2 id="faq-heading" className="text-base font-medium">
            Questions
          </h2>
          <div className="ruled-list border-y border-line">
            {faqs.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    className="size-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 max-w-[40rem] text-sm leading-relaxed text-ink-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}
