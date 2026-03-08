'use client'

import { SkillHistoryEntry } from '@/lib/types'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { easing } from '@/lib/utils/animations'

interface SkillHistoryProps {
  history: SkillHistoryEntry[]
  skillName: string
}

export default function SkillHistory({ history, skillName }: SkillHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-black/60 dark:text-white/60">
        <p>No history available for this skill.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-black dark:text-white mb-4">
        Change History
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-black/10 dark:bg-white/10" />
        <div className="space-y-6">
          {history.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: easing.gentle }}
              className="relative pl-12"
            >
              <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-black dark:bg-white border-2 border-white dark:border-black" />
              <div className="border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-black">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <div className="space-y-2">
                  {entry.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="text-sm">
                      <span className="font-medium text-black/70 dark:text-white/70">
                        {change.field}:
                      </span>{' '}
                      <span className="text-black/50 dark:text-white/50 line-through">
                        {typeof change.oldValue === 'object' 
                          ? JSON.stringify(change.oldValue)
                          : String(change.oldValue || 'null')}
                      </span>
                      {' → '}
                      <span className="text-black dark:text-white font-medium">
                        {typeof change.newValue === 'object'
                          ? JSON.stringify(change.newValue)
                          : String(change.newValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
