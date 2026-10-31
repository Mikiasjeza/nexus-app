/**
 * Builds the candidate dashboard from raw rows: the next step to take, how
 * many skills are verified (now and over the last 12 weeks), verified share
 * per pillar, the latest AI checks and an activity timeline.
 *
 * Pure so it can be tested and reused for the guest preview; the API route
 * only loads rows and calls `buildDashboardSummary`.
 */

import { normalizeSkillCategory, SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
/** Weekly points on the verified-skills chart. */
const GROWTH_WEEKS = 12
/** How far back the activity calendar reaches (a full year of weeks plus the current one). */
export const ACTIVITY_WINDOW_MS = 53 * WEEK_MS
const RECENT_CHECKS = 4
const MAX_STEPS = 3
/** An activity this close to a check on the same skill was written by that check. */
const SAME_EVENT_MS = 60_000

export type DashboardSkillRow = {
  id: string
  name: string
  category: string
  verified: boolean
  createdAt: Date
}

export type DashboardAnalysisRow = {
  id: string
  skillId: string
  /** 0–1, as stored. */
  confidenceScore: number
  improvements: string[]
  createdAt: Date
}

/** One change to a skill's verified flag (from SkillHistory). */
export type VerifiedChangeRow = {
  skillId: string
  timestamp: Date
  oldValue: boolean
  newValue: boolean
}

export type DashboardActivityRow = {
  skillId: string | null
  timestamp: Date
}

export type DashboardInput = {
  now: Date
  skills: DashboardSkillRow[]
  /** Newest first. */
  analyses: DashboardAnalysisRow[]
  verifiedChanges: VerifiedChangeRow[]
  activities: DashboardActivityRow[]
}

export type NextStep = {
  kind: 'add-skill' | 'add-proof' | 'first-check' | 'share'
  skillId?: string
  title: string
  /** The concrete thing to do, when the AI named one. */
  lead?: string
  detail: string
  action: { label: string; href: string }
}

export type DashboardSummary = {
  totals: { claimed: number; verified: number }
  pillars: { label: string; claimed: number; verified: number }[]
  verifiedOverTime: { date: string; verified: number }[]
  recentChecks: {
    id: string
    skillId: string
    skillName: string
    /** 0–100. */
    confidence: number
    /** Whether the skill was verified straight after this check. */
    verified: boolean
    createdAt: string
  }[]
  /** One timestamp per check run or change made, oldest first, within the activity window. */
  activity: string[]
  steps: NextStep[]
}

/** Reads `{ field: 'verified', oldValue, newValue }` entries out of a SkillHistory `changes` value. */
export function verifiedChangesFromHistory(
  rows: { skillId: string; timestamp: Date; changes: unknown }[]
): VerifiedChangeRow[] {
  const result: VerifiedChangeRow[] = []
  for (const row of rows) {
    if (!Array.isArray(row.changes)) continue
    for (const change of row.changes) {
      if (
        change &&
        typeof change === 'object' &&
        (change as { field?: unknown }).field === 'verified' &&
        typeof (change as { newValue?: unknown }).newValue === 'boolean'
      ) {
        const { oldValue, newValue } = change as { oldValue?: unknown; newValue: boolean }
        result.push({
          skillId: row.skillId,
          timestamp: row.timestamp,
          oldValue: typeof oldValue === 'boolean' ? oldValue : !newValue,
          newValue,
        })
      }
    }
  }
  return result
}

/**
 * Whether a skill was verified at `time`. Works backwards from today's flag:
 * if the flag changed after `time`, the first such change tells us what it was.
 */
function verifiedAt(
  skill: DashboardSkillRow,
  changesBySkill: Map<string, VerifiedChangeRow[]>,
  time: number
): boolean {
  if (skill.createdAt.getTime() > time) return false
  const later = changesBySkill.get(skill.id)?.find((change) => change.timestamp.getTime() > time)
  return later ? later.oldValue : skill.verified
}

function sentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

export function buildDashboardSummary(input: DashboardInput): DashboardSummary {
  const now = input.now.getTime()
  const skillsById = new Map(input.skills.map((skill) => [skill.id, skill]))

  const changesBySkill = new Map<string, VerifiedChangeRow[]>()
  for (const change of [...input.verifiedChanges].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )) {
    const list = changesBySkill.get(change.skillId) ?? []
    list.push(change)
    changesBySkill.set(change.skillId, list)
  }

  const analyses = input.analyses.filter((analysis) => skillsById.has(analysis.skillId))
  const latestCheck = new Map<string, DashboardAnalysisRow>()
  for (const analysis of analyses) {
    const current = latestCheck.get(analysis.skillId)
    if (!current || analysis.createdAt > current.createdAt) {
      latestCheck.set(analysis.skillId, analysis)
    }
  }

  const verifiedCount = input.skills.filter((skill) => skill.verified).length

  const pillars = SKILL_PILLAR_DETAILS.map((pillar) => {
    const inPillar = input.skills.filter(
      (skill) => normalizeSkillCategory(skill.category) === pillar.category
    )
    return {
      label: pillar.shortLabel,
      claimed: inPillar.length,
      verified: inPillar.filter((skill) => skill.verified).length,
    }
  })

  const verifiedOverTime = Array.from({ length: GROWTH_WEEKS }, (_, i) => {
    const time = now - (GROWTH_WEEKS - 1 - i) * WEEK_MS
    return {
      date: new Date(time).toISOString(),
      verified: input.skills.filter((skill) => verifiedAt(skill, changesBySkill, time)).length,
    }
  })

  const recentChecks = [...analyses]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_CHECKS)
    .map((analysis) => {
      const skill = skillsById.get(analysis.skillId)!
      return {
        id: analysis.id,
        skillId: skill.id,
        skillName: skill.name,
        confidence: Math.round(analysis.confidenceScore * 100),
        // The verified flag is written in the same transaction as the check,
        // so its state a moment later is this check's verdict.
        verified: verifiedAt(skill, changesBySkill, analysis.createdAt.getTime() + SAME_EVENT_MS),
        createdAt: analysis.createdAt.toISOString(),
      }
    })

  const windowStart = now - ACTIVITY_WINDOW_MS
  const checkTimes = analyses
    .map((analysis) => analysis.createdAt.getTime())
    .filter((time) => time >= windowStart && time <= now)
  const changeTimes = input.activities
    .filter((activity) => {
      const time = activity.timestamp.getTime()
      if (time < windowStart || time > now) return false
      // Verifying a skill also logs an activity; count that check once.
      return !analyses.some(
        (analysis) =>
          analysis.skillId === activity.skillId &&
          Math.abs(analysis.createdAt.getTime() - time) < SAME_EVENT_MS
      )
    })
    .map((activity) => activity.timestamp.getTime())
  const activity = [...checkTimes, ...changeTimes]
    .sort((a, b) => a - b)
    .map((time) => new Date(time).toISOString())

  return {
    totals: { claimed: input.skills.length, verified: verifiedCount },
    pillars,
    verifiedOverTime,
    recentChecks,
    activity,
    steps: buildSteps(input.skills, latestCheck),
  }
}

