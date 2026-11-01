'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import SectionHeading from '@/components/Layout/SectionHeading'
import Loader from '@/components/UI/Loader'
import { assessmentsApi, type Catalog, type CatalogEntry } from '@/lib/api/assessments'

function statusOf(
  entry: CatalogEntry
): { label: string; tone: 'verified' | 'muted' | 'caution' } | null {
  if (!entry.available) return { label: 'Opening soon', tone: 'muted' }
  const mine = entry.personal
  if (!mine) return null
  if (mine.openAttempt) {
    return {
      label: mine.openAttempt.status === 'IN_PROGRESS' ? 'In progress' : 'Ready to start',
      tone: 'caution',
    }
  }
  if (mine.credential) return { label: 'Credential active', tone: 'verified' }
  if (mine.latest?.status === 'PENDING_REVIEW') return { label: 'Under review', tone: 'muted' }
  if (mine.latest?.result === 'NOT_PASSED') return { label: 'Not passed yet', tone: 'muted' }
  return null
}

const toneClass = {
  verified: 'text-verified-ink',
  caution: 'text-caution',
  muted: 'text-ink-faint',
}

export default function AssessmentsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    assessmentsApi
      .catalog()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
  }, [])

  const groups = useMemo(() => {
    const out = new Map<string, CatalogEntry[]>()
    for (const entry of catalog?.assessments ?? []) {
      const key =
        entry.workspace === 'writing'
          ? 'Communication'
          : entry.workspace === 'sql'
            ? 'Data'
            : 'Code'
      out.set(key, [...(out.get(key) ?? []), entry])
    }
    return [...out.entries()]
  }, [catalog])

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Assessments"
          rule
          description="Timed, hands-on tasks graded against hidden tests and a published rubric. Pass one and you get a credential anyone can check."
          actions={
            <Link href="/verify" className="button-base button-secondary min-h-11 px-5">
              Check a credential
            </Link>
          }
        />

        {error && (
          <p role="alert" className="metalab-alert-error">
            {error}
          </p>
        )}
        {!catalog && !error && <Loader />}

        {catalog && (
          <>
            {catalog.guest && (
              <p className="mb-8 border-b border-line pb-4 text-sm text-ink-muted">
                You’re browsing as a guest. Practice rounds work without an account; a credential
                needs one.{' '}
                <Link href="/auth/register" className="metalab-link">
                  Create an account
                </Link>
              </p>
            )}
            {catalog.personalError && (
              <p className="mb-8 text-sm text-caution">{catalog.personalError}</p>
            )}

            <div className="space-y-14">
              {groups.map(([group, entries]) => (
                <section key={group} aria-labelledby={`group-${group}`}>
                  <SectionHeading
                    id={`group-${group}`}
                    note={`${entries.length} ${entries.length === 1 ? 'skill' : 'skills'}`}
                  >
                    {group}
                  </SectionHeading>
                  <ul className="ruled-list mt-4 border-t border-line">
                    {entries.map((entry) => {
                      const status = statusOf(entry)
                      return (
                        <li key={entry.slug}>
                          <Link
                            href={`/assessments/${entry.slug}`}
                            className="group grid gap-x-8 gap-y-3 py-7 transition-colors md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-baseline"
                          >
                            <span className="display-number text-3xl text-ink md:text-4xl">
                              {entry.skillName}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-base text-ink">{entry.title}</span>
                              <span className="mt-1 block max-w-[38rem] text-[0.9375rem] leading-relaxed text-ink-muted">
                                {entry.summary}
                              </span>
                              <span className="mt-3 block text-sm text-ink-faint">
                                {entry.minutes} min · {entry.level} · pass mark{' '}
                                {entry.rubric.passThreshold}%
                              </span>
                            </span>
                            <span className="flex items-center gap-3 text-sm md:justify-end">
                              {status && (
                                <span className={toneClass[status.tone]}>{status.label}</span>
                              )}
                              <ArrowRight
                                className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                                aria-hidden
                              />
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <section aria-labelledby="how-graded" className="mt-20 border-t border-line pt-10">
              <h2 id="how-graded" className="text-base font-medium">
                How grading works
              </h2>
              <div className="mt-6 grid gap-10 md:grid-cols-3">
                <div>
                  <p className="display-number text-4xl text-ink">Tests</p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                    Your work runs against hidden tests generated for your attempt alone. Those
                    results are final; nothing else can raise a score the tests didn’t earn.
                  </p>
                </div>
                <div>
                  <p className="display-number text-4xl text-ink">Judgement</p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                    Quality, reasoning and tone are scored against the rubric, quoting your own work
                    as evidence. When automated grading isn’t sure, a person decides.
                  </p>
                </div>
                <div>
                  <p className="display-number text-4xl text-ink">Integrity</p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                    Pastes, tab switches and timing are recorded. They never fail anyone on their
                    own; unusual patterns go to a reviewer, and you can appeal any result.
                  </p>
                </div>
              </div>
              <p className="mt-10 text-sm text-ink-faint">
                Credentials last {catalog.assessments[0]?.credentialValidMonths ?? 24} months and
                say whether the work was independent or AI-assisted. Up to{' '}
                {catalog.retakePolicy.maxAttempts} attempts per skill every{' '}
                {catalog.retakePolicy.windowDays} days.
              </p>
            </section>
          </>
        )}
      </div>
    </AppPageShell>
  )
}
