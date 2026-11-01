'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSkillPillarForName } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'

interface Job {
  id: string
  title: string
  description?: string
  skills: string[]
  location?: string
  type: string
  salary?: string
}

interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  website?: string
  description?: string
}

/** Public company profile: who they are and the roles they have open. */
export default function CompanyPage() {
  const params = useParams()
  const slug = params.slug as string
  const [company, setCompany] = useState<Company | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      fetch(`/api/company/${slug}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/jobs?companySlug=${slug}`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([companyData, jobsData]) => {
        if (companyData.company) setCompany(companyData.company)
        if (jobsData.jobs) setJobs(jobsData.jobs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (!company) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Company not found"
            rule
            description="This company page doesn’t exist, or it has been removed."
            actions={
              <Link href="/marketplace" className="button-base button-secondary min-h-11 px-5">
                Browse roles
              </Link>
            }
          />
        </div>
      </AppPageShell>
    )
  }

  const hiringPillars = Array.from(
    new Set(
      jobs.flatMap((job) => job.skills.map((skill) => getSkillPillarForName(skill).shortLabel))
    )
  )

  return (
    <AppPageShell>
      <div className="page-shell">
        <div className="flex items-start gap-6">
          {company.logo && (
            <Image
              src={company.logo}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="mt-8 size-16 shrink-0 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <PageHeader
              title={company.name}
              rule
              description={
                company.description ||
                (hiringPillars.length
                  ? `Hiring for ${hiringPillars.join(', ')}.`
                  : 'No open roles at the moment.')
              }
              actions={
                company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-base button-secondary min-h-11 px-5"
                  >
                    Website ↗
                  </a>
                ) : undefined
              }
            />
          </div>
        </div>

        <section aria-labelledby="roles-heading" className="border-t border-line pt-10">
          <h2 id="roles-heading" className="text-base font-medium">
            Open roles <span className="text-ink-faint">{jobs.length}</span>
          </h2>
          {jobs.length === 0 ? (
            <p className="mt-6 border-y border-line py-12 text-ink-muted">
              No open roles right now. Check back later.
            </p>
          ) : (
            <ul className="ruled-list mt-6 border-y border-line">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="grid gap-4 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div>
                    <h3 className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-light leading-tight">
                      {job.title}
                    </h3>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                      {job.location && <span>{job.location}</span>}
                      <span>{job.type.replace('-', ' ')}</span>
                      {job.salary && <span>{job.salary}</span>}
                    </p>
                  </div>
                  <div className="text-sm">
                    {job.description && (
                      <p className="line-clamp-2 leading-relaxed text-ink-muted">
                        {job.description}
                      </p>
                    )}
                    {job.skills.length > 0 && (
                      <p className="mt-1 text-ink-faint">{job.skills.slice(0, 6).join(', ')}</p>
                    )}
                  </div>
                  <Link
                    href="/marketplace"
                    className="button-base button-primary min-h-9 px-4 text-sm lg:justify-self-end"
                  >
                    View and apply
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppPageShell>
  )
}