function buildSteps(
  skills: DashboardSkillRow[],
  latestCheck: Map<string, DashboardAnalysisRow>
): NextStep[] {
  if (skills.length === 0) {
    return [
      {
        kind: 'add-skill',
        title: 'Add your first skill',
        detail:
          'Pick something you can show real work for. You add proof next, and the AI checks it against the level you claim.',
        action: { label: 'Add a skill', href: '/skills' },
      },
    ]
  }

  const unverified = skills.filter((skill) => !skill.verified)

  // Checked but not verified: the AI said what was missing, so lead with that.
  const needsProof: NextStep[] = unverified
    .filter((skill) => latestCheck.has(skill.id))
    .sort(
      (a, b) =>
        latestCheck.get(b.id)!.createdAt.getTime() - latestCheck.get(a.id)!.createdAt.getTime()
    )
    .map((skill) => {
      const check = latestCheck.get(skill.id)!
      const suggestion = check.improvements.find((item) => item.trim())
      return {
        kind: 'add-proof',
        skillId: skill.id,
        title: `Add proof to ${skill.name}`,
        lead: suggestion ? sentence(suggestion) : undefined,
        detail: `The last check came back at ${Math.round(check.confidenceScore * 100)}% confidence, which isn't enough to verify it yet. Add the work it asked for and check again.`,
        action: { label: 'Add proof', href: `/verification?skill=${skill.id}` },
      }
    })

  // Never checked: newest first, since that's what the person is thinking about.
  const firstChecks: NextStep[] = unverified
    .filter((skill) => !latestCheck.has(skill.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((skill) => ({
      kind: 'first-check',
      skillId: skill.id,
      title: `Check your ${skill.name} skill`,
      detail:
        'Attach something you made or did that shows it. The AI reads it and tells you whether it backs up the level you claimed.',
      action: { label: 'Start a check', href: `/verification?skill=${skill.id}` },
    }))

  const steps = [...needsProof, ...firstChecks].slice(0, MAX_STEPS)
  if (steps.length > 0) return steps

  return [
    {
      kind: 'share',
      title: 'Share your passport',
      detail: `All ${skills.length} of your skills are verified. Send your public passport to an employer, or add the next skill you want proof for.`,
      action: { label: 'Get your link', href: '/settings' },
    },
  ]
}
