'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <AppPageShell className="flex min-h-screen items-center justify-center p-4" orbs={false}>
      <div className="gradient-border-card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-critical/40 bg-critical/15">
          <AlertCircle className="h-8 w-8 text-critical" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="mb-2 text-sm text-ink-muted">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest ? (
          <p className="mb-8 font-mono text-xs text-ink-faint">ID · {error.digest}</p>
        ) : (
          <div className="mb-8" />
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="button-base button-primary inline-flex flex-1 justify-center rounded-xl"
          >
            <RefreshCw className="h-5 w-5" />
            Try again
          </button>

          <Link
            href="/dashboard"
            className="button-base button-secondary inline-flex flex-1 justify-center rounded-xl border-line bg-raised text-ink hover:bg-raised"
          >
            <Home className="h-5 w-5" />
            Dashboard
          </Link>
        </div>
      </div>
    </AppPageShell>
  )
}
