'use client'

import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import AdminNav from '@/components/Admin/AdminNav'
import DailyBars, { type DailySegment } from '@/components/Admin/DailyBars'
import { count, formatDate } from '@/components/Admin/format'
import { PLAN_INFO } from '@/lib/plans'
import type { AdminOverview } from '@/lib/admin/overview'

const SIGNUP_SEGMENTS: DailySegment[] = [
  { key: 'count', label: 'New accounts', color: 'var(--chart-2)' },
]

// Emphasis, not two categories: the orange is the app's "verified" colour, the rest is grey.
const ASSESSMENT_SEGMENTS: DailySegment[] = [
  { key: 'passed', label: 'Passed', color: 'var(--chart-1)' },
  { key: 'other', label: 'Not passed, or not finished', color: 'var(--chart-3)' },
]

/** Admin home: who joined, what they did, and what needs a person. Draws what it is given. */
export default function OverviewView({ data }: { data: AdminOverview }) {
  const { users, assessments, attention, plans, employers, signIn, series, setup } = data
  const assessmentDays = series.assessments.map((day) => ({
    date: day.date,
    passed: day.passed,
    other: Math.max(0, day.started - day.passed),
  }))
  const signupsInSeries = series.signups.reduce((sum, day) => sum + day.count, 0)
  const startedInSeries = series.assessments.reduce((sum, day) => sum + day.started, 0)

  const needs = [
    attention.pendingReview > 0 && {
      text: `${count(attention.pendingReview, 'assessment is', 'assessments are')} waiting for your review`,
      href: '/admin/reviews',
    },
    attention.openAppeals > 0 && {
      text: `${count(attention.openAppeals, 'appeal is', 'appeals are')} open`,
      href: '/admin/reviews',
    },
    attention.failedGradings > 0 && {
      text: `${count(attention.failedGradings, 'grading', 'gradings')} failed and can be retried`,
      href: '/admin/reviews',
    },
    attention.failedWebhooks > 0 && {
      text: `${count(attention.failedWebhooks, 'payment update', 'payment updates')} from Stripe failed this week`,
      href: '/admin/billing',
    },
  ].filter((item): item is { text: string; href: string } => Boolean(item))

  const payments =
    setup.stripeMode === 'live'
      ? setup.liveBillingApproved
        ? { on: true, note: 'Taking real payments' }
        : { on: false, note: 'Connected, but not switched on (BILLING_LIVE_APPROVED)' }
      : setup.stripeMode === 'test'
        ? { on: false, note: 'Test mode: cards are never charged' }
        : { on: false, note: 'Stripe is not connected' }

  const setupRows = [
    ...signIn.providers.map((provider) => ({
      label: `Sign in with ${provider.label}`,
      on: provider.on,
      note: provider.on
        ? count(provider.users, 'person uses it', 'people use it')
        : 'Not set up yet',
    })),
    { label: 'Payments', ...payments },
    {
      label: 'Code runner',
      on: setup.codeRunner,
      note: setup.codeRunner
        ? 'Coding and SQL assessments are open'
        : 'Not set up: coding and SQL assessments stay closed',
    },
    {
      label: 'Email',
      on: setup.email,
      note: setup.email
        ? 'Password-reset emails can be sent'
        : 'Not set up: nobody can reset a password',
    },
  ]

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Admin"
          rule
          description="Who has joined, what they are doing, and what needs you."
          actions={<AdminNav />}
        />

        <section aria-labelledby="needs-heading" className="mb-12">
          <h2 id="needs-heading" className="text-base font-medium">
            Needs you
          </h2>
          {needs.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Nothing right now.</p>
          ) : (
            <ul className="ruled-list mt-3 border-y border-line text-sm">
              {needs.map((item) => (
                <li key={item.text} className="flex items-center justify-between gap-4 py-3">
                  <span>{item.text}</span>
                  <Link href={item.href} className="pill shrink-0">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <dl className="mb-14 grid grid-cols-2 gap-x-10 gap-y-8 border-t border-line pt-6 md:grid-cols-4">
          <Stat
            label="People"
            value={users.total}
            note={`${users.newThisWeek} joined this week, ${users.newLastWeek} the week before`}
          />
          <Stat
            label="Active this week"
            value={users.activeThisWeek}
            note="Signed in, worked on an assessment or changed a skill"
          />
          <Stat
            label="Assessments passed"
            value={assessments.passedThisMonth}
            note={`Of ${assessments.finishedThisMonth} finished in the last 30 days`}
          />
          <Stat
            label="Paying subscribers"
            value={plans.paying}
            note={
              plans.byPlan.length > 0
                ? plans.byPlan.map((p) => `${p.count} ${PLAN_INFO[p.plan].name}`).join(', ')
                : `${count(plans.waitlist, 'person', 'people')} on a waitlist`
            }
          />
        </dl>

        <div className="mb-14 grid gap-12 lg:grid-cols-2 lg:gap-10">
          <section aria-labelledby="signups-heading">
            <h2 id="signups-heading" className="text-base font-medium">
              New accounts
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {count(signupsInSeries, 'account', 'accounts')} in the last {series.days} days, by day
              (UTC).
            </p>
            <DailyBars
              days={series.signups}
              segments={SIGNUP_SEGMENTS}
              caption={`New accounts each day for the last ${series.days} days`}
              emptyMessage={`Nobody has joined in the last ${series.days} days.`}
            />
          </section>
          <section aria-labelledby="attempts-heading">
            <h2 id="attempts-heading" className="text-base font-medium">
              Assessments started
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {count(startedInSeries, 'assessment', 'assessments')} in the last {series.days} days,
              by the day they were started (UTC).
            </p>
            <DailyBars
              days={assessmentDays}
              segments={ASSESSMENT_SEGMENTS}
              caption={`Assessments started each day for the last ${series.days} days, and how many of them were passed`}
              emptyMessage={`No assessments were started in the last ${series.days} days.`}
            />
          </section>
        </div>

        <div className="mb-14 grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
          <section aria-labelledby="recent-heading" className="lg:col-span-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="recent-heading" className="text-base font-medium">
                Newest accounts
              </h2>
              <Link href="/admin/users" className="metalab-link text-sm">
                All users
              </Link>
            </div>
            {data.recentUsers.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No accounts yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {data.recentUsers.map((user) => (
                  <li key={user.id}>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 transition-colors hover:text-verified-ink"
                    >
                      <span className="min-w-0">
                        <span className="break-words">{user.name}</span>{' '}
                        <span className="break-all text-ink-faint">{user.email}</span>
                      </span>
                      <span className="shrink-0 text-ink-faint">
                        {user.methods.join(', ')} · {formatDate(user.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="popular-heading">
            <h2 id="popular-heading" className="text-base font-medium">
              Most started, last 30 days
            </h2>
            {data.topAssessments.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No assessments started yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {data.topAssessments.map((item) => (
                  <li key={item.slug} className="flex justify-between gap-4 py-3">
                    <span className="min-w-0 break-words">{item.skillName}</span>
                    <span className="tabular shrink-0">{item.started}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
          <section aria-labelledby="totals-heading">
            <h2 id="totals-heading" className="text-base font-medium">
              In total
            </h2>
            <ul className="ruled-list mt-3 border-y border-line text-sm">
              <Row
                label="Confirmed email addresses"
                value={`${users.confirmedEmails} of ${users.total}`}
              />
              <Row label="Finished onboarding" value={`${users.onboarded} of ${users.total}`} />
              <Row label="Sign in with email and password only" value={signIn.emailOnly} />
              <Row label="Assessments started, all time" value={assessments.total} />
              <Row label="In progress now" value={assessments.inProgress} />
              <Row label="Credentials in force" value={assessments.activeCredentials} />
              <Row label="On the free plan" value={plans.free} />
              <Row label="Waitlist sign-ups" value={plans.waitlist} />
              <Row label="Companies" value={employers.companies} />
              <Row label="Open job listings" value={employers.activeJobs} />
            </ul>
          </section>

          <section aria-labelledby="setup-heading" className="lg:col-span-2">
            <h2 id="setup-heading" className="text-base font-medium">
              What&apos;s switched on
            </h2>
            <ul className="ruled-list mt-3 border-y border-line text-sm">
              {setupRows.map((row) => (
                <li
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span>
                    {row.label}{' '}
                    <span className={row.on ? 'text-verified-ink' : 'text-ink-faint'}>
                      · {row.on ? 'On' : 'Off'}
                    </span>
                  </span>
                  <span className="text-ink-muted">{row.note}</span>
                </li>
              ))}
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span>Admins</span>
                <span className="text-ink-muted">
                  {count(setup.admins, 'address', 'addresses')} in ADMIN_EMAILS
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </AppPageShell>
  )
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className="display-number mt-2 text-5xl leading-none">{value.toLocaleString()}</dd>
      {note && <dd className="mt-2 text-xs leading-relaxed text-ink-faint">{note}</dd>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex justify-between gap-4 py-3">
      <span className="text-ink-muted">{label}</span>
      <span className="tabular shrink-0">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </li>
  )
}
