'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, Building2 } from 'lucide-react'
import { clsx } from 'clsx'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AuthShell from '@/components/Layout/AuthShell'
import SocialSignIn, { OrDivider } from '@/components/Auth/SocialSignIn'
import type { ProviderSummary } from '@/lib/auth/oauth/providers'
import type { AccountType } from '@/lib/types'
import Turnstile, { turnstileActive } from '@/components/Security/Turnstile'
import { invalidateUserCache } from '@/lib/hooks/useUser'

const SIDES: { id: AccountType; title: string; body: string }[] = [
  {
    id: 'candidate',
    title: 'I want to prove my skills',
    body: 'Build a skills passport, pass assessments, share verified credentials.',
  },
  {
    id: 'employer',
    title: "I'm hiring",
    body: 'Find people by verified skills, save shortlists, post roles.',
  },
]

export default function RegisterForm({
  providers,
  initialSide = 'candidate',
}: {
  providers: ProviderSummary[]
  initialSide?: AccountType
}) {
  const router = useRouter()
  const { addToast } = useToast()
  const [side, setSide] = useState<AccountType>(initialSide)
  const employer = side === 'employer'
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
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

    if (employer && !formData.companyName.trim()) {
      setError('Company name is required')
      return
    }

    if (!ageConfirmed) {
      setError('Please confirm you are 16 or older')
      return
    }

    setLoading(true)

    try {
      await authApi.register(
        formData.email,
        formData.password,
        formData.name,
        employer ? { companyName: formData.companyName.trim() } : undefined,
        ageConfirmed,
        turnstileToken
      )
      invalidateUserCache()
      addToast({
        type: 'success',
        title: 'Account created',
        message: employer
          ? `${formData.companyName.trim()} is set up. Start by finding talent.`
          : 'Your account has been created successfully.',
      })
      router.push(employer ? '/employer/dashboard' : '/onboarding')
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
      <div className="mb-10">
        <h1 className="mb-3 font-display text-[2.5rem] font-medium leading-tight">
          Create account
        </h1>
        <p className="text-base metalab-muted">
          {providers.length > 0
            ? 'Continue with an account you already have, or use your email'
            : 'Start with your name, email, and a secure password'}
        </p>
      </div>

      <fieldset className="mb-8">
        <legend className="metalab-label">What brings you to Nexus?</legend>
        <div role="radiogroup" className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
          {SIDES.map((option) => {
            const selected = side === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setSide(option.id)
                  setError('')
                }}
                className={clsx(
                  'flex flex-col gap-1.5 p-4 text-left transition-colors duration-150',
                  selected
                    ? 'bg-ink text-ground'
                    : 'bg-ground text-ink hover:bg-lavender hover:text-[#0b0b0b]'
                )}
              >
                <span className="text-[0.9375rem] font-medium tracking-[-0.02em]">
                  {option.title}
                </span>
                <span className="text-xs leading-snug opacity-75">{option.body}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {error ? (
        <div className="metalab-alert-error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {providers.length > 0 && (
        <>
          <SocialSignIn providers={providers} next={employer ? '/employer/signup' : null} />
          <p className="mt-3 text-xs leading-relaxed metalab-muted">
            By continuing you confirm you are 16 or older, agree to our{' '}
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
        {employer && (
          <div>
            <label className="metalab-label" htmlFor="reg-company">
              Company name
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-company"
                type="text"
                required
                autoComplete="organization"
                value={formData.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="metalab-input pl-11"
                placeholder="Acme Inc."
              />
            </div>
          </div>
        )}

        <div>
          <label className="metalab-label" htmlFor="reg-name">
            {employer ? 'Your name' : 'Full name'}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
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
            {employer ? 'Work email' : 'Email'}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              id="reg-email"
              type="email"
              required
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="metalab-input pl-11"
              placeholder={employer ? 'you@company.com' : 'you@example.com'}
            />
          </div>
        </div>

        <div>
          <label className="metalab-label" htmlFor="reg-password">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
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
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-ink" htmlFor="reg-age">
          <input
            id="reg-age"
            type="checkbox"
            required
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-verified"
          />
          <span>I am 16 or older</span>
        </label>

        <p className="text-xs leading-relaxed metalab-muted">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="metalab-link">
            Terms of Service
          </Link>
          {employer ? ', including the employer rules on using candidate data, ' : ' '}
          and acknowledge our{' '}
          <Link href="/privacy" className="metalab-link">
            Privacy Policy
          </Link>
          . We&apos;ll only email you about your account, never marketing.
        </p>

        <Turnstile onToken={setTurnstileToken} />

        <Button
          type="submit"
          disabled={loading || (turnstileActive && !turnstileToken)}
          isLoading={loading}
          fullWidth
          size="lg"
        >
          {employer ? 'Create employer account' : 'Create account'}
        </Button>
      </form>

      <div className="mt-8 border-t border-line pt-6">
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
