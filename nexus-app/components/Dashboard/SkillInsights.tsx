'use client'

import { SkillInsight } from '@/lib/types'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react'
import AnimatedCard from '../UI/AnimatedCard'
import { memo } from 'react'

interface SkillInsightsProps {
  insights: SkillInsight[]
}

function SkillInsights({ insights }: SkillInsightsProps) {
  if (insights.length === 0) {
    return (
      <AnimatedCard className="p-8 border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 border border-black/10 dark:border-white/10">
            <Lightbulb className="w-5 h-5 text-black dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Skill Insights</h2>
        </div>
        <p className="text-black/60 dark:text-white/60">No insights available yet</p>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard className="p-8 border border-black/10 dark:border-white/10">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 border border-black/10 dark:border-white/10">
          <Lightbulb className="w-5 h-5 text-black dark:text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Skill Insights</h2>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">AI-powered recommendations</p>
        </div>
      </div>
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const TrendIcon = insight.trend === 'up' 
            ? TrendingUp 
            : insight.trend === 'down' 
            ? TrendingDown 
            : Minus

          return (
            <motion.div
              key={insight.skillId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="p-4 border border-black/10 dark:border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-black dark:text-white">{insight.skillName}</h3>
                <div className="flex items-center gap-2">
                  <TrendIcon className="w-4 h-4 text-black dark:text-white" />
                  <span className="text-sm font-medium text-black dark:text-white tabular-nums">
                    {insight.change > 0 ? '+' : ''}{insight.change}%
                  </span>
                </div>
              </div>
              {insight.recommendation && (
                <p className="text-sm text-black/60 dark:text-white/60 mt-2 leading-relaxed">{insight.recommendation}</p>
              )}
            </motion.div>
          )
        })}
      </div>
    </AnimatedCard>
  )
}

export default memo(SkillInsights)
