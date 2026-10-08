'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'
import { easing } from '@/lib/utils/animations'

type AuthShellProps = {
  children: ReactNode
  /** e.g. back link above the card */
  beforeCard?: ReactNode
  maxWidthClass?: string
}

export default function AuthShell({
  children,
  beforeCard,
  maxWidthClass = 'max-w-md',
}: AuthShellProps) {
  return (
    <AppPageShell className="flex min-h-screen flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easing.primary }}
        className={`w-full ${maxWidthClass}`}
      >
        {beforeCard ? <div className="mb-5">{beforeCard}</div> : null}
        <div className="gradient-border-card p-8 lg:p-10">{children}</div>
      </motion.div>
    </AppPageShell>
  )
}
