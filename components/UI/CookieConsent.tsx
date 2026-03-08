'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cookie } from 'lucide-react'
import Button from './Button'
import Link from 'next/link'
import { useToast } from './ToastProvider'

export default function CookieConsent() {
  const [show, setShow] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show consent banner after a delay
      const timer = setTimeout(() => {
        setShow(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShow(false)
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your cookie preferences have been saved.',
    })
  }

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShow(false)
    // Disable analytics cookies if rejected
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // Disable Google Analytics
    }
  }

  if (!show) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-white dark:bg-black border-t border-black/10 dark:border-white/10 shadow-lg"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Cookie className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-1">
                    Cookie Preferences
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                    We use cookies to enhance your experience, analyze site usage, and assist in marketing efforts. 
                    By clicking &quot;Accept All&quot;, you agree to our use of cookies.{' '}
                    <Link href="/privacy" className="underline hover:opacity-80 transition-opacity">
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                >
                  Reject All
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAccept}
                >
                  Accept All
                </Button>
                <button
                  onClick={() => setShow(false)}
                  className="p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
