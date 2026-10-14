'use client'

import React, { useState } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { fetchApi } from '@/lib/api/fetcher'
import AuthShell from '@/components/Layout/AuthShell'

export default function ForgotPasswordPage() {
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      await fetchApi<{ ok: boolean }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSent(true)
      addToast({
        type: 'success',
        title: 'Reset link sent',
        message: 'Check your email for password reset instructions.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send reset link. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const backLink = (
    <Link
      href="/auth/login"
      className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to login
    </Link>
  )

  return (
    <AuthShell beforeCard={backLink}>
      <div className="hero-kicker mb-6">Recovery</div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">Reset password</h1>
      <p className="mb-8 text-sm leading-relaxed metalab-muted">
        Enter your email and we&apos;ll send a secure link to choose a new password.
      </p>

      {sent ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Mail className="h-8 w-8 text-cyan-200/90" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">Check your email</h2>
          <p className="mb-8 text-sm metalab-muted">
            We sent a reset link to <span className="text-white/85">{email}</span>
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            Send another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="forgot-email" className="metalab-label">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="email"
                id="forgot-email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="metalab-input pl-11"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <Button type="submit" isLoading={loading} fullWidth>
            Send reset link
          </Button>
        </form>
      )}

      <div className="mt-8 border-t border-white/[0.08] pt-6 text-center">
        <p className="text-sm metalab-muted">
          Remember your password?{' '}
          <Link href="/auth/login" className="metalab-link">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
