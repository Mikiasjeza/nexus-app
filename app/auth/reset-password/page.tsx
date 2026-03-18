'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import { fetchApi } from '@/lib/api/fetcher'

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
        title: 'Invalid Link',
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
        title: 'Passwords Don&apos;t Match',
        message: 'Please make sure both passwords match.',
      })
      return
    }

    if (formData.password.length < 8) {
      addToast({
        type: 'error',
        title: 'Password Too Short',
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
        title: 'Password Reset',
        message: 'Your password has been reset successfully.',
      })
      router.push('/auth/login')
    } catch (err) {
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
              Enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-12 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                fullWidth
              >
                Reset Password
              </Button>
            </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-black" />}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
