'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Search, User, Shield, Plus } from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import Link from 'next/link'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import {
  getSkillPillarDetail,
  inferSkillCategory,
  normalizeSkillCategory,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'

interface Candidate {
  id: string
  name: string
  avatar?: string
  bio?: string
  shareableId: string
  skills: { name: string; level: string; verified: boolean; category: string }[]
  matchedPillars?: SkillCategory[]
  matchedVerifiedSignals?: number
  matchScore: number
}

interface Pool {
  id: string
  name: string
  candidateCount: number
}

interface JobOption {
  id: string
  title: string
  skills: string[]
}

function getCandidatePillars(
  skills: Candidate['skills']
): Array<{ category: SkillCategory; count: number; shortLabel: string }> {
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
      return { category: pillar.category, count, shortLabel: pillar.shortLabel }
    })
    .sort((left, right) => right.count - left.count)
}

export default function EmployerTalentPage() {
  const { addToast } = useToast()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [loading, setLoading] = useState(true)
  const [skillsQuery, setSkillsQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedJobTitle, setSelectedJobTitle] = useState('')

  const search = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (skillsQuery.trim()) params.set('skills', skillsQuery.trim())
    if (levelFilter) params.set('level', levelFilter)
    if (selectedJobId) params.set('jobId', selectedJobId)
    params.set('limit', '20')
    fetch(`/api/employer/talent?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.candidates) setCandidates(data.candidates)
        setSelectedJobTitle(data.targetJob?.title ?? '')
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }

  const loadPools = () => {
    fetch('/api/employer/pools', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.pools) setPools(data.pools)
      })
      .catch(() => setPools([]))
  }

  const loadJobs = async () => {
    try {
      const companyRes = await fetch('/api/employer/company', { credentials: 'include' })
      const companyData = await companyRes.json()
      if (!companyData.company?.id) {
        setJobs([])
        return
      }
      const jobsRes = await fetch(`/api/jobs?companyId=${companyData.company.id}`, {
        credentials: 'include',
      })
      const jobsData = await jobsRes.json()
      setJobs(
        (jobsData.jobs || []).map((job: { id: string; title: string; skills: string[] }) => ({
          id: job.id,
          title: job.title,
          skills: job.skills ?? [],
        }))
      )
    } catch {
      setJobs([])
    }
  }

  const addToPool = async (poolId: string, candidateId: string) => {
    try {
      const res = await fetch(`/api/employer/pools/${poolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addCandidateId: candidateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add candidate')

      setPools((prev) =>
        prev.map((pool) =>
          pool.id === poolId
            ? { ...pool, candidateCount: data.candidateCount ?? pool.candidateCount }
            : pool
        )
      )
      addToast({ type: 'success', title: 'Candidate added to pool' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not add candidate',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  useEffect(() => {
    search()
    loadPools()
    void loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const levels = ['beginner', 'intermediate', 'advanced', 'expert']
  const totalVerifiedSignals = candidates.reduce(
    (sum, candidate) => sum + candidate.skills.filter((skill) => skill.verified).length,
    0
  )
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null
  const dominantPillars = SKILL_PILLAR_DETAILS.map((pillar) => ({
    ...pillar,
    count: candidates.reduce(
      (sum, candidate) =>
        sum +
        candidate.skills.filter(
          (skill) => normalizeSkillCategory(skill.category) === pillar.category
        ).length,
      0
    ),
  }))

  return (
    <AppPageShell className="min-h-screen bg-black py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <h1 className="text-4xl font-bold text-white mb-2">Talent Search</h1>
            <p className="text-lg text-white/60 mb-8 max-w-3xl">
              Find candidates by verified proof and the pillars that matter most to your team, from
              technical execution to communication, leadership, and growth.
            </p>

            {selectedJobTitle && (
              <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] px-4 py-3 text-sm text-cyan-100">
                Matching candidates against{' '}
                <span className="font-semibold">{selectedJobTitle}</span> using role skills, pillar
                coverage, and verified proof.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
              {[
                { label: 'Candidates in view', value: candidates.length },
                { label: 'Verified signals', value: totalVerifiedSignals },
                { label: 'Saved pools', value: pools.length },
              ].map((item) => (
                <div key={item.label} className="insight-card p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {item.label}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-8">
              {dominantPillars.map((pillar) => (
                <div
                  key={pillar.category}
                  className="insight-card p-4"
                  style={{ borderColor: `${CATEGORY_COLORS[pillar.category]}30` }}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {pillar.shortLabel}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{pillar.count}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search skills or pillars, like React, Public Speaking, Leadership, or Growth"
                  value={skillsQuery}
                  onChange={(e) => setSkillsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  className="w-full pl-12 pr-4 py-3 border border-white/10 bg-black/40 text-white"
                />
              </div>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-4 py-3 border border-white/10 bg-black/40 text-white"
              >
                <option value="">All roles</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-4 py-3 border border-white/10 bg-black/40 text-white"
              >
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </select>
              <Button onClick={search} disabled={loading}>
                Search
              </Button>
            </div>
            {selectedJob && selectedJob.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from(
                  new Set(
                    selectedJob.skills.map(
                      (skill) => getSkillPillarDetail(inferSkillCategory(skill)).shortLabel
                    )
                  )
                ).map((shortLabel) => (
                  <Badge key={shortLabel} variant="default" size="sm">
                    {shortLabel}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-16 text-white/40">Searching...</div>
        ) : (
          <div className="space-y-6">
            {candidates.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="gradient-border-card p-6"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      {c.avatar ? (
                        <Image
                          src={c.avatar}
                          alt={`${c.name} avatar`}
                          width={56}
                          height={56}
                          unoptimized
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-white/40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{c.name}</h3>
                        <Badge variant={c.matchScore >= 80 ? 'primary' : 'default'} size="sm">
                          {c.matchScore}% match
                        </Badge>
                      </div>
                      {c.bio && <p className="text-white/60 text-sm mb-4 line-clamp-2">{c.bio}</p>}
                      <div className="mb-4 flex flex-wrap gap-2">
                        {getCandidatePillars(c.skills)
                          .slice(0, 3)
                          .map((pillar) => (
                            <Badge key={pillar.category} variant="default" size="sm">
                              {pillar.shortLabel} {pillar.count}
                            </Badge>
                          ))}
                        {typeof c.matchedVerifiedSignals === 'number' &&
                          c.matchedVerifiedSignals > 0 && (
                            <Badge variant="primary" size="sm">
                              Verified matches {c.matchedVerifiedSignals}
                            </Badge>
                          )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.skills.slice(0, 8).map((s) => (
                          <Badge
                            key={s.name}
                            variant={s.verified ? 'primary' : 'default'}
                            size="sm"
                          >
                            <span className="flex items-center gap-1">
                              {s.verified && <Shield className="w-3 h-3" />}
                              {s.name} ({s.level})
                            </span>
                          </Badge>
                        ))}
                        {c.skills.length > 8 && (
                          <span className="text-sm text-white/40">+{c.skills.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/share/${c.shareableId}`} target="_blank">
                      <Button variant="primary" rightIcon={<Plus className="w-4 h-4" />}>
                        View Profile
                      </Button>
                    </Link>
                    {pools.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pools.map((pool) => (
                          <Button
                            key={pool.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addToPool(pool.id, c.id)}
                          >
                            Add to {pool.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Link href="/employer/pools">
                        <Button variant="outline" size="sm">
                          Create pool to save
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {candidates.length === 0 && (
              <div className="gradient-border-card p-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-xl font-medium text-white mb-2">No candidates found</h3>
                <p className="text-white/60 mb-4">
                  Try adjusting your search. Candidates must have public profiles and opt-in to
                  employer discovery.
                </p>
                <Link href="/employer/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AppPageShell>
  )
}
