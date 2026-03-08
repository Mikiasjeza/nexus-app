'use client'

import { Skill } from '@/lib/types'
import { CATEGORY_COLORS, LEVEL_COLORS } from '@/lib/utils/constants'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface SkillGraphProps {
  skills: Skill[]
  type?: 'category' | 'level'
}

export default function SkillGraph({ skills, type = 'category' }: SkillGraphProps) {
  const data = useMemo(() => {
    if (type === 'category') {
      const counts: Record<string, number> = {}
      skills.forEach((skill) => {
        counts[skill.category] = (counts[skill.category] || 0) + 1
      })
      return Object.entries(counts).map(([key, value]) => ({
        label: key,
        value,
        color: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS],
      }))
    } else {
      const counts: Record<string, number> = {}
      skills.forEach((skill) => {
        counts[skill.level] = (counts[skill.level] || 0) + 1
      })
      return Object.entries(counts).map(([key, value]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        color: LEVEL_COLORS[key as keyof typeof LEVEL_COLORS],
      }))
    }
  }, [skills, type])

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-dark-700">{item.label}</span>
            <span className="text-sm font-semibold text-dark-900">{item.value}</span>
          </div>
          <div className="w-full h-3 bg-dark-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
