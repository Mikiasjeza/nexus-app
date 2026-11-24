'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AVAILABILITY,
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  WORK_ARRANGEMENTS,
  labelOf,
} from '@/lib/career/profile-options'
import { fmtMonth, type CareerData } from './useCareerProfile'

type Summary = {
  assessments: { slug: string; title: string; skillName: string; reason: string }[]
  jobs: {
    id: string
    title: string
    company: string
    location: string | null
    type: string
    matched: string[]
    missing: string[]
  }[]
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-5 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
      <p className="text-sm text-ink-faint">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const none = <p className="text-sm text-ink-muted">Nothing added yet.</p>
const join = (list: (string | null | undefined | false)[]) => list.filter(Boolean).join(' · ')

/** Everything in the person's Career Profile, plus suggestions built from it. */
export default function CareerProfileSummary({ data }: { data: CareerData }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  useEffect(() => {
    fetch('/api/career/summary', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const p = data.profile
  const verified = data.skills.filter((s) => s.verified)
  const selfReported = data.skills.filter((s) => !s.verified)
  const completed = data.education.filter((e) => e.status === 'completed')
  const inProgress = data.education.filter((e) => e.status !== 'completed')

  return (
    <div className="border-t border-line">
      <Row label="Education">
        {data.education.length === 0 ? (
          none
        ) : (
          <ul className="space-y-2">
            {[...completed, ...inProgress].map((e) => (
              <li key={e.id}>
                <span className="font-medium">
                  {labelOf(EDUCATION_LEVELS, e.level)}
                  {e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}
                </span>
                <span className="text-sm text-ink-muted">
                  {' '}
                  ·{' '}
                  {join([
                    labelOf(EDUCATION_STATUSES, e.status),
                    e.institution,
                    e.graduationDate && fmtMonth(e.graduationDate),
                  ])}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.certifications.length > 0 && (
          <p className="mt-3 text-sm">
            <span className="text-ink-faint">Certifications: </span>
            {data.certifications.map((c) => c.name).join(', ')}
          </p>
        )}
      </Row>

      <Row label="Experience">
        {data.experience.length === 0 ? (
          none
        ) : (
          <ul className="space-y-2">
            {data.experience.map((x) => (
              <li key={x.id}>
                <span className="font-medium">{x.title}</span>
                <span className="text-sm text-ink-muted">
                  {' '}
                  ·{' '}
                  {join([
                    x.employer,
                    labelOf(EMPLOYMENT_TYPES, x.employmentType),
                    x.current && 'Current',
                  ])}
                </span>
              </li>
            ))}
          </ul>
        )}
        {p?.yearsExperience != null && (
          <p className="mt-2 text-sm text-ink-muted">
            {p.yearsExperience} years of relevant experience
          </p>
        )}
      </Row>

      <Row label="Career interests">
        {!p || (p.interests.length === 0 && p.desiredTitles.length === 0 && !p.exploring) ? (
          none
        ) : (
          <div className="space-y-1 text-sm">
            {p.interests.length > 0 && <p>{p.interests.join(', ')}</p>}
            {p.exploring && <p className="text-ink-muted">Still exploring</p>}
            {p.desiredTitles.length > 0 && (
              <p>
                <span className="text-ink-faint">Roles: </span>
                {p.desiredTitles.join(', ')}
              </p>
            )}
            {p.targetCareer && (
              <p>
                <span className="text-ink-faint">Target: </span>
                {p.targetCareer}
              </p>
            )}
          </div>
        )}
      </Row>

      <Row label="Skills">
        {data.skills.length === 0 ? (
          none
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-verified-ink">Verified: </span>
              {verified.length ? verified.map((s) => s.name).join(', ') : 'none yet'}
            </p>
            <p>
              <span className="text-ink-faint">Self-reported: </span>
              {selfReported.length ? selfReported.map((s) => s.name).join(', ') : 'none'}
            </p>
            <p className="text-xs text-ink-faint">
              Self-reported skills become verified only when you pass a Nexus assessment or AI
              evidence check.
            </p>
          </div>
        )}
      </Row>

      <Row label="Job preferences">
        {!p ? (
          none
        ) : (
          <p className="text-sm">
            {join([
              p.locations.join(', '),
              p.workArrangements.map((w) => labelOf(WORK_ARRANGEMENTS, w)).join('/'),
              p.jobTypes.map((t) => labelOf(JOB_TYPES, t)).join('/'),
              p.experienceLevels.map((l) => labelOf(EXPERIENCE_LEVELS, l)).join('/'),
              Boolean(p.salaryMin || p.salaryMax) &&
                `$${(p.salaryMin ?? 0).toLocaleString()}–${p.salaryMax ? `$${p.salaryMax.toLocaleString()}` : '+'}`,
              p.willingToRelocate != null &&
                (p.willingToRelocate ? 'Open to relocating' : 'Not relocating'),
              p.availability && labelOf(AVAILABILITY, p.availability),
            ]) || 'Nothing set yet.'}
          </p>
        )}
      </Row>

      <Row label="Recommended assessments">
        {!summary ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : summary.assessments.length === 0 ? (
          <p className="text-sm text-ink-muted">Add skills or interests to get suggestions.</p>
        ) : (
          <ul className="space-y-2">
            {summary.assessments.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/assessments/${a.slug}`}
                  className="font-medium underline underline-offset-2"
                >
                  {a.title}
                </Link>
                <span className="text-sm text-ink-muted"> · {a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Row>

      <Row label="Job matches">
        {!summary ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : summary.jobs.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No open jobs share your skills yet. As more jobs are listed, matches appear here and in
            the marketplace.
          </p>
        ) : (
          <ul className="space-y-3">
            {summary.jobs.map((j) => (
              <li key={j.id}>
                <Link href="/marketplace" className="font-medium hover:underline">
                  {j.title}
                </Link>
                <span className="text-sm text-ink-muted">
                  {' '}
                  · {join([j.company, j.location, j.type])}
                </span>
                <p className="text-xs text-ink-faint">
                  You have {j.matched.join(', ')}
                  {j.missing.length > 0 && `; not yet: ${j.missing.join(', ')}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Row>
    </div>
  )
}
