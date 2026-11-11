'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AuthShell from '@/components/Layout/AuthShell'
import SocialSignIn, { OrDivider } from '@/components/Auth/SocialSignIn'
import { signInErrorMessage } from '@/lib/auth/oauth/labels'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import type { ProviderSummary } from '@/lib/auth/oauth/providers'

export default function LoginForm({ providers }: { providers: ProviderSummary[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    signInErrorMessage(searchParams.get('error'), searchParams.get('provider'))
  )
  const [showPassword, setShowPassword] = useState(false)
  // Only ever a path on this site, however the link was written.
  const next = searchParams.get('next') ? safeNextPath(searchParams.get('next')) : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await authApi.login(formData.email, formData.password)
      addToast({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully signed in.',
      })
      const target = user.onboardingComplete === false ? '/onboarding' : next || '/dashboard'
      router.push(target)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Login Failed',
        message: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGuestContinue = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Guest preview is unavailable right now')
      }
      router.push(next || '/dashboard')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Guest preview is unavailable right now'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Guest preview unavailable',
        message: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-10">
        <h1 className="mb-3 font-display text-[2.5rem] font-light leading-tight">Welcome back</h1>
        <p className="text-base metalab-muted">Sign in to continue your passport</p>
        <button
          type="button"
          onClick={handleGuestContinue}
          className="mt-4 text-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
        >
          Continue as guest
        </button>
      </div>

      {error ? (
        <div className="metalab-alert-error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {providers.length > 0 && (
        <>
          <SocialSignIn providers={providers} next={next} />
          <p className="mt-3 text-xs leading-relaxed metalab-muted">
            New here? Continuing creates your account. You agree to our{' '}
            <Link href="/terms" className="metalab-link">
              Terms of Service
            </Link>{' '}
            and acknowledge our{' '}
            <Link href="/privacy" className="metalab-link">
              Privacy Policy
            </Link>
            .
          </p>
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="metalab-label" htmlFor="login-email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, email: e.target?.value || '' })
              }
              className="metalab-input pl-11"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="metalab-label" htmlFor="login-password">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, password: e.target?.value || '' })
              }
              className="metalab-input pl-11 pr-12"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm metalab-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line-strong bg-ground/70 text-verified focus:ring-verified/40"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm metalab-muted transition-colors hover:text-ink"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} isLoading={loading} fullWidth size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-sm metalab-muted">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="metalab-link">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
