'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase,
  MapPin,
  DollarSign,
  Search,
  Building2,
  Calendar,
  ExternalLink,
  Brain,
  MessageSquare,
  Send,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useSkills } from '@/lib/hooks/useSkills'
import { aiApi, authApi } from '@/lib/api'
import { easing } from '@/lib/utils/animations'
import { getSkillPillarDetail, inferSkillCategory, skillsLooselyMatch, SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import type { AIJobMatchItem } from '@/lib/api/ai'
import type { SkillCategory, User } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import AppPageShell from '@/components/Layout/AppPageShell'

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

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
  prompts?: string[]
}

export default function MarketplacePage() {
  const router = useRouter()
  const { skills } = useSkills()
  const [user, setUser] = useState<User | null>(null)
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [aiSummary, setAiSummary] = useState('')
  const [aiMatches, setAiMatches] = useState<AIJobMatchItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Ask me which roles fit your strongest pillars, which gaps matter most, or how to position yourself for a better match.',
      prompts: ['Which pillar is strongest for me?', 'What role should I target next?', 'How can I improve my match score?'],
    },
  ])

  const isGuestPreview = user?.id === 'guest-user'
  const userSkills = skills.map((skill) => skill.name)

  useEffect(() => {
    let isActive = true

    async function loadMarketplace() {
      try {
        const [currentUser, jobsResponse] = await Promise.all([
          authApi.getCurrentUser(),
          fetch('/api/jobs', { credentials: 'include' }).then((response) => response.json()).catch(() => ({ jobs: [] })),
        ])

        if (!isActive) return

        setUser(currentUser)
        setJobs(jobsResponse.jobs || [])
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadMarketplace()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!user) return

    let isActive = true
    setAiLoading(true)

    aiApi.getJobMatches()
      .then((response) => {
        if (!isActive) return
        setAiSummary(response.data.summary)
        setAiMatches(response.data.matches)
      })
      .catch((error) => {
        if (!isActive) return
        console.error('AI job matches load error:', error)
        setAiSummary('')
        setAiMatches([])
      })
      .finally(() => {
        if (isActive) {
          setAiLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [user, skills.length])

  const promptSignIn = () => {
    router.push('/auth/login?next=/marketplace')
  }

  const aiMatchMap = useMemo(
    () => new Map(aiMatches.map((match) => [match.jobId, match])),
    [aiMatches]
  )

  const matchedJobs = useMemo(() => {
    return jobs.map((job) => {
      const heuristicMatch =
        job.skills.length === 0
          ? 50
          : Math.round(
              (job.skills.filter((skill) =>
                userSkills.some((userSkill) =>
                  skillsLooselyMatch(userSkill, skill)
                )
              ).length /
                Math.max(job.skills.length, 1)) *
                100
            )

      const aiMatch = aiMatchMap.get(job.id)

      return {
        ...job,
        match: aiMatch?.matchScore ?? Math.min(heuristicMatch, 100),
        posted: formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }),
        aiMatch,
      }
    })
  }, [aiMatchMap, jobs, userSkills])

  const userPillarCounts = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] ?? 0) + 1
      return acc
    }, {} as Record<SkillCategory, number>)
  }, [skills])

  const topPillars = useMemo(() => {
    return SKILL_PILLAR_DETAILS
      .map((pillar) => ({
        ...pillar,
        count: userPillarCounts[pillar.category] ?? 0,
        color: CATEGORY_COLORS[pillar.category],
      }))
      .sort((a, b) => b.count - a.count)
  }, [userPillarCounts])

  const getPillarsForSkills = (skillNames: string[]) => {
    return Array.from(
      new Set(skillNames.map((skill) => inferSkillCategory(skill)))
    ).map((category) => getSkillPillarDetail(category))
  }

  const filteredJobs = matchedJobs
    .filter((job) => {
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
    })
    .sort((a, b) => b.match - a.match)

  const latestAssistantPrompts = [...chatMessages].reverse().find((message) => message.role === 'assistant')?.prompts || []

  const sendChat = async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    if (!user) {
      promptSignIn()
      return
    }

    setChatMessages((prev) => [...prev, { role: 'user', content: trimmedMessage }])
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await aiApi.chatCareerCoach(trimmedMessage)
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.reply,
          prompts: response.data.suggestedPrompts,
        },
      ])
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'I could not answer that right now. Please try again.',
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <AppPageShell className="flex min-h-screen items-center justify-center bg-black" orbs={false}>
        <div className="text-white/70">Loading opportunities...</div>
      </AppPageShell>
    )
  }

  return (
    <AppPageShell className="min-h-screen bg-black py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
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
                  Discover openings matched to your strongest pillars, with AI-ranked fit reasons, gap analysis, and coaching grounded in the same skill system across Nexus.
                </p>
              </div>
              <Badge variant="primary" size="lg">
                {filteredJobs.length} Jobs In View
              </Badge>
            </div>

            {isGuestPreview && (
              <div className="mb-6 border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
                You are browsing as a guest. AI recommendations are shown in preview mode. Sign in or create an account to apply or save jobs.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
              {[
                { label: 'Open roles', value: matchedJobs.length },
                { label: 'AI recommendations', value: aiMatches.length },
                { label: 'Skills detected', value: userSkills.length },
              ].map((item) => (
                <div key={item.label} className="insight-card p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-6">
              {topPillars.map((pillar) => (
                <div
                  key={pillar.category}
                  className="insight-card p-4"
                  style={{ borderColor: `${pillar.color}30` }}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{pillar.shortLabel}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{pillar.count}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-white/10 bg-black/55 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-300/60 transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['all', 'full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    type="button"
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
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-12">
          <div className="gradient-border-card p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="hero-kicker mb-3">AI Job Matching</div>
                <h2 className="text-2xl font-bold text-white">Best-fit roles right now</h2>
                <p className="text-white/60 mt-2">
                  {aiSummary || 'AI is comparing your strongest pillars and skill proof against active roles to surface the best opportunities.'}
                </p>
              </div>
              <Button
                variant="outline"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  if (!user) {
                    promptSignIn()
                    return
                  }
                  setAiLoading(true)
                  aiApi.getJobMatches()
                    .then((response) => {
                      setAiSummary(response.data.summary)
                      setAiMatches(response.data.matches)
                    })
                    .finally(() => setAiLoading(false))
                }}
                disabled={aiLoading}
              >
                {aiLoading ? 'Refreshing...' : 'Refresh AI'}
              </Button>
            </div>

            <div className="space-y-4">
              {aiMatches.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
                  {user
                    ? 'Add more skills or wait for active jobs to load so AI can generate stronger recommendations.'
                    : 'Sign in to unlock AI-ranked matches tailored to your skill profile.'}
                </div>
              )}

              {aiMatches.slice(0, 3).map((match) => (
                <div key={match.jobId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="font-semibold text-white">{match.job?.title || 'Recommended role'}</div>
                      <div className="text-sm text-white/55">{match.job?.company.name}</div>
                    </div>
                    <Badge variant={match.recommended ? 'primary' : 'default'} size="sm">
                      {match.matchScore}% fit
                    </Badge>
                  </div>
                  <p className="text-sm text-white/70 mb-3">{match.reason}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getPillarsForSkills(match.matchingSkills).map((pillar) => (
                      <Badge key={pillar.category} variant="default" size="sm">
                        {pillar.shortLabel}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {match.matchingSkills.map((skill) => (
                      <Badge key={skill} variant="primary" size="sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {match.gaps.length > 0 && (
                    <div className="text-xs text-white/55">
                      Gap pillars: {getPillarsForSkills(match.gaps).map((pillar) => pillar.shortLabel).join(', ')}. Missing skills: {match.gaps.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-border-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <MessageSquare className="w-6 h-6 text-white" />
              <div>
                <div className="hero-kicker mb-2">AI Career Coach</div>
                <h2 className="text-2xl font-bold text-white">Ask what to do next</h2>
                <p className="text-sm text-white/60 mt-2">
                  Get advice based on your strongest pillars, missing proof, and the roles you are closest to landing.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5 max-h-[22rem] overflow-y-auto pr-1">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'assistant'
                      ? 'border border-white/10 bg-white/[0.04] text-white/80'
                      : 'bg-white text-black'
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>

            {latestAssistantPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {latestAssistantPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendChat(prompt)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void sendChat(chatInput)
                  }
                }}
                placeholder="Ask about your best role, missing skills, or how to improve your fit..."
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-black/45 px-4 text-white outline-none transition focus:border-cyan-300/60"
              />
              <Button
                onClick={() => void sendChat(chatInput)}
                isLoading={chatLoading}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Send
              </Button>
            </div>
          </div>
        </div>

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
                      <div className="flex items-start justify-between mb-4 gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{job.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-white/60 mb-3">
                            <a
                              href={`/company/${job.company.slug}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>{job.company.name}</span>
                            </a>
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{job.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={job.match >= 85 ? 'primary' : 'default'} size="lg">
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

                      {job.aiMatch && (
                        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-cyan-100 mb-2">
                            <Brain className="w-4 h-4" />
                            AI match insight
                          </div>
                          <p className="text-sm text-white/75 mb-3">{job.aiMatch.reason}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {getPillarsForSkills(job.aiMatch.matchingSkills).map((pillar) => (
                              <Badge key={pillar.category} variant="default" size="sm">
                                {pillar.shortLabel}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {job.aiMatch.matchingSkills.map((skill) => (
                              <Badge key={skill} variant="primary" size="sm">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          {job.aiMatch.gaps.length > 0 && (
                            <div className="text-xs text-white/55">
                              Skill gaps to address: {job.aiMatch.gaps.join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-sm font-medium text-white mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill) => (
                            <Badge
                              key={skill}
                              variant={userSkills.some((userSkill) => skillsLooselyMatch(userSkill, skill)) ? 'primary' : 'default'}
                              size="sm"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 md:w-48">
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
                              return
                            }

                            setChatInput(`How should I position myself for the ${job.title} role at ${job.company.name}?`)
                          }}
                        >
                          Ask AI About Fit
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
              <p className="text-white/60">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

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
                <div className="text-4xl font-bold text-white mb-2">{jobs.length}</div>
                <div className="text-white/60">Active Jobs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">{aiMatches.filter((match) => match.recommended).length}</div>
                <div className="text-white/60">AI Recommendations</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">
                  {Math.round(aiMatches.reduce((sum, match) => sum + match.matchScore, 0) / Math.max(aiMatches.length, 1)) || 0}%
                </div>
                <div className="text-white/60">Average AI Fit</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppPageShell>
  )
}
