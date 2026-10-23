'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
    Sentry.captureException(error)
  }, [error])

  // The root layout (and its fonts) failed, so this page stands alone on system fonts.
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ground font-sans text-ink antialiased">
        <main className="mx-auto flex min-h-screen max-w-[90rem] flex-col justify-center px-[clamp(1rem,4vw,3rem)]">
          <h1 className="font-display text-[clamp(2.75rem,5vw,5.5rem)] font-extralight leading-[1.08]">
            Nexus hit a problem
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
            Something failed while loading the app. Reloading usually fixes it.
          </p>
          <div className="mt-10">
            <button
              type="button"
              onClick={reset}
              className="button-base button-primary min-h-11 px-5"
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
