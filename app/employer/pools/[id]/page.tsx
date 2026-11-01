'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Loader from '@/components/UI/Loader'
import { useToast } from '@/components/UI/ToastProvider'
import { getSkillPillarDetail, normalizeSkillCategory } from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

interface Candidate {
  id: string
  name: string
  avatar?: string
  shareableId: string
  skills: { name: string; level: string; verified: boolean; category: string }[]
}

interface PoolDetail {
  id: string
  name: string
  candidates: Candidate[]
}

function pillarSummary(skills: Candidate['skills']): string {
  const counts = skills.reduce(
    (acc, skill) => {
      const category = normalizeSkillCategory(skill.category)
      acc[category] = (acc[category] ?? 0) + 1
      return acc
    },
    {} as Record<SkillCategory, number>
  )
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([category, count]) =>
        `${getSkillPillarDetail(category as SkillCategory).shortLabel} ${count}`
    )
    .join(' · ')
}

/** One shortlist: the people in it, their verified skills, and a way to drop them. */
export default function EmployerPoolDetailPage() {
  const params = useParams()
  const poolId = params.id as string
  const { addToast } = useToast()
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!poolId) return
    fetch(`/api/employer/pools/${poolId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setPool(data.id ? data : null))
      .catch(() => setPool(null))
      .finally(() => setLoading(false))
  }, [poolId])

  const handleRemove = async (candidate: Candidate) => {
    try {
      const res = await fetch(`/api/employer/pools/${poolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeCandidateId: candidate.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove')
      setPool((prev) =>
        prev ? { ...prev, candidates: prev.candidates.filter((c) => c.id !== candidate.id) } : null
      )
      addToast({ type: 'success', title: `Removed ${candidate.name}` })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not remove',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (!pool) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Shortlist not found"
            rule
            description="It may have been deleted, or it belongs to another company."
            actions={
              <Link href="/employer/pools" className="button-base button-secondary min-h-11 px-5">
                All shortlists
              </Link>
            }
          />
        </div>
      </AppPageShell>
    )
  }

  return (
    <AppPageShell>
      <div className="page-shell">
        <Link href="/employer/pools" className="text-sm text-ink-muted hover:text-ink">
          ← Shortlists
        </Link>
        <PageHeader
          title={pool.name}
          rule
          description={`${pool.candidates.length} ${pool.candidates.length === 1 ? 'person' : 'people'}. Only people who are still discoverable are shown.`}
          actions={
            <Link href="/employer/talent" className="button-base button-secondary min-h-11 px-5">
              Add from a search
            </Link>
          }
        />

        {pool.candidates.length === 0 ? (
          <div className="border-y border-line py-12">
            <p className="font-display text-3xl font-light">Nobody here yet</p>
            <p className="mt-3 max-w-md text-ink-muted">
              Search for talent and use “Add to {pool.name}” on anyone worth a second look.
            </p>
          </div>
        ) : (
          <ul className="ruled-list border-y border-line">
            {pool.candidates.map((c) => (
              <li
                key={c.id}
                className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pill text-ink-muted">
                    {c.avatar ? (
                      <Image
                        src={c.avatar}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="size-12 object-cover"
                      />
                    ) : (
                      <span aria-hidden>{c.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-[2rem] font-light leading-tight">{c.name}</h2>
                    <p className="text-sm text-ink-faint">{pillarSummary(c.skills)}</p>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label={`${c.name}’s skills`}>
                  {c.skills.slice(0, 8).map((s) => (
                    <li
                      key={s.name}
                      className={`rounded-full px-2.5 py-1 text-xs ${s.verified ? 'bg-verified-wash text-verified-ink' : 'bg-pill text-ink-muted'}`}
                    >
                      {s.name}
                      {s.verified && <span className="sr-only"> (verified)</span>}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-1.5 lg:justify-end">
                  <Link
                    href={`/share/${c.shareableId}`}
                    target="_blank"
                    className="button-base button-primary min-h-9 px-4 text-sm"
                  >
                    View passport
                  </Link>
                  <button type="button" className="pill" onClick={() => handleRemove(c)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
