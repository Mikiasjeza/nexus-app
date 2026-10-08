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
      whileHover={
        hover
          ? {
              y: -3,
              transition: { duration: 0.25, ease: easing.primary },
            }
          : undefined
      }
      className={cn(
        'gradient-border-card transition-micro',
        hover && 'hover:shadow-[0_28px_80px_rgba(0,0,0,0.42)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children || null}
    </motion.div>
  )
}
