'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import AuthShell from '@/components/Layout/AuthShell'
import Button from '@/components/UI/Button'
import { invalidateUserCache } from '@/lib/hooks/useUser'

/** Second sign-in step: a code from the authenticator app, or a recovery code. */
export default function TwoFactorPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.expired) setExpired(true)
        throw new Error(data.error || 'That code did not match.')
      }
      invalidateUserCache()
      router.push(typeof data.next === 'string' ? data.next : '/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not match.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell maxWidthClass="max-w-md">
      <div className="mb-8">
        <Shield className="mb-4 size-8 text-verified" aria-hidden />
        <h1 className="mb-3 font-display text-[2.5rem] font-medium leading-tight">
          Two-step login
        </h1>
        <p className="text-base metalab-muted">
          {useRecovery
            ? 'Enter one of the recovery codes you saved when you set up two-step login. Each works once.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      {error && (
        <div className="metalab-alert-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {expired ? (
        <Link href="/auth/login" className="button-base button-primary min-h-11 px-5">
          Sign in again
        </Link>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="metalab-label" htmlFor="two-factor-code">
              {useRecovery ? 'Recovery code' : 'Code'}
            </label>
            <input
              id="two-factor-code"
              type="text"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode={useRecovery ? 'text' : 'numeric'}
              pattern={useRecovery ? undefined : '[0-9 ]{6,7}'}
              maxLength={useRecovery ? 20 : 7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="metalab-input tracking-[0.2em]"
              placeholder={useRecovery ? 'xxxx-xxxx-xxxx' : '123456'}
            />
          </div>
          <Button type="submit" isLoading={loading} disabled={loading} fullWidth size="lg">
            Continue
          </Button>
        </form>
      )}

      {!expired && (
        <div className="mt-8 border-t border-line pt-6 text-sm metalab-muted">
          <button
            type="button"
            onClick={() => {
              setUseRecovery((r) => !r)
              setCode('')
              setError('')
            }}
            className="metalab-link"
          >
            {useRecovery
              ? 'Use a code from my app instead'
              : 'Lost your phone? Use a recovery code'}
          </button>
        </div>
      )}
    </AuthShell>
  )
}
