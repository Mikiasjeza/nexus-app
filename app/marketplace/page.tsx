'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase,
  MapPin,
  DollarSign,
  Filter,
  Search,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useSkills } from '@/lib/hooks/useSkills'
import { easing } from '@/lib/utils/animations'
import { formatDistanceToNow } from 'date-fns'
import { authApi } from '@/lib/api'
import type { User } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface ApiJob {
  id: string
  title: string
  description?: string
  skills: string[]
  location?: string
  type: string
  salary?: string
  status: string
  company: { id: string; name: string; slug: string; logo?: string }
  createdAt: string
}

export default function MarketplacePage() {
  const router = useRouter()
  const { skills } = useSkills()
  const [user, setUser] = useState<User | null>(null)
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const isGuestPreview = user?.id === 'guest-user'

  useEffect(() => {
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null))
    fetch('/api/jobs', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  const promptSignIn = () => {
    router.push('/auth/login?next=/marketplace')
  }

  const userSkills = skills.map((s) => s.name)
  const matchedJobs = jobs.map((job) => {
    const match =
      job.skills.length === 0
        ? 50
        : Math.round(
            (job.skills.filter((skill) =>
              userSkills.some((us) =>
                us.toLowerCase().includes(skill.toLowerCase())
              )
            ).length /
              Math.max(job.skills.length, 1)) *
              100
          )
    return {
      ...job,
      match: Math.min(match, 100),
      posted: formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }),
    }
  })

  const filteredJobs = matchedJobs.filter((job) => {
    if (
      searchQuery &&
      !job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !job.company.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    if (selectedType !== 'all' && job.type !== selectedType) {
      return false
    }
    return true
  }).sort((a, b) => b.match - a.match)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white/70">Loading opportunities...</div>
      </div>
    )
  }

  return (
    <div className="aurora-shell min-h-screen bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-6">
              <div>
                <div className="hero-kicker mb-4">Opportunity Radar</div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight">
                  Career Marketplace
                </h1>
                <p className="text-lg text-white/68 max-w-2xl">
                  Discover openings matched to your verified strengths, not just keywords on a resume.
                </p>
              </div>
              <Badge variant="primary" size="lg">
                {matchedJobs.length} Matched Jobs
              </Badge>
            </div>

            {isGuestPreview && (
              <div className="mb-6 border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
                You are browsing as a guest. Sign in or create an account to save jobs or apply.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
              {[
                { label: 'Open roles', value: matchedJobs.length },
                { label: 'Strong matches', value: matchedJobs.filter((job) => job.match >= 80).length },
                { label: 'Skills detected', value: userSkills.length },
              ].map((item) => (
                <div key={item.label} className="insight-card p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-white/10 bg-black/55 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-300/60 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <Button
                  variant="outline"
                  leftIcon={<Filter className="w-4 h-4" />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                </Button>
                <div className="flex flex-wrap gap-2">
                  {['all', 'full-time', 'part-time', 'contract', 'internship'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 text-sm font-medium transition-opacity ${
                        selectedType === type
                          ? 'bg-white text-black opacity-100'
                          : 'border border-white/10 text-white/65 hover:opacity-100 opacity-70'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Job Listings */}
        <div className="space-y-6">
          <AnimatePresence>
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className="gradient-border-card p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{job.title}</h3>
                          <div className="flex items-center gap-4 text-white/60 mb-3">
                            <a
                              href={`/company/${job.company.slug}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>{job.company.name}</span>
                            </a>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={job.match >= 90 ? 'primary' : 'default'} 
                          size="lg"
                        >
                          {job.match}% Match
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        {job.salary && (
                          <div className="flex items-center gap-2 text-white/60">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">{job.salary}</span>
                          </div>
                        )}
                        <Badge variant="default" size="sm">
                          {job.type.replace('-', ' ')}
                        </Badge>
                        <div className="flex items-center gap-2 text-white/60">
                          <Calendar className="w-4 h-4" />
                          <span>{job.posted}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-black dark:text-white mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill, idx) => (
                            <Badge
                              key={idx}
                              variant={userSkills.some(us => us.toLowerCase().includes(skill.toLowerCase())) ? 'primary' : 'default'}
                              size="sm"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <Button
                          variant="primary"
                          rightIcon={<ExternalLink className="w-4 h-4" />}
                          fullWidth
                          onClick={() => {
                            if (isGuestPreview || !user) {
                              promptSignIn()
                            }
                          }}
                        >
                          Apply Now
                        </Button>
                        <Button
                          variant="outline"
                          fullWidth
                          onClick={() => {
                            if (isGuestPreview || !user) {
                              promptSignIn()
                            }
                          }}
                        >
                          Save Job
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredJobs.length === 0 && (
            <div className="gradient-border-card p-12 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-xl font-medium text-white mb-2">No jobs found</h3>
              <p className="text-white/60">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Stats Section */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: easing.primary }}
          className="mt-16"
        >
          <div className="gradient-border-card p-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-white mb-2">
                  {jobs.length}
                </div>
                <div className="text-white/60">Active Jobs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">5K+</div>
                <div className="text-white/60">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">95%</div>
                <div className="text-white/60">Match Accuracy</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
