'use client'

import { Skill } from '@/lib/types'
import { LEVEL_COLORS, LEVEL_LABELS } from '@/lib/utils/constants'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { easing } from '@/lib/utils/animations'

interface TimelineViewProps {
  skills: Skill[]
}

export default function TimelineView({ skills }: TimelineViewProps) {
  // Sort skills by creation date for timeline
  const sortedSkills = [...skills].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <div className="border border-black/10 dark:border-white/10 p-6">
      <h2 className="text-xl font-bold text-black dark:text-white mb-6">Skill Timeline</h2>
        <div className="relative">
        {/* Timeline line - animates from past to present */}
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute left-4 top-0 bottom-0 w-0.5 origin-top bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"
        />
        
        <div className="space-y-6">
          {sortedSkills.map((skill, index) => {
            const levelColor = LEVEL_COLORS[skill.level]
            const createdAt = new Date(skill.createdAt)
            
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.12,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="relative pl-12"
              >
                {/* Timeline dot - fades in from the past */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.12 + 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="absolute left-2 top-2 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-lg"
                  style={{ backgroundColor: levelColor }}
                />
                
                {/* Skill card - historical milestones fade in */}
                <div className="border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-black hover:border-black dark:hover:border-white transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-black dark:text-white">{skill.name}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60">{skill.category}</p>
                    </div>
                    <span
                      className="px-2.5 py-1 border border-black/10 dark:border-white/10 text-xs font-semibold"
                      style={{
                        color: levelColor,
                      }}
                    >
                      {LEVEL_LABELS[skill.level]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60">
                    <span>{format(createdAt, 'MMM d, yyyy')}</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ delay: index * 0.12 + 0.4, duration: 0.5 }}
                    >
                      {skill.progress}% progress
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
