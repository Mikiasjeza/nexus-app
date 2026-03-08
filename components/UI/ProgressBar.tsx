'use client'

import { motion } from 'framer-motion'
import { LEVEL_COLORS, SkillLevel } from '@/lib/types'

interface ProgressBarProps {
  progress: number
  level?: SkillLevel
  className?: string
  showLabel?: boolean
  animated?: boolean
}

export default function ProgressBar({
  progress,
  level,
  className = '',
  showLabel = true,
  animated = true,
}: ProgressBarProps) {
  const color = level ? LEVEL_COLORS[level] : '#0ea5e9'
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Progress</span>
          <span className="text-sm font-bold text-neutral-200 tabular-nums">{clampedProgress}%</span>
        </div>
      )}
      <div className="relative w-full h-2.5 bg-neutral-900/50 rounded-full overflow-hidden border border-neutral-800/50 backdrop-blur-sm">
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ 
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 10px ${color}40`
          }}
          initial={animated ? { width: 0 } : { width: `${clampedProgress}%` }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: animated ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>
      </div>
    </div>
  )
}
