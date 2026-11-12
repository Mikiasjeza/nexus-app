'use client'

import { useCallback, useEffect, useState } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import AdminNav from '@/components/Admin/AdminNav'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import { PLAN_INFO, formatPlanPrice } from '@/lib/plans'
import type { BillingOverview } from '@/lib/billing/admin'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

const usd = (value: number) => `$${value.toFixed(2)}`
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
/** yyyy-mm-dd for a date input, in UTC. */
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

type Promotion = BillingOverview['promotions'][number]

/** Admin billing console: what's on sale, subscribers, the founding offer, usage, spend, webhooks. */
export default function BillingAdminPage() {
  const [data, setData] = useState<BillingOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<BillingOverview>('/api/admin/billing')
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(load, [load])

  if (error) return <AdminUnavailable message={error} />
  if (!data) return <Loader />

  const live = data.config.stripeMode === 'live'

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Billing"
          rule
          description="Plans on sale, subscribers, the founding-member offer, this month's usage and AI spend."
          actions={<AdminNav />}
        />

        <section aria-labelledby="sale-heading" className="mb-12">
          <h2 id="sale-heading" className="text-base font-medium">
            On sale
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Stripe is in <span className="text-ink">{data.config.stripeMode ?? 'no'}</span> mode
            {live &&
              (data.config.liveBillingApproved
                ? '; live billing is approved.'
                : '; live billing is not approved (set BILLING_LIVE_APPROVED=true), so nothing can be bought.')}
            {!live && '. Test mode: cards are never charged.'}
          </p>
          <ul className="ruled-list mt-4 border-y border-line">
            {data.config.plans
              .filter((p) => p.id !== 'free')
              .map((plan) => (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                >
                  <span>
                    {PLAN_INFO[plan.id].name} · {formatPlanPrice(PLAN_INFO[plan.id].price)}/month
                  </span>
                  <span className={plan.purchasable ? 'text-verified-ink' : 'text-ink-faint'}>
                    {plan.purchasable ? 'Can be bought' : plan.note}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <dl className="mb-12 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-line pt-6 md:grid-cols-4">
          <Stat
            label="Paying subscribers"
            value={data.subscriptions
              .filter((s) => ['active', 'past_due', 'trialing'].includes(s.status))
              .reduce((sum, s) => sum + s.count, 0)}
          />
          <Stat label="Assessments used this month" value={data.usage.formalUsed} />
          <Stat label="Accounts at their limit" value={data.usage.accountsAtLimit} />
          <Stat label="Practice rounds this month" value={data.usage.practiceRounds} />
          <Stat
            label="AI spend this month"
            value={usd(data.ai.totalUsd)}
            note={
              data.ai.budgetUsd
                ? `${Math.round((data.ai.budgetShare ?? 0) * 100)}% of ${usd(data.ai.budgetUsd)} budget`
                : 'No budget set (AI_MONTHLY_BUDGET_USD)'
            }
          />
          <Stat label="AI gradings" value={data.ai.gradingCalls} note={usd(data.ai.gradingUsd)} />
          <Stat
            label="AI verifications"
            value={data.ai.verificationCalls}
            note={usd(data.ai.verificationUsd)}
          />
          <Stat
            label="Failed webhooks (7 days)"
            value={data.webhooks.failedLastWeek}
            tone={data.webhooks.failedLastWeek > 0 ? 'caution' : undefined}
          />
        </dl>

        <section aria-labelledby="promo-heading" className="mb-12">
          <h2 id="promo-heading" className="text-base font-medium">
            Promotions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Nothing is advertised until a promotion is on, has started and hasn&apos;t ended. Each
            person can use it once, and only if they have never paid before.
          </p>
          <div className="mt-4 space-y-6">
            {data.promotions.map((promotion) => (
              <PromotionEditor key={promotion.id} promotion={promotion} onSaved={load} />
            ))}
          </div>
        </section>

        <section aria-labelledby="subs-heading" className="mb-12 grid gap-10 md:grid-cols-2">
          <div>
            <h2 id="subs-heading" className="text-base font-medium">
              Subscriptions by status
            </h2>
            {data.subscriptions.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No paid subscriptions yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {data.subscriptions.map((s) => (
                  <li key={`${s.plan}-${s.status}`} className="flex justify-between py-2">
                    <span>
                      {PLAN_INFO[s.plan].name} · {s.status}
                    </span>
                    <span className="tabular">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-base font-medium">Waitlists</h2>
            {data.waitlist.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nobody yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {data.waitlist.map((w) => (
                  <li key={w.plan} className="flex justify-between py-2">
                    <span>{PLAN_INFO[w.plan].name}</span>
                    <span className="tabular">{w.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {data.webhooks.recentFailures.length > 0 && (
          <section aria-labelledby="webhook-heading" className="mb-12">
            <h2 id="webhook-heading" className="text-base font-medium">
              Recent webhook failures
            </h2>
            <ul className="ruled-list mt-3 border-y border-line text-sm">
              {data.webhooks.recentFailures.map((f) => (
                <li key={`${f.eventType}-${f.at}`} className="py-3">
                  <p>
                    {f.eventType}{' '}
                    <span className="text-ink-faint">
                      · {formatDate(f.at)} · {f.attempts} attempts
                    </span>
                  </p>
                  {f.lastError && <p className="mt-1 text-ink-muted">{f.lastError}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppPageShell>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string | number
  note?: string
  tone?: 'caution'
}) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className={`display-number mt-2 text-3xl ${tone === 'caution' ? 'text-caution' : ''}`}>
        {value}
      </dd>
      {note && <dd className="mt-1 text-xs text-ink-faint">{note}</dd>}
    </div>
  )
}

function PromotionEditor({ promotion, onSaved }: { promotion: Promotion; onSaved: () => void }) {
  const [active, setActive] = useState(promotion.active)
  const [startsAt, setStartsAt] = useState(dateInput(promotion.startsAt))
  const [endsAt, setEndsAt] = useState(dateInput(promotion.endsAt))
  const [cap, setCap] = useState(promotion.maxRedemptions?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api(`/api/admin/billing/promotions/${promotion.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          active,
          startsAt: startsAt ? new Date(`${startsAt}T00:00:00Z`).toISOString() : null,
          endsAt: endsAt ? new Date(`${endsAt}T00:00:00Z`).toISOString() : null,
          maxRedemptions: cap === '' ? null : Number(cap),
        }),
      })
      setMessage('Saved.')
      onSaved()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {promotion.name}{' '}
          <span className="font-normal text-ink-faint">
            · {PLAN_INFO[promotion.plan].name} at {formatPlanPrice(promotion.priceCents)}/month for{' '}
            {promotion.durationMonths} months
          </span>
        </p>
        <p className="text-sm text-ink-muted">
          {promotion.redeemed} redeemed
          {promotion.pending > 0 && ` · ${promotion.pending} in checkout`}
          {promotion.maxRedemptions !== null && ` · cap ${promotion.maxRedemptions}`}
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-[#0b0b0b]"
          />
          On
        </label>
        <label className="text-sm">
          <span className="text-ink-faint">Starts (UTC)</span>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="metalab-input mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-faint">Ends (UTC)</span>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="metalab-input mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-faint">Cap (blank = none)</span>
          <input
            type="number"
            min={0}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="metalab-input mt-1"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={save} isLoading={saving}>
          Save
        </Button>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
        {promotion.stripeCouponId && (
          <p className="text-xs text-ink-faint">Stripe coupon {promotion.stripeCouponId}</p>
        )}
      </div>
    </div>
  )
}
