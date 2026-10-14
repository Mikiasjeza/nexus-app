'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, RefreshCw } from 'lucide-react'
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

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#06070d] text-white antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="gradient-border-card w-full max-w-md p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-300" />
            </div>

            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">
              Critical error
            </h1>
            <p className="mb-8 text-sm text-white/60">
              A critical error occurred. Please reload the application.
            </p>

            <button
              type="button"
              onClick={reset}
              className="button-base button-primary inline-flex w-full justify-center rounded-xl"
            >
              <RefreshCw className="h-5 w-5" />
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
