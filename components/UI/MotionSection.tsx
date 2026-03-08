'use client'

import { motion, MotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { sectionReveal } from '@/lib/utils/animations'

interface MotionSectionProps extends Omit<MotionProps, 'children'> {
  children: ReactNode
  className?: string
}

/**
 * Reusable section wrapper with scroll-triggered fade + rise animation
 * Follows MetaLab-style motion: calm, intentional, meaningful
 */
export default function MotionSection({ children, className = '', ...props }: MotionSectionProps) {
  return (
    <motion.section
      {...sectionReveal}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  )
}
