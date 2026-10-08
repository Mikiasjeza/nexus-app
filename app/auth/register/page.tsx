'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AuthShell from '@/components/Layout/AuthShell'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await authApi.register(formData.email, formData.password, formData.name)
      addToast({
        type: 'success',
        title: 'Account Created',
        message: 'Your account has been created successfully.',
      })
      router.push('/onboarding')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.'
      setError(message)
      addToast({
        type: 'error',
        title: 'Registration Failed',
        message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell maxWidthClass="max-w-md">
      <div className="hero-kicker mb-6">New passport</div>
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Create account
        </h1>
        <p className="text-base metalab-muted">
          Start with your name, email, and a secure password
        </p>
      </div>

      {error ? (
        <div className="metalab-alert-error">
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="metalab-label" htmlFor="reg-name">
            Full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="reg-name"
              type="text"
              required
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="metalab-input pl-11"
              placeholder="Alex Rivera"
            />
          </div>
        </div>

        <div>
          <label className="metalab-label" htmlFor="reg-email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="reg-email"
              type="email"
              required
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="metalab-input pl-11"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="metalab-label" htmlFor="reg-password">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, password: e.target.value })
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
          <p className="mt-2 text-xs metalab-muted">At least 8 characters</p>
        </div>

        <div>
          <label className="metalab-label" htmlFor="reg-confirm">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="reg-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
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

        <p className="text-xs leading-relaxed metalab-muted">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="metalab-link">
            Terms of Service
          </Link>{' '}
          and acknowledge our{' '}
          <Link href="/privacy" className="metalab-link">
            Privacy Policy
          </Link>
          . We&apos;ll only email you about your account, never marketing.
        </p>

        <Button type="submit" disabled={loading} isLoading={loading} fullWidth size="lg">
          Create account
        </Button>
      </form>

      <div className="mt-8 border-t border-white/[0.08] pt-6 text-center">
        <p className="text-sm metalab-muted">
          Already have an account?{' '}
          <Link href="/auth/login" className="metalab-link">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
