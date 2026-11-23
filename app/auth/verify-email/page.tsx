'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/Layout/AuthShell'
import Loader from '@/components/UI/Loader'
import { invalidateUserCache } from '@/lib/hooks/useUser'

type State = { kind: 'working' } | { kind: 'done' } | { kind: 'failed'; message: string }

function VerifyEmail() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<State>({ kind: 'working' })
  const sent = useRef(false)

  useEffect(() => {
    // Strict mode runs effects twice in development; a token only works once.
    if (sent.current) return
    sent.current = true
    if (!token) {
      setState({ kind: 'failed', message: 'This link is missing its code.' })
      return
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          invalidateUserCache()
          setState({ kind: 'done' })
        } else {
          setState({ kind: 'failed', message: data.error || 'This link did not work.' })
        }
      })
      .catch(() => setState({ kind: 'failed', message: 'Something went wrong. Try again.' }))
  }, [token])

  if (state.kind === 'working') {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-3 font-display text-[2.5rem] font-medium leading-tight">
        {state.kind === 'done' ? 'Email confirmed' : 'Link not valid'}
      </h1>
      <p
        className="mb-8 text-base metalab-muted"
        role={state.kind === 'failed' ? 'alert' : undefined}
      >
        {state.kind === 'done'
          ? 'Thanks. Your email address is confirmed.'
          : `${state.message} You can ask for a new link from your dashboard.`}
      </p>
      <Link href="/dashboard" className="button-base button-primary min-h-11 px-5">
        Go to your dashboard
      </Link>
    </>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthShell maxWidthClass="max-w-md">
      <Suspense fallback={<Loader />}>
        <VerifyEmail />
      </Suspense>
    </AuthShell>
  )
}
