'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useSkills } from '@/lib/hooks/useSkills'
import { motion } from 'framer-motion'
import Loader from '@/components/UI/Loader'
import { TrendingUp, Download, Filter, Calendar, BarChart3, PieChart } from 'lucide-react'
import Button from '@/components/UI/Button'
import { easing } from '@/lib/utils/animations'

// Lazy load heavy chart components
const ProgressChart = dynamic(() => import('@/components/Analytics/ProgressChart'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: false,
})

const SkillHeatmap = dynamic(() => import('@/components/Analytics/SkillHeatmap'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: false,
})

const TimelineView = dynamic(() => import('@/components/Analytics/TimelineView'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: false,
})

const GapAnalysis = dynamic(() => import('@/components/Analytics/GapAnalysis'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader /></div>,
  ssr: false,
})

export default function AnalyticsPage() {
  const { skills, loading } = useSkills()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/analytics/export?format=json', { credentials: 'include' })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skill-passport-analytics-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail
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
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing.primary }}
          className="mb-20"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-3 tracking-tight leading-[1.1]">
                Analytics
              </h1>
              <p className="text-lg text-black/60 dark:text-white/60 max-w-xl">
                How your skills are growing
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExport}
                disabled={exporting}
                isLoading={exporting}
              >
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            {
              icon: TrendingUp,
              value: skills.length > 0
                ? Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / skills.length)
                : 0,
              label: 'Average Progress',
              suffix: '%',
            },
            {
              icon: BarChart3,
              value: skills.filter(s => s.verified).length,
              label: 'Verified Skills',
            },
            {
              icon: PieChart,
              value: new Set(skills.map(s => s.category)).size,
              label: 'Categories',
            },
            {
              icon: Calendar,
              value: skills.filter(s => {
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
                <div className="border border-black/10 dark:border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 border border-black/10 dark:border-white/10">
                      <Icon className="w-5 h-5 text-black dark:text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-black dark:text-white mb-2 tracking-tight tabular-nums">
                    {stat.value}{stat.suffix || ''}
                  </div>
                  <div className="text-xs text-black/60 dark:text-white/60 uppercase tracking-wider font-medium">{stat.label}</div>
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
