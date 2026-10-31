'use client'

import { useEffect } from 'react'
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
    <AppPageShell>
      <div className="page-shell flex min-h-[70vh] flex-col justify-center">
        <h1 className="page-title">
          Something went wrong
          <span className="title-rule" aria-hidden />
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && <p className="mt-2 text-sm text-ink-faint">Reference {error.digest}</p>}
        <div className="mt-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="button-base button-primary min-h-11 px-5"
          >
            Try again
          </button>
          <Link href="/dashboard" className="button-base button-secondary min-h-11 px-5">
            Go to dashboard
          </Link>
        </div>
      </div>
    </AppPageShell>
  )
}
