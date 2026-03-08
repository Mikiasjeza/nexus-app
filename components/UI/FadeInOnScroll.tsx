'use client'

import { motion, MotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { scrollReveal } from '@/lib/utils/animations'

interface FadeInOnScrollProps extends Omit<MotionProps, 'children'> {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Reusable component for elements that fade in on scroll
 * Uses scroll-scrubbed motion where possible
 * Respects prefers-reduced-motion
 */
export default function FadeInOnScroll({ 
  children, 
  className = '', 
  delay = 0,
  ...props 
}: FadeInOnScrollProps) {
  return (
    <motion.div
      {...scrollReveal}
      className={className}
      transition={{
        ...scrollReveal.transition,
        delay,
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
