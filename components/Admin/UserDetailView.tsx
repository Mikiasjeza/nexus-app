'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import AdminNav from '@/components/Admin/AdminNav'
import {
  attemptOutcome,
  credentialStatus,
  formatDate,
  modeLabel,
  providerName,
  timeAgo,
} from '@/components/Admin/format'
import { PLAN_INFO } from '@/lib/plans'
import type { AdminUserDetail } from '@/lib/admin/users'

const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: 'Active',
  trialing: 'In a trial',
  past_due: 'Payment overdue',
  unpaid: 'Unpaid',
  incomplete: 'Checkout not finished',
  incomplete_expired: 'Checkout expired',
  canceled: 'Cancelled',
  paused: 'Paused',
}

/** One person's record: account, plan, assessments, credentials and recent activity. Read-only. */
export default function UserDetailView({ user }: { user: AdminUserDetail }) {
  const { subscription, usage } = user
  const paid = user.plan !== 'free'

  return (
    <AppPageShell>
      <div className="page-shell">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-ink-faint transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All users
        </Link>
        <PageHeader
          title={user.name}
          description={
            <>
              <span className="break-all">{user.email}</span> · Joined {formatDate(user.createdAt)}{' '}
              · Last active {timeAgo(user.lastActiveAt).toLowerCase()}
            </>
          }
          actions={<AdminNav />}
        />

        <dl className="mb-14 grid grid-cols-2 gap-x-10 gap-y-8 border-t border-line pt-6 md:grid-cols-4">
          <Stat label="Plan" value={PLAN_INFO[user.plan].name} accent={paid} />
          <Stat label="Assessments started" value={user.totals.attempts} />
          <Stat label="Credentials in force" value={user.totals.credentialsInForce} />
          <Stat
            label="Skills"
            value={user.skills.total}
            note={`${user.skills.verified} verified`}
          />
        </dl>

        <div className="mb-14 grid gap-12 lg:grid-cols-2 lg:gap-10">
          <Section id="account" title="Account">
            <Fact label="Email address">{user.emailVerified ? 'Confirmed' : 'Not confirmed'}</Fact>
            <Fact label="Signs in with">{user.methods.join(', ')}</Fact>
            {user.connections.map((connection) => (
              <Fact key={connection.provider} label={`${providerName(connection.provider)} linked`}>
                <span className="break-all">{connection.account ?? 'Yes'}</span>
                <span className="text-ink-faint"> · {formatDate(connection.connectedAt)}</span>
              </Fact>
            ))}
            <Fact label="Onboarding">{user.onboardingComplete ? 'Finished' : 'Not finished'}</Fact>
            <Fact label="Profile">
              {user.profilePath ? (
                <Link href={user.profilePath} className="metalab-link">
                  Public
                </Link>
              ) : (
                'Private'
              )}
            </Fact>
            <Fact label="Visible to employers">{user.discoverableByEmployers ? 'Yes' : 'No'}</Fact>
            {user.companies.map((company) => (
              <Fact key={company.slug} label="Company">
                {company.name} <span className="text-ink-faint">· {company.role}</span>
              </Fact>
            ))}
            {user.waitlist.map((entry) => (
              <Fact key={entry.plan} label="On a waitlist">
                {PLAN_INFO[entry.plan].name}{' '}
                <span className="text-ink-faint">· {formatDate(entry.joinedAt)}</span>
              </Fact>
            ))}
          </Section>

          <Section id="plan" title="Plan and usage">
            <Fact label="Plan">{PLAN_INFO[user.plan].name}</Fact>
            {subscription && subscription.plan !== 'free' && (
              <>
                <Fact label="Subscription">
                  {SUBSCRIPTION_STATUS[subscription.status] ?? subscription.status}
                </Fact>
                {subscription.currentPeriodEnd && (
                  <Fact label={subscription.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}>
                    {formatDate(subscription.currentPeriodEnd)}
                  </Fact>
                )}
                {subscription.firstPaidAt && (
                  <Fact label="First paid">{formatDate(subscription.firstPaidAt)}</Fact>
                )}
              </>
            )}
            {subscription?.stripeCustomerId && (
              <Fact label="In Stripe">
                <a
                  href={`https://dashboard.stripe.com/customers/${encodeURIComponent(subscription.stripeCustomerId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metalab-link"
                >
                  Open customer
                </a>
              </Fact>
            )}
            <Fact label="Formal assessments this month">
              {usage ? `${usage.formalUsed} of ${usage.formalLimit}` : 'None yet'}
            </Fact>
            <Fact label="Practice rounds this month">{usage ? usage.practiceRounds : 0}</Fact>
          </Section>
        </div>

        <section aria-labelledby="attempts-heading" className="mb-14">
          <h2 id="attempts-heading" className="text-base font-medium">
            Assessments
          </h2>
          {user.totals.attempts > user.attempts.length && (
            <p className="mt-1 text-sm text-ink-muted">
              The most recent {user.attempts.length} of {user.totals.attempts}.
            </p>
          )}
          {user.attempts.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">None started yet.</p>
          ) : (
            <ul className="ruled-list mt-3 border-y border-line text-sm">
              {user.attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span>
                    {attempt.skillName}{' '}
                    <span className="text-ink-faint">· {modeLabel(attempt.mode)}</span>
                  </span>
                  <span className="text-ink-muted">
                    <span className={attempt.result === 'PASSED' ? 'text-verified-ink' : ''}>
                      {attemptOutcome(attempt.status, attempt.result)}
                    </span>
                    {attempt.score !== null && ` · ${attempt.score} out of 100`} ·{' '}
                    {formatDate(attempt.completedAt ?? attempt.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
          <section aria-labelledby="credentials-heading">
            <h2 id="credentials-heading" className="text-base font-medium">
              Credentials
            </h2>
            {user.credentials.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">None issued yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {user.credentials.map((credential) => (
                  <li key={credential.id} className="py-3">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span>
                        {credential.skillName}{' '}
                        <span className="text-ink-faint">
                          · {credential.level} · {credential.score} out of 100
                        </span>
                      </span>
                      <span
                        className={
                          credential.status === 'ACTIVE' ? 'text-verified-ink' : 'text-ink-muted'
                        }
                      >
                        {credentialStatus(credential.status)}
                      </span>
                    </p>
                    <p className="mt-1 text-ink-faint">
                      <Link href={`/verify/${credential.id}`} className="metalab-link">
                        {credential.id}
                      </Link>{' '}
                      · {formatDate(credential.issuedAt)} to {formatDate(credential.expiresAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="text-base font-medium">
              Recent activity
            </h2>
            {user.activity.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nothing recorded yet.</p>
            ) : (
              <ul className="ruled-list mt-3 border-y border-line text-sm">
                {user.activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                  >
                    <span className="min-w-0 break-words">{item.message}</span>
                    <span className="shrink-0 text-ink-faint">{formatDate(item.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
          This page is read-only. People can download or delete everything in their account from
          their own Settings.
        </p>
      </div>
    </AppPageShell>
  )
}

function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string | number
  note?: string
  accent?: boolean
}) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd
        className={`display-number mt-2 text-5xl leading-none ${accent ? 'text-verified-ink' : ''}`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </dd>
      {note && <dd className="mt-2 text-xs text-ink-faint">{note}</dd>}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-base font-medium">
        {title}
      </h2>
      <dl className="ruled-list mt-3 border-y border-line text-sm">{children}</dl>
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}
