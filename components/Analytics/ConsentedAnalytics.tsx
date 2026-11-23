'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { CONSENT_CHANGED_EVENT, hasConsent } from '@/lib/consent'

/**
 * Anonymous page-view counts (Vercel Web Analytics: no cookies, no
 * cross-site tracking), loaded only for visitors who allow "Diagnostics and
 * usage stats" in the cookie banner. Query strings are dropped so tokens in
 * links (password reset, invites) never leave the page.
 */
export default function ConsentedAnalytics() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const update = () => setAllowed(hasConsent('analytics'))
    update()
    window.addEventListener(CONSENT_CHANGED_EVENT, update)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, update)
  }, [])

  if (!allowed) return null
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url)
        url.search = ''
        url.hash = ''
        return { ...event, url: url.toString() }
      }}
    />
  )
}
