'use client'

import type { ReactNode } from 'react'
import { openCookiePreferences } from '@/lib/consent'

export default function CookiePreferencesButton({
  className,
  children = 'Cookie settings',
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      {children}
    </button>
  )
}
