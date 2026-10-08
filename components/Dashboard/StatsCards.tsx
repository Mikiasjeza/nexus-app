'use client'

import { Stats } from '@/lib/types'
import { motion } from 'framer-motion'
import { TrendingUp, Award, Target, CheckCircle2 } from 'lucide-react'
import { memo, useMemo } from 'react'

interface StatsCardsProps {
  stats: Stats
}

function StatsCards({ stats }: StatsCardsProps) {
  // Memoize stat items to prevent recalculation
  const statItems = useMemo(
    () => [
      {
        label: 'Total Skills',
        value: stats.totalSkills,
        icon: Target,
        accent: 'from-cyan-500/12 to-transparent border-cyan-500/25 dark:border-cyan-400/30',
      },
      {
        label: 'Average Level',
        value: `${stats.averageLevel}%`,
        icon: TrendingUp,
        accent: 'from-violet-500/12 to-transparent border-violet-500/25 dark:border-violet-400/30',
      },
      {
        label: 'Verified Skills',
        value: stats.verifiedSkills,
        icon: CheckCircle2,
        accent:
          'from-emerald-500/12 to-transparent border-emerald-500/25 dark:border-emerald-400/30',
      },
      {
        label: 'Recent Growth',
        value: `+${stats.recentGrowth}`,
        icon: Award,
        accent: 'from-rose-500/12 to-transparent border-rose-500/25 dark:border-rose-400/30',
      },
    ],
    [stats]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            whileHover={{
              y: -4,
              scale: 1.01,
              transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
          >
            <div className={`insight-card relative p-6 bg-gradient-to-br ${item.accent}`}>
              <motion.div
                className="absolute -inset-[1px] pointer-events-none"
                style={{
                  background:
                    'linear-gradient(120deg, transparent 10%, rgba(255,255,255,0.12) 45%, transparent 80%)',
                }}
                animate={{ x: ['-110%', '130%'] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: index * 0.35,
                }}
              />
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-medium mb-3">
                    {item.label}
                  </p>
                  <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
                    {item.value}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default memo(StatsCards)
