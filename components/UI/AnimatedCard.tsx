'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface AnimatedCardProps {
  children?: ReactNode
  className?: string
  /** Hover brightens the hairline; nothing lifts or glows. */
  hover?: boolean
  onClick?: () => void
}

/** A raised panel. Kept under its old name for existing call sites. */
export default function AnimatedCard({
  children,
  className = '',
  hover = true,
  onClick,
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-raised transition-colors duration-150',
        hover && 'hover:border-line-strong',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children || null}
    </div>
  )
}
