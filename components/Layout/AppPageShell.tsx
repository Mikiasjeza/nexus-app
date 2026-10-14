'use client'

import type { ReactNode } from 'react'

type AppPageShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Soft drifting orbs (CSS-only — no Framer on every page). */
  orbs?: boolean
}

export default function AppPageShell({
  children,
  className = '',
  contentClassName = '',
  orbs = true,
}: AppPageShellProps) {
  return (
    <div className={`aurora-shell relative min-h-screen overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="app-shell-grid" />
        <div className="app-shell-vignette" />
      </div>
      {orbs ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="app-shell-orb app-shell-orb-a" />
          <div className="app-shell-orb app-shell-orb-b" />
        </div>
      ) : null}
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  )
}
