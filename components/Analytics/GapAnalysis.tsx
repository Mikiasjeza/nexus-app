'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '@/components/UI/Button'
import { easing } from '@/lib/utils/animations'

const ROLES = [
  { id: 'frontend-developer', label: 'Frontend Developer' },
  { id: 'full-stack', label: 'Full Stack Developer' },
  { id: 'data-scientist', label: 'Data Scientist' },
  { id: 'product-manager', label: 'Product Manager' },
] as const

interface GapResult {
  targetRole: string
  requiredCount: number
  matchedCount: number
  missingCount: number
  coveragePercent: number
  matched: { target: string; userSkill: string; level: string; progress: number }[]
  missing: { target: string; recommendation: string }[]
  summary: string
}

export default function GapAnalysis() {
  const [role, setRole] = useState<string>('frontend-developer')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GapResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/analytics/gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetRole: role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Analysis failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: easing.primary }}
      className="border border-black/10 dark:border-white/10 p-6 lg:p-8 bg-white dark:bg-black"
    >
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-6 h-6 text-black/60 dark:text-white/60" />
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Gap Analysis
        </h2>
      </div>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Compare your skills to a target role and see what to focus on next.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              role === r.id
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Button
        onClick={runAnalysis}
        disabled={loading}
        isLoading={loading}
        leftIcon={<Target className="w-4 h-4" />}
      >
        Analyze Gaps
      </Button>

      {error && (
        <div className="mt-6 p-4 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-4">
            <div
              className="text-4xl font-bold"
              style={{
                color:
                  result.coveragePercent >= 80
                    ? '#10b981'
                    : result.coveragePercent >= 50
                      ? '#f59e0b'
                      : '#ef4444',
              }}
            >
              {result.coveragePercent}%
            </div>
            <div>
              <p className="font-medium text-black dark:text-white">
                {result.matchedCount} of {result.requiredCount} skills matched
              </p>
              <p className="text-sm text-black/60 dark:text-white/60">
                {result.summary}
              </p>
            </div>
          </div>

          {result.matched.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-black/60 dark:text-white/60 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Skills you have
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matched.map(m => (
                  <span
                    key={m.target}
                    className="px-3 py-1 bg-green-500/10 text-green-700 dark:text-green-400 text-sm"
                  >
                    {m.userSkill} ({m.level})
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-black/60 dark:text-white/60 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Skills to develop
              </h3>
              <ul className="space-y-2">
                {result.missing.map(m => (
                  <li
                    key={m.target}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="font-medium text-black dark:text-white">
                      {m.target}
                    </span>
                    <span className="text-black/60 dark:text-white/60">
                      — {m.recommendation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
