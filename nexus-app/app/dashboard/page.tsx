'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Stats, Activity, SkillInsight } from '@/lib/types'
import { skillsApi, authApi } from '@/lib/api'
import { useSkills } from '@/lib/hooks/useSkills'
import Loader from '@/components/UI/Loader'
import { motion } from 'framer-motion'
import { sectionReveal, passportSlide, easing } from '@/lib/utils/animations'
import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// MetaLab scroll animation pattern
const metalabScroll = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.primary },
}

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
  }, [loadData])

  if (loading || skillsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-6">
        <div className="max-w-xl w-full border border-black/10 dark:border-white/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-3">Dashboard unavailable</h1>
          <p className="text-black/60 dark:text-white/60 mb-6">
            {error ?? 'Unable to load your dashboard data right now.'}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="min-h-[44px] px-5 py-2 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-black overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -top-20 -left-20 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-25 dark:opacity-35"
          style={{ background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2) 0%, rgba(147, 51, 234, 0.08) 48%, transparent 72%)' }}
          animate={{ x: [0, 20, -12, 0], y: [0, 16, -10, 0], scale: [1, 1.06, 0.96, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 right-0 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-20 dark:opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255, 111, 145, 0.2) 0%, rgba(255, 196, 107, 0.08) 45%, transparent 74%)' }}
          animate={{ x: [0, -18, 10, 0], y: [0, -12, 8, 0], scale: [1, 0.95, 1.05, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="relative page-shell">
        {/* Header - one focal point */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing.primary }}
          className="mb-14 md:mb-24"
        >
          <div className="inline-flex items-center gap-2 border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200 mb-6">
            Live Passport Overview
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight leading-[1.1] max-w-[14ch] md:max-w-none">
            Your{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 dark:from-cyan-300 dark:via-violet-300 dark:to-rose-300 bg-clip-text text-transparent">
              passport
            </span>
          </h1>
          <p className="text-base md:text-lg text-black/60 dark:text-white/60 max-w-[34ch] md:max-w-xl">
            A living record of what you can do
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 md:mt-6 max-w-3xl">
            {['Signal confidence', 'Growth velocity', 'Verification health'].map((item) => (
              <div key={item} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/45 px-4 py-3 text-sm text-black/70 dark:text-white/70">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats Cards - MetaLab scroll animation */}
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
              className="border border-black/10 dark:border-white/10 p-8 bg-white/60 dark:bg-black/60 backdrop-blur-[2px]"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: easing.primary }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black dark:text-white mb-2 tracking-tight">Skills by Category</h2>
                <p className="text-sm text-black/60 dark:text-white/60">Distribution across skill domains</p>
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
              className="border border-black/10 dark:border-white/10 p-8 bg-white/60 dark:bg-black/60 backdrop-blur-[2px]"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: easing.primary }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black dark:text-white mb-2 tracking-tight">Skills by Level</h2>
                <p className="text-sm text-black/60 dark:text-white/60">Progression and expertise breakdown</p>
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
          <div className="border border-black/10 dark:border-white/10 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-black dark:text-white mb-3 tracking-tight">Performance Insights</h2>
              <p className="text-black/60 dark:text-white/60">AI-powered analysis of your skill development</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                className="p-6 border border-cyan-500/25 dark:border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-transparent"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3, ease: easing.primary }}
              >
                <div className="text-4xl font-bold text-black dark:text-white mb-3">+12%</div>
                <div className="text-sm text-black/60 dark:text-white/60 uppercase tracking-wider">Growth This Month</div>
              </motion.div>
              <motion.div
                className="p-6 border border-violet-500/25 dark:border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-transparent"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3, ease: easing.primary }}
              >
                <div className="text-4xl font-bold text-black dark:text-white mb-3">18</div>
                <div className="text-sm text-black/60 dark:text-white/60 uppercase tracking-wider">Verified Skills</div>
              </motion.div>
              <motion.div
                className="p-6 border border-rose-500/25 dark:border-rose-400/30 bg-gradient-to-br from-rose-500/10 to-transparent"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3, ease: easing.primary }}
              >
                <div className="text-4xl font-bold text-black dark:text-white mb-3">85%</div>
                <div className="text-sm text-black/60 dark:text-white/60 uppercase tracking-wider">Average Progress</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
