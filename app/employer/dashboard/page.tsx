'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Search } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import SectionHeading from '@/components/Layout/SectionHeading'
import Loader from '@/components/UI/Loader'
import VerifiedBars from '@/components/Analytics/VerifiedBars'

interface Company {
  id: string
  name: string
  slug: string
  role: string
  jobCount: number
  poolCount: number
}

interface Summary {
  talent: {
    discoverable: number
    verifiedSkills: number
    byPillar: { label: string; claimed: number; verified: number }[]
  }
  jobs: { id: string; title: string; skills: string[]; createdAt: string }[]
  pools: { id: string; name: string; candidateCount: number; createdAt: string }[]
}

async function getJson<T>(url: string, fallbackError: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : fallbackError)
  }
  return data as T
}

/** Employer home: what the talent pool can prove, your open roles and your shortlists. */
export default function EmployerDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [companyData, summaryData] = await Promise.all([
        getJson<{ company: Company | null }>(
          '/api/employer/company',
          'Unable to load your employer workspace.'
        ),
        getJson<Summary>('/api/employer/summary', 'Unable to load your hiring summary.'),
      ])
      if (!companyData.company) {
        throw new Error('No employer profile was found for this account yet.')
      }
      setCompany(companyData.company)
      setSummary(summaryData)
    } catch (err) {
      setCompany(null)
      setError(err instanceof Error ? err.message : 'Unable to load your employer workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (error || !company || !summary) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Hiring"
            rule
            description={error ?? 'We could not load your employer workspace right now.'}
            actions={
              <button
                type="button"
                onClick={load}
                className="button-base button-primary min-h-11 px-5"
              >
                Try again
              </button>
            }
          />
        </div>
      </AppPageShell>
    )
  }

  const verifiedShare = summary.talent.byPillar.reduce(
    (acc, p) => ({ claimed: acc.claimed + p.claimed, verified: acc.verified + p.verified }),
    { claimed: 0, verified: 0 }
  )

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title={company.name}
          rule
          description="Search people by what they’ve proven, keep shortlists, and post roles the AI can match against."
          actions={
            <>
              <Link href="/employer/talent" className="button-base button-primary min-h-11 px-5">
                <Search className="size-4" aria-hidden />
                Find talent
              </Link>
              <Link href="/employer/jobs" className="button-base button-secondary min-h-11 px-5">
                Post a role
              </Link>
            </>
          }
        />

        <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
          {[
            { label: 'Discoverable candidates', value: summary.talent.discoverable },
            {
              label: 'Skills verified',
              value: verifiedShare.claimed
                ? `${Math.round((verifiedShare.verified / verifiedShare.claimed) * 100)}%`
                : '—',
            },
            { label: 'Open roles', value: company.jobCount },
            { label: 'Shortlists', value: company.poolCount },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`py-8 ${i % 2 === 1 ? 'pl-6' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i > 0 ? 'md:border-l md:border-line md:pl-8' : ''}`}
            >
              <dt className="text-sm text-ink-faint">{stat.label}</dt>
              <dd className="display-number mt-3 text-[clamp(2.5rem,4vw,3.5rem)] leading-none">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-12 py-12 lg:grid-cols-3 lg:gap-10">
          <section aria-labelledby="talent-heading">
            <SectionHeading id="talent-heading" note="Public skills, verified of claimed">
              Talent by pillar
            </SectionHeading>
            <VerifiedBars groups={summary.talent.byPillar} />
          </section>

          <section aria-labelledby="roles-heading">
            <SectionHeading
              id="roles-heading"
              note={
                <Link href="/employer/jobs" className="hover:text-ink">
                  All roles
                </Link>
              }
            >
              Open roles
            </SectionHeading>
            {summary.jobs.length === 0 ? (
              <p className="mt-4 border-y border-line py-4 text-sm text-ink-muted">
                No open roles yet. Post one and the AI can rank candidates against it.
              </p>
            ) : (
              <ul className="ruled-list mt-4 border-y border-line">
                {summary.jobs.map((job) => (
                  <li key={job.id} className="py-4">
                    <Link
                      href={`/employer/talent?jobId=${job.id}`}
                      className="flex items-baseline justify-between gap-4 hover:text-ink"
                    >
                      <span className="font-medium">{job.title}</span>
                      <span className="shrink-0 text-sm text-ink-faint">
                        {formatDistanceToNowStrict(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </Link>
                    {job.skills.length > 0 && (
                      <p className="mt-1 truncate text-sm text-ink-muted">
                        {job.skills.join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="pools-heading">
            <SectionHeading
              id="pools-heading"
              note={
                <Link href="/employer/pools" className="hover:text-ink">
                  All shortlists
                </Link>
              }
            >
              Shortlists
            </SectionHeading>
            {summary.pools.length === 0 ? (
              <p className="mt-4 border-y border-line py-4 text-sm text-ink-muted">
                No shortlists yet. Save candidates from a search to start one.
              </p>
            ) : (
              <ul className="ruled-list mt-4 border-y border-line">
                {summary.pools.map((pool) => (
                  <li key={pool.id}>
                    <Link
                      href={`/employer/pools/${pool.id}`}
                      className="flex items-baseline justify-between gap-4 py-4 hover:text-ink"
                    >
                      <span className="font-medium">{pool.name}</span>
                      <span className="text-sm text-ink-faint">
                        {pool.candidateCount} {pool.candidateCount === 1 ? 'person' : 'people'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppPageShell>
  )
}
