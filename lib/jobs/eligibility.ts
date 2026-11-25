/**
 * Job eligibility and relevance. Pure functions: no database, no AI.
 *
 * Eligibility looks at what a posting states (education, experience,
 * certifications, skills, job type, location, work authorization) and says,
 * for each, met / not met / unknown / equivalent may be accepted. It never
 * guesses: unstated requirements are "unknown". Work authorization is shown
 * as stated but never used to rank or exclude, and no sensitive personal
 * characteristics are used at all.
 *
 * Relevance is a separate weighted score (0-100) for ordering. It is NOT a
 * probability of being hired. Initial weights: 45% verified skills, 25%
 * education and experience, 15% career goals, 10% location and work
 * preferences, 5% other preferences.
 */

import { skillsLooselyMatch } from '@/lib/skills-taxonomy'
import type { JobRequirements } from './enrich'

export const WEIGHTS = { skills: 0.45, background: 0.25, goals: 0.15, location: 0.1, other: 0.05 }

export type Status = 'met' | 'not_met' | 'unknown' | 'equivalent'
export interface Check {
  status: Status
  detail: string
}

export interface CandidateProfile {
  skills: { name: string; verified: boolean }[]
  education: { level: string; status: string; fieldOfStudy: string | null }[]
  experience: {
    startDate: Date | null
    endDate: Date | null
    current: boolean
    employmentType: string
  }[]
  certifications: { name: string }[]
  yearsExperience: number | null
  desiredTitles: string[]
  targetCareer: string | null
  interests: string[]
  locations: string[]
  workArrangements: string[]
  jobTypes: string[]
  experienceLevels: string[]
  willingToRelocate: boolean | null
  salaryMin: number | null
  currentlyStudent: boolean | null
}

export interface MatchJob {
  title: string
  company: string
  location: string | null
  remote: boolean
  employmentType: string | null
  experienceLevel: string | null
  salaryMin: number | null
  salaryMax: number | null
  skills: string[]
  requirements: JobRequirements | null
}

const RANK: Record<string, number> = {
  high_school: 1,
  ged: 1,
  trade: 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  doctorate: 5,
}
const DEGREE_LABEL: Record<string, string> = {
  high_school: 'a high school diploma',
  associate: 'an associate degree',
  bachelor: "a bachelor's degree",
  master: "a master's degree",
  doctorate: 'a doctorate',
}

/** Years of experience: what they told us, or the span of jobs they listed. */
export function experienceYears(p: CandidateProfile, now = new Date()): number | null {
  if (p.yearsExperience != null) return p.yearsExperience
  const dated = p.experience.filter((x) => x.startDate && x.employmentType !== 'volunteer')
  if (dated.length === 0) return null
  const months = dated.reduce((sum, x) => {
    const end = x.current || !x.endDate ? now : x.endDate
    return sum + Math.max(0, (end.getTime() - x.startDate!.getTime()) / (30.44 * 86_400_000))
  }, 0)
  return Math.round((months / 12) * 10) / 10
}

export function checkEducation(p: CandidateProfile, req: JobRequirements | null): Check {
  const need = req?.education
  if (!need)
    return { status: 'unknown', detail: 'The posting does not state an education requirement.' }
  const completed = Math.max(
    0,
    ...p.education.filter((e) => e.status === 'completed').map((e) => RANK[e.level] ?? 0)
  )
  const inProgress = p.education.find(
    (e) => e.status === 'in_progress' && (RANK[e.level] ?? 0) >= RANK[need]
  )
  const label = DEGREE_LABEL[need] ?? need
  if (completed >= RANK[need])
    return { status: 'met', detail: `Asks for ${label}; you have completed one.` }
  if (req.educationPreferred) {
    return {
      status: 'equivalent',
      detail: `${label[0].toUpperCase()}${label.slice(1)} is preferred, not required.`,
    }
  }
  if (req.equivalentAccepted) {
    return { status: 'equivalent', detail: `Asks for ${label} or equivalent experience.` }
  }
  if (p.education.length === 0) {
    return { status: 'unknown', detail: `Asks for ${label}. Add your education to check this.` }
  }
  if (inProgress) {
    return {
      status: 'not_met',
      detail: `Asks for ${label}; yours is in progress, not yet completed.`,
    }
  }
  return { status: 'not_met', detail: `Asks for ${label}.` }
}

