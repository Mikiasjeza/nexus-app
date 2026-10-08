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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-300" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Something went wrong</h1>
        <p className="mb-2 text-sm text-white/60">{error.message || 'An unexpected error occurred'}</p>
        {error.digest ? <p className="mb-8 font-mono text-xs text-white/40">ID · {error.digest}</p> : <div className="mb-8" />}

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
            className="button-base button-secondary inline-flex flex-1 justify-center rounded-xl border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.07]"
          >
            <Home className="h-5 w-5" />
            Dashboard
          </Link>
        </div>
      </div>
    </AppPageShell>
  )
}
