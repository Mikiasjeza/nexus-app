'use client'

import { Skill } from '@/lib/types'
import { CATEGORY_COLORS, LEVEL_COLORS } from '@/lib/utils/constants'
import { motion } from 'framer-motion'
import AnimatedCard from '../UI/AnimatedCard'

interface SkillHeatmapProps {
  skills: Skill[]
  type?: 'category' | 'level'
}

export default function SkillHeatmap({ skills, type = 'category' }: SkillHeatmapProps) {
  const grouped = skills.reduce((acc, skill) => {
    const key = type === 'category' ? skill.category : skill.level
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  const maxCount = Math.max(...Object.values(grouped).map(g => g.length), 1)

  return (
    <AnimatedCard className="p-6">
      <h2 className="text-xl font-bold text-dark-900 mb-6">
        Skills by {type === 'category' ? 'Category' : 'Level'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([key, skillList], index) => {
          const color = type === 'category' 
            ? CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]
            : LEVEL_COLORS[key as keyof typeof LEVEL_COLORS]
          
          const intensity = skillList.length / maxCount
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <div
                className="p-6 rounded-xl text-center cursor-pointer transition-transform hover:scale-105"
                style={{
                  backgroundColor: `${color}${Math.floor(intensity * 15).toString(16).padStart(2, '0')}`,
                  border: `2px solid ${color}`,
                }}
              >
                <p className="text-3xl font-bold mb-1" style={{ color }}>
                  {skillList.length}
                </p>
                <p className="text-sm font-medium text-dark-700">{key}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </AnimatedCard>
  )
}
