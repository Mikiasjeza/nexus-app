'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Clock } from 'lucide-react'
import Button from '@/components/UI/Button'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { useToast } from '@/components/UI/ToastProvider'
import { billingApi, type PlansResponse } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/fetcher'
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice, type SubscriptionPlan } from '@/lib/plans'
import { cn } from '@/lib/utils/cn'

// Prices, features and limits come from lib/plans.ts, the same source Stripe
// checkout and the entitlement checks use. Whether a plan can be bought, the
// founding offer and the visitor's own plan come from /api/billing/plans.

const linkButtonClass = (variant: 'primary' | 'secondary' = 'primary') =>
  cn(
    'button-base min-h-12 w-full px-5 text-base',
    variant === 'primary' ? 'button-primary' : 'button-secondary'
  )

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

const everyPlan = [
  {
    title: 'Credentials you keep',
    description:
      'Credentials you earn stay valid for their full 24 months and can always be verified, whether or not you subscribe.',
  },
  {
    title: 'Private by default',
    description: 'Nothing is public, or visible to employers, until you turn it on.',
  },
  {
    title: 'Practice never counts',
    description: 'Practice rounds are free on every plan and never use your monthly assessments.',
  },
]

const baseFaqs = [
  {
    q: 'What counts as a formal assessment?',
    a: 'A formal assessment is a timed assessment that can earn a credential. It counts when you start the timer, not when you open the page, so you can read the brief and leave without using one. Practice rounds never count.',
  },
  {
    q: 'When does my allowance reset?',
    a: 'On the 1st of every month (UTC), on every plan. Unused assessments don’t roll over. If you upgrade partway through a month, the bigger allowance applies straight away.',
  },
  {
    q: 'What if something goes wrong during an assessment?',
    a: 'If our system fails to grade your attempt, it doesn’t count and we grade it again once the problem is fixed. Letting the time run out does count, because you’ve already seen the task.',
  },
  {
    q: 'Do I keep my credentials if I cancel?',
    a: 'Yes. Credentials you’ve earned stay valid until they expire and anyone can still verify them. We never charge you to keep a credential you’ve earned. Cancelling only switches off paid extras such as detailed feedback, reports and growth analytics.',
  },
  {
    q: 'How do I cancel?',
    a: 'Go to Settings, then Billing, then Manage billing, and cancel. No call or email needed. You keep paid features until the end of the period you already paid for, and you won’t be charged again.',
  },
  {
    q: 'How does billing work?',
    a: 'Paid plans are billed monthly by card through Stripe, at the price shown here plus any applicable tax. They renew automatically each month until you cancel. We’ll email you at least 30 days before any price change.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade or cancel any time from Settings, then Billing. Stripe shows the prorated amount before you confirm a change.',
  },
  {
    q: 'When will Career+ and Business open?',
    a: 'Career+ opens once its career-planning features are ready, and Business once employer assessments are ready and validated. Join a waitlist to hear first. We never charge for features that aren’t ready.',
  },
]

