'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import JobTracker from '@/components/Jobs/JobTracker'

type Readiness = {
  target: string | null
  role: { id: string; title: string } | null
  demonstrated: string[]
  selfReported: string[]
  missing: string[]
  education: string[]
  experience: { years: number | null; latest: string | null }
  assessments: { slug: string; title: string; reason: string }[]
  nextSteps: string[]
  jobs: {
    ref: string
    title: string
    company: string
    location: string | null
    applyUrl: string | null
    relevance: number
  }[]
}

function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-line py-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const list = (items: string[], empty: string) =>
  items.length ? <span>{items.join(', ')}</span> : <span className="text-ink-faint">{empty}</span>

/** Career Profile, Readiness, recommended jobs and assessments, saved jobs and applications. */
export default function CareerSection() {
  const [r, setR] = useState<Readiness | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/career/readiness', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setR)
      .catch(() => setFailed(true))
  }, [])

  const settings = (
    <Link href="/settings/career" className="text-sm underline underline-offset-2">
      Career settings
    </Link>
  )

  return (
    <div className="mt-12">
      <Card title="Career readiness" action={settings}>
        {!r ? (
          <p className="text-sm text-ink-muted">
            {failed ? 'Could not load your readiness right now.' : 'Loading…'}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-ink-faint">Target career: </span>
                {r.target ?? (
                  <Link href="/settings/career" className="underline">
                    Set one
                  </Link>
                )}
                {r.role && r.role.title.toLowerCase() !== (r.target ?? '').toLowerCase() && (
                  <span className="text-ink-faint"> (compared with {r.role.title})</span>
                )}
              </p>
              {r.role && (
                <>
                  <p>
                    <span className="text-verified-ink">Demonstrated: </span>
                    {list(r.demonstrated, 'none verified yet')}
                  </p>
                  <p>
                    <span className="text-ink-faint">Self-reported, not yet demonstrated: </span>
                    {list(r.selfReported, 'none')}
                  </p>
                  <p>
                    <span className="text-ink-faint">Not yet shown: </span>
                    {list(r.missing, 'nothing missing')}
                  </p>
                </>
              )}
              <p>
                <span className="text-ink-faint">Education: </span>
                {list(r.education, 'not added')}
              </p>
              <p>
                <span className="text-ink-faint">Experience: </span>
                {r.experience.years != null || r.experience.latest ? (
                  [
                    r.experience.years != null && `about ${r.experience.years} years`,
                    r.experience.latest,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                ) : (
                  <span className="text-ink-faint">not added</span>
                )}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Next steps</p>
              {r.nextSteps.length === 0 ? (
                <p className="text-ink-muted">
                  You&apos;ve shown everything we track for this role. Keep your skills current.
                </p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5">
                  {r.nextSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Recommended jobs"
        action={
          <Link href="/marketplace" className="text-sm underline underline-offset-2">
            All matches
          </Link>
        }
      >
        {!r ? null : r.jobs.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {r.target
              ? 'No qualified matches right now. New jobs arrive daily.'
              : 'Set a target career to get recommendations.'}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {r.jobs.map((j) => (
              <li key={j.ref} className="flex flex-wrap justify-between gap-2">
                <span>
                  {j.applyUrl ? (
                    <a
                      href={j.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium hover:underline"
                    >
                      {j.title}
                    </a>
                  ) : (
                    <Link href="/marketplace" className="font-medium hover:underline">
                      {j.title}
                    </Link>
                  )}
                  <span className="text-ink-muted">
                    {' '}
                    · {[j.company, j.location].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="text-ink-faint">{j.relevance}% relevance</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recommended assessments">
        {!r ? null : r.assessments.length === 0 ? (
          <p className="text-sm text-ink-muted">Add skills or interests to get suggestions.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {r.assessments.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/assessments/${a.slug}`}
                  className="font-medium underline underline-offset-2"
                >
                  {a.title}
                </Link>
                <span className="text-ink-muted"> · {a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Saved jobs & applications">
        <JobTracker />
      </Card>
    </div>
  )
}
