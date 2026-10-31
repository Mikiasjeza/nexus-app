'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * A short settle on navigation. It never waits for the old page to leave
 * (that used to add ~0.5s to every click) and starts from a visible state,
 * so content is readable on the first frame.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter w-full">
      {children}
    </div>
  )
}
