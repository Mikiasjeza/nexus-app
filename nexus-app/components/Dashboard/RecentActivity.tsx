'use client'

import { Activity } from '@/lib/types'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, TrendingUp, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import AnimatedCard from '../UI/AnimatedCard'
import { memo } from 'react'

interface RecentActivityProps {
  activities: Activity[]
}

const activityIcons = {
  skill_added: Plus,
  skill_updated: Edit,
  skill_deleted: Trash2,
  level_up: TrendingUp,
  evidence_added: FileText,
}

function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <AnimatedCard className="p-8 border border-black/10 dark:border-white/10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2 tracking-tight">Recent Activity</h2>
        <p className="text-sm text-black/60 dark:text-white/60">Timeline of your skill development</p>
      </div>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-black/60 dark:text-white/60">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = activityIcons[activity.type]
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="flex items-start gap-4 pb-4 border-b border-black/10 dark:border-white/10 last:border-0 last:pb-0"
              >
                <div className="p-2 border border-black/10 dark:border-white/10">
                  <Icon className="w-4 h-4 text-black dark:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black dark:text-white leading-relaxed">{activity.message}</p>
                  <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </AnimatedCard>
  )
}

export default memo(RecentActivity)
