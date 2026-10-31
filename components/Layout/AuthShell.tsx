'use client'

import type { ReactNode } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'

type AuthShellProps = {
  children: ReactNode
  /** e.g. back link above the card */
  beforeCard?: ReactNode
  maxWidthClass?: string
}

/** Centred column for sign-in style forms: no card chrome, just a hairline frame. */
export default function AuthShell({
  children,
  beforeCard,
  maxWidthClass = 'max-w-md',
}: AuthShellProps) {
  return (
    <AppPageShell className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 py-16">
      <div className={`w-full ${maxWidthClass}`}>
        {beforeCard ? <div className="mb-6">{beforeCard}</div> : null}
        <div className="rounded-[1.5rem] border border-line bg-raised p-8 lg:p-10">{children}</div>
      </div>
    </AppPageShell>
  )
}
