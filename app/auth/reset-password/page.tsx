'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { fetchApi } from '@/lib/api/fetcher'
import AuthShell from '@/components/Layout/AuthShell'
import AppPageShell from '@/components/Layout/AppPageShell'

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      addToast({
        type: 'error',
        title: 'Invalid link',
        message: 'This reset link is invalid or has expired.',
      })
      router.push('/auth/forgot-password')
    }
  }, [token, router, addToast])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords do not match',
        message: 'Please make sure both passwords match.',
      })
      return
    }

    if (formData.password.length < 8) {
      addToast({
        type: 'error',
        title: 'Password too short',
        message: 'Password must be at least 8 characters.',
      })
      return
    }

    setLoading(true)

    try {
      await fetchApi<{ ok: boolean }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: formData.password,
        }),
      })
      addToast({
        type: 'success',
        title: 'Password reset',
        message: 'Your password has been reset successfully.',
      })
      router.push('/auth/login')
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to reset password. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return null
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
      <div className="hero-kicker mb-6">New credentials</div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">Choose a password</h1>
      <p className="mb-8 text-sm leading-relaxed metalab-muted">
        Use at least 8 characters you haven&apos;t used elsewhere.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="reset-password" className="metalab-label">
            New password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="reset-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

        <div>
          <label htmlFor="reset-confirm" className="metalab-label">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="reset-confirm"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="metalab-input pl-11 pr-12"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button type="submit" isLoading={loading} fullWidth>
          Update password
        </Button>
      </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell className="flex min-h-screen items-center justify-center" orbs={false}>
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" aria-hidden />
        </AppPageShell>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  )
}
