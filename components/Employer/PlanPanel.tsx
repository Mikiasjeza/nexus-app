'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Button from '@/components/UI/Button'
import { PLAN_INFO, formatPlanPrice, type SubscriptionPlan } from '@/lib/plans'

type Billing = {
  plan: SubscriptionPlan
  openJobs: { used: number; limit: number }
  teamSeats: { used: number; limit: number }
  subscribed: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  canManage: boolean
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0
  const full = !unlimited && used >= limit
  return (
    <div className="py-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-medium ${full ? 'text-critical' : ''}`}>
        {used}
        <span className="text-base text-ink-faint"> / {unlimited ? 'unlimited' : limit}</span>
      </p>
    </div>
  )
}

/** The company's plan: what it includes, what's in use, and upgrade or manage. */
export default function PlanPanel() {
  const params = useSearchParams()
  const [billing, setBilling] = useState<Billing | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/employer/billing', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setBilling(data)
    else setError(data.error || 'Could not load your plan')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Stripe confirms through the webhook, which can land a moment after the redirect.
  useEffect(() => {
    if (params.get('checkout') !== 'success') return
    const timer = setTimeout(load, 4000)
    return () => clearTimeout(timer)
  }, [params, load])

  const go = async (path: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(path, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Something went wrong')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const business = PLAN_INFO.business
  const checkout = params.get('checkout')

  return (
    <section
      id="plan"
      aria-labelledby="plan-heading"
      className="scroll-mt-20 border-t border-line py-12"
    >
      <h2 id="plan-heading" className="text-base font-medium">
        Plan
      </h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Free covers {PLAN_INFO.free.limits.openJobs} open job and {PLAN_INFO.free.limits.teamSeats}{' '}
        people. Business is {formatPlanPrice(business.price)} a month for unlimited jobs and up to{' '}
        {business.limits.teamSeats} teammates.
      </p>

      {checkout === 'success' && (
        <p role="status" className="mt-4 text-sm text-ink">
          Thanks. Your payment went through; Business turns on as soon as Stripe confirms it.
        </p>
      )}
      {checkout === 'cancelled' && (
        <p role="status" className="mt-4 text-sm text-ink-muted">
          Checkout was cancelled. Nothing was charged.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-critical">
          {error}
        </p>
      )}

      {billing && (
        <div className="mt-6 max-w-3xl">
          <p className="font-display text-3xl font-medium">
            {PLAN_INFO[billing.plan]?.name ?? 'Free'}
          </p>
          {billing.subscribed && billing.currentPeriodEnd && (
            <p className="mt-1 text-sm text-ink-muted">
              {billing.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
              {format(new Date(billing.currentPeriodEnd), 'd MMMM yyyy')}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 border-y border-line">
            <Usage label="Open jobs" {...billing.openJobs} />
            <Usage label="Team (including invites)" {...billing.teamSeats} />
          </div>

          {billing.canManage ? (
            <div className="mt-6">
              {billing.subscribed ? (
                <Button
                  variant="secondary"
                  onClick={() => go('/api/employer/billing/portal')}
                  isLoading={busy}
                >
                  Manage billing
                </Button>
              ) : (
                <Button onClick={() => go('/api/employer/billing/checkout')} isLoading={busy}>
                  Upgrade to Business, {formatPlanPrice(business.price)}/month
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-muted">
              Only the owner or an admin can change the plan.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