export function checkExperience(p: CandidateProfile, req: JobRequirements | null): Check {
  const need = req?.minYears
  if (need == null)
    return { status: 'unknown', detail: 'The posting does not state years of experience.' }
  const have = experienceYears(p)
  if (have == null)
    return {
      status: 'unknown',
      detail: `Asks for ${need}+ years. Add your experience to check this.`,
    }
  if (have >= need)
    return { status: 'met', detail: `Asks for ${need}+ years; you have about ${have}.` }
  if (req?.equivalentAccepted) {
    return {
      status: 'equivalent',
      detail: `Asks for ${need}+ years (you have about ${have}); equivalent experience may count.`,
    }
  }
  return { status: 'not_met', detail: `Asks for ${need}+ years; you have about ${have}.` }
}

export function checkCertifications(p: CandidateProfile, req: JobRequirements | null): Check {
  const named = req?.certifications ?? []
  if (named.length === 0) return { status: 'unknown', detail: 'No certifications are named.' }
  const held = named.filter((c) =>
    p.certifications.some((h) => h.name.toLowerCase().includes(c.toLowerCase()))
  )
  if (held.length === named.length)
    return {
      status: 'met',
      detail: `Names ${named.join(', ')}; you have ${held.length === 1 ? 'it' : 'them'}.`,
    }
  const missing = named.filter((c) => !held.includes(c))
  return {
    status: 'not_met',
    detail: `Mentions ${missing.join(', ')} (may be required or preferred; check the posting).`,
  }
}

export interface SkillMatch {
  verified: string[]
  selfReported: string[]
  missing: string[]
}

export function matchSkills(p: CandidateProfile, jobSkills: string[]): SkillMatch {
  const out: SkillMatch = { verified: [], selfReported: [], missing: [] }
  for (const s of jobSkills) {
    const mine = p.skills.filter((m) => skillsLooselyMatch(m.name, s))
    if (mine.some((m) => m.verified)) out.verified.push(s)
    else if (mine.length) out.selfReported.push(s)
    else out.missing.push(s)
  }
  return out
}

export function checkSkills(m: SkillMatch): Check {
  const total = m.verified.length + m.selfReported.length + m.missing.length
  if (total === 0) return { status: 'unknown', detail: 'No specific skills are named.' }
  const have = m.verified.length + m.selfReported.length
  const detail = `You have ${have} of ${total} named skills (${m.verified.length} verified).`
  return { status: have / total >= 0.5 ? 'met' : 'not_met', detail }
}

export function checkJobType(p: CandidateProfile, job: MatchJob): Check {
  if (!job.employmentType) return { status: 'unknown', detail: 'Job type is not stated.' }
  if (p.jobTypes.length === 0)
    return { status: 'unknown', detail: 'Set job types in your preferences.' }
  return p.jobTypes.includes(job.employmentType)
    ? { status: 'met', detail: `${job.employmentType} matches your preferences.` }
    : { status: 'not_met', detail: `${job.employmentType}, which is not in your preferences.` }
}

export function checkLocation(p: CandidateProfile, job: MatchJob): Check {
  if (job.remote) {
    return p.workArrangements.length === 0 || p.workArrangements.includes('remote')
      ? { status: 'met', detail: 'Remote.' }
      : { status: 'not_met', detail: 'Remote, but you prefer hybrid or in person.' }
  }
  if (!job.location) return { status: 'unknown', detail: 'Location is not stated.' }
  if (p.locations.length === 0)
    return { status: 'unknown', detail: 'Set preferred locations to check this.' }
  const loc = job.location.toLowerCase()
  if (p.locations.some((l) => loc.includes(l.toLowerCase().split(',')[0].trim()))) {
    return { status: 'met', detail: `${job.location} is one of your locations.` }
  }
  if (p.willingToRelocate)
    return { status: 'met', detail: `${job.location}; you are open to relocating.` }
  return { status: 'not_met', detail: `${job.location} is outside your preferred locations.` }
}

export function checkWorkAuthorization(req: JobRequirements | null): Check | null {
  // Shown so people can see it, never used for ranking or exclusion.
  return req?.workAuthorization
    ? { status: 'unknown', detail: `The posting states: “${req.workAuthorization}”` }
    : null
}

const score = (s: Status) => ({ met: 1, equivalent: 0.7, unknown: 0.5, not_met: 0 })[s]

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'senior', 'junior'].includes(w))

function goalFit(p: CandidateProfile, job: MatchJob): number {
  const titleWords = new Set(words(job.title))
  const targets = [...p.desiredTitles, p.targetCareer ?? ''].filter(Boolean)
  if (targets.some((t) => words(t).length && words(t).every((w) => titleWords.has(w)))) return 1
  if (targets.some((t) => words(t).some((w) => titleWords.has(w)))) return 0.6
  const hay = `${job.title} ${job.company}`.toLowerCase()
  if (p.interests.some((i) => words(i).some((w) => hay.includes(w)))) return 0.4
  return targets.length || p.interests.length ? 0 : 0.5
}

