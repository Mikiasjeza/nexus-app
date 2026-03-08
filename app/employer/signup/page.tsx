'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import Link from 'next/link'

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
        title: 'Registration Failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: easing.primary }}
        className="w-full max-w-md"
      >
        <div className="border border-black/10 dark:border-white/10 p-8 lg:p-12">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-black dark:text-white mb-3 tracking-tight">
              Register as Employer
            </h1>
            <p className="text-lg text-black/60 dark:text-white/60">
              Create your company profile to search for verified talent
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
            >
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              fullWidth
              size="lg"
            >
              Create Employer Account
            </Button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-black/10 dark:border-white/10">
            <p className="text-sm text-black/60 dark:text-white/60">
              Looking for a job?{' '}
              <Link
                href="/marketplace"
                className="text-black dark:text-white font-medium hover:opacity-80"
              >
                Browse jobs
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
