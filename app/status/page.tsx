import type { Metadata } from 'next'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { overall, statusChecks, type CheckState } from '@/lib/status'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Whether Nexus and its parts are working right now.',
}

// Checked at most once a minute, so visiting the page can't load the database.
export const revalidate = 60

const DOT: Record<CheckState, string> = {
  up: 'bg-verified',
  down: 'bg-critical',
  off: 'bg-ink-faint',
}

const WORD: Record<CheckState, string> = { up: 'Working', down: 'Problem', off: 'Off' }

export default async function StatusPage() {
  const checks = await statusChecks()
  const state = overall(checks)
  const history = process.env.NEXT_PUBLIC_STATUS_URL
  const checkedAt = new Date().toUTCString().replace('GMT', 'UTC')

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title={state === 'up' ? 'Everything is working' : 'Something isn’t working'}
          rule
          description={
            state === 'up'
              ? `Checked ${checkedAt}. Refreshed every minute.`
              : `We’ve been alerted and are on it. Checked ${checkedAt}.`
          }
        />

        <ul className="ruled-list max-w-3xl border-y border-line">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-4 py-5">
              <span className="flex items-center gap-3">
                <span aria-hidden className={`size-2.5 rounded-full ${DOT[c.state]}`} />
                <span className="font-medium">{c.name}</span>
              </span>
              <span className="text-right text-sm text-ink-muted">
                <span className="sr-only">{WORD[c.state]}: </span>
                {c.detail}
              </span>
            </li>
          ))}
        </ul>

        {history && (
          <p className="mt-8 max-w-3xl text-sm text-ink-muted">
            An outside monitor checks Nexus every few minutes.{' '}
            <a
              href={history}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2"
            >
              See uptime history
            </a>
          </p>
        )}
      </div>
    </AppPageShell>
  )
}
