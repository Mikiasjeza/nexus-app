'use client'

import { ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  animated?: boolean
}

const variants = {
  default: 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white',
  primary: 'bg-black dark:bg-white text-white dark:text-black',
  success: 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white',
  warning: 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white',
  danger: 'bg-black dark:bg-white text-white dark:text-black',
  info: 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  animated = false,
  ...props
}, ref) => {
  const content = (
    <span
      ref={ref}
      {...props}
      className={cn(
        'inline-flex items-center font-medium rounded-md tracking-[0.01em]',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {content}
      </motion.div>
    )
  }

  return content
})

Badge.displayName = 'Badge'

export default Badge
