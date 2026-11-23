'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import { canManageHiring } from '@/lib/employer/roles'

type Status = 'submitted' | 'shortlisted' | 'rejected'
type Applicant = {
  id: string
  status: Status
  message: string | null
  appliedAt: string
  candidateId: string
  name: string
  email: string
  passportPath: string
  verifiedSkills: string[]
  skillCount: number
}
type Data = {
  job: { id: string; title: string; status: string; skills: string[] }
  role: string
  applicants: Applicant[]
}

const FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'New' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'rejected', label: 'Not a fit' },
]

const STATUS_LABEL: Record<Status, string> = {
  submitted: 'New',
  shortlisted: 'Shortlisted',
  rejected: 'Not a fit',
}

/** Everyone who applied to one job, with their verified skills and a status for each. */
export default function ApplicantsPage() {
  const id = String(useParams().id ?? '')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/employer/jobs/${id}/applicants`, { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) setData(json)
    else setError(json.error || 'Could not load applicants')
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (applicationId: string, status: Status) => {
    setBusy(applicationId)
    try {
      const res = await fetch(`/api/employer/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save')
      setData((d) =>
        d
          ? {
              ...d,
              applicants: d.applicants.map((a) => (a.id === applicationId ? { ...a, status } : a)),
            }
          : d
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  if (!data) {
    return (
      <AppPageShell>
        <div className="page-shell">
          {error ? <PageHeader title="Applicants" rule description={error} /> : <Loader />}
        </div>
      </AppPageShell>
    )
  }

  const editable = canManageHiring(data.role)
  const shown = data.applicants.filter((a) => filter === 'all' || a.status === filter)
  const count = (s: Status | 'all') =>
    s === 'all' ? data.applicants.length : data.applicants.filter((a) => a.status === s).length

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title={data.job.title}
          rule
          description={`${data.applicants.length} ${data.applicants.length === 1 ? 'applicant' : 'applicants'}${data.job.status === 'closed' ? ' · this role is closed' : ''}`}
          actions={
            <Link href="/employer/jobs" className="button-base button-secondary min-h-11 px-5">
              All jobs
            </Link>
          }
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-critical">
            {error}
          </p>
        )}

        <nav aria-label="Filter applicants" className="mb-8 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-current={filter === f.id ? 'page' : undefined}
              className="pill"
            >
              {f.label} ({count(f.id)})
            </button>
          ))}
        </nav>

        {shown.length === 0 ? (
          <p className="border-y border-line py-6 text-ink-muted">
            {data.applicants.length === 0
              ? 'No one has applied yet. Candidates can apply from the marketplace.'
              : 'No applicants here.'}
          </p>
        ) : (
          <ul className="ruled-list border-y border-line">
            {shown.map((a) => {
              const matched = data.job.skills.filter((s) =>
                a.verifiedSkills.some((v) => v.toLowerCase() === s.toLowerCase())
              )
              return (
                <li
                  key={a.id}
                  className="grid gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-8"
                >
                  <div className="min-w-0">
                    <p className="text-lg font-medium">{a.name}</p>
                    <p className="truncate text-sm text-ink-muted">
                      <a href={`mailto:${a.email}`} className="hover:text-ink">
                        {a.email}
                      </a>
                    </p>
                    <p className="mt-1 text-sm text-ink-faint">
                      Applied{' '}
                      {formatDistanceToNowStrict(new Date(a.appliedAt), { addSuffix: true })} ·{' '}
                      {STATUS_LABEL[a.status]}
                    </p>
                    {a.message && (
                      <p className="mt-3 whitespace-pre-line text-sm text-ink-muted">
                        “{a.message}”
                      </p>
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="text-ink">
                      {a.verifiedSkills.length} of {a.skillCount} skills verified
                    </p>
                    {matched.length > 0 && (
                      <p className="mt-1 text-ink-muted">
                        Verified for this role: {matched.join(', ')}
                      </p>
                    )}
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <Link
                        href={a.passportPath}
                        target="_blank"
                        className="text-ink underline underline-offset-2"
                      >
                        View passport ↗
                      </Link>
                      {editable && (
                        <Link
                          href={`/messages?to=${encodeURIComponent(a.candidateId)}&name=${encodeURIComponent(a.name)}`}
                          className="text-ink underline underline-offset-2"
                        >
                          Message
                        </Link>
                      )}
                    </span>
                  </div>
                  {editable && (
                    <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-end">
                      {a.status !== 'shortlisted' && (
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => setStatus(a.id, 'shortlisted')}
                          className="button-base button-primary min-h-9 px-4 text-sm"
                        >
                          Shortlist
                        </button>
                      )}
                      {a.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => setStatus(a.id, 'rejected')}
                          className="pill"
                        >
                          Not a fit
                        </button>
                      )}
                      {a.status !== 'submitted' && (
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => setStatus(a.id, 'submitted')}
                          className="pill"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
