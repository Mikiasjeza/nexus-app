'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Users, Briefcase, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import AppPageShell from '@/components/Layout/AppPageShell'

interface Company {
  id: string
  name: string
  slug: string
  role: string
  jobCount: number
  poolCount: number
}

export default function EmployerDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCompany = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch('/api/employer/company', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Unable to load your employer workspace.'
          )
        }
        if (!data.company) {
          throw new Error('No employer profile was found for this account yet.')
        }
        setCompany(data.company)
      })
      .catch((err: unknown) => {
        setCompany(null)
        setError(err instanceof Error ? err.message : 'Unable to load your employer workspace.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ground">
        <div className="animate-pulse text-ink-faint">Loading...</div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center px-6">
        <div className="max-w-xl w-full gradient-border-card p-8 text-center">
          <h1 className="text-2xl font-bold text-ink mb-3">Employer dashboard unavailable</h1>
          <p className="text-ink-muted mb-6">
            {error ?? 'We could not load your employer workspace right now.'}
          </p>
          <button
            type="button"
            onClick={loadCompany}
            className="min-h-[44px] px-5 py-2 border border-line-strong text-ink hover:bg-ink hover:text-ground transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const actions = [
    {
      title: 'Search Talent',
      description:
        'Find candidates by their strongest pillars, verified signals, and proof of execution.',
      icon: Search,
      href: '/employer/talent',
      primary: true,
    },
    {
      title: 'Talent Pools',
      description: 'Manage your saved candidates',
      icon: Users,
      href: '/employer/pools',
      count: company.poolCount,
    },
    {
      title: 'Job Listings',
      description: 'Post and manage open roles',
      icon: Briefcase,
      href: '/employer/jobs',
      count: company.jobCount,
    },
  ]

  return (
    <AppPageShell className="min-h-screen bg-ground py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-12">
          <div className="hero-panel p-8 md:p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-pill flex items-center justify-center">
                <Building2 className="w-6 h-6 text-ink" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-ink">{company.name}</h1>
                <p className="text-ink-muted">Hiring dashboard · {company.role}</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
              <div>
                <p className="text-lg text-ink-muted max-w-3xl">
                  Source talent through the same five-pillar system used across Nexus so your team
                  can quickly spot what a candidate builds, creates, explains, leads, and improves
                  over time.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Open roles', value: company.jobCount },
                  { label: 'Saved pools', value: company.poolCount },
                  { label: 'Hiring lens', value: 5 },
                ].map((item) => (
                  <div key={item.label} className="insight-card p-4">
                    <div className="text-sm text-ink-faint">{item.label}</div>
                    <div className="mt-2 text-3xl font-semibold text-ink">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-8">
              {SKILL_PILLAR_DETAILS.map((pillar) => (
                <div
                  key={pillar.category}
                  className="insight-card p-4"
                  style={{ borderColor: `${CATEGORY_COLORS[pillar.category]}30` }}
                >
                  <div className="text-sm text-ink-faint">{pillar.shortLabel}</div>
                  <div className="mt-2 text-sm font-semibold text-ink">{pillar.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {actions.map((action) => (
            <div key={action.href}>
              <Link href={action.href}>
                <AnimatedCard
                  className={`p-6 h-full flex flex-col ${
                    action.primary ? 'border-verified/40 bg-verified-wash' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                      <action.icon className="w-6 h-6 text-ink" />
                    </div>
                    {action.count !== undefined && (
                      <span className="text-2xl font-bold text-ink">{action.count}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-ink mb-2">{action.title}</h3>
                  <p className="text-ink-muted mb-4 flex-1">{action.description}</p>
                  <div className="flex items-center gap-2 text-verified-ink font-medium">
                    <span>Open</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </AnimatedCard>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppPageShell>
  )
}
