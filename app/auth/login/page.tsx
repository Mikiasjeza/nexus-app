'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AuthShell from '@/components/Layout/AuthShell'
import AppPageShell from '@/components/Layout/AppPageShell'

const OAUTH_ERRORS: Record<string, string> = {
  github_account_exists:
    'An account with your GitHub email already exists. Sign in with your password, then connect GitHub from Settings.',
  github_email_unverified:
    'Your GitHub account has no verified primary email. Verify it on GitHub, or create an account with email and password.',
  github_cancelled: 'GitHub sign-in was cancelled.',
  invalid_state: 'Your sign-in link expired. Please try again.',
  oauth_config: 'GitHub sign-in is not available right now.',
  oauth_failed: 'GitHub sign-in failed. Please try again.',
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const oauthError = searchParams.get('error')
  const [error, setError] = useState(
    oauthError ? OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.oauth_failed : ''
  )
  const [showPassword, setShowPassword] = useState(false)

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
      const next = searchParams.get('next')
      const target = user.onboardingComplete === false ? '/onboarding' : (next || '/dashboard')
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
      const next = searchParams.get('next')
      router.push(next || '/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Guest preview is unavailable right now'
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
      <div className="hero-kicker mb-6">Account access</div>
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Welcome back</h1>
        <p className="text-base metalab-muted">Sign in to continue your passport</p>
        <button
          type="button"
          onClick={handleGuestContinue}
          className="mt-4 text-sm text-cyan-200/80 underline decoration-white/20 underline-offset-4 transition-colors hover:text-cyan-100"
        >
          Continue as guest
        </button>
      </div>

      {error ? (
        <div className="metalab-alert-error">
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="metalab-label" htmlFor="login-email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="login-email"
              type="email"
              required
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
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
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
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400/30"
            />
            <span>Remember me</span>
          </label>
          <Link href="/auth/forgot-password" className="text-sm metalab-muted transition-colors hover:text-white">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} isLoading={loading} fullWidth size="lg">
          Sign in
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t metalab-divider" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.2em]">
            <span className="bg-[rgba(6,8,14,0.95)] px-4 metalab-muted">Or continue with</span>
          </div>
        </div>

        <a href="/api/auth/github/authorize" className="metalab-oauth">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>GitHub</span>
        </a>
      </form>

      <div className="mt-8 border-t border-white/[0.08] pt-6 text-center">
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell className="flex min-h-screen items-center justify-center" orbs={false}>
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" aria-hidden />
        </AppPageShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
