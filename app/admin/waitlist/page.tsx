'use client'

import { useEffect, useMemo, useState } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import AdminNav from '@/components/Admin/AdminNav'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import DailyBars, { type DailySegment } from '@/components/Admin/DailyBars'

type WaitlistData = {
  confirmed: number
  pending: number
  unsubscribed: number
  period: { days: number; views: number; signups: number; conversion: number | null }
  daily: { day: string; views: number; signups: number; confirmations: number }[]
  sources: { source: string; count: number }[]
  prelaunch: boolean
  payingCustomers: { people: number; companies: number }
}

const SEGMENTS: DailySegment[] = [{ key: 'signups', label: 'Signups', color: 'var(--chart-1)' }]

/** Every day in the period, oldest first, with zeros where nothing happened. */
function fillDays(data: WaitlistData) {
  const byDay = new Map(data.daily.map((d) => [d.day, d]))
  const today = new Date()
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Array.from({ length: data.period.days }, (_, i) => {
    const date = new Date(end - (data.period.days - 1 - i) * 86_400_000).toISOString().slice(0, 10)
    const d = byDay.get(date)
    return { date, signups: d?.signups ?? 0, views: d?.views ?? 0 }
  })
}

/** Admin: launch waitlist numbers, paying customers kept in pre-launch, CSV export. */
export default function WaitlistAdminPage() {
  const [data, setData] = useState<WaitlistData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/waitlist', { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || res.statusText)
        setData(body as WaitlistData)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const days = useMemo(() => (data ? fillDays(data) : []), [data])

  if (error) return <AdminUnavailable message={error} />
  if (!data) return <Loader />

  const conversion =
    data.period.conversion === null ? '–' : `${(data.period.conversion * 100).toFixed(1)}%`

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Launch waitlist"
          rule
          description="People waiting for Nexus to open, how the Coming Soon page is doing, and who keeps access in pre-launch mode."
          actions={<AdminNav />}
        />

        <p className="mb-8 text-sm text-ink-muted">
          Pre-launch mode is{' '}
          <span className={data.prelaunch ? 'text-verified-ink' : 'text-ink'}>
            {data.prelaunch ? 'on' : 'off'}
          </span>
          .{' '}
          {data.prelaunch
            ? 'Visitors see the Coming Soon page. Admins, allowlisted emails and paying customers can still sign in.'
            : 'Nexus is open to everyone. Set PRELAUNCH_MODE=true in Vercel to show the Coming Soon page.'}
        </p>

        <dl className="mb-12 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-line pt-6 md:grid-cols-4">
          <Stat label="Confirmed on the list" value={data.confirmed} />
          <Stat label="Waiting to confirm" value={data.pending} />
          <Stat label="Unsubscribed" value={data.unsubscribed} />
          <Stat
            label={`Conversion (${data.period.days} days)`}
            value={conversion}
            note={`${data.period.signups} signups from ${data.period.views} page views`}
          />
          <Stat
            label="Paying people"
            value={data.payingCustomers.people}
            note="Keep full access in pre-launch mode"
          />
          <Stat
            label="Paying companies"
            value={data.payingCustomers.companies}
            note="Their members keep access too"
          />
        </dl>

        <section aria-labelledby="daily-heading" className="mb-12">
          <h2 id="daily-heading" className="mb-4 text-base font-medium">
            Signups each day
          </h2>
          <DailyBars
            days={days}
            segments={SEGMENTS}
            caption={`Waitlist signups each day for the last ${data.period.days} days`}
            emptyMessage={`Nobody has joined in the last ${data.period.days} days.`}
          />
        </section>

        <section aria-labelledby="sources-heading" className="mb-12 grid gap-10 md:grid-cols-2">
          <div>
            <h2 id="sources-heading" className="text-base font-medium">
              Where confirmed signups came from
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              From the link&apos;s <code>utm_source</code>, for example{' '}
              <code>nexusverified.com/?utm_source=linkedin</code>.
            </p>
            {data.sources.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nobody yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {data.sources.map((s) => (
                  <li key={s.source} className="flex justify-between py-2">
                    <span>{s.source}</span>
                    <span className="tabular">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-base font-medium">Export</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Confirmed, still-subscribed emails with when they agreed. Each download is recorded in
              the audit log. Keep the file private and delete it when you&apos;re done.
            </p>
            <a
              href="/api/admin/waitlist/export"
              className="button-base button-accent mt-4 inline-flex min-h-11 items-center px-5"
              download
            >
              Download CSV
            </a>
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className="display-number mt-2 text-3xl">{value}</dd>
      {note && <dd className="mt-1 text-xs text-ink-faint">{note}</dd>}
    </div>
  )
}
