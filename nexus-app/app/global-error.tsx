'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-md w-full glass-card rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              A critical error occurred. Please refresh the page.
            </p>
            
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
