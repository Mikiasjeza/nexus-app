'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Stats, Activity, SkillInsight, User } from '@/lib/types'
import { authApi, skillsApi } from '@/lib/api'
import { useSkills } from '@/lib/hooks/useSkills'
import Loader from '@/components/UI/Loader'
import { motion } from 'framer-motion'
import { easing } from '@/lib/utils/animations'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'

// Lazy load all dashboard components for better initial load
const SkillGraph = dynamic(() => import('@/components/Skills/SkillGraph'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: false,
})

const StatsCards = dynamic(() => import('@/components/Dashboard/StatsCards'), {
  loading: () => <div className="h-32 flex items-center justify-center"><Loader /></div>,
  ssr: true,
})

const RecentActivity = dynamic(() => import('@/components/Dashboard/RecentActivity'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: true,
})

const SkillInsights = dynamic(() => import('@/components/Dashboard/SkillInsights'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: true,
})

export default function DashboardPage() {
  const router = useRouter()
  const { skills, loading: skillsLoading } = useSkills()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [insights, setInsights] = useState<SkillInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const isGuestPreview = user?.id === 'guest-user'

  // Memoize data loading function to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const [statsData, activitiesData, insightsData] = await Promise.all([
        skillsApi.getStats(),
        skillsApi.getActivities(10),
        skillsApi.getInsights(),
      ])
      setStats(statsData)
      setActivities(activitiesData)
      setInsights(insightsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      if (error instanceof Error && error.message === 'Not authenticated') {
        router.push('/auth/login?next=/dashboard')
        return
      }
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null))
  }, [loadData])

  const pillarCards = useMemo(() => {
    if (!stats) return []
    return SKILL_PILLAR_DETAILS.map((pillar) => ({
      ...pillar,
      count: stats.skillsByCategory[pillar.category] ?? 0,
      color: CATEGORY_COLORS[pillar.category],
    }))
  }, [stats])

  const dominantPillar = useMemo(() => {
    return pillarCards.reduce<(typeof pillarCards)[number] | null>(
      (best, pillar) => {
        if (!best || pillar.count > best.count) return pillar
        return best
      },
      null
    )
  }, [pillarCards])

  const verifiedRate = stats && stats.totalSkills > 0
    ? Math.round((stats.verifiedSkills / stats.totalSkills) * 100)
    : 0

  if (loading || skillsLoading) {
    return (
      <AppPageShell className="min-h-screen bg-black">
        <div className="page-shell">
          <div className="mb-14 md:mb-24 animate-pulse">
            <div className="hero-panel p-8 md:p-10">
              <div className="h-5 w-40 rounded bg-white/10 mb-6" />
              <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
                <div>
                  <div className="h-12 w-72 rounded bg-white/10 mb-4" />
                  <div className="h-5 w-80 rounded bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="insight-card p-4">
                      <div className="h-3 w-24 rounded bg-white/10 mb-3" />
                      <div className="h-8 w-10 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 md:mt-6 max-w-3xl">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="insight-card px-4 py-3 h-10 rounded bg-white/[0.04]" />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="insight-card px-4 py-4">
                <div className="h-3 w-14 rounded bg-white/10 mb-2" />
                <div className="h-4 w-20 rounded bg-white/[0.06] mt-2" />
                <div className="h-7 w-8 rounded bg-white/10 mt-3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-8 lg:mt-12 animate-pulse">
            <div className="lg:col-span-2 gradient-border-card p-6 h-48" />
            <div className="gradient-border-card p-6 h-48" />
          </div>
        </div>
      </AppPageShell>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-xl w-full gradient-border-card p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Dashboard unavailable</h1>
          <p className="text-white/65 mb-6">
            {error ?? 'Unable to load your dashboard data right now.'}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="min-h-[44px] px-5 py-2 border border-white/15 text-white hover:bg-white hover:text-black transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="page-shell">
        {/* Header - one focal point */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing.primary }}
          className="mb-14 md:mb-24"
        >
          <div className="hud-panel p-8 md:p-10">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Passport · Live</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 text-white tracking-tight leading-[1.1] max-w-[14ch] md:max-w-none">
                  Your{' '}
                  <span className="glow-cyan">
                    passport
                  </span>
                </h1>
                <p className="text-base md:text-lg text-white/55 max-w-[34ch] md:max-w-xl font-light">
                  A living neural record of what you build, create, explain, lead, and improve over time — with proof attached to each node.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Tracked nodes', value: skills.length, color: '#22d3ee' },
                  { label: 'Recent signals', value: activities.length, color: '#a78bfa' },
                  { label: 'AI insights', value: insights.length, color: '#f472b6' },
                ].map((item) => (
                  <div key={item.label} className="cyber-card p-4">
                    <div className="hud-label mb-2">{item.label}</div>
                    <div className="text-3xl font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 md:mt-6 max-w-3xl">
              {[
                { label: 'Dominant pillar', value: dominantPillar?.shortLabel ?? 'Build' },
                { label: 'Verified coverage', value: `${verifiedRate}%` },
                { label: 'Recent growth', value: `+${stats.recentGrowth}` },
              ].map((item) => (
                <div key={item.label} className="cyber-card px-4 py-3">
                  <div className="hud-label mb-1">{item.label}</div>
                  <div className="text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {isGuestPreview && (
              <div className="mt-6 border border-cyan-400/30 bg-cyan-500/8 p-4 text-sm text-cyan-200">
                <span className="hud-label mr-2">DEMO MODE</span>
                Guest preview — sign in to track your real skills.
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards - MetaLab scroll animation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: easing.primary }}
          className="mt-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {pillarCards.map((pillar) => (
              <div
                key={pillar.category}
                className="cyber-card px-4 py-4 group"
                style={{ borderColor: `${pillar.color}20` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: pillar.color }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40"
                  >
                    {pillar.shortLabel}
                  </span>
                </div>
                <div className="text-xs text-white/35 mb-1">{pillar.category}</div>
                <div className="text-2xl font-bold text-white">
                  {pillar.count}
                </div>
                <div className="mt-2 hud-progress">
                  <div
                    className="hud-progress-fill"
                    style={{
                      width: `${Math.min(100, pillar.count * 20)}%`,
                      background: pillar.color,
                      boxShadow: `0 0 6px ${pillar.color}60`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: easing.primary }}
        >
          <StatsCards stats={stats} />
        </motion.div>

        {/* Main Content Grid - Passport pages sliding */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-8 lg:mt-12 passport-layer">
          {/* Recent Activity - MetaLab scroll animation */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: easing.primary }}
            className="lg:col-span-2 passport-page"
          >
            <RecentActivity activities={activities} />
          </motion.div>
          
          {/* Skill Insights - MetaLab scroll animation */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.4, ease: easing.primary }}
            className="passport-page"
          >
            <SkillInsights insights={insights} />
          </motion.div>
        </div>

        {/* Skills Visualization - Passport pages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mt-12 md:mt-16 passport-layer">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: easing.primary }}
            className="passport-page"
          >
            <motion.div
              className="gradient-border-card p-8"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: easing.primary }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Skills by Pillar</h2>
                <p className="text-sm text-white/60">Distribution across the five Nexus skill pillars</p>
              </div>
              <SkillGraph skills={skills} type="category" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: easing.primary }}
            className="passport-page"
          >
            <motion.div
              className="gradient-border-card p-8"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: easing.primary }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Skills by Level</h2>
                <p className="text-sm text-white/60">Progression and expertise breakdown</p>
              </div>
              <SkillGraph skills={skills} type="level" />
            </motion.div>
          </motion.div>
        </div>

        {/* Performance Insights - MetaLab scroll animation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: easing.primary }}
          className="mt-12 md:mt-16"
        >
          <div className="hud-panel p-8">
            <div className="mb-8">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Performance</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">Pillar Health</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { value: `+${stats.recentGrowth}`, label: 'NEW NODES THIS MONTH', color: '#06b6d4' },
                { value: stats.verifiedSkills, label: 'VERIFIED SIGNALS', color: '#7c3aed' },
                { value: `${stats.averageLevel}%`, label: 'AVERAGE PROGRESS', color: '#ec4899' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="cyber-card p-6"
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.25, ease: easing.primary }}
                >
                  <div className="hud-label mb-3">{item.label}</div>
                  <div className="text-4xl font-bold mb-3 text-white">
                    {item.value}
                  </div>
                  <div className="hud-progress">
                    <motion.div
                      className="hud-progress-fill"
                      style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`, boxShadow: `0 0 8px ${item.color}60` }}
                      initial={{ width: 0 }}
                      whileInView={{ width: i === 0 ? '60%' : i === 1 ? `${verifiedRate}%` : `${stats.averageLevel}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AppPageShell>
  )
}
