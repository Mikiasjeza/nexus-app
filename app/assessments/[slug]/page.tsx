'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { assessmentsApi, type Catalog, type CatalogEntry } from '@/lib/api/assessments'
import type { AssessmentMode } from '@/lib/assessments/types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function AssessmentDetailPage() {
  const slug = String(useParams().slug ?? '')
  const router = useRouter()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<AssessmentMode>('independent')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    assessmentsApi
      .catalog()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
  }, [])

  const entry: CatalogEntry | undefined = catalog?.assessments.find((a) => a.slug === slug)

  const start = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const attempt = await assessmentsApi.create(slug, mode)
      router.push(`/assessments/attempt/${attempt.id}`)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Could not start')
      setStarting(false)
    }
  }

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <p role="alert" className="metalab-alert-error">
            {error}
          </p>
        </div>
      </AppPageShell>
    )
  }
  if (!catalog) return <Loader />
  if (!entry) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader title="Not found" description="There is no assessment at this address." />
          <Link href="/assessments" className="metalab-link">
            All assessments
          </Link>
        </div>
      </AppPageShell>
    )
  }

  const mine = entry.personal
  const steps = [
    {
      label: 'The task',
      minutes: entry.stageMinutes.main,
      text: 'Do the work in the browser. Run it as often as you like.',
    },
    {
      label: 'Follow-up',
      minutes: entry.stageMinutes.followup,
      text: 'The requirement changes. Adapt what you made.',
    },
    {
      label: 'Explain',
      minutes: entry.stageMinutes.explain,
      text: 'Short questions about your own choices.',
    },
  ]

  return (
    <AppPageShell>
      <div className="page-shell">
        <Link href="/assessments" className="text-sm text-ink-muted hover:text-ink">
          ← All assessments
        </Link>
        <PageHeader title={entry.skillName} rule description={entry.summary} />

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-14">
            <section aria-labelledby="steps-heading">
              <h2 id="steps-heading" className="text-base font-medium">
                {entry.title}
              </h2>
              <p className="mt-1 text-sm text-ink-faint">
                {entry.minutes} minutes in one sitting · {entry.level}
              </p>
              <ol className="ruled-list mt-5 border-t border-line">
                {steps.map((step, i) => (
                  <li
                    key={step.label}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-4 py-4"
                  >
                    <span className="display-number text-2xl text-ink-faint">{i + 1}</span>
                    <span>
                      <span className="block text-ink">{step.label}</span>
                      <span className="mt-1 block text-sm text-ink-muted">{step.text}</span>
                    </span>
                    <span className="text-sm tabular-nums text-ink-faint">{step.minutes} min</span>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="measures-heading">
              <h2 id="measures-heading" className="text-base font-medium">
                What it measures
              </h2>
              <ul className="mt-4 space-y-2 text-[0.9375rem] leading-relaxed text-ink-muted">
                {entry.measures.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="rubric-heading">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="rubric-heading" className="text-base font-medium">
                  How it’s scored
                </h2>
                <span className="text-sm text-ink-faint">
                  Rubric {entry.rubric.id} v{entry.rubric.version}
                </span>
              </div>
              <table className="mt-4 w-full text-left text-[0.9375rem]">
                <thead className="sr-only">
                  <tr>
                    <th>Criterion</th>
                    <th>How</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.rubric.criteria.map((c) => (
                    <tr key={c.label} className="border-t border-line align-baseline">
                      <td className="py-3 pr-4">
                        <span className="block text-ink">{c.label}</span>
                        <span className="mt-0.5 block text-sm text-ink-muted">{c.description}</span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-ink-faint">
                        {c.automatic ? 'Automatic' : 'Judged'}
                      </td>
                      <td className="display-number py-3 text-right text-2xl">{c.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-sm text-ink-muted">
                Pass mark {entry.rubric.passThreshold}%, and the automatic checks have minimums of
                their own that judgement can’t make up for.
              </p>
            </section>

            <section aria-labelledby="rules-heading">
              <h2 id="rules-heading" className="text-base font-medium">
                Rules
              </h2>
              <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                {catalog.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-raised p-6">
              {!entry.available ? (
                <>
                  <p className="text-base text-ink">Opening soon</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    This assessment needs a code runner that isn’t switched on yet.
                  </p>
                </>
              ) : (
                <>
                  <fieldset>
                    <legend className="text-base text-ink">How you’ll work</legend>
                    <div className="mt-4 space-y-2">
                      {entry.modes.map((m) => (
                        <label
                          key={m}
                          className={`block cursor-pointer rounded-xl p-4 transition-colors ${
                            mode === m ? 'bg-pill' : 'hover:bg-pill/60'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="mode"
                              value={m}
                              checked={mode === m}
                              onChange={() => setMode(m)}
                              className="accent-[#e9762b]"
                            />
                            <span className="text-ink">{catalog.modes[m].label}</span>
                          </span>
                          <span className="mt-2 block pl-7 text-sm leading-relaxed text-ink-muted">
                            {catalog.modes[m].description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-6 space-y-3">
                    {mine?.credential && (
                      <p className="text-sm leading-relaxed text-ink-muted">
                        You hold an active credential,{' '}
                        <Link href={`/verify/${mine.credential.id}`} className="metalab-link">
                          {mine.credential.id}
                        </Link>
                        . Passing again replaces it.
                      </p>
                    )}
                    {mine?.openAttempt ? (
                      <Link
                        href={`/assessments/attempt/${mine.openAttempt.id}`}
                        className="button-base button-primary w-full"
                      >
                        {mine.openAttempt.status === 'IN_PROGRESS'
                          ? 'Resume your attempt'
                          : 'Continue to start'}
                      </Link>
                    ) : catalog.signedIn ? (
                      mine?.retake.allowed === false ? (
                        <p className="text-sm leading-relaxed text-caution">
                          {mine.retake.reason}
                          {mine.retake.nextAt &&
                            ` You can start again on ${formatDate(mine.retake.nextAt)}.`}
                        </p>
                      ) : (
                        <Button fullWidth onClick={start} isLoading={starting}>
                          Start assessment
                        </Button>
                      )
                    ) : (
                      <Link
                        href={`/auth/login?next=${encodeURIComponent(`/assessments/${entry.slug}`)}`}
                        className="button-base button-primary w-full"
                      >
                        Sign in to take it
                      </Link>
                    )}
                    {startError && (
                      <p role="alert" className="text-sm text-[#ffc9c9]">
                        {startError}
                      </p>
                    )}
                    <Link
                      href={
                        entry.practiceNeedsAccount && !catalog.signedIn
                          ? `/auth/login?next=${encodeURIComponent(`/assessments/practice/${entry.slug}`)}`
                          : `/assessments/practice/${entry.slug}`
                      }
                      className="button-base button-secondary w-full"
                    >
                      Practice round
                    </Link>
                    <p className="text-xs leading-relaxed text-ink-faint">
                      Practice uses a different task each time, checks only the automatic parts, and
                      saves nothing.
                      {entry.practiceNeedsAccount &&
                        ' Code runs on a separate, metered server, so practice needs an account.'}
                    </p>
                  </div>
                </>
              )}
            </div>
            {mine?.latest && (
              <p className="mt-4 text-sm text-ink-muted">
                Last attempt:{' '}
                <Link href={`/assessments/result/${mine.latest.id}`} className="metalab-link">
                  see the result
                </Link>
              </p>
            )}
          </aside>
        </div>
      </div>
    </AppPageShell>
  )
}