export default function PricingPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<PlansResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [waitlisted, setWaitlisted] = useState<SubscriptionPlan[]>([])

  const load = useCallback(async () => {
    try {
      const next = await billingApi.getPlans()
      setData(next)
      setWaitlisted(next.viewer?.waitlist ?? [])
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') === 'cancelled') {
      addToast({
        type: 'info',
        title: 'Checkout cancelled',
        message: 'You haven’t been charged.',
      })
    }
  }, [addToast])

  const viewer = data?.viewer ?? null
  const signedIn = Boolean(viewer)
  const current = viewer?.plan ?? null
  const hasLiveSubscription = viewer?.subscription?.hasStripeSubscription ?? false
  const promotion = data?.promotion ?? null
  // Only advertise the founding offer to people it applies to.
  const offerForViewer =
    promotion && (!signedIn || viewer?.promotion?.eligible) && !hasLiveSubscription
      ? promotion
      : null
  const offerFor = (id: SubscriptionPlan) => data?.plans.find((p) => p.id === id) ?? null
  const proOnSale = offerFor('pro')?.purchasable ?? false

  const fail = (title: string, error: unknown) =>
    addToast({
      type: 'error',
      title,
      message: error instanceof Error ? error.message : 'Please try again.',
    })

  const checkout = async (plan: 'pro' | 'career_plus') => {
    setBusy(plan)
    try {
      const { url } = await billingApi.createCheckoutSession(plan, {
        promotion: plan === 'pro' && Boolean(offerForViewer),
      })
      window.location.href = url
    } catch (error) {
      setBusy(null)
      if (error instanceof ApiError && error.code === 'promotion_unavailable') {
        addToast({
          type: 'warning',
          title: 'Offer no longer available',
          message: `${error.message} The regular price is shown now.`,
        })
        load()
        return
      }
      fail('Checkout failed', error)
    }
  }

  const manageBilling = async () => {
    setBusy('manage')
    try {
      const { url } = await billingApi.createPortalSession()
      window.location.href = url
    } catch (error) {
      setBusy(null)
      fail('Billing portal unavailable', error)
    }
  }

  const changePlan = async (plan: 'pro' | 'career_plus') => {
    setBusy(plan)
    try {
      const { url } = await billingApi.changePlan(plan)
      window.location.href = url
    } catch (error) {
      setBusy(null)
      fail('Plan change unavailable', error)
    }
  }

  const joinWaitlist = async (plan: 'career_plus' | 'business') => {
    setBusy(`waitlist-${plan}`)
    try {
      await billingApi.joinWaitlist(plan)
      setWaitlisted((list) => Array.from(new Set([...list, plan])))
      addToast({
        type: 'success',
        title: 'You’re on the waitlist',
        message: `We’ll email you when ${PLAN_INFO[plan].name} opens.`,
      })
    } catch (error) {
      fail('Couldn’t join the waitlist', error)
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null || loading

  function action(plan: SubscriptionPlan): React.ReactNode {
    const info = PLAN_INFO[plan]
    const offer = offerFor(plan)
    const isCurrent = current === plan && (plan !== 'free' || !hasLiveSubscription)

    if (plan === 'free') {
      if (!signedIn) {
        return (
          <Link href="/auth/register" className={linkButtonClass('secondary')}>
            Get Started
          </Link>
        )
      }
      return isCurrent ? (
        <CurrentPlan />
      ) : (
        <p className="text-sm text-ink-faint">Everything in Free is included in your plan.</p>
      )
    }

    if (plan === 'business') {
      const joined = waitlisted.includes('business')
      return (
        <div className="space-y-3">
          <Link href="/contact" className={linkButtonClass('secondary')}>
            Contact Sales
          </Link>
          {signedIn ? (
            <Button
              fullWidth
              size="lg"
              variant="ghost"
              onClick={() => joinWaitlist('business')}
              isLoading={busy === 'waitlist-business'}
              disabled={disabled || joined}
            >
              {joined ? 'You’re on the waitlist' : 'Join Waitlist'}
            </Button>
          ) : (
            <Link href="/auth/register" className={linkButtonClass('secondary')}>
              Join Waitlist
            </Link>
          )}
        </div>
      )
    }

    // Individual paid plans: pro and career_plus.
    const label = `Upgrade to ${info.name}`
    if (info.availability !== 'available') {
      const joined = waitlisted.includes(plan)
      return signedIn ? (
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => joinWaitlist(plan as 'career_plus')}
          isLoading={busy === `waitlist-${plan}`}
          disabled={disabled || joined}
        >
          {joined ? 'You’re on the waitlist' : 'Join Waitlist'}
        </Button>
      ) : (
        <Link href="/auth/register" className={linkButtonClass('secondary')}>
          Join Waitlist
        </Link>
      )
    }
    if (!signedIn) {
      return (
        <>
          <Link href="/auth/register" className={linkButtonClass('primary')}>
            {label}
          </Link>
          <p className="mt-3 text-sm text-ink-faint">You’ll create a free account first.</p>
        </>
      )
    }
    if (isCurrent) {
      return (
        <div className="space-y-3">
          <CurrentPlan />
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            onClick={manageBilling}
            isLoading={busy === 'manage'}
            disabled={disabled}
          >
            Manage billing
          </Button>
        </div>
      )
    }
    if (hasLiveSubscription && current === 'free') {
      // A subscription exists but isn't paying (failed payment): fix it, don't start another.
      return (
        <Button
          fullWidth
          size="lg"
          onClick={manageBilling}
          isLoading={busy === 'manage'}
          disabled={disabled}
        >
          Fix billing
        </Button>
      )
    }
    if (!offer?.purchasable) {
      return (
        <>
          <Button fullWidth size="lg" disabled>
            {label}
          </Button>
          <p className="mt-3 text-sm text-ink-faint">{offer?.note ?? 'Not on sale yet.'}</p>
        </>
      )
    }
    if (hasLiveSubscription) {
      return (
        <Button
          fullWidth
          size="lg"
          onClick={() => changePlan(plan as 'pro' | 'career_plus')}
          isLoading={busy === plan}
          disabled={disabled}
        >
          {current && PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(current)
            ? `Switch to ${info.name}`
            : label}
        </Button>
      )
    }
    return (
      <Button
        fullWidth
        size="lg"
        onClick={() => checkout(plan as 'pro' | 'career_plus')}
        isLoading={busy === plan}
        disabled={disabled}
      >
        {label}
      </Button>
    )
  }

  const faqs = offerForViewer
    ? [
        ...baseFaqs.slice(0, 5),
        { q: `What is the ${offerForViewer.name.toLowerCase()} price?`, a: offerForViewer.terms },
        ...baseFaqs.slice(5),
      ]
    : baseFaqs

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Pricing"
          rule
          description="Start free, earn credentials you keep, and upgrade when you want more assessments and deeper feedback."
        />

        {offerForViewer && proOnSale && (
          <section
            aria-labelledby="offer-heading"
            className="plan-rise mb-10 flex flex-col gap-2 rounded-lg border border-verified/40 bg-raised px-6 py-5 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div>
              <h2 id="offer-heading" className="font-medium text-verified-ink">
                {offerForViewer.name} offer
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{offerForViewer.terms}</p>
            </div>
            <p className="shrink-0 text-sm text-ink-faint">
              {offerForViewer.remaining !== null && `${offerForViewer.remaining} places left`}
              {offerForViewer.remaining !== null && offerForViewer.endsAt && ' · '}
              {offerForViewer.endsAt && `Ends ${formatDate(offerForViewer.endsAt)}`}
            </p>
          </section>
        )}

        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((id, index) => {
            const plan = PLAN_INFO[id]
            const showOffer = id === 'pro' && offerForViewer && proOnSale
            const isCurrent = current === id && (id !== 'free' || !hasLiveSubscription)
            return (
              <section
                key={id}
                aria-labelledby={`plan-${id}`}
                style={{ '--rise-index': index } as React.CSSProperties}
                className={cn(
                  'plan-rise flex flex-col bg-ground p-6 lg:p-8',
                  plan.recommended && 'bg-raised'
                )}
              >
                <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                  <h2 id={`plan-${id}`} className="text-base font-medium">
                    {plan.name}
                  </h2>
                  {isCurrent ? (
                    <Badge tone="current">Current plan</Badge>
                  ) : plan.recommended ? (
                    <Badge tone="accent">Recommended</Badge>
                  ) : plan.availability === 'coming_soon' ? (
                    <Badge>Coming soon</Badge>
                  ) : plan.availability === 'waitlist' ? (
                    <Badge>Waitlist</Badge>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="display-number text-[clamp(2.75rem,4vw,3.75rem)] leading-none">
                      {formatPlanPrice(showOffer ? offerForViewer.priceCents : plan.price)}
                    </span>
                    <span className="text-ink-faint">/ month</span>
                    {showOffer && (
                      <span className="text-ink-faint line-through decoration-ink-faint">
                        <span className="sr-only">Regular price </span>
                        {formatPlanPrice(plan.price)}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 min-h-5 text-sm text-ink-faint">
                    {showOffer
                      ? `For your first ${offerForViewer.durationMonths} months, then ${formatPlanPrice(plan.price)}/month`
                      : id === 'business'
                        ? 'Per organization'
                        : id === 'free'
                          ? 'No card needed'
                          : plan.availability === 'available'
                            ? 'Billed monthly, cancel any time'
                            : 'Billed monthly once it opens'}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{plan.description}</p>

                <div className="mt-6">{loading ? <ActionSkeleton /> : action(id)}</div>

                {plan.features.length > 0 && (
                  <ul className="mt-8 space-y-2.5" aria-label={`${plan.name} includes`}>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-verified-ink" aria-hidden />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {plan.comingSoon.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">
                      {plan.availability === 'available' ? 'Coming soon' : 'Planned'}
                    </p>
                    <ul className="mt-3 space-y-2.5" aria-label={`${plan.name}: planned`}>
                      {plan.comingSoon.map((feature) => (
                        <li key={feature} className="flex gap-3 text-sm text-ink-faint">
                          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <p className="mt-6 max-w-[48rem] text-sm leading-relaxed text-ink-faint">
          Prices in US dollars. Paid plans are billed monthly through Stripe, plus any applicable
          tax, and renew automatically until you cancel. Cancel any time in Settings, then Billing.
          Nothing is charged until you confirm on Stripe’s checkout page.
        </p>

        <section aria-labelledby="included-heading" className="py-16">
          <h2 id="included-heading" className="text-base font-medium">
            Every plan includes
          </h2>
          <dl className="mt-8 grid gap-x-10 md:grid-cols-3">
            {everyPlan.map((feature) => (
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

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'accent' | 'current' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs',
        tone === 'accent' && 'bg-verified/15 text-verified-ink',
        tone === 'current' && 'bg-ink text-ground',
        !tone && 'bg-pill text-ink-muted'
      )}
    >
      {children}
    </span>
  )
}

function CurrentPlan() {
  return (
    <p className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm text-ink-muted">
      Your current plan
    </p>
  )
}

function ActionSkeleton() {
  return <div className="h-12 w-full animate-pulse rounded-full bg-pill" aria-hidden />
}
