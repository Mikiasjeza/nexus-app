'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const iconColors = {
  success: 'text-verified',
  error: 'text-critical',
  warning: 'text-caution',
  info: 'text-ink-muted',
}

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const Icon = icons[type]

  return (
    <motion.div
      role={type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-sm overflow-hidden rounded-2xl border border-line bg-[#1d1b18] p-4"
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${iconColors[type]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {message && <p className="mt-1 text-sm text-ink-muted">{message}</p>}
        </div>
        <button
          type="button"
          onClick={() => onClose(id)}
          className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:bg-pill hover:text-ink"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  )
}
