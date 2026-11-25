'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import ApplyButton from '@/components/Jobs/ApplyButton'
import SaveJobButton from '@/components/Jobs/SaveJobButton'
import { EXPERIENCE_LEVELS, JOB_TYPES, labelOf } from '@/lib/career/profile-options'

type Status = 'met' | 'not_met' | 'unknown' | 'equivalent'
type Check = { status: Status; detail: string }
type Match = {
  job: {
    ref: string
    source: string
    sourceLabel: string
    title: string
    company: string
    location: string | null
    remote: boolean
    employmentType: string | null
    experienceLevel: string | null
    salaryMin: number | null
    salaryMax: number | null
    applyUrl: string | null
  }
  result: {
    relevance: number
    explanation: string
    skills: { verified: string[]; selfReported: string[]; missing: string[] }
    checks: {
      education: Check
      experience: Check
      certifications: Check
      skills: Check
      jobType: Check
      location: Check
      workAuthorization: Check | null
    }
  }
}
type Section = 'qualified' | 'growth' | 'early'

const TABS: { id: Section; label: string; blurb: string }[] = [
  {
    id: 'qualified',
    label: 'Qualified matches',
    blurb:
      'Jobs where what you have entered appears to meet the stated requirements. Unknowns are shown on each job.',
  },
  {
    id: 'growth',
    label: 'Growth opportunities',
    blurb:
      'Jobs that fit your goals but ask for more than you have shown so far, with what is missing.',
  },
  {
    id: 'early',
    label: 'Internships & early careers',
    blurb:
      'Internships, apprenticeships and entry-level roles for students, recent graduates and career changers.',
  },
]

const STATUS_LABEL: Record<Status, string> = {
  met: 'Met',
  not_met: 'Not met',
  unknown: 'Unknown',
  equivalent: 'Equivalent may count',
}
const STATUS_CLASS: Record<Status, string> = {
  met: 'text-verified-ink',
  not_met: 'text-critical',
  unknown: 'text-ink-faint',
  equivalent: 'text-caution',
}
const money = (n: number) => `$${Math.round(n / 1000)}k`

function Requirement({ label, check }: { label: string; check: Check }) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 text-ink-faint">{label}</span>
      <span>
        <span className={STATUS_CLASS[check.status]}>{STATUS_LABEL[check.status]}</span>
        <span className="text-ink-muted"> · {check.detail}</span>
      </span>
    </li>
  )
}

