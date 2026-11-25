'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import SaveJobButton from '@/components/Jobs/SaveJobButton'
import { EXPERIENCE_LEVELS, JOB_TYPES, labelOf } from '@/lib/career/profile-options'

type Job = {
  id: string
  source: string
  sourceLabel: string
  title: string
  company: string
  location: string | null
  remote: boolean
  salaryMin: number | null
  salaryMax: number | null
  salaryText: string | null
  employmentType: string | null
  experienceLevel: string | null
  skills: string[]
  applyUrl: string
  postedAt: string | null
  expiresAt: string | null
}

type Filters = {
  q: string
  location: string
  remote: boolean
  salaryMin: string
  type: string
  level: string
}

const EMPTY: Filters = { q: '', location: '', remote: false, salaryMin: '', type: '', level: '' }

const money = (n: number) => `$${Math.round(n / 1000)}k`

/** Real listings synced daily from USAJOBS and companies' public careers pages. */
export default function ExternalJobs() {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [applied, setApplied] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ jobs: Job[]; total: number; pages: number } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (f: Filters, p: number) => {
    setError('')
    const params = new URLSearchParams()
    if (f.q) params.set('q', f.q)
    if (f.location) params.set('location', f.location)
    if (f.remote) params.set('remote', '1')
    if (f.salaryMin) params.set('salaryMin', f.salaryMin)
    if (f.type) params.set('type', f.type)
    if (f.level) params.set('level', f.level)
    params.set('page', String(p))
    try {
      const res = await fetch(`/api/jobs/external?${params}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not load jobs')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load jobs')
    }
  }, [])

  useEffect(() => {
    load(applied, page)
  }, [load, applied, page])

  const search = (e?: React.FormEvent) => {
    e?.preventDefault()
    setPage(1)
    setApplied(filters)
  }
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }))

  return (
    <section aria-labelledby="external-jobs-heading" className="border-t border-line pt-10">
      <h2 id="external-jobs-heading" className="text-base font-medium">
        Jobs from across the web
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Real openings updated daily from USAJOBS and companies&apos; own careers pages. You apply on
        the employer&apos;s site.
      </p>

      <form onSubmit={search} className="mt-6 grid gap-3 md:grid-cols-6">
        <input
          aria-label="Search title, company or skill"
          className="metalab-input md:col-span-2"
          placeholder="Title, company or skill"
          value={filters.q}
          maxLength={100}
          onChange={(e) => set('q', e.target.value)}
        />
        <input
          aria-label="Location"
          className="metalab-input"
          placeholder="Location"
          value={filters.location}
          maxLength={100}
          onChange={(e) => set('location', e.target.value)}
        />
        <select
          aria-label="Job type"
          className="metalab-input"
          value={filters.type}
          onChange={(e) => set('type', e.target.value)}
        >
          <option value="">Any type</option>
          {JOB_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Level"
          className="metalab-input"
          value={filters.level}
          onChange={(e) => set('level', e.target.value)}
        >
          <option value="">Any level</option>
          {EXPERIENCE_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Minimum salary"
          type="number"
          min={0}
          step={5000}
          className="metalab-input"
          placeholder="Min salary"
          value={filters.salaryMin}
          onChange={(e) => set('salaryMin', e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={filters.remote}
            onChange={(e) => set('remote', e.target.checked)}
          />
          Remote only
        </label>
        <div className="flex gap-2 md:col-span-4 md:justify-end">
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFilters(EMPTY)
              setPage(1)
              setApplied(EMPTY)
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-critical">
          {error}
        </p>
      )}

      {!data ? (
        <div className="mt-8">
          <Loader />
        </div>
      ) : data.jobs.length === 0 ? (
        <p className="mt-8 border-y border-line py-6 text-sm text-ink-muted">
          No jobs match those filters. Try fewer filters. New jobs arrive every day.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-faint">{data.total.toLocaleString()} jobs</p>
          <ul className="ruled-list mt-2 border-y border-line">
            {data.jobs.map((j) => (
              <li
                key={j.id}
                className="grid gap-3 py-6 md:grid-cols-[minmax(0,1fr)_12rem] md:gap-8"
              >
                <div className="min-w-0">
                  <p className="text-lg font-medium">{j.title}</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <span>{j.company}</span>
                    {j.location && <span>{j.location}</span>}
                    {j.remote && <span>Remote</span>}
                    {j.employmentType && <span>{labelOf(JOB_TYPES, j.employmentType)}</span>}
                    {j.experienceLevel && (
                      <span>{labelOf(EXPERIENCE_LEVELS, j.experienceLevel)}</span>
                    )}
                    {(j.salaryMin || j.salaryMax) && (
                      <span>
                        {j.salaryMin ? money(j.salaryMin) : ''}
                        {j.salaryMax && j.salaryMax !== j.salaryMin ? `–${money(j.salaryMax)}` : ''}
                      </span>
                    )}
                  </p>
                  {j.skills.length > 0 && (
                    <p className="mt-2 text-xs text-ink-faint">
                      Mentions: {j.skills.slice(0, 8).join(', ')}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-ink-faint">
                    Via {j.sourceLabel}
                    {j.postedAt &&
                      ` · posted ${formatDistanceToNowStrict(new Date(j.postedAt), { addSuffix: true })}`}
                    {j.expiresAt && ` · closes ${new Date(j.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="space-y-2 md:text-right">
                  <SaveJobButton
                    job={{
                      ref: `ext:${j.id}`,
                      title: j.title,
                      company: j.company,
                      location: j.location,
                      url: j.applyUrl,
                    }}
                  />
                  <a
                    href={j.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="button-base button-primary min-h-11 px-5"
                  >
                    Apply on site ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
          {data.pages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-ink-faint">
                Page {page} of {data.pages}
              </span>
              <Button
                variant="ghost"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
