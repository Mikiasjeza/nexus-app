'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User, Skill } from '@/lib/types'
import { Share2, Download } from 'lucide-react'
import Loader from '@/components/UI/Loader'
import { LEVEL_LABELS } from '@/lib/utils/constants'
import Button from '@/components/UI/Button'
import {
  getSkillPillarDetail,
  normalizeSkillCategory,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

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
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (notFound || !user) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Passport not found"
            rule
            description="This passport is private, or the link is wrong."
          />
        </div>
      </AppPageShell>
    )
  }

  const verified = skills.filter((skill) => skill.verified)
  const claimed = skills.filter((skill) => !skill.verified)
  const verifiedRate = skills.length > 0 ? Math.round((verified.length / skills.length) * 100) : 0
  const pillarCounts = SKILL_PILLAR_DETAILS.map((pillar) => {
    const inPillar = skills.filter(
      (skill) => normalizeSkillCategory(skill.category) === pillar.category
    )
    return {
      label: pillar.shortLabel,
      claimed: inPillar.length,
      verified: inPillar.filter((skill) => skill.verified).length,
    }
  })
  const activePillars = pillarCounts.filter((pillar) => pillar.claimed > 0).length
  const profileUrl = printOrigin && shareableId ? `${printOrigin}/share/${shareableId}` : ''

  return (
    <AppPageShell>
      <div className="share-passport-print page-shell">
        <PageHeader
          title={user.name}
          rule
          description={
            user.bio ||
            `A Nexus passport: ${verified.length} of ${skills.length} skills checked by AI against real work.`
          }
          actions={
            <div className="no-print flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leftIcon={<Share2 className="size-4" aria-hidden />}
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href)
                  addToast({
                    type: 'success',
                    title: 'Link copied',
                    message: 'Share this passport anywhere.',
                  })
                }}
              >
                Copy link
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Download className="size-4" aria-hidden />}
                onClick={() => window.print()}
              >
                Save as PDF
              </Button>
            </div>
          }
        />

        <dl className="print-card grid grid-cols-2 border-y border-line md:grid-cols-4">
          {[
            { label: 'Verified skills', value: verified.length },
            { label: 'Verified share', value: `${verifiedRate}%` },
            { label: 'Skills listed', value: skills.length },
            { label: 'Pillars', value: `${activePillars}/${SKILL_PILLAR_DETAILS.length}` },
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

        <section aria-labelledby="verified-heading" className="py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="verified-heading" className="text-base font-medium">
              Verified
            </h2>
            <span className="text-sm text-ink-faint">Checked by AI against attached work</span>
          </div>
          {verified.length === 0 ? (
            <p className="mt-6 border-y border-line py-6 text-ink-muted">No verified skills yet.</p>
          ) : (
            <SkillRows skills={verified} />
          )}
        </section>

        {claimed.length > 0 && (
          <section aria-labelledby="claimed-heading" className="pb-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="claimed-heading" className="text-base font-medium">
                Also claimed
              </h2>
              <span className="text-sm text-ink-faint">Listed, not verified yet</span>
            </div>
            <SkillRows skills={claimed} />
          </section>
        )}

        <section
          aria-labelledby="pillars-heading"
          className="share-pillar-grid border-t border-line pt-10"
        >
          <h2 id="pillars-heading" className="text-base font-medium">
            By pillar
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 sm:grid-cols-5">
            {pillarCounts.map((pillar) => (
              <div key={pillar.label} className="border-t border-line py-4">
                <dt className="text-sm text-ink-faint">{pillar.label}</dt>
                <dd className="mt-1">
                  {pillar.claimed === 0
                    ? 'None'
                    : `${pillar.verified} of ${pillar.claimed} verified`}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="print-hide mt-12 text-sm text-ink-faint">
          Verdicts come from Nexus’s AI reading this person’s own evidence.{' '}
          <Link
            href="/how-it-works"
            className="text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            How verification works
          </Link>
        </p>

        <div className="print-only mt-8 space-y-1 border-t border-line pt-4 text-xs text-ink-faint">
          {profileUrl && <p>Public URL: {profileUrl}</p>}
          {exportedAt && <p>Exported: {exportedAt}</p>}
        </div>
      </div>
    </AppPageShell>
  )
}

function SkillRows({ skills }: { skills: Skill[] }) {
  return (
    <ul className="ruled-list mt-6 border-y border-line">
      {skills.map((skill) => (
        <li
          key={skill.id}
          className="print-skill-card grid gap-x-6 gap-y-1 py-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline"
        >
          <span className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-tight">
            {skill.name}
          </span>
          <span className="text-ink-muted">
            {getSkillPillarDetail(normalizeSkillCategory(skill.category)).shortLabel} ·{' '}
            {LEVEL_LABELS[skill.level]}
          </span>
          <span
            className={`text-sm md:text-right ${skill.verified ? 'text-verified' : 'text-ink-faint'}`}
          >
            {skill.verified ? 'Verified' : 'Not verified yet'}
          </span>
          {skill.description && (
            <p className="text-sm leading-relaxed text-ink-muted md:col-span-3">
              {skill.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