function MatchCard({ m, onHide }: { m: Match; onHide: (ref: string) => void }) {
  const { job, result } = m
  const [open, setOpen] = useState(false)
  const [ai, setAi] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [sent, setSent] = useState(false)

  const askAi = async () => {
    setAiBusy(true)
    setAiError('')
    try {
      const res = await fetch('/api/jobs/matches/explain', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: job.ref }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not explain this one')
      setAi(data.explanation)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not explain this one')
    } finally {
      setAiBusy(false)
    }
  }

  const feedback = async (helpful: boolean) => {
    await fetch('/api/jobs/feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: job.ref, helpful }),
    }).catch(() => {})
    setSent(true)
    if (!helpful) onHide(job.ref)
  }

  const c = result.checks
  return (
    <li className="py-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem] md:gap-8">
        <div className="min-w-0">
          <p className="text-lg font-medium">{job.title}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>{job.company}</span>
            {job.location && <span>{job.location}</span>}
            {job.remote && <span>Remote</span>}
            {job.employmentType && <span>{labelOf(JOB_TYPES, job.employmentType)}</span>}
            {job.experienceLevel && <span>{labelOf(EXPERIENCE_LEVELS, job.experienceLevel)}</span>}
            {(job.salaryMin || job.salaryMax) && (
              <span>
                {job.salaryMin ? money(job.salaryMin) : ''}
                {job.salaryMax && job.salaryMax !== job.salaryMin ? `–${money(job.salaryMax)}` : ''}
              </span>
            )}
          </p>
          <p className="mt-3 text-sm">{result.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              <span className="text-ink-faint">Education: </span>
              <span className={STATUS_CLASS[c.education.status]}>
                {STATUS_LABEL[c.education.status]}
              </span>
            </span>
            <span>
              <span className="text-ink-faint">Experience: </span>
              <span className={STATUS_CLASS[c.experience.status]}>
                {STATUS_LABEL[c.experience.status]}
              </span>
            </span>
          </div>
          {result.skills.verified.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="text-verified-ink">Verified skills that match: </span>
              {result.skills.verified.join(', ')}
            </p>
          )}
          {(result.skills.missing.length > 0 || result.skills.selfReported.length > 0) && (
            <p className="mt-1 text-sm text-ink-muted">
              {result.skills.missing.length > 0 && (
                <>Missing: {result.skills.missing.join(', ')}. </>
              )}
              {result.skills.selfReported.length > 0 && (
                <>Not yet verified: {result.skills.selfReported.join(', ')}.</>
              )}
            </p>
          )}

          {open && (
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              <Requirement label="Education" check={c.education} />
              <Requirement label="Experience" check={c.experience} />
              <Requirement label="Certifications" check={c.certifications} />
              <Requirement label="Skills" check={c.skills} />
              <Requirement label="Job type" check={c.jobType} />
              <Requirement label="Location" check={c.location} />
              {c.workAuthorization && (
                <Requirement label="Work authorization" check={c.workAuthorization} />
              )}
            </ul>
          )}
          {ai && <p className="mt-3 border-l-2 border-line pl-3 text-sm text-ink-muted">{ai}</p>}
          {aiError && <p className="mt-2 text-sm text-critical">{aiError}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <button type="button" className="underline" onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide requirements' : 'All requirements'}
            </button>
            {!ai && (
              <button type="button" className="underline" onClick={askAi} disabled={aiBusy}>
                {aiBusy ? 'Thinking…' : 'Explain with AI'}
              </button>
            )}
            {sent ? (
              <span className="text-ink-faint">Thanks for the feedback</span>
            ) : (
              <>
                <button
                  type="button"
                  className="text-ink-faint underline"
                  onClick={() => feedback(true)}
                >
                  Good match
                </button>
                <button
                  type="button"
                  className="text-ink-faint underline"
                  onClick={() => feedback(false)}
                >
                  Not relevant
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Via {job.sourceLabel}</p>
        </div>

        <div className="space-y-3 md:text-right">
          <p>
            <span className="font-display text-3xl font-medium">{result.relevance}%</span>
            <span className="block text-xs text-ink-faint">
              relevance, not a chance of being hired
            </span>
          </p>
          <SaveJobButton
            job={{
              ref: job.ref,
              title: job.title,
              company: job.company,
              location: job.location,
              url: job.applyUrl,
            }}
          />
          {job.applyUrl ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="button-base button-primary min-h-11 px-5"
            >
              Apply on site ↗
            </a>
          ) : (
            <ApplyButton
              jobId={job.ref.slice('nexus:'.length)}
              jobTitle={job.title}
              companyName={job.company}
            />
          )}
        </div>
      </div>
    </li>
  )
}

/** Personalized matches in three sections. */
export default function MatchedJobs() {
  const [section, setSection] = useState<Section>('qualified')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    matches: Match[]
    total: number
    pages: number
    profileComplete: boolean
  } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (s: Section, p: number) => {
    setData(null)
    setError('')
    try {
      const res = await fetch(`/api/jobs/matches?section=${s}&page=${p}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not load matches')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load matches')
    }
  }, [])

  useEffect(() => {
    load(section, page)
  }, [load, section, page])

  const tab = TABS.find((t) => t.id === section)!
  return (
    <section aria-labelledby="matches-heading" className="border-t border-line pt-10">
      <h2 id="matches-heading" className="text-base font-medium">
        Jobs for you
      </h2>
      <nav aria-label="Match sections" className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="pill"
            aria-current={section === t.id ? 'page' : undefined}
            onClick={() => {
              setSection(t.id)
              setPage(1)
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <p className="mt-3 max-w-2xl text-sm text-ink-muted">{tab.blurb}</p>
      {section === 'growth' && (
        <p className="mt-1 max-w-2xl text-xs text-ink-faint">
          Passing a Nexus assessment proves a skill, but no single assessment guarantees you meet a
          job&apos;s requirements.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-critical">
          {error}
        </p>
      )}
      {!data ? (
        !error && (
          <div className="mt-8">
            <Loader />
          </div>
        )
      ) : (
        <>
          {!data.profileComplete && (
            <p className="mt-6 border-y border-line py-4 text-sm text-ink-muted">
              Matches get better as you fill in your career profile.{' '}
              <Link href="/settings/career" className="text-ink underline underline-offset-2">
                Add education, experience and preferences
              </Link>
            </p>
          )}
          {data.matches.length === 0 ? (
            <p className="mt-6 border-y border-line py-6 text-sm text-ink-muted">
              No jobs in this section yet. New jobs arrive every day.
            </p>
          ) : (
            <>
              <p className="mt-6 text-sm text-ink-faint">{data.total.toLocaleString()} jobs</p>
              <ul className="ruled-list mt-2 border-y border-line">
                {data.matches.map((m) => (
                  <MatchCard
                    key={m.job.ref}
                    m={m}
                    onHide={(ref) =>
                      setData((d) =>
                        d ? { ...d, matches: d.matches.filter((x) => x.job.ref !== ref) } : d
                      )
                    }
                  />
                ))}
              </ul>
              {data.pages > 1 && (
                <div className="mt-6 flex items-center justify-between text-sm">
                  <Button
                    variant="ghost"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
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
        </>
      )}
    </section>
  )
}
