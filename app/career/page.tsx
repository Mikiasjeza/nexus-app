'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'

type Overview = {
  skills: { total: number; verified: number }
  recommendations: {
    roleId: string
    title: string
    summary: string
    score: number
    strengths: string[]
    topGaps: string[]
  }[]
  roles: { id: string; title: string }[]
  market: { skill: string; listings: number; youHave: boolean; verified: boolean }[]
  passport: {
    public: boolean
    last7: number
    last30: number
    employers: { name: string; slug: string; views: number }[]
  }
}

type Plan = {
  roleId: string
  title: string
  score: number
  requirements: { skill: string; importance: 'core' | 'plus'; status: string }[]
  gaps: { skill: string; importance: string; status: string; demand: number }[]
  steps: {
    skill: string
    action: string
    title: string
    detail: string
    assessment: { slug: string; title: string } | null
  }[]
  coaching: { summary: string; tips: { skill: string; tip: string }[] } | null
}

const STATUS_LABEL: Record<string, string> = {
  strong: 'Verified',
  ok: 'You have it',
  weak: 'Beginner',
  missing: 'Missing',
}

const STATUS_CLASS: Record<string, string> = {
  strong: 'text-verified-ink',
  ok: 'text-ink',
  weak: 'text-caution',
  missing: 'text-ink-faint',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="text-base font-medium">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Career+: where you fit, what to learn next, and who is looking. */
export default function CareerPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [locked, setLocked] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [roleId, setRoleId] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planning, setPlanning] = useState(false)

  useEffect(() => {
    fetch('/api/career', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.status === 402) setLocked(data.error || 'Career+ is part of the Career+ plan.')
        else if (!res.ok) setError(data.error || 'Could not load Career+')
        else {
          setOverview(data)
          setRoleId(data.recommendations[0]?.roleId ?? data.roles[0]?.id ?? '')
        }
      })
      .catch(() => setError('Could not load Career+'))
  }, [])

  const buildPlan = useCallback(async (id: string) => {
    if (!id) return
    setPlanning(true)
    setError('')
    try {
      const res = await fetch('/api/career/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not build the plan')
      setPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the plan')
    } finally {
      setPlanning(false)
    }
  }, [])

  if (locked) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Career+"
            rule
            description="See the roles you are closest to, exactly what you are missing for any role, a step-by-step plan to get there, and who has been looking at your passport."
            actions={
              <Link href="/pricing" className="button-base button-primary min-h-11 px-5">
                See Career+
              </Link>
            }
          />
          <p className="text-sm text-ink-muted">{locked}</p>
        </div>
      </AppPageShell>
    )
  }

  if (!overview) {
    return (
      <AppPageShell>
        <div className="page-shell">
          {error ? <PageHeader title="Career+" rule description={error} /> : <Loader />}
        </div>
      </AppPageShell>
    )
  }

  const tipFor = (skill: string) =>
    plan?.coaching?.tips.find((t) => t.skill.toLowerCase() === skill.toLowerCase())?.tip

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Career+"
          rule
          description={`Based on your ${overview.skills.total} skills (${overview.skills.verified} verified) and the jobs posted on Nexus.`}
        />

        {overview.skills.total === 0 && (
          <p className="mb-6 border-y border-line py-4 text-sm text-ink-muted">
            Add a few skills first and this page fills in.{' '}
            <Link href="/skills" className="text-ink underline underline-offset-2">
              Add skills
            </Link>
          </p>
        )}

        <Section title="Roles you're closest to">
          {overview.recommendations.length === 0 ? (
            <p className="text-sm text-ink-muted">No matches yet. Add more skills to see roles.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-3">
              {overview.recommendations.map((r) => (
                <li key={r.roleId} className="border border-line p-5">
                  <p className="text-sm text-ink-faint">{r.score}% ready</p>
                  <p className="mt-1 font-display text-2xl font-medium">{r.title}</p>
                  <p className="mt-2 text-sm text-ink-muted">{r.summary}</p>
                  {r.strengths.length > 0 && (
                    <p className="mt-3 text-sm">
                      <span className="text-ink-faint">You have: </span>
                      {r.strengths.join(', ')}
                    </p>
                  )}
                  {r.topGaps.length > 0 && (
                    <p className="mt-1 text-sm">
                      <span className="text-ink-faint">Next to work on: </span>
                      {r.topGaps.join(', ')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRoleId(r.roleId)
                      buildPlan(r.roleId)
                    }}
                    className="mt-4 text-sm text-ink underline underline-offset-2"
                  >
                    Build my plan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Skill gaps and learning plan">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="career-role" className="metalab-label">
                Target role
              </label>
              <select
                id="career-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="metalab-input w-auto"
              >
                {overview.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => buildPlan(roleId)} isLoading={planning}>
              Analyze and plan
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-critical">
              {error}
            </p>
          )}

          {plan && (
            <div className="mt-8 max-w-4xl">
              <p className="font-display text-3xl font-medium">
                {plan.title}: {plan.score}% ready
              </p>
              {plan.coaching?.summary && (
                <p className="mt-3 text-ink-muted">{plan.coaching.summary}</p>
              )}

              <ul className="mt-6 grid grid-cols-1 border-y border-line sm:grid-cols-2">
                {plan.requirements.map((r) => (
                  <li
                    key={r.skill}
                    className="flex items-center justify-between gap-3 border-b border-line py-3 sm:odd:pr-6"
                  >
                    <span>
                      {r.skill}
                      {r.importance === 'core' && (
                        <span className="ml-2 text-xs text-ink-faint">core</span>
                      )}
                    </span>
                    <span className={`text-sm ${STATUS_CLASS[r.status] ?? ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.steps.length === 0 ? (
                <p className="mt-6 text-sm text-ink-muted">
                  Nothing missing for this role. Keep your skills verified and current.
                </p>
              ) : (
                <ol className="mt-8 space-y-6">
                  {plan.steps.map((step, i) => (
                    <li key={step.skill} className="flex gap-4">
                      <span className="font-display text-2xl text-ink-faint">{i + 1}</span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">{step.detail}</p>
                        {tipFor(step.skill) && (
                          <p className="mt-2 text-sm">
                            <span className="text-ink-faint">Coach: </span>
                            {tipFor(step.skill)}
                          </p>
                        )}
                        {step.assessment && (
                          <Link
                            href={`/assessments/${step.assessment.slug}`}
                            className="mt-2 inline-block text-sm text-ink underline underline-offset-2"
                          >
                            Take {step.assessment.title}
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </Section>

        <Section title="What employers are asking for">
          {overview.market.length === 0 ? (
            <p className="text-sm text-ink-muted">No open jobs on Nexus yet to compare against.</p>
          ) : (
            <ul className="max-w-3xl border-y border-line">
              {overview.market.map((m) => (
                <li
                  key={m.skill}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <span>{m.skill}</span>
                  <span className="text-sm text-ink-muted">
                    {m.listings} {m.listings === 1 ? 'job' : 'jobs'} ·{' '}
                    <span
                      className={
                        m.verified ? 'text-verified-ink' : m.youHave ? 'text-ink' : 'text-ink-faint'
                      }
                    >
                      {m.verified ? 'Verified' : m.youHave ? 'You have it' : 'Not yet'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Who's looking at your passport">
          {!overview.passport.public ? (
            <p className="text-sm text-ink-muted">
              Your passport is private, so nobody can view it.{' '}
              <Link href="/settings" className="text-ink underline underline-offset-2">
                Turn on public sharing
              </Link>
            </p>
          ) : (
            <>
              <div className="grid max-w-md grid-cols-2 border-y border-line">
                <div className="py-4">
                  <p className="text-sm text-ink-muted">Last 7 days</p>
                  <p className="font-display text-3xl font-medium">{overview.passport.last7}</p>
                </div>
                <div className="py-4">
                  <p className="text-sm text-ink-muted">Last 30 days</p>
                  <p className="font-display text-3xl font-medium">{overview.passport.last30}</p>
                </div>
              </div>
              {overview.passport.employers.length > 0 ? (
                <ul className="mt-5 max-w-md space-y-2 text-sm">
                  {overview.passport.employers.map((e) => (
                    <li key={e.slug} className="flex justify-between">
                      <Link href={`/company/${e.slug}`} className="hover:underline">
                        {e.name}
                      </Link>
                      <span className="text-ink-muted">
                        {e.views} {e.views === 1 ? 'view' : 'views'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">
                  No companies have viewed it in the last 30 days.
                </p>
              )}
            </>
          )}
        </Section>
      </div>
    </AppPageShell>
  )
}
