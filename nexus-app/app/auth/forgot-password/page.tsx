'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import { fetchApi } from '@/lib/api/fetcher'

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
        title: 'Reset Link Sent',
        message: 'Check your email for password reset instructions.',
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send reset link. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: easing.primary }}
        >
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="border border-black/10 dark:border-white/10 p-8 lg:p-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-black dark:text-white mb-4 tracking-tight">
              Reset Password
            </h1>
            <p className="text-black/60 dark:text-white/60 mb-8 leading-relaxed">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                  <Mail className="w-8 h-8 text-black dark:text-white" />
                </div>
                <h2 className="text-xl font-bold text-black dark:text-white mb-3">
                  Check Your Email
                </h2>
                <p className="text-black/60 dark:text-white/60 mb-8 leading-relaxed">
                  We&apos;ve sent a password reset link to <strong>{email}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSent(false)
                    setEmail('')
                  }}
                >
                  Send Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-5 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={loading}
                  fullWidth
                >
                  Send Reset Link
                </Button>
              </form>
            )}

            <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10 text-center">
              <p className="text-sm text-black/60 dark:text-white/60">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-black dark:text-white hover:opacity-80 transition-opacity font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
