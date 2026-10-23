'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import {
  getSkillPillarDetail,
  inferSkillCategory,
  normalizeSkillCategory,
} from '@/lib/skills-taxonomy'
import type { SkillCategory } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

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

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

function getCandidatePillars(skills: Candidate['skills']) {
  const counts = skills.reduce(
    (acc, skill) => {
      const category = normalizeSkillCategory(skill.category)
      acc[category] = (acc[category] ?? 0) + 1
      return acc
    },
    {} as Record<SkillCategory, number>
  )
  return Object.entries(counts)
    .map(([category, count]) => ({
      shortLabel: getSkillPillarDetail(category as SkillCategory).shortLabel,
      count,
    }))
    .sort((left, right) => right.count - left.count)
}

/** Search discoverable candidates by skill, pillar, level or one of your roles. */
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

  const search = (overrides: { jobId?: string } = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const jobId = overrides.jobId ?? selectedJobId
    if (skillsQuery.trim()) params.set('skills', skillsQuery.trim())
    if (levelFilter) params.set('level', levelFilter)
    if (jobId) params.set('jobId', jobId)
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
      addToast({ type: 'success', title: 'Added to the shortlist' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not add candidate',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  useEffect(() => {
    // The dashboard links here with ?jobId=<id> to rank candidates against that role.
    const jobId = new URLSearchParams(window.location.search).get('jobId') ?? ''
    if (jobId) setSelectedJobId(jobId)
    search({ jobId })
    loadPools()
    void loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null
  const verifiedInView = candidates.reduce(
    (sum, candidate) => sum + candidate.skills.filter((skill) => skill.verified).length,
    0
  )
  const jobPillars = selectedJob
    ? Array.from(
        new Set(
          selectedJob.skills.map(
            (skill) => getSkillPillarDetail(inferSkillCategory(skill)).shortLabel
          )
        )
      )
    : []

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Find talent"
          rule
          description={
            selectedJobTitle
              ? `Ranked against ${selectedJobTitle}: role skills, pillar coverage and verified proof.`
              : 'Search by skill, pillar or level. Only people who chose to be discoverable appear here.'
          }
        />

        <form
          className="flex flex-col gap-2 border-t border-line pt-6 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault()
            search()
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Skills or pillars</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Skills or pillars, like React, public speaking or Lead"
              value={skillsQuery}
              onChange={(e) => setSkillsQuery(e.target.value)}
              className="metalab-input pl-10"
            />
          </label>
          <label>
            <span className="sr-only">Rank against a role</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="metalab-input lg:w-56"
            >
              <option value="">Any role</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Level</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="metalab-input lg:w-44"
            >
              <option value="">Any level</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={loading}>
            Search
          </Button>
        </form>

        <p className="mt-4 text-sm text-ink-faint">
          {loading
            ? 'Searching'
            : `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'} · ${verifiedInView} verified skills in view`}
          {jobPillars.length > 0 && ` · role needs ${jobPillars.join(', ')}`}
        </p>

        {!loading && candidates.length === 0 ? (
          <div className="mt-6 border-y border-line py-12">
            <p className="font-display text-3xl font-light">No one matches yet</p>
            <p className="mt-3 max-w-md text-ink-muted">
              Try fewer or broader skills. Candidates appear only with a public profile and employer
              discovery turned on.
            </p>
          </div>
        ) : (
          <ul className="ruled-list mt-6 border-y border-line" aria-busy={loading}>
            {candidates.map((c) => (
              <li
                key={c.id}
                className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_13rem]"
              >
                <div className="flex gap-4">
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
                    {c.bio && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{c.bio}</p>}
                    <p className="mt-2 text-sm text-ink-faint">
                      {getCandidatePillars(c.skills)
                        .slice(0, 3)
                        .map((p) => `${p.shortLabel} ${p.count}`)
                        .join(' · ')}
                    </p>
                  </div>
                </div>

                <ul
                  className="flex flex-wrap content-start gap-1.5"
                  aria-label={`${c.name}’s skills`}
                >
                  {c.skills.slice(0, 10).map((s) => (
                    <li
                      key={s.name}
                      className={`rounded-full px-2.5 py-1 text-xs ${s.verified ? 'bg-verified-wash text-verified-ink' : 'bg-pill text-ink-muted'}`}
                    >
                      {s.name}
                      <span className="opacity-60"> · {s.level}</span>
                      {s.verified && <span className="sr-only"> (verified)</span>}
                    </li>
                  ))}
                  {c.skills.length > 10 && (
                    <li className="px-1 py-1 text-xs text-ink-faint">
                      +{c.skills.length - 10} more
                    </li>
                  )}
                </ul>

                <div className="flex flex-col gap-3 lg:items-end">
                  <p className="flex items-baseline gap-2">
                    <span
                      className={`display-number text-4xl leading-none ${c.matchScore >= 80 ? 'text-verified' : ''}`}
                    >
                      {c.matchScore}%
                    </span>
                    <span className="text-sm text-ink-faint">match</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 lg:justify-end">
                    <Link
                      href={`/share/${c.shareableId}`}
                      target="_blank"
                      className="button-base button-primary min-h-9 px-4 text-sm"
                    >
                      View passport
                    </Link>
                    {pools.length > 0 ? (
                      pools.map((pool) => (
                        <button
                          key={pool.id}
                          type="button"
                          className="pill"
                          onClick={() => addToPool(pool.id, c.id)}
                        >
                          Add to {pool.name}
                        </button>
                      ))
                    ) : (
                      <Link href="/employer/pools" className="pill">
                        Start a shortlist
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
