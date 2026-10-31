'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { useSkills } from '@/lib/hooks/useSkills'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { authApi, dashboardApi } from '@/lib/api'
import type { DashboardSummary } from '@/lib/dashboard/summary'
import type { User } from '@/lib/types'
import { LEVEL_LABELS, SKILL_LEVELS } from '@/lib/utils/constants'
import {
  getSkillPillarDetail,
  normalizeSkillCategory,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import SectionHeading from '@/components/Layout/SectionHeading'
import VerifiedBars from '@/components/Analytics/VerifiedBars'
import GapAnalysis from '@/components/Analytics/GapAnalysis'
import VerifiedGrowth from '@/components/Dashboard/VerifiedGrowth'

/** Where the passport is strong, where it's thin, and what to prove next. All from real data. */
export default function AnalyticsPage() {
  const { addToast } = useToast()
  const { skills, loading } = useSkills()
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const isGuestPreview = user?.id === 'guest-user'

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
    dashboardApi
      .getSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const analytics = useMemo(() => {
    const byPillar = SKILL_PILLAR_DETAILS.map((pillar) => {
      const inPillar = skills.filter(
        (skill) => normalizeSkillCategory(skill.category) === pillar.category
      )
      return {
        label: pillar.shortLabel,
        category: pillar.category,
        claimed: inPillar.length,
        verified: inPillar.filter((skill) => skill.verified).length,
      }
    })
    const byLevel = SKILL_LEVELS.map((level) => {
      const atLevel = skills.filter((skill) => skill.level === level)
      return {
        label: LEVEL_LABELS[level],
        claimed: atLevel.length,
        verified: atLevel.filter((skill) => skill.verified).length,
      }
    })
    const verified = skills.filter((skill) => skill.verified).length
    const coverage = skills.length ? Math.round((verified / skills.length) * 100) : 0
    const activePillars = byPillar.filter((pillar) => pillar.claimed > 0)
    const strongest = [...byPillar].sort((a, b) => b.claimed - a.claimed)[0]
    const emptyPillar = byPillar.find((pillar) => pillar.claimed === 0)
    const leastVerified = [...activePillars].sort(
      (a, b) => a.verified / a.claimed - b.verified / b.claimed
    )[0]
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const updatedThisMonth = skills.filter((s) => new Date(s.updatedAt) > monthAgo).length
    const nextToProve = [...skills]
      .filter((skill) => !skill.verified)
      .sort((a, b) => b.progress - a.progress)[0]
    const concentration =
      skills.length && strongest ? Math.round((strongest.claimed / skills.length) * 100) : 0

    const lead =
      skills.length === 0
        ? 'Add a few skills to see how your passport breaks down by pillar and level.'
        : concentration >= 70
          ? `Most of your skills sit in ${strongest.label}. That’s real depth; one verified skill in another pillar would make the passport read broader.`
          : activePillars.length >= 4
            ? `You span ${activePillars.length} pillars fairly evenly, which suits roles that want breadth backed by proof.`
            : `You’re active in ${activePillars.length} ${activePillars.length === 1 ? 'pillar' : 'pillars'}. Adding an adjacent one makes your story easier for employers to scan.`

    return {
      byPillar,
      byLevel,
      verified,
      coverage,
      activePillars,
      strongest,
      emptyPillar,
      leastVerified,
      updatedThisMonth,
      nextToProve,
      lead,
    }
  }, [skills])

  const handleExport = async () => {
    if (isGuestPreview) return
    setExporting(true)
    try {
      const res = await fetch(`/api/analytics/export?format=${exportFormat}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skill-passport-analytics-${Date.now()}.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
      addToast({
        type: 'success',
        title: 'Analytics exported',
        message: `Your ${exportFormat.toUpperCase()} export is ready.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Export failed',
        message: 'We could not export your analytics right now.',
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  const focus = [
    {
      label: 'Strongest pillar',
      value: analytics.strongest?.claimed ? analytics.strongest.label : 'None yet',
      note: analytics.strongest?.claimed
        ? `${analytics.strongest.claimed} ${analytics.strongest.claimed === 1 ? 'skill' : 'skills'}`
        : 'Add a skill to start',
    },
    {
      label: 'Next to prove',
      value: analytics.nextToProve?.name ?? 'Nothing waiting',
      note: analytics.nextToProve
        ? 'Your most developed skill without a verified check'
        : 'Every skill you claim is verified',
    },
    {
      label: 'Least verified pillar',
      value: analytics.leastVerified?.label ?? '—',
      note: analytics.leastVerified
        ? `${analytics.leastVerified.verified} of ${analytics.leastVerified.claimed} verified`
        : 'No pillars in use yet',
    },
    {
      label: 'Empty pillar',
      value: analytics.emptyPillar?.label ?? 'None',
      note: analytics.emptyPillar
        ? getSkillPillarDetail(analytics.emptyPillar.category).summary
        : 'You have skills in all five pillars',
    },
  ]

  const timeline = [...skills].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <AppPageShell>
      <div className="page-shell">
        {isGuestPreview && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-ink-muted">
              You are viewing sample analytics. Exporting needs an account.
            </p>
            <Link href="/auth/register" className="pill" data-active="true">
              Create account
            </Link>
          </div>
        )}

        <PageHeader
          title="Analytics"
          rule
          description={analytics.lead}
          actions={
            <>
              <label>
                <span className="sr-only">Export format</span>
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as 'csv' | 'json')}
                  className="metalab-input !min-h-11 w-auto"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <Button
                variant="secondary"
                leftIcon={<Download className="size-4" aria-hidden />}
                onClick={handleExport}
                disabled={exporting || isGuestPreview}
                isLoading={exporting}
              >
                Export
              </Button>
            </>
          }
        />

        <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
          {[
            { label: 'Skills claimed', value: skills.length },
            { label: 'Verified', value: `${analytics.coverage}%` },
            {
              label: 'Pillars in use',
              value: `${analytics.activePillars.length}/${SKILL_PILLAR_DETAILS.length}`,
            },
            { label: 'Updated this month', value: analytics.updatedThisMonth },
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
          <section aria-labelledby="pillar-heading">
            <SectionHeading id="pillar-heading" note="Verified out of claimed">
              By pillar
            </SectionHeading>
            <VerifiedBars groups={analytics.byPillar} />
          </section>
          <section aria-labelledby="level-heading">
            <SectionHeading id="level-heading" note="Verified out of claimed">
              By level
            </SectionHeading>
            <VerifiedBars groups={analytics.byLevel} />
          </section>
          <section aria-labelledby="growth-heading">
            <SectionHeading id="growth-heading" note="Last 12 weeks">
              Verified skills
            </SectionHeading>
            {summary ? (
              <VerifiedGrowth points={summary.verifiedOverTime} />
            ) : (
              <div className="mt-6 aspect-[2/1] rounded-lg bg-raised" aria-hidden />
            )}
          </section>
        </div>

        <section aria-labelledby="focus-heading" className="border-t border-line py-12">
          <SectionHeading id="focus-heading">Where to focus</SectionHeading>
          <dl className="mt-6 grid gap-x-10 md:grid-cols-2">
            {focus.map((item) => (
              <div key={item.label} className="border-t border-line py-5">
                <dt className="text-sm text-ink-faint">{item.label}</dt>
                <dd className="mt-1 font-display text-3xl font-light">{item.value}</dd>
                <dd className="mt-1 text-sm text-ink-muted">{item.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="gap-heading" className="border-t border-line py-12">
          <SectionHeading id="gap-heading" note="Against a target role">
            Gap analysis
          </SectionHeading>
          <div className="mt-6">
            <GapAnalysis />
          </div>
        </section>

        <section aria-labelledby="timeline-heading" className="border-t border-line pt-12">
          <SectionHeading id="timeline-heading" note="Newest first">
            Timeline
          </SectionHeading>
          {timeline.length === 0 ? (
            <p className="mt-6 text-ink-muted">Skills appear here as you add them.</p>
          ) : (
            <ol className="ruled-list mt-6 border-y border-line">
              {timeline.map((skill) => (
                <li
                  key={skill.id}
                  className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-4 py-4 md:grid-cols-[8rem_minmax(0,1fr)_10rem_10rem]"
                >
                  <time dateTime={skill.createdAt} className="tabular text-sm text-ink-faint">
                    {format(new Date(skill.createdAt), 'MMM d, yyyy')}
                  </time>
                  <span className="truncate">{skill.name}</span>
                  <span className="hidden text-sm text-ink-muted md:block">
                    {getSkillPillarDetail(normalizeSkillCategory(skill.category)).shortLabel} ·{' '}
                    {LEVEL_LABELS[skill.level]}
                  </span>
                  <span
                    className={`text-right text-sm ${skill.verified ? 'text-verified' : 'text-ink-faint'}`}
                  >
                    {skill.verified ? 'Verified' : 'Not verified yet'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </AppPageShell>
  )
}
