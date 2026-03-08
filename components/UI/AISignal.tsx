'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { memo } from 'react'

/**
 * AI Signal Layer - subtle indicators of AI presence
 * Soft glow, pulse effects, ambient intelligence
 * No chatbot UI - just subtle signals
 */
function AISignal({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      {/* Ambient AI presence - chromatic and organic */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 82% 54% at 50% 20%, rgba(0, 217, 255, 0.08) 0%, rgba(147, 51, 234, 0.05) 32%, rgba(255, 111, 145, 0.03) 52%, transparent 74%)',
        }}
        aria-hidden
      />

      {/* Living orbital signature */}
      <motion.div
        className="absolute top-4 right-4 w-12 h-12 pointer-events-none"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        <motion.span
          className="absolute left-1/2 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/70"
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-fuchsia-400/70"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </motion.div>

      {/* Calm AI indicator - appears after a moment */}
      <motion.div
        className="absolute top-4 right-4 flex items-center gap-2 text-xs text-black/35 dark:text-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.55, 1, 0.7] }}
        transition={{
          opacity: { delay: 0.8, duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-300" />
        <span>AI-assisted</span>
      </motion.div>
    </div>
  )
}

export default memo(AISignal)
