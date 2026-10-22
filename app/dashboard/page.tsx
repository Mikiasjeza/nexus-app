'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi, dashboardApi } from '@/lib/api'
import type { DashboardSummary } from '@/lib/dashboard/summary'
import type { User } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import ActivityCalendar from '@/components/Dashboard/ActivityCalendar'
import PillarRings from '@/components/Dashboard/PillarRings'
import RecentChecks from '@/components/Dashboard/RecentChecks'
import VerifiedGrowth from '@/components/Dashboard/VerifiedGrowth'

/**
 * Candidate dashboard: the one thing to do next, then where things stand
 * (verified skills over time, verified per pillar, recent AI checks) and a
 * year of activity.
 */
export default function DashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      setSummary(await dashboardApi.getSummary())
      setStepIndex(0)
    } catch (e) {
      if (e instanceof Error && e.message === 'Not authenticated') {
        router.push('/auth/login?next=/dashboard')
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to load your dashboard')
    }
  }, [router])

  useEffect(() => {
    load()
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [load])

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Dashboard"
            rule
            description={`We couldn't load your dashboard. ${error}`}
            actions={<Button onClick={load}>Try again</Button>}
          />
        </div>
      </AppPageShell>
    )
  }

  if (!summary) return <DashboardLoading />

  const step = summary.steps[stepIndex] ?? summary.steps[0]
  const hasMoreSteps = stepIndex < summary.steps.length - 1
  const isGuestPreview = user?.id === 'guest-user'

  return (
    <AppPageShell>
      <div className="page-shell">
        {isGuestPreview && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-ink-muted">
              You are viewing sample data. Your own skills and checks show here once you have an
              account.
            </p>
            <Link href="/auth/register" className="pill" data-active="true">
              Create account
            </Link>
          </div>
        )}

        <PageHeader
          title={step.title}
          rule
          description={
            <>
              {step.lead && <span className="text-ink">{step.lead}</span>} {step.detail}
            </>
          }
          actions={
            <>
              <Link href={step.action.href} className="button-base button-primary min-h-11 px-5">
                {step.action.label}
              </Link>
              {hasMoreSteps && (
                <Button variant="secondary" onClick={() => setStepIndex((i) => i + 1)}>
                  Not now
                </Button>
              )}
            </>
          }
        />

        <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
          <section aria-labelledby="verified-heading">
            <SectionHeading id="verified-heading" note="Last 12 weeks">
              Verified skills
            </SectionHeading>
            <p className="mt-4 flex items-baseline gap-3">
              <span className="display-number text-[4.5rem] leading-none">
                {summary.totals.verified}
              </span>
              <span className="text-ink-muted">
                of {summary.totals.claimed} {summary.totals.claimed === 1 ? 'skill' : 'skills'}
              </span>
            </p>
            <VerifiedGrowth points={summary.verifiedOverTime} />
          </section>

          <section aria-labelledby="pillars-heading">
            <SectionHeading id="pillars-heading" note="Verified out of claimed">
              By pillar
            </SectionHeading>
            <PillarRings pillars={summary.pillars} />
          </section>

          <section aria-labelledby="recent-heading">
            <SectionHeading id="recent-heading">Recent checks</SectionHeading>
            <RecentChecks checks={summary.recentChecks} />
          </section>
        </div>

        <section aria-labelledby="activity-heading" className="mt-16 border-t border-line pt-10">
          <SectionHeading id="activity-heading" note="Checks run and changes made">
            Activity
          </SectionHeading>
          <ActivityCalendar activity={summary.activity} />
        </section>
      </div>
    </AppPageShell>
  )
}

function SectionHeading({
  id,
  note,
  children,
}: {
  id: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-base font-medium">
        {children}
      </h2>
      {note && <span className="text-sm text-ink-faint">{note}</span>}
    </div>
  )
}

/** Same frame as the loaded page, so nothing jumps when the data arrives. */
function DashboardLoading() {
  return (
    <AppPageShell>
      <div className="page-shell" aria-busy="true" aria-label="Loading your dashboard">
        <div className="pb-10 pt-6">
          <div className="h-[clamp(2.75rem,5vw,5.5rem)] w-2/3 max-w-[36rem] rounded-lg bg-raised" />
          <div className="mt-6 h-4 w-full max-w-[34rem] rounded bg-raised" />
          <div className="mt-3 h-4 w-2/3 max-w-[24rem] rounded bg-raised" />
        </div>
        <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 w-28 rounded bg-raised" />
              <div className="mt-6 aspect-[2/1] rounded-lg bg-raised" />
            </div>
          ))}
        </div>
      </div>
    </AppPageShell>
  )
}
