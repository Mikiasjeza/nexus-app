import type { ReactNode } from 'react'

type AppPageShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
  /** @deprecated The old drifting orbs are gone; kept so existing callers compile. */
  orbs?: boolean
}

/** Page container for signed-in screens: black ground, one width, one gutter. */
export default function AppPageShell({
  children,
  className = '',
  contentClassName = '',
}: AppPageShellProps) {
  return (
    <div className={`relative min-h-screen bg-ground ${className}`}>
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
