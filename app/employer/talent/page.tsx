'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, User, Shield, Plus } from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import Link from 'next/link'

interface Candidate {
  id: string
  name: string
  avatar?: string
  bio?: string
  shareableId: string
  skills: { name: string; level: string; verified: boolean; category: string }[]
  matchScore: number
}

interface Pool {
  id: string
  name: string
  candidateCount: number
}

export default function EmployerTalentPage() {
  const { addToast } = useToast()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [skillsQuery, setSkillsQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  const search = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (skillsQuery.trim()) params.set('skills', skillsQuery.trim())
    if (levelFilter) params.set('level', levelFilter)
    params.set('limit', '20')
    fetch(`/api/employer/talent?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.candidates) setCandidates(data.candidates)
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const levels = ['beginner', 'intermediate', 'advanced', 'expert']

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Talent Search
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 mb-8">
            Find candidates with verified skills
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
              <input
                type="text"
                placeholder="Skills (e.g. React, TypeScript, Python)"
                value={skillsQuery}
                onChange={(e) => setSkillsQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="w-full pl-12 pr-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
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
        </motion.div>

        {loading ? (
          <div className="text-center py-16 text-black/40 dark:text-white/40">
            Searching...
          </div>
        ) : (
          <div className="space-y-6">
            {candidates.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-black/10 dark:border-white/10 p-6"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-black/40 dark:text-white/40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-black dark:text-white">
                          {c.name}
                        </h3>
                        <Badge
                          variant={c.matchScore >= 80 ? 'primary' : 'default'}
                          size="sm"
                        >
                          {c.matchScore}% match
                        </Badge>
                      </div>
                      {c.bio && (
                        <p className="text-black/60 dark:text-white/60 text-sm mb-4 line-clamp-2">
                          {c.bio}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {c.skills.slice(0, 8).map((s) => (
                          <Badge
                            key={s.name}
                            variant={s.verified ? 'primary' : 'default'}
                            size="sm"
                          >
                            <span className="flex items-center gap-1">
                              {s.verified && (
                                <Shield className="w-3 h-3" />
                              )}
                              {s.name} ({s.level})
                            </span>
                          </Badge>
                        ))}
                        {c.skills.length > 8 && (
                          <span className="text-sm text-black/40 dark:text-white/40">
                            +{c.skills.length - 8} more
                          </span>
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
              <div className="border border-black/10 dark:border-white/10 p-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
                <h3 className="text-xl font-medium text-black dark:text-white mb-2">
                  No candidates found
                </h3>
                <p className="text-black/60 dark:text-white/60 mb-4">
                  Try adjusting your search. Candidates must have public profiles
                  and opt-in to employer discovery.
                </p>
                <Link href="/employer/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
