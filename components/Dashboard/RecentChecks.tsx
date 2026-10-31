import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import type { DashboardSummary } from '@/lib/dashboard/summary'

type Props = {
  checks: DashboardSummary['recentChecks']
}

export default function RecentChecks({ checks }: Props) {
  if (checks.length === 0) {
    return (
      <p className="mt-4 border-y border-line py-4 text-sm text-ink-muted">
        No checks yet. Each time the AI checks a skill, the result shows up here.{' '}
        <Link href="/verification" className="text-ink underline underline-offset-4">
          Run one
        </Link>
      </p>
    )
  }

  return (
    <ul className="ruled-list mt-4 border-y border-line">
      {checks.map((check) => (
        <li key={check.id} className="flex items-baseline justify-between gap-4 py-4">
          <span className="min-w-0">
            <span className="font-medium">{check.skillName}</span>
            <span
              className={`ml-2 text-sm ${check.verified ? 'text-verified-ink' : 'text-ink-muted'}`}
            >
              {check.verified ? 'Verified' : 'Not verified yet'}
            </span>
          </span>
          <span className="tabular shrink-0 text-sm text-ink-faint">
            {check.confidence}% ·{' '}
            <time dateTime={check.createdAt}>
              {formatDistanceToNowStrict(new Date(check.createdAt), { addSuffix: true })}
            </time>
          </span>
        </li>
      ))}
    </ul>
  )
}
