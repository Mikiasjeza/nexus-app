'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import Link from 'next/link'
import { motion } from 'framer-motion'
import AuthShell from '@/components/Layout/AuthShell'

export default function EmployerSignupPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/employer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyName: companyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register')
      }
      addToast({
        type: 'success',
        title: 'Employer account created',
        message: `Welcome, ${data.name}. You can now search for talent.`,
      })
      router.push('/employer/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register')
      addToast({
        type: 'error',
        title: 'Registration failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="hero-kicker mb-6">Employer workspace</div>
      <div className="mb-10 text-center">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-cyan-500/10"
        >
          <Building2 className="h-8 w-8 text-cyan-200/90" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Register as employer</h1>
        <p className="text-sm leading-relaxed metalab-muted md:text-base">
          Create a company profile to search talent by verified proof and Nexus skill pillars.
        </p>
      </div>

      {error ? (
        <div className="metalab-alert-error">
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="metalab-label" htmlFor="employer-company">
            Company name
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="employer-company"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="metalab-input pl-11"
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed metalab-muted">
          By creating an employer account you agree to our{' '}
          <Link href="/terms" className="metalab-link">Terms of Service</Link>, including the employer rules on using
          candidate data, and acknowledge our{' '}
          <Link href="/privacy" className="metalab-link">Privacy Policy</Link>.
        </p>

        <Button type="submit" disabled={loading} isLoading={loading} fullWidth size="lg">
          Create employer account
        </Button>
      </form>

      <div className="mt-8 border-t border-white/[0.08] pt-6 text-center">
        <p className="text-sm metalab-muted">
          Looking for a role?{' '}
          <Link href="/marketplace" className="metalab-link">
            Browse marketplace
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
