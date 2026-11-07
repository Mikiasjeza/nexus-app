'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, fetchApi } from '@/lib/api/fetcher'
import type { GrowthSkill } from '@/app/api/analytics/assessment-growth/route'

type State =
  | { kind: 'loading' }
  | { kind: 'locked'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; skills: GrowthSkill[] }

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** Formal assessment scores per skill over time. Pro only; Free sees what it would show. */
export default function AssessmentGrowth({ guest = false }: { guest?: boolean }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    if (guest) {
      setState({ kind: 'locked', message: 'Create an account to track your assessment scores.' })
      return
    }
    fetchApi<{ skills: GrowthSkill[] }>('/api/analytics/assessment-growth')
      .then(({ skills }) => setState({ kind: 'ready', skills }))
      .catch((e: Error) =>
        setState(
          e instanceof ApiError && e.status === 402
            ? { kind: 'locked', message: e.message }
            : { kind: 'error', message: e.message }
        )
      )
  }, [guest])

  if (state.kind === 'loading') {
    return <div className="mt-6 h-32 animate-pulse rounded-lg bg-raised" aria-hidden />
  }
  if (state.kind === 'locked') {
    return (
      <div className="mt-6 flex flex-col gap-3 rounded-lg bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[36rem] text-sm leading-relaxed text-ink-muted">
          {state.message} With Pro, every formal assessment you take is charted here by skill: your
          best and latest scores and how far you&apos;ve come since your first attempt.
        </p>
        {!guest && (
          <Link href="/pricing" className="button-base button-secondary shrink-0 px-5">
            See Pro
          </Link>
        )}
      </div>
    )
  }
  if (state.kind === 'error') {
    return <p className="mt-6 text-sm text-ink-muted">{state.message}</p>
  }
  if (state.skills.length === 0) {
    return (
      <p className="mt-6 text-ink-muted">
        Take a formal assessment and your scores will appear here.{' '}
        <Link href="/assessments" className="metalab-link">
          Browse assessments
        </Link>
      </p>
    )
  }

  return (
    <ul className="ruled-list mt-6 border-y border-line">
      {state.skills.map((skill) => (
        <li
          key={skill.slug}
          className="grid gap-4 py-5 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] md:items-center"
        >
          <div>
            <p>{skill.skillName}</p>
            <p className="text-sm text-ink-faint">
              {skill.points.length} {skill.points.length === 1 ? 'attempt' : 'attempts'}
            </p>
          </div>
          <ol className="flex h-14 items-end gap-1.5" aria-label={`${skill.skillName} scores`}>
            {skill.points.map((point) => (
              <li
                key={point.at}
                className="flex h-full w-6 items-end"
                title={`${formatDate(point.at)}: ${point.score}`}
              >
                <span
                  className={`block w-full rounded-sm ${point.result === 'PASSED' ? 'bg-verified' : 'bg-pill-hover'}`}
                  style={{ height: `${Math.max(6, point.score)}%` }}
                />
                <span className="sr-only">
                  {formatDate(point.at)}: {point.score}
                  {point.result === 'PASSED' ? ', passed' : ''}
                </span>
              </li>
            ))}
          </ol>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-ink-faint">Best</dt>
              <dd className="tabular">{skill.best}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Latest</dt>
              <dd className="tabular">{skill.latest}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Change</dt>
              <dd
                className={`tabular ${skill.change > 0 ? 'text-verified-ink' : skill.change < 0 ? 'text-caution' : ''}`}
              >
                {skill.change > 0 ? `+${skill.change}` : skill.change}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
