'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/Layout/AuthShell'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { invalidateUserCache, useUser } from '@/lib/hooks/useUser'

function AcceptInvite() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const { user, loading } = useUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wrongAccount, setWrongAccount] = useState(false)

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/employer/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setWrongAccount(Boolean(data.wrongAccount))
        throw new Error(data.error || 'Could not accept the invite')
      }
      invalidateUserCache()
      router.push('/employer/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the invite')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return <p className="text-base metalab-muted">This invite link is missing its code.</p>
  }

  const here = `/employer/invite?token=${encodeURIComponent(token)}`
  if (!loading && !user) {
    return (
      <>
        <h1 className="mb-3 font-display text-[2.5rem] font-medium leading-tight">
          Join your team
        </h1>
        <p className="mb-8 text-base metalab-muted">
          You&apos;ve been invited to hire with a company on Nexus. Sign in, or create an account
          with the email address the invite was sent to.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/auth/login?next=${encodeURIComponent(here)}`}
            className="button-base button-primary min-h-11 px-5"
          >
            Sign in
          </Link>
          <Link
            href={`/auth/register?next=${encodeURIComponent(here)}`}
            className="button-base button-secondary min-h-11 px-5"
          >
            Create an account
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-3 font-display text-[2.5rem] font-medium leading-tight">Join your team</h1>
      <p className="mb-8 text-base metalab-muted">
        You&apos;ve been invited to hire with a company on Nexus.
        {user ? ` You're signed in as ${user.email}.` : ''}
      </p>
      {error && (
        <div className="metalab-alert-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      <Button onClick={accept} isLoading={busy} disabled={busy} fullWidth size="lg">
        Accept invite
      </Button>
      {wrongAccount && (
        <p className="mt-6 text-sm metalab-muted">
          <button
            type="button"
            className="metalab-link"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              invalidateUserCache()
              const next = `/employer/invite?token=${encodeURIComponent(token)}`
              router.push(`/auth/login?next=${encodeURIComponent(next)}`)
            }}
          >
            Sign out
          </button>{' '}
          and sign in with the invited address, or ask for an invite to {user?.email}.
        </p>
      )}
    </>
  )
}

/** Opened from a team invite email; signed-out visitors are offered sign-in or sign-up first. */
export default function EmployerInvitePage() {
  return (
    <AuthShell maxWidthClass="max-w-md">
      <Suspense fallback={<Loader />}>
        <AcceptInvite />
      </Suspense>
    </AuthShell>
  )
}
