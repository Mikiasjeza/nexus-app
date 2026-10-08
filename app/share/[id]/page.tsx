'use client'

import Link from 'next/link'
import React, { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User, Skill } from '@/lib/types'
import { motion } from 'framer-motion'
import { Globe, User as UserIcon, Share2, Download, CheckCircle2, TrendingUp } from 'lucide-react'
import Loader from '@/components/UI/Loader'
import { CATEGORY_COLORS, LEVEL_COLORS, LEVEL_LABELS } from '@/lib/utils/constants'
import Button from '@/components/UI/Button'
import { cn } from '@/lib/utils/cn'
import { easing } from '@/lib/utils/animations'
import {
  getSkillPillarDetail,
  normalizeSkillCategory,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function SharePage() {
  const { addToast } = useToast()
  const params = useParams()
  const shareableId = params.id as string
  const [user, setUser] = useState<User | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [printOrigin, setPrintOrigin] = useState('')
  const [exportedAt, setExportedAt] = useState('')

  useEffect(() => {
    setPrintOrigin(typeof window !== 'undefined' ? window.location.origin : '')
    setExportedAt(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareableId)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setUser(data.user)
        setSkills(data.skills ?? [])
      } catch (error) {
        console.error('Failed to load profile:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (shareableId) {
      loadData()
    }
  }, [shareableId])

  if (loading) {
    return (
      <AppPageShell className="flex min-h-screen items-center justify-center bg-black" orbs={false}>
        <Loader />
      </AppPageShell>
    )
  }

  if (notFound || !user) {
    return (
      <AppPageShell className="flex min-h-screen items-center justify-center bg-black p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: easing.gentle }}
          className="gradient-border-card max-w-md p-10 text-center"
        >
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Profile not found
          </h1>
          <p className="text-sm leading-relaxed text-white/60">
            This profile is private or does not exist.
          </p>
        </motion.div>
      </AppPageShell>
    )
  }

  const pillarCounts = skills.reduce(
    (acc, skill) => {
      const category = normalizeSkillCategory(skill.category)
      acc[category] = (acc[category] ?? 0) + 1
      return acc
    },
    {} as Record<Skill['category'], number>
  )
  const topPillars = [...SKILL_PILLAR_DETAILS]
    .map((pillar) => ({
      ...pillar,
      count: pillarCounts[pillar.category] ?? 0,
    }))
    .sort((left, right) => right.count - left.count)
  const standoutSkills = [...skills]
    .sort(
      (left, right) =>
        Number(right.verified) - Number(left.verified) || right.progress - left.progress
    )
    .slice(0, 5)
  const verifiedCount = skills.filter((skill) => skill.verified).length
  const verifiedRate = skills.length > 0 ? Math.round((verifiedCount / skills.length) * 100) : 0
  const activePillars = new Set(skills.map((skill) => normalizeSkillCategory(skill.category))).size

  const recruiterSummary = [
    `${verifiedCount} verified skill signals (${verifiedRate}% of listed skills)`,
    `${topPillars[0]?.count ?? 0} skills in the strongest pillar (${topPillars[0]?.shortLabel ?? '—'})`,
    `${standoutSkills.filter((skill) => skill.verified).length} of ${standoutSkills.length} spotlight skills carry verification`,
  ]

  const profileUrl = printOrigin && shareableId ? `${printOrigin}/share/${shareableId}` : ''

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="share-passport-print mx-auto max-w-6xl px-6 py-16 lg:px-12 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing.primary }}
          className="mb-12 lg:mb-16 print-card rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm p-6 lg:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/45 mb-2">
                Recruiter view
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Scan-first summary</h2>
              <p className="mt-2 text-sm text-white/62 max-w-xl leading-relaxed">
                Five-pillar skill passport · {skills.length} skills · {activePillars} pillars active
                · {verifiedRate}% verified coverage
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 print-hide shrink-0">
              <Link
                href={`/share/${encodeURIComponent(shareableId)}`}
                className={cn(
                  'button-base button-secondary min-h-[42px] px-3.5 text-sm text-center rounded-lg'
                )}
              >
                Refresh this view
              </Link>
              <Link
                href="/how-it-works"
                className={cn(
                  'button-base button-secondary min-h-[42px] px-3.5 text-sm text-center rounded-lg'
                )}
              >
                How Nexus verifies skills
              </Link>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Skills listed', value: String(skills.length) },
              { label: 'Verified', value: String(verifiedCount) },
              { label: 'Pillars', value: String(activePillars) },
              {
                label: 'Avg progress',
                value: skills.length
                  ? `${Math.round(skills.reduce((a, s) => a + s.progress, 0) / skills.length)}%`
                  : '—',
              },
            ].map((cell) => (
              <div
                key={cell.label}
                className="rounded-xl border border-white/10 bg-[rgba(6,8,14,0.45)] px-3 py-3 backdrop-blur-sm"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/45">
                  {cell.label}
                </div>
                <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
          <div className="print-only mt-6 pt-4 border-t border-black/15 text-xs text-gray-700 space-y-1">
            {profileUrl && (
              <p>
                <span className="font-semibold">Public URL:</span> {profileUrl}
              </p>
            )}
            {exportedAt && (
              <p>
                <span className="font-semibold">Exported:</span> {exportedAt}
              </p>
            )}
          </div>
        </motion.div>

        {/* Editorial Header - Slower, more deliberate pacing */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.1, ease: easing.primary }}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easing.gentle }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm mb-8"
          >
            <Globe className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white uppercase tracking-wider">
              Public Nexus Profile
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: easing.primary }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]"
          >
            {user.name}
          </motion.h1>

          {user.bio && (
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, delay: 0.3, ease: easing.primary }}
              className="text-lg text-white/62 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              {user.bio}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.35, ease: easing.primary }}
            className="share-pillar-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 max-w-5xl mx-auto mb-12"
          >
            {SKILL_PILLAR_DETAILS.map((pillar) => (
              <div
                key={pillar.category}
                className="rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm px-4 py-4 text-left"
                style={{ boxShadow: `inset 0 0 0 1px ${CATEGORY_COLORS[pillar.category]}20` }}
              >
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  {pillar.shortLabel}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {pillarCounts[pillar.category] ?? 0}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.4, ease: easing.primary }}
            className="no-print flex items-center justify-center gap-4 flex-wrap"
          >
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Share2 className="w-4 h-4" />}
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href)
                addToast({
                  type: 'success',
                  title: 'Profile link copied',
                  message: 'You can now share this public Nexus profile anywhere.',
                })
              }}
            >
              Share Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => {
                window.print()
              }}
            >
              Print / Save PDF
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards - Editorial spacing and pacing */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1, delay: 0.2, ease: easing.gentle }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {[
            {
              icon: UserIcon,
              label: 'Total Skills',
              value: skills.length.toString(),
            },
            {
              icon: CheckCircle2,
              label: 'Verified Skills',
              value: skills.filter((s) => s.verified).length.toString(),
            },
            {
              icon: TrendingUp,
              label: 'Average Progress',
              value:
                skills.length > 0
                  ? Math.round(
                      skills.reduce((sum, s) => sum + s.progress, 0) / skills.length
                    ).toString()
                  : '0',
              suffix: '%',
            },
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 1,
                  delay: 0.4 + index * 0.15,
                  ease: easing.gentle,
                }}
                className="rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm p-8 text-center"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="p-3 rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-white/62 mb-4">
                  {stat.label}
                </h3>
                <p className="text-4xl lg:text-5xl font-bold text-white tracking-tight tabular-nums">
                  {stat.value}
                  {stat.suffix || ''}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, delay: 0.3, ease: easing.gentle }}
          className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 mb-20"
        >
          <div className="print-card rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-white/45 mb-4">
              Recruiter Snapshot
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Fast scan summary</h2>
            <div className="space-y-3">
              {recruiterSummary.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm px-4 py-3 text-sm text-white/72"
                >
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm text-white/55">
              Strongest pillars:{' '}
              {topPillars
                .slice(0, 2)
                .map((pillar) => pillar.shortLabel)
                .join(', ') || 'None yet'}
            </div>
          </div>

          <div className="print-card rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-white/45 mb-4">
              Standout Skills
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Best proof at a glance</h2>
            <div className="space-y-3">
              {standoutSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{skill.name}</div>
                      <div className="mt-1 text-sm text-white/55">
                        {getSkillPillarDetail(normalizeSkillCategory(skill.category)).shortLabel} ·{' '}
                        {LEVEL_LABELS[skill.level]} · {skill.progress}% progress
                      </div>
                    </div>
                    {skill.verified && (
                      <span className="text-xs font-medium text-emerald-300/95">Verified</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Skills Portfolio - Editorial presentation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1.2, ease: easing.gentle }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1, delay: 0.2, ease: easing.gentle }}
            className="text-3xl lg:text-4xl font-bold text-white mb-12 lg:mb-16 tracking-tight"
          >
            Skills Across Five Pillars
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.08,
                  ease: easing.gentle,
                }}
                className="print-skill-card rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-4 tracking-tight">
                      {skill.name}
                    </h3>
                    <div className="flex items-center gap-2.5 mb-6 flex-wrap">
                      <span
                        className="px-3 py-1.5 rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: LEVEL_COLORS[skill.level],
                        }}
                      >
                        {LEVEL_LABELS[skill.level]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-[rgba(6,8,14,0.45)] px-3 py-1.5 text-xs font-medium text-white/65 backdrop-blur-sm">
                        {getSkillPillarDetail(normalizeSkillCategory(skill.category)).shortLabel}:{' '}
                        {normalizeSkillCategory(skill.category)}
                      </span>
                      {skill.verified && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                            delay: 0.5 + index * 0.08,
                          }}
                          className="p-1 rounded-2xl border border-white/10 bg-[rgba(6,8,14,0.45)] backdrop-blur-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar - animates forward */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-white/62 uppercase tracking-wider">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {skill.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-white/10">
                    <motion.div
                      className="h-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${skill.progress}%` }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{
                        duration: 1.5,
                        delay: 0.6 + index * 0.08,
                        ease: easing.gentle,
                      }}
                      style={{
                        backgroundColor: LEVEL_COLORS[skill.level],
                      }}
                    />
                  </div>
                </div>

                {skill.description && (
                  <p className="text-sm text-white/62 leading-relaxed line-clamp-2">
                    {skill.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppPageShell>
  )
}
