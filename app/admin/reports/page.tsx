'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import AdminNav from '@/components/Admin/AdminNav'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import { REPORT_REASONS, type ReportReason, type ReportStatus } from '@/lib/report-options'

type ReportRow = {
  id: string
  targetType: 'profile' | 'job' | 'company'
  targetId: string
  target: { label: string; href: string } | null
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolution: string | null
  resolvedBy: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: { name: string; email: string } | null
}

type Queue = {
  status: ReportStatus
  reports: ReportRow[]
  counts: Partial<Record<ReportStatus, number>>
}

const TABS: { status: ReportStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'actioned', label: 'Actioned' },
  { status: 'dismissed', label: 'Dismissed' },
]

const TARGET_LABEL = { profile: 'Profile', job: 'Job', company: 'Company' } as const

/** Reports people sent about profiles, jobs and companies, for an admin to review. */
export default function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('open')
  const [queue, setQueue] = useState<Queue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async (which: ReportStatus) => {
    setQueue(null)
    try {
      const res = await fetch(`/api/admin/reports?status=${which}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load')
      setQueue(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load')
    }
  }, [])

  useEffect(() => {
    load(status)
  }, [load, status])

  const resolve = async (id: string, outcome: ReportStatus) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: outcome, resolution: notes[id] ?? '' }),
      })
      if (!res.ok) throw new Error('Could not save')
      await load(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  if (error && !queue) return <AdminUnavailable message={error} />

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Reports"
          rule
          description="Profiles, jobs and companies people flagged. Look at each one, deal with it, then mark it actioned or dismissed."
          actions={<AdminNav />}
        />

        <nav aria-label="Report status" className="mb-8 flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              onClick={() => setStatus(tab.status)}
              aria-current={status === tab.status ? 'page' : undefined}
              className="pill"
            >
              {tab.label}
              {queue?.counts[tab.status] ? ` (${queue.counts[tab.status]})` : ''}
            </button>
          ))}
        </nav>

        {!queue ? (
          <Loader />
        ) : queue.reports.length === 0 ? (
          <p className="border-y border-line py-6 text-ink-muted">
            {status === 'open' ? 'Nothing to review. Nice.' : 'None yet.'}
          </p>
        ) : (
          <ul className="ruled-list border-y border-line">
            {queue.reports.map((r) => (
              <li
                key={r.id}
                className="grid gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-faint">
                    {TARGET_LABEL[r.targetType]} ·{' '}
                    {formatDistanceToNowStrict(new Date(r.createdAt), { addSuffix: true })}
                    {r.reporter ? ` · reported by ${r.reporter.name} (${r.reporter.email})` : ''}
                  </p>
                  <p className="mt-1 text-lg font-medium">
                    {r.target ? (
                      <Link href={r.target.href} target="_blank" className="hover:underline">
                        {r.target.label}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">Already removed ({r.targetId})</span>
                    )}
                  </p>
                  <p className="mt-2">{REPORT_REASONS[r.reason] ?? r.reason}</p>
                  {r.details && (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">“{r.details}”</p>
                  )}
                  {r.status !== 'open' && (
                    <p className="mt-3 text-sm text-ink-faint">
                      {r.status === 'actioned' ? 'Actioned' : 'Dismissed'} by {r.resolvedBy}
                      {r.resolution ? `: ${r.resolution}` : ''}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {r.status === 'open' ? (
                    <>
                      <label className="sr-only" htmlFor={`note-${r.id}`}>
                        Note
                      </label>
                      <textarea
                        id={`note-${r.id}`}
                        rows={2}
                        maxLength={1000}
                        placeholder="What you did (optional)"
                        value={notes[r.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        className="metalab-input resize-y py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => resolve(r.id, 'actioned')}
                          className="button-base button-primary min-h-10 px-4"
                        >
                          Actioned
                        </button>
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => resolve(r.id, 'dismissed')}
                          className="button-base button-secondary min-h-10 px-4"
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, 'open')}
                      className="button-base button-ghost min-h-10 px-4"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
