'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { easing } from '@/lib/utils/animations'
import { cn } from '@/lib/utils/cn'

interface AnimatedCardProps {
  children?: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export default function AnimatedCard({
  children,
  className = '',
  hover = true,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={false}
      whileHover={hover ? { 
        y: -4, 
        transition: { duration: 0.3, ease: easing.primary } 
      } : undefined}
      className={cn(
        'premium-card',
        'transition-premium',
        hover && 'hover:shadow-premium-lg hover:border-neutral-700/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children || null}
    </motion.div>
  )
}
