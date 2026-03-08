'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import Button from '@/components/UI/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.gentle }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: easing.gentle }}
            className="text-9xl md:text-[12rem] font-bold text-black/10 dark:text-white/10 mb-8"
          >
            404
          </motion.div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-6 tracking-tight">
            Page Not Found
          </h1>

          <p className="text-lg text-black/60 dark:text-white/60 mb-12 max-w-md mx-auto leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button
                variant="primary"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </Link>
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
