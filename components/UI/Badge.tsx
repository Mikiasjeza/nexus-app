'use client'

import { ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Kept for older call sites; badges no longer animate in. */
  animated?: boolean
}

// Small pills. Orange only means verified/success; everything else stays neutral.
const variants = {
  default: 'bg-pill text-ink',
  primary: 'bg-ink text-ground',
  success: 'bg-verified-wash text-verified-ink',
  warning: 'bg-caution/15 text-caution',
  danger: 'bg-critical/15 text-critical',
  info: 'bg-pill text-ink-muted',
}

const sizes = {
  sm: 'h-5 px-2 text-[0.6875rem]',
  md: 'h-6 px-2.5 text-xs',
  lg: 'h-7 px-3 text-sm',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ children, variant = 'default', size = 'md', className = '', animated, ...props }, ref) => (
    <span
      ref={ref}
      {...props}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'

export default Badge
