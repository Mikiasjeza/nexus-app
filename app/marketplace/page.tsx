'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ExternalLink, Send, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { useSkills } from '@/lib/hooks/useSkills'
import { aiApi, authApi } from '@/lib/api'
import { skillsLooselyMatch, SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import type { AIJobMatchItem } from '@/lib/api/ai'
import type { SkillCategory, User } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

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
      content:
        'Ask me which roles fit your strongest pillars, which gaps matter most, or how to position yourself for a better match.',
      prompts: [
        'Which pillar is strongest for me?',
        'What role should I target next?',
        'How can I improve my match score?',
      ],
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
          fetch('/api/jobs', { credentials: 'include' })
            .then((response) => response.json())
            .catch(() => ({ jobs: [] })),
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

    aiApi
      .getJobMatches()
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
                userSkills.some((userSkill) => skillsLooselyMatch(userSkill, skill))
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
    return skills.reduce(
      (acc, skill) => {
        acc[skill.category] = (acc[skill.category] ?? 0) + 1
        return acc
      },
      {} as Record<SkillCategory, number>
    )
  }, [skills])

  const topPillars = useMemo(() => {
    return SKILL_PILLAR_DETAILS.map((pillar) => ({
      ...pillar,
      count: userPillarCounts[pillar.category] ?? 0,
      color: CATEGORY_COLORS[pillar.category],
    })).sort((a, b) => b.count - a.count)
  }, [userPillarCounts])

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

  const latestAssistantPrompts =
    [...chatMessages].reverse().find((message) => message.role === 'assistant')?.prompts || []

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
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  const strongestPillars = topPillars.filter((pillar) => pillar.count > 0).slice(0, 2)
  const averageFit =
    Math.round(
      aiMatches.reduce((sum, match) => sum + match.matchScore, 0) / Math.max(aiMatches.length, 1)
    ) || 0

  return (
    <AppPageShell>
      <div className="page-shell">
        {(isGuestPreview || !user) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-ink-muted">
              AI matches are shown as a preview. Applying and saving jobs needs an account.
            </p>
            <Link
              href={user ? '/auth/register' : '/auth/login?next=/marketplace'}
              className="pill"
              data-active="true"
            >
              {user ? 'Create account' : 'Sign in'}
            </Link>
          </div>
        )}

        <PageHeader
          title="Marketplace"
          rule
          description={
            strongestPillars.length > 0
              ? `Open roles ranked against your skills. Your strongest pillars right now: ${strongestPillars.map((p) => p.shortLabel).join(' and ')}.`
              : 'Open roles ranked against your skills, with the reasons for each match.'
          }
        />

        <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
          {[
            { label: 'Open roles', value: jobs.length },
            { label: 'AI matches', value: aiMatches.length },
            { label: 'Average AI fit', value: `${averageFit}%` },
            { label: 'Your skills', value: userSkills.length },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`py-8 ${i % 2 === 1 ? 'pl-6' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i > 0 ? 'md:border-l md:border-line md:pl-8' : ''}`}
            >
              <dt className="text-sm text-ink-faint">{stat.label}</dt>
              <dd className="display-number mt-3 text-[clamp(2.5rem,4vw,3.5rem)] leading-none">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
          <section aria-labelledby="best-fit-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="best-fit-heading" className="text-base font-medium">
                  Best fit right now
                </h2>
                <p className="mt-1 max-w-[34rem] text-sm text-ink-muted">
                  {aiSummary ||
                    'The AI compares your skills and their proof against every open role.'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
                onClick={() => {
                  if (!user) {
                    promptSignIn()
                    return
                  }
                  setAiLoading(true)
                  aiApi
                    .getJobMatches()
                    .then((response) => {
                      setAiSummary(response.data.summary)
                      setAiMatches(response.data.matches)
                    })
                    .finally(() => setAiLoading(false))
                }}
                disabled={aiLoading}
              >
                {aiLoading ? 'Refreshing' : 'Refresh'}
              </Button>
            </div>

            {aiMatches.length === 0 ? (
              <p className="mt-6 border-y border-line py-6 text-sm text-ink-muted">
                {user
                  ? 'No matches yet. Add skills, or check back when more roles are open.'
                  : 'Sign in to see roles ranked against your own skills.'}
              </p>
            ) : (
              <ul className="ruled-list mt-6 border-y border-line">
                {aiMatches.slice(0, 3).map((match) => (
                  <li key={match.jobId} className="py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="font-medium">{match.job?.title || 'Recommended role'}</p>
                        <p className="text-sm text-ink-faint">{match.job?.company.name}</p>
                      </div>
                      <span
                        className={`display-number text-3xl leading-none ${match.recommended ? 'text-verified' : ''}`}
                      >
                        {match.matchScore}%
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{match.reason}</p>
                    {match.matchingSkills.length > 0 && (
                      <p className="mt-3 text-sm">
                        <span className="text-ink-faint">You have </span>
                        {match.matchingSkills.join(', ')}
                      </p>
                    )}
                    {match.gaps.length > 0 && (
                      <p className="mt-1 text-sm">
                        <span className="text-ink-faint">Missing </span>
                        {match.gaps.join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="coach-heading" className="flex flex-col">
            <h2 id="coach-heading" className="text-base font-medium">
              Ask what to do next
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Advice based on your pillars, missing proof and the roles you’re closest to.
            </p>

            <div
              className="mt-6 max-h-[22rem] space-y-3 overflow-y-auto pr-1"
              aria-live="polite"
              aria-label="Conversation"
            >
              {chatMessages.map((message, index) => (
                <p
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'assistant'
                      ? 'bg-raised text-ink'
                      : 'ml-auto bg-ink text-ground'
                  }`}
                >
                  {message.content}
                </p>
              ))}
            </div>

            {latestAssistantPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {latestAssistantPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendChat(prompt)}
                    className="pill text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void sendChat(chatInput)
              }}
            >
              <label className="flex-1">
                <span className="sr-only">Your question</span>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask about a role, a missing skill, or your fit"
                  className="metalab-input"
                />
              </label>
              <Button
                type="submit"
                isLoading={chatLoading}
                rightIcon={<Send className="size-4" aria-hidden />}
              >
                Send
              </Button>
            </form>
          </section>
        </div>

        <section aria-labelledby="roles-heading" className="border-t border-line pt-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="roles-heading" className="text-base font-medium">
              All roles <span className="text-ink-faint">{filteredJobs.length}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Job type">
                {['all', 'full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    aria-pressed={selectedType === type}
                    className="pill"
                  >
                    {type === 'all'
                      ? 'All'
                      : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
              <label className="relative">
                <span className="sr-only">Search roles</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Search roles or companies"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="metalab-input !min-h-9 w-64 !py-1.5 pl-9 text-sm"
                />
              </label>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <p className="mt-6 border-y border-line py-12 text-ink-muted">
              No roles match. Try another search or job type.
            </p>
          ) : (
            <ul className="ruled-list mt-6 border-y border-line">
              {filteredJobs.map((job) => (
                <li
                  key={job.id}
                  className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]"
                >
                  <div>
                    <h3 className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-light leading-tight">
                      {job.title}
                    </h3>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                      <Link href={`/company/${job.company.slug}`} className="hover:text-ink">
                        {job.company.name}
                      </Link>
                      {job.location && <span>{job.location}</span>}
                      <span>{job.type.replace('-', ' ')}</span>
                      {job.salary && <span>{job.salary}</span>}
                      <span className="text-ink-faint">Posted {job.posted}</span>
                    </p>
                  </div>

                  <div className="text-sm">
                    {job.aiMatch?.reason && (
                      <p className="leading-relaxed text-ink-muted">{job.aiMatch.reason}</p>
                    )}
                    {job.skills.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Required skills">
                        {job.skills.map((skill) => {
                          const has = userSkills.some((userSkill) =>
                            skillsLooselyMatch(userSkill, skill)
                          )
                          return (
                            <li
                              key={skill}
                              className={`rounded-full px-2.5 py-0.5 text-xs ${has ? 'bg-verified-wash text-verified-ink' : 'bg-pill text-ink-muted'}`}
                            >
                              {skill}
                              {has && <span className="sr-only"> (you have this)</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <p className="flex items-baseline gap-2">
                      <span
                        className={`display-number text-4xl leading-none ${job.match >= 85 ? 'text-verified' : ''}`}
                      >
                        {job.match}%
                      </span>
                      <span className="text-sm text-ink-faint">match</span>
                    </p>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        size="sm"
                        rightIcon={<ExternalLink className="size-3.5" aria-hidden />}
                        onClick={() => {
                          if (isGuestPreview || !user) {
                            promptSignIn()
                          }
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (isGuestPreview || !user) {
                            promptSignIn()
                            return
                          }
                          setChatInput(
                            `How should I position myself for the ${job.title} role at ${job.company.name}?`
                          )
                        }}
                      >
                        Ask AI
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppPageShell>
  )
}
