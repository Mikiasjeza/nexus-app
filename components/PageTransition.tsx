'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/** Avoid `filter: blur()` here — it forces expensive repaints on every navigation. */
const pageVariants = {
  initial: {
    opacity: 0.85,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0.92,
    y: -6,
  },
}

const pageTransition = {
  type: 'tween' as const,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  duration: 0.28,
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isMounting, setIsMounting] = useState(true)

  useEffect(() => {
    setIsMounting(false)
  }, [])

  if (isMounting) {
    return <>{children}</>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
