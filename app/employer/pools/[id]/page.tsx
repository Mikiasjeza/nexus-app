'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { User, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import {
  getSkillPillarDetail,
  normalizeSkillCategory,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'

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

function getCandidatePillars(
  skills: Candidate['skills']
): Array<{ category: SkillCategory; shortLabel: string; count: number }> {
  const counts = skills.reduce(
    (acc, skill) => {
      const category = normalizeSkillCategory(skill.category)
      acc[category] = (acc[category] ?? 0) + 1
      return acc
    },
    {} as Record<SkillCategory, number>
  )

  return Object.entries(counts)
    .map(([category, count]) => {
      const pillar = getSkillPillarDetail(category as SkillCategory)
      return { category: pillar.category, shortLabel: pillar.shortLabel, count }
    })
    .sort((left, right) => right.count - left.count)
}

export default function EmployerPoolDetailPage() {
  const params = useParams()
  const poolId = params.id as string
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!poolId) return
    fetch(`/api/employer/pools/${poolId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setPool(data)
      })
      .finally(() => setLoading(false))
  }, [poolId])

  const handleRemove = async (candidateId: string) => {
    if (!poolId) return
    try {
      await fetch(`/api/employer/pools/${poolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeCandidateId: candidateId }),
      })
      setPool((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.filter((c) => c.id !== candidateId),
            }
          : null
      )
    } catch {
      // ignore
    }
  }

  if (loading || !pool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-black/40 dark:text-white/40">Loading...</div>
      </div>
    )
  }

  const poolPillarCounts = pool.candidates.reduce(
    (acc, candidate) => {
      candidate.skills.forEach((skill) => {
        const category = normalizeSkillCategory(skill.category)
        acc[category] = (acc[category] ?? 0) + 1
      })
      return acc
    },
    {} as Record<SkillCategory, number>
  )

  return (
    <AppPageShell className="min-h-screen bg-black py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <Link
          href="/employer/pools"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pools
        </Link>

        <div className="hero-panel p-8 md:p-10 mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{pool.name}</h1>
          <p className="text-white/60 mb-8">
            {pool.candidates.length} candidate{pool.candidates.length !== 1 ? 's' : ''} saved with
            pillar-aware skill proof.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {SKILL_PILLAR_DETAILS.map((pillar) => (
              <div
                key={pillar.category}
                className="insight-card p-4"
                style={{ borderColor: `${CATEGORY_COLORS[pillar.category]}30` }}
              >
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  {pillar.shortLabel}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {poolPillarCounts[pillar.category] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {pool.candidates.length === 0 ? (
          <div className="gradient-border-card p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <p className="text-white/60 mb-4">No candidates in this pool yet</p>
            <Link href="/employer/talent">
              <Button>Search Talent</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pool.candidates.map((c) => (
              <div
                key={c.id}
                className="gradient-border-card p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    {c.avatar ? (
                      <Image
                        src={c.avatar}
                        alt={`${c.name} avatar`}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2 mb-3">
                      {getCandidatePillars(c.skills)
                        .slice(0, 3)
                        .map((pillar) => (
                          <Badge key={pillar.category} variant="default" size="sm">
                            {pillar.shortLabel}: {pillar.count}
                          </Badge>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {c.skills.slice(0, 5).map((s) => (
                        <Badge key={s.name} variant={s.verified ? 'primary' : 'default'} size="sm">
                          {s.verified && <Shield className="w-3 h-3" />}
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/share/${c.shareableId}`} target="_blank">
                    <Button variant="primary" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(c.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  )
}
