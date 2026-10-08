'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSkills } from '@/lib/hooks/useSkills'
import { motion } from 'framer-motion'
import Loader from '@/components/UI/Loader'
import { TrendingUp, Download, Calendar, BarChart3, PieChart } from 'lucide-react'
import Button from '@/components/UI/Button'
import { easing } from '@/lib/utils/animations'
import { authApi } from '@/lib/api'
import type { User } from '@/lib/types'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import { normalizeSkillCategory, SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'

// Lazy load heavy chart components
const ProgressChart = dynamic(() => import('@/components/Analytics/ProgressChart'), {
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <Loader />
    </div>
  ),
  ssr: false,
})

const SkillHeatmap = dynamic(() => import('@/components/Analytics/SkillHeatmap'), {
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <Loader />
    </div>
  ),
  ssr: false,
})

const TimelineView = dynamic(() => import('@/components/Analytics/TimelineView'), {
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <Loader />
    </div>
  ),
  ssr: false,
})

const GapAnalysis = dynamic(() => import('@/components/Analytics/GapAnalysis'), {
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <Loader />
    </div>
  ),
  ssr: false,
})

export default function AnalyticsPage() {
  const { addToast } = useToast()
  const { skills, loading } = useSkills()
  const [user, setUser] = useState<User | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const isGuestPreview = user?.id === 'guest-user'

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const analyticsSummary = useMemo(() => {
    const pillarCounts = SKILL_PILLAR_DETAILS.map((pillar) => ({
      ...pillar,
      count: skills.filter((skill) => normalizeSkillCategory(skill.category) === pillar.category)
        .length,
      color: CATEGORY_COLORS[pillar.category],
    }))
    const strongestPillar = [...pillarCounts].sort((a, b) => b.count - a.count)[0]
    const weakestPillar = [...pillarCounts].sort((a, b) => a.count - b.count)[0]
    const averageProgress =
      skills.length > 0
        ? Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / skills.length)
        : 0
    const verifiedCoverage =
      skills.length > 0
        ? Math.round((skills.filter((skill) => skill.verified).length / skills.length) * 100)
        : 0
    const updatedThisMonth = skills.filter((s) => {
      const updateDate = new Date(s.updatedAt)
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return updateDate > monthAgo
    }).length
    const topProofOpportunity = [...skills]
      .filter((skill) => !skill.verified)
      .sort((a, b) => b.progress - a.progress)[0]

    const total = skills.length
    const pillarSpread = pillarCounts.filter((pillar) => pillar.count > 0).length
    const topPillarConcentration =
      total > 0 && strongestPillar ? Math.round((strongestPillar.count / total) * 100) : 0
    const verifiedByPillar = SKILL_PILLAR_DETAILS.map((pillar) => {
      const inPillar = skills.filter(
        (skill) => normalizeSkillCategory(skill.category) === pillar.category
      )
      const verified = inPillar.filter((skill) => skill.verified).length
      return {
        category: pillar.category,
        shortLabel: pillar.shortLabel,
        verified,
        total: inPillar.length,
        rate: inPillar.length ? Math.round((verified / inPillar.length) * 100) : 0,
      }
    })
    const lowestVerifiedPillar = [...verifiedByPillar].sort((a, b) => a.rate - b.rate)[0]

    const insightLead =
      skills.length === 0
        ? 'Add a few skills to unlock pillar-level analytics and export.'
        : topPillarConcentration >= 70
          ? `Most of your visible skills sit in ${strongestPillar?.shortLabel ?? 'one pillar'}—great depth, and worth a deliberate pass in other pillars so the passport reads balanced.`
          : pillarSpread >= 4
            ? `You span ${pillarSpread} pillars with a relatively even footprint—strong for roles that need breadth plus proof.`
            : `You are active across ${pillarSpread} ${pillarSpread === 1 ? 'pillar' : 'pillars'}; expanding into adjacent pillars makes your story easier for recruiters to scan.`

    return {
      pillarCounts,
      strongestPillar,
      weakestPillar,
      averageProgress,
      verifiedCoverage,
      updatedThisMonth,
      topProofOpportunity,
      verifiedByPillar,
      lowestVerifiedPillar,
      pillarSpread,
      topPillarConcentration,
      insightLead,
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
        message: `Your ${exportFormat.toUpperCase()} analytics export is ready.`,
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="page-shell">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing.primary }}
          className="mb-16"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="hero-kicker mb-5">Growth Intelligence</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-[1.1]">
                  Analytics
                </h1>
                <p className="text-lg text-white/68 max-w-xl">
                  See how credibility compounds across your profile, where momentum is building, and
                  what needs proof next.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as 'csv' | 'json')}
                  className="min-h-[40px] rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                  disabled={exporting || isGuestPreview}
                  isLoading={exporting}
                >
                  Export {exportFormat.toUpperCase()}
                </Button>
              </div>
            </div>
            {isGuestPreview && (
              <div className="mt-6 border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
                You are browsing a guest preview. Sign in or create an account to export analytics.
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-6">
              {[
                { label: 'Average progress', value: `${analyticsSummary.averageProgress}%` },
                { label: 'Verified skills', value: `${skills.filter((s) => s.verified).length}` },
                {
                  label: 'Active pillars',
                  value: `${new Set(skills.map((s) => normalizeSkillCategory(s.category))).size}`,
                },
              ].map((item) => (
                <div key={item.label} className="insight-card p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {item.label}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="gradient-border-card p-8 mb-12">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45 mb-3">
            Signal narrative
          </div>
          <p className="text-lg text-white/85 leading-relaxed max-w-4xl">
            {analyticsSummary.insightLead}
          </p>
          {skills.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Pillar distribution</h3>
                <span className="text-xs text-white/50">
                  {analyticsSummary.pillarSpread} of {SKILL_PILLAR_DETAILS.length} pillars in use ·{' '}
                  {analyticsSummary.lowestVerifiedPillar?.total
                    ? `lowest verification in ${analyticsSummary.lowestVerifiedPillar.shortLabel} (${analyticsSummary.lowestVerifiedPillar.rate}%)`
                    : 'add skills to see verification by pillar'}
                </span>
              </div>
              <div className="space-y-3">
                {analyticsSummary.pillarCounts.map((pillar) => {
                  const pct = Math.round((pillar.count / Math.max(1, skills.length)) * 100)
                  return (
                    <div key={pillar.category}>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span className="font-medium text-white/80">{pillar.shortLabel}</span>
                        <span className="tabular-nums">
                          {pillar.count} skills · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            {
              icon: TrendingUp,
              value: skills.length > 0 ? analyticsSummary.averageProgress : 0,
              label: 'Average Progress',
              suffix: '%',
            },
            {
              icon: BarChart3,
              value: skills.filter((s) => s.verified).length,
              label: 'Verified Skills',
            },
            {
              icon: PieChart,
              value: new Set(skills.map((s) => normalizeSkillCategory(s.category))).size,
              label: 'Pillars represented',
            },
            {
              icon: Calendar,
              value: skills.filter((s) => {
                const updateDate = new Date(s.updatedAt)
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return updateDate > monthAgo
              }).length,
              label: 'Updated This Month',
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label}>
                <div className="gradient-border-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 border border-white/10 bg-white/5">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2 tracking-tight tabular-nums">
                    {stat.value}
                    {stat.suffix || ''}
                  </div>
                  <div className="text-xs text-white/60 uppercase tracking-wider font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 mb-20">
          <div className="gradient-border-card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Insight Summary</h2>
              <p className="text-white/60">
                A quick read on where your proof is strongest and what deserves attention next.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="insight-card p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Strongest pillar
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {analyticsSummary.strongestPillar?.category ?? 'None yet'}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {analyticsSummary.strongestPillar?.count ?? 0} skills represented
                </div>
              </div>
              <div className="insight-card p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Needs more proof
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {analyticsSummary.topProofOpportunity?.name ?? 'No obvious gap'}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {analyticsSummary.topProofOpportunity
                    ? `${analyticsSummary.topProofOpportunity.progress}% progress and still unverified`
                    : 'Your strongest visible skills already have proof attached.'}
                </div>
              </div>
              <div className="insight-card p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Verified coverage
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {analyticsSummary.verifiedCoverage}%
                </div>
                <div className="mt-2 text-sm text-white/60">
                  How much of your visible skill set is backed by verified signals.
                </div>
              </div>
              <div className="insight-card p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Underrepresented pillar
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {analyticsSummary.weakestPillar?.category ?? 'Learning & Growth'}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {analyticsSummary.weakestPillar?.count === 0
                    ? 'No skills in this pillar yet—add one to round out your passport.'
                    : analyticsSummary.lowestVerifiedPillar &&
                        analyticsSummary.lowestVerifiedPillar.total > 0
                      ? `Lowest pillar verification is ${analyticsSummary.lowestVerifiedPillar.shortLabel} at ${analyticsSummary.lowestVerifiedPillar.rate}%—prioritize proof there.`
                      : 'Add stronger proof here to make your profile feel more balanced.'}
                </div>
              </div>
            </div>
          </div>

          <div className="gradient-border-card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Pillar Recommendations</h2>
              <p className="text-white/60">
                Three focused actions that would improve the quality of your passport fastest.
              </p>
            </div>
            <div className="space-y-4">
              {[
                analyticsSummary.topProofOpportunity
                  ? `Add evidence for ${analyticsSummary.topProofOpportunity.name} to convert existing progress into proof recruiters can trust.`
                  : 'Keep adding proof to your strongest skills so your passport stays current.',
                analyticsSummary.weakestPillar
                  ? `Strengthen ${analyticsSummary.weakestPillar.category.toLowerCase()} with at least one concrete example or artifact.`
                  : 'Balance your profile by expanding into more than one pillar.',
                analyticsSummary.updatedThisMonth > 0
                  ? `You updated ${analyticsSummary.updatedThisMonth} skills recently. Capture that momentum with a new verification run or share update.`
                  : 'Refresh one stale skill this month so your profile shows visible momentum.',
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/72"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics sections - increased spacing for hierarchy */}
        <div className="space-y-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
          >
            <ProgressChart skills={skills} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: easing.primary }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <SkillHeatmap skills={skills} type="category" />
            <SkillHeatmap skills={skills} type="level" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: easing.primary }}
          >
            <TimelineView skills={skills} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.3, ease: easing.primary }}
          >
            <GapAnalysis />
          </motion.div>
        </div>
      </div>
    </AppPageShell>
  )
}
