'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import Button from '@/components/UI/Button'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function NotFound() {
  return (
    <AppPageShell className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto w-full max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.gentle }}
          className="gradient-border-card px-8 py-12 md:px-12 md:py-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easing.gentle }}
            className="mb-6 bg-gradient-to-br from-cyan-400/20 via-violet-400/15 to-rose-400/20 bg-clip-text text-7xl font-bold text-transparent md:mb-8 md:text-9xl"
          >
            404
          </motion.div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">Page not found</h1>

          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-white/60">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/" className="button-base button-primary">
              <Home className="h-4 w-4" />
              Go home
            </Link>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        </motion.div>
      </div>
    </AppPageShell>
  )
}
