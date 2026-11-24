/**
 * Career+ analysis: pure functions (no database, no AI) so they can be
 * tested directly. The service layer feeds them a person's skills, their
 * credentials and the skills open job listings ask for.
 */

import { skillsLooselyMatch } from '@/lib/skills-taxonomy'
import { ASSESSMENTS } from '@/lib/assessments/catalog'
import { CAREER_ROLES, type CareerRole } from './roles'

export interface CareerSkill {
  name: string
  level: string // 'beginner' | 'intermediate' | 'advanced' | 'expert'
  verified: boolean
}

const LEVEL_WEIGHT: Record<string, number> = {
  beginner: 0.25,
  intermediate: 0.5,
  advanced: 0.75,
  expert: 1,
}

/**
 * How much a skill counts toward a role, 0 to 1. A claimed skill counts for
 * part of its level; a verified one (AI-checked evidence or a passed
 * assessment) counts in full.
 */
export function skillStrength(skill: CareerSkill): number {
  const level = LEVEL_WEIGHT[skill.level] ?? 0.25
  return skill.verified ? level : level * 0.6
}

function findSkill(skills: CareerSkill[], wanted: string): CareerSkill | undefined {
  let best: CareerSkill | undefined
  for (const skill of skills) {
    if (
      skillsLooselyMatch(skill.name, wanted) &&
      (!best || skillStrength(skill) > skillStrength(best))
    ) {
      best = skill
    }
  }
  return best
}

export interface RequirementStatus {
  skill: string
  importance: 'core' | 'plus'
  /** What the person has that matches, if anything. */
  have: CareerSkill | null
  /** 'strong' verified at advanced+, 'ok' has it, 'weak' only beginner or unverified beginner, 'missing'. */
  status: 'strong' | 'ok' | 'weak' | 'missing'
}

export interface RoleMatch {
  role: CareerRole
  /** 0-100: how ready the person is for this role. */
  score: number
  requirements: RequirementStatus[]
}

function statusOf(skill: CareerSkill | undefined): RequirementStatus['status'] {
  if (!skill) return 'missing'
  const strength = skillStrength(skill)
  if (skill.verified && strength >= 0.75) return 'strong'
  if (strength >= 0.3) return 'ok'
  return 'weak'
}

export function matchRole(role: CareerRole, skills: CareerSkill[]): RoleMatch {
  const requirements: RequirementStatus[] = [
    ...role.core.map((skill) => ({ skill, importance: 'core' as const })),
    ...role.plus.map((skill) => ({ skill, importance: 'plus' as const })),
  ].map(({ skill, importance }) => {
    const have = findSkill(skills, skill)
    return { skill, importance, have: have ?? null, status: statusOf(have) }
  })

  const part = (importance: 'core' | 'plus') => {
    const items = requirements.filter((r) => r.importance === importance)
    if (items.length === 0) return 0
    return items.reduce((sum, r) => sum + (r.have ? skillStrength(r.have) : 0), 0) / items.length
  }
  const score = Math.round((part('core') * 0.75 + part('plus') * 0.25) * 100)
  return { role, score, requirements }
}

/** The roles the person is closest to, best first. Roles with no overlap at all are left out. */
export function recommendRoles(skills: CareerSkill[], limit = 3): RoleMatch[] {
  return CAREER_ROLES.map((role) => matchRole(role, skills))
    .filter((match) => match.requirements.some((r) => r.have))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export interface SkillGap {
  skill: string
  importance: 'core' | 'plus'
  status: 'missing' | 'weak' | 'unverified'
  /** Higher means fix this first. */
  priority: number
  /** How many open job listings on Nexus ask for it. */
  demand: number
}

/**
 * What stands between the person and a role, most important first: missing
 * core skills, then weak or unverified ones, then nice-to-haves. Listings
 * that ask for a skill often push it up.
 */
export function skillGaps(match: RoleMatch, demand: Map<string, number> = new Map()): SkillGap[] {
  const gaps: SkillGap[] = []
  for (const r of match.requirements) {
    let status: SkillGap['status'] | null = null
    if (r.status === 'missing') status = 'missing'
    else if (r.status === 'weak') status = 'weak'
    else if (r.have && !r.have.verified) status = 'unverified'
    if (!status) continue
    const base = { missing: 3, weak: 2, unverified: 1 }[status]
    const asked = demandFor(r.skill, demand)
    gaps.push({
      skill: r.skill,
      importance: r.importance,
      status,
      priority: base * (r.importance === 'core' ? 2 : 1) + Math.min(asked, 5) * 0.2,
      demand: asked,
    })
  }
  return gaps.sort((a, b) => b.priority - a.priority)
}

function demandFor(skill: string, demand: Map<string, number>): number {
  let total = 0
  demand.forEach((count, name) => {
    if (skillsLooselyMatch(name, skill)) total += count
  })
  return total
}

/** How often each skill appears across open job listings. */
export function skillDemand(jobSkillLists: string[][]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const list of jobSkillLists) {
    const seen = new Set<string>()
    for (const raw of list) {
      const name = raw.trim()
      const key = name.toLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      const existing = Array.from(counts.keys()).find((k) => k.toLowerCase() === key)
      counts.set(existing ?? name, (counts.get(existing ?? name) ?? 0) + 1)
    }
  }
  return counts
}

export interface MarketInsight {
  skill: string
  listings: number
  youHave: boolean
  verified: boolean
}

/** The skills employers ask for most, and whether the person has each. */
export function marketInsights(
  skills: CareerSkill[],
  demand: Map<string, number>,
  limit = 10
): MarketInsight[] {
  return Array.from(demand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([skill, listings]) => {
      const have = findSkill(skills, skill)
      return { skill, listings, youHave: Boolean(have), verified: Boolean(have?.verified) }
    })
}

export interface PlanStep {
  skill: string
  action: 'add' | 'level_up' | 'verify'
  title: string
  detail: string
  /** A Nexus assessment that proves this skill, when there is one. */
  assessment: { slug: string; title: string } | null
}

/** A step-by-step plan to close the top gaps for a role. */
export function learningPlan(gaps: SkillGap[], limit = 6): PlanStep[] {
  return gaps.slice(0, limit).map((gap) => {
    const test = ASSESSMENTS.find((a) => skillsLooselyMatch(a.skillName, gap.skill))
    const assessment = test ? { slug: test.slug, title: test.title } : null
    if (gap.status === 'missing') {
      return {
        skill: gap.skill,
        action: 'add',
        title: `Learn ${gap.skill}`,
        detail: `Build one small project that uses ${gap.skill}, then add it to your passport with that project as evidence.`,
        assessment,
      }
    }
    if (gap.status === 'weak') {
      return {
        skill: gap.skill,
        action: 'level_up',
        title: `Grow your ${gap.skill}`,
        detail: `You're at beginner level. Take on a harder piece of work with ${gap.skill} and add it as new evidence to move up a level.`,
        assessment,
      }
    }
    return {
      skill: gap.skill,
      action: 'verify',
      title: `Verify ${gap.skill}`,
      detail: assessment
        ? `Employers trust verified skills more. Take the ${assessment.title} assessment to prove it.`
        : `Employers trust verified skills more. Add evidence (a project, link or file) and run AI verification.`,
      assessment,
    }
  })
}