export type Section = 'qualified' | 'growth' | 'early'

export interface MatchResult {
  relevance: number
  checks: {
    education: Check
    experience: Check
    certifications: Check
    skills: Check
    jobType: Check
    location: Check
    workAuthorization: Check | null
  }
  skills: SkillMatch
  qualified: boolean
  early: boolean
  goalFit: number
  explanation: string
}

const EARLY_LEVELS = new Set(['internship', 'entry'])

export function evaluate(p: CandidateProfile, job: MatchJob): MatchResult {
  const req = job.requirements
  const skills = matchSkills(p, job.skills)
  const checks = {
    education: checkEducation(p, req),
    experience: checkExperience(p, req),
    certifications: checkCertifications(p, req),
    skills: checkSkills(skills),
    jobType: checkJobType(p, job),
    location: checkLocation(p, job),
    workAuthorization: checkWorkAuthorization(req),
  }

  const totalSkills = job.skills.length
  const skillScore = totalSkills
    ? (skills.verified.length + 0.4 * skills.selfReported.length) / totalSkills
    : 0.3
  const background = (score(checks.education.status) + score(checks.experience.status)) / 2
  const goals = goalFit(p, job)
  const location = (score(checks.location.status) + score(checks.jobType.status)) / 2
  const salaryOk =
    p.salaryMin == null || job.salaryMax == null ? 0.5 : job.salaryMax >= p.salaryMin ? 1 : 0
  const levelOk =
    p.experienceLevels.length === 0 || !job.experienceLevel
      ? 0.5
      : p.experienceLevels.includes(job.experienceLevel)
        ? 1
        : 0
  const other = (salaryOk + levelOk) / 2

  const relevance = Math.round(
    100 *
      (WEIGHTS.skills * skillScore +
        WEIGHTS.background * background +
        WEIGHTS.goals * goals +
        WEIGHTS.location * location +
        WEIGHTS.other * other)
  )

  // Mandatory checks only: unknowns don't exclude, and "equivalent" counts.
  const qualified =
    checks.education.status !== 'not_met' &&
    checks.experience.status !== 'not_met' &&
    checks.certifications.status !== 'not_met' &&
    checks.skills.status !== 'not_met'

  return {
    relevance,
    checks,
    skills,
    qualified,
    early: EARLY_LEVELS.has(job.experienceLevel ?? '') || job.employmentType === 'internship',
    goalFit: goals,
    explanation: explain(job, checks, skills, goals),
  }
}

/** A short, factual explanation built only from the checks above. */
function explain(job: MatchJob, c: MatchResult['checks'], s: SkillMatch, goals: number): string {
  const parts: string[] = []
  if (s.verified.length)
    parts.push(`You've verified ${s.verified.slice(0, 3).join(', ')}, which this role asks for.`)
  else if (s.selfReported.length)
    parts.push(
      `You list ${s.selfReported.slice(0, 3).join(', ')}, which this role asks for (not yet verified).`
    )
  if (goals >= 0.6) parts.push('It lines up with the roles you said you want.')
  if (c.education.status === 'met' || c.experience.status === 'met') {
    parts.push(
      [c.education, c.experience]
        .filter((x) => x.status === 'met')
        .map((x) => x.detail)
        .join(' ')
    )
  }
  const gaps = [c.education, c.experience, c.certifications].filter((x) => x.status === 'not_met')
  if (gaps.length) parts.push(`Still needed: ${gaps.map((g) => g.detail).join(' ')}`)
  if (s.missing.length)
    parts.push(`Skills you haven't shown yet: ${s.missing.slice(0, 4).join(', ')}.`)
  if (parts.length === 0)
    parts.push(`Shown because of your preferences; the posting gives few details.`)
  return parts.join(' ')
}

/** Which marketplace section a job belongs in for this person, if any. */
export function sectionOf(p: CandidateProfile, r: MatchResult): Section[] {
  const out: Section[] = []
  if (r.qualified && r.relevance >= 35) out.push('qualified')
  if (
    !r.qualified &&
    (r.goalFit >= 0.6 || r.skills.verified.length + r.skills.selfReported.length > 0)
  )
    out.push('growth')
  const earlyCareer =
    p.currentlyStudent === true ||
    (experienceYears(p) ?? 0) <= 2 ||
    p.experienceLevels.some((l) => EARLY_LEVELS.has(l))
  if (r.early && earlyCareer) out.push('early')
  return out
}
