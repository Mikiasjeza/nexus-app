'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authApi.login(formData.email, formData.password)
      addToast({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully signed in.',
      })
      router.push('/dashboard')
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

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: easing.primary }}
        className="w-full max-w-md"
      >
        <div className="border border-black/10 dark:border-white/10 p-8 lg:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-black dark:text-white mb-3 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-lg text-black/60 dark:text-white/60">
              Sign in to your account
            </p>
            <Link href="/dashboard" className="mt-3 inline-block text-sm underline">
              Continue as guest
            </Link>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5"
            >
              <p className="text-sm text-black dark:text-white font-medium">{error}</p>
            </motion.div>
          )}

          <motion.form
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: easing.primary }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target?.value || '' })}
                  className="w-full pl-12 pr-5 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target?.value || '' })}
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

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2.5 text-sm text-black/60 dark:text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 border border-black/20 dark:border-white/20 bg-white dark:bg-black text-black dark:text-white focus:outline-none"
                />
                <span>Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              fullWidth
              size="lg"
            >
              Sign In
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-black text-black/60 dark:text-white/60">
                  or continue with
                </span>
              </div>
            </div>

            <a
              href="/api/auth/github/authorize"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">GitHub</span>
            </a>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center pt-6 border-t border-black/10 dark:border-white/10"
          >
            <p className="text-sm text-black/60 dark:text-white/60">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-black dark:text-white font-medium hover:opacity-80 transition-opacity">
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
