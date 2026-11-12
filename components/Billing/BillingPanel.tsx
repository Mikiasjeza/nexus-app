'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { billingApi, type BillingSummary } from '@/lib/api/billing'
import { ENTITLEMENT_LABELS, PLAN_INFO, formatPlanPrice } from '@/lib/plans'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed',
  unpaid: 'Unpaid',
  incomplete: 'Awaiting payment',
  incomplete_expired: 'Checkout expired',
  canceled: 'Cancelled',
  paused: 'Paused',
}

/** How long the page waits for Stripe to confirm a checkout before saying it's still pending. */
const CONFIRM_POLLS = 30
const CONFIRM_INTERVAL_MS = 2000

type Confirming = 'idle' | 'checking' | 'slow'

/**
 * The billing section of Settings. Everything shown comes from
 * /api/billing/summary, which reads the real subscription and usage records;
 * a finished checkout is only called a success once Stripe confirms it.
 */
export default function BillingPanel({ disabled = false }: { disabled?: boolean }) {
  const { addToast } = useToast()
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [confirming, setConfirming] = useState<Confirming>('idle')
  const started = useRef(false)

  const load = useCallback(async () => {
    try {
      setSummary(await billingApi.getSummary())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Billing details are unavailable right now.')
    }
  }, [])

  useEffect(() => {
    if (disabled) return
    load()
  }, [disabled, load])

  // Coming back from Stripe Checkout: confirm with Stripe before celebrating.
  useEffect(() => {
    if (disabled || started.current) return
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('checkout')
    const planChanged = params.get('plan_change') === 'done'
    if (!sessionId && !planChanged) return
    started.current = true
    const clearParams = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('plan_change')
      window.history.replaceState({}, '', url.toString())
    }

    if (planChanged) {
      clearParams()
      addToast({
        type: 'info',
        title: 'Plan change submitted',
        message: 'Your plan here updates as soon as Stripe confirms it.',
      })
      setTimeout(load, CONFIRM_INTERVAL_MS)
      return
    }

    let cancelled = false
    setConfirming('checking')
    const poll = async (attempt: number) => {
      if (cancelled) return
      try {
        const { state, plan } = await billingApi.checkoutStatus(sessionId!)
        if (state === 'confirmed') {
          clearParams()
          setConfirming('idle')
          addToast({
            type: 'success',
            title: `Welcome to ${PLAN_INFO[plan].name}`,
            message: 'Stripe confirmed your payment. Your new plan is active.',
          })
          load()
          return
        }
        if (state === 'expired') {
          clearParams()
          setConfirming('idle')
          addToast({
            type: 'info',
            title: 'Checkout expired',
            message: 'That checkout ended without payment. You haven’t been charged.',
          })
          return
        }
      } catch {
        // Keep waiting; a transient error shouldn't end confirmation early.
      }
      if (attempt + 1 >= CONFIRM_POLLS) {
        setConfirming('slow')
        return
      }
      setTimeout(() => poll(attempt + 1), CONFIRM_INTERVAL_MS)
    }
    poll(0)
    return () => {
      cancelled = true
    }
  }, [disabled, addToast, load])

  const openPortal = async () => {
    setOpening(true)
    try {
      const { url } = await billingApi.createPortalSession()
      window.location.href = url
    } catch (e) {
      setOpening(false)
      addToast({
        type: 'error',
        title: 'Billing portal unavailable',
        message: e instanceof Error ? e.message : 'Please try again.',
      })
    }
  }

  if (disabled) {
    return <p className="text-sm text-ink-muted">Billing is off in the guest preview.</p>
  }
  if (error && !summary) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">{error}</p>
        <button type="button" className="pill" onClick={load}>
          Try again
        </button>
      </div>
    )
  }
  if (!summary) {
    return <div className="h-40 animate-pulse rounded-lg bg-raised" aria-hidden />
  }

  const plan = PLAN_INFO[summary.plan]
  const sub = summary.subscription
  const paying = Boolean(sub?.hasStripeSubscription)
  const allowance = summary.allowance
  const lapsed = sub && sub.plan !== 'free' && summary.plan === 'free'

  return (
    <div className="space-y-8">
      {confirming !== 'idle' && (
        <p role="status" className="rounded-lg bg-raised px-4 py-3 text-sm text-ink-muted">
          {confirming === 'checking'
            ? 'Confirming your payment with Stripe…'
            : 'Stripe hasn’t confirmed your payment yet. This page will show your new plan once it does; refresh in a minute. You won’t be charged twice.'}
        </p>
      )}

      {sub?.pastDue && (
        <div role="alert" className="rounded-lg border border-caution/40 px-4 py-3 text-sm">
          <p className="font-medium text-caution">Your last payment failed</p>
          <p className="mt-1 text-ink-muted">
            Stripe will retry your card.{' '}
            {sub.graceEndsAt &&
              `Your ${PLAN_INFO[sub.plan].name} features stay on until ${formatDate(sub.graceEndsAt)}. `}
            Update your payment details to keep them.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">
            {plan.name}
            {sub && sub.plan !== 'free' && (
              <span className="font-normal text-ink-faint">
                {' '}
                · {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {summary.plan === 'free'
              ? lapsed
                ? `Your ${PLAN_INFO[sub!.plan].name} plan has ended. You’re on Free.`
                : 'Free forever. No card on file needed.'
              : `${formatPlanPrice(sub?.priceCents ?? plan.price)} per month${
                  sub?.promotion
                    ? ` (${sub.promotion.name} price${
                        sub.promotion.endsAt
                          ? ` until ${formatDate(sub.promotion.endsAt)}, then ${formatPlanPrice(sub.regularPriceCents)}`
                          : ''
                      })`
                    : ''
                }`}
          </p>
          {sub?.currentPeriodEnd && paying && (
            <p className="mt-1 text-sm text-ink-muted">
              {sub.cancelAtPeriodEnd
                ? `Cancelled. Paid features end on ${formatDate(sub.currentPeriodEnd)}; you won’t be charged again.`
                : `Renews on ${formatDate(sub.currentPeriodEnd)}.`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {paying || sub?.pastDue ? (
            <Button variant="secondary" onClick={openPortal} isLoading={opening} disabled={opening}>
              Manage billing
            </Button>
          ) : null}
          {summary.plan === 'free' && !paying && (
            <Link href="/pricing" className="button-base button-primary min-h-11 px-5">
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {allowance && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">Formal assessments this month</p>
            <p className="tabular text-sm text-ink-muted">
              {allowance.used} of {allowance.limit} used
            </p>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-pill"
            role="meter"
            aria-label="Formal assessments used this month"
            aria-valuemin={0}
            aria-valuemax={allowance.limit}
            aria-valuenow={allowance.used}
          >
            <div
              className="h-full rounded-full bg-verified transition-[width] duration-500"
              style={{
                width: `${allowance.limit ? Math.min(100, (allowance.used / allowance.limit) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-faint">
            {allowance.remaining > 0 ? `${allowance.remaining} left. ` : 'None left this month. '}
            Resets on {formatDate(allowance.resetsAt)}.
            {allowance.remaining === 0 && allowance.upgradeTo && (
              <>
                {' '}
                <Link href="/pricing" className="underline underline-offset-2 hover:text-ink">
                  {PLAN_INFO[allowance.upgradeTo].name} includes{' '}
                  {PLAN_INFO[allowance.upgradeTo].limits.formalAssessments}
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}

      <dl className="grid gap-x-10 gap-y-4 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-faint">AI evidence verifications</dt>
          <dd className="tabular mt-1 text-sm">
            {summary.aiVerifications.used} of {summary.aiVerifications.limit} this month
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Credentials</dt>
          <dd className="mt-1 text-sm">Yours to keep on every plan</dd>
        </div>
      </dl>

      <div className="border-t border-line pt-6">
        <p className="text-sm font-medium">
          {summary.entitlements.length > 0 ? 'Included in your plan' : 'Available on Pro'}
        </p>
        <ul className="mt-3 space-y-2">
          {(summary.entitlements.length > 0
            ? summary.entitlements
            : PLAN_INFO.pro.entitlements
          ).map((entitlement) => (
            <li
              key={entitlement}
              className={`flex gap-3 text-sm ${summary.entitlements.length > 0 ? '' : 'text-ink-faint'}`}
            >
              <Check
                className={`mt-0.5 size-4 shrink-0 ${summary.entitlements.length > 0 ? 'text-verified-ink' : ''}`}
                aria-hidden
              />
              {ENTITLEMENT_LABELS[entitlement]}
            </li>
          ))}
        </ul>
        {summary.waitlist.length > 0 && (
          <p className="mt-4 text-sm text-ink-faint">
            You’re on the waitlist for{' '}
            {summary.waitlist.map((p) => PLAN_INFO[p].name).join(' and ')}.
          </p>
        )}
      </div>

      {summary.history.length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-sm font-medium">Usage history</p>
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">Formal assessments and practice rounds by month</caption>
            <thead className="text-ink-faint">
              <tr>
                <th scope="col" className="py-2 font-normal">
                  Month
                </th>
                <th scope="col" className="py-2 font-normal">
                  Plan
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Assessments
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Practice rounds
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {summary.history.map((month) => (
                <tr key={month.periodStart} className="border-t border-line">
                  <td className="py-2">{formatMonth(month.periodStart)}</td>
                  <td className="py-2 text-ink-muted">
                    {month.plan ? PLAN_INFO[month.plan].name : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {month.limit === null ? month.used : `${month.used} / ${month.limit}`}
                  </td>
                  <td className="py-2 text-right">{month.practiceRounds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
