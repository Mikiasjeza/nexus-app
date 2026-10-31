'use client'

import type { SkillLevel } from '@/lib/types'

interface ProgressBarProps {
  progress: number
  /** Kept for older call sites; the bar no longer changes colour by level. */
  level?: SkillLevel
  className?: string
  showLabel?: boolean
  animated?: boolean
  label?: string
}

export default function ProgressBar({
  progress,
  className = '',
  showLabel = true,
  animated = true,
  label = 'Progress',
}: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, progress))

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-ink-faint">{label}</span>
          <span className="tabular text-ink">{value}%</span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-pill"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full bg-verified ${
            animated ? 'transition-[width] duration-500 ease-out motion-reduce:transition-none' : ''
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
