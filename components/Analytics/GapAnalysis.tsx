'use client'

import React, { useState } from 'react'
import Button from '@/components/UI/Button'

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

/** Compare the passport to a target role and list what's covered and what's missing. */
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
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Target role">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            aria-pressed={role === r.id}
            className="pill"
          >
            {r.label}
          </button>
        ))}
      </div>

      <Button className="mt-6" onClick={runAnalysis} disabled={loading} isLoading={loading}>
        Compare my skills
      </Button>

      {error && (
        <p role="alert" className="mt-6 text-sm text-critical">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <p className="flex items-baseline gap-3">
              <span className="display-number text-score leading-none">
                {result.coveragePercent}%
              </span>
            </p>
            <p className="mt-3 text-ink">
              {result.matchedCount} of {result.requiredCount} skills covered
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{result.summary}</p>
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-sm text-ink-faint">You have</h3>
              {result.matched.length > 0 ? (
                <ul className="ruled-list mt-3 border-y border-line">
                  {result.matched.map((m) => (
                    <li key={m.target} className="flex justify-between gap-4 py-3 text-sm">
                      <span>{m.userSkill}</span>
                      <span className="text-ink-faint">{m.level}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">None of this role’s skills yet.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm text-ink-faint">To develop</h3>
              {result.missing.length > 0 ? (
                <ul className="ruled-list mt-3 border-y border-line">
                  {result.missing.map((m) => (
                    <li key={m.target} className="py-3 text-sm">
                      <span className="text-ink">{m.target}</span>
                      <span className="mt-1 block text-ink-muted">{m.recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">Nothing missing for this role.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
