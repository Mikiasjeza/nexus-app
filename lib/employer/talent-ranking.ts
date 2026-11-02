/**
 * Ranks candidates for an employer talent search. Shared by the real route and
 * the guest preview, so both read search terms, pillar terms and a target
 * role's requirements the same way.
 */

import type { SkillCategory } from '@/lib/types'
import {
  computeJobRequirementCoverage,
  inferSkillCategory,
  normalizeSkillCategory,
  resolveSkillPillarQuery,
  skillsLooselyMatch,
} from '@/lib/skills-taxonomy'

export interface RankableSkill {
  name: string
  level: string
  verified: boolean
  category: string
}

export interface TalentQuery {
  /** Lower-cased search terms: skill names, or pillar names such as "build". */
  skillNames: string[]
  /** True when the search is for a role; its skills rank candidates first. */
  hasTargetJob: boolean
  /** The target role's required skills; empty when no role is selected. */
  targetJobSkills: string[]
}

/** Split the comma-separated `skills` query parameter into lower-cased terms. */
export function parseTalentTerms(skillsParam: string): string[] {
  return skillsParam
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** The pillars that search terms name, such as "build" or "Technical Skills". */
export function resolvePillarTerms(skillNames: string[]): SkillCategory[] {
  return skillNames
    .map((term) => resolveSkillPillarQuery(term))
    .filter((value): value is SkillCategory => Boolean(value))
}

/** The distinct pillars a role's required skills fall into. */
export function jobPillars(jobSkills: string[]): SkillCategory[] {
  return Array.from(new Set(jobSkills.map((skill) => inferSkillCategory(skill))))
}

/**
 * True when a candidate has a skill a search term names exactly, or a skill
 * in a pillar a term names. With no terms, everyone qualifies.
 */
export function matchesTalentTerms(skills: RankableSkill[], skillNames: string[]): boolean {
  if (skillNames.length === 0) return true
  return skillNames.some((term) => {
    const pillar = resolveSkillPillarQuery(term)
    return skills.some(
      (skill) =>
        skill.name.toLowerCase() === term ||
        (pillar !== null && normalizeSkillCategory(skill.category) === pillar)
    )
  })
}

/** Score candidates against the query, best match first. */
export function rankTalent<T extends { skills: RankableSkill[] }>(
  candidates: T[],
  { skillNames, hasTargetJob, targetJobSkills }: TalentQuery
) {
  const pillarQueries = resolvePillarTerms(skillNames)
  const targetJobPillars = jobPillars(targetJobSkills)

  const scored = candidates.map((candidate) => {
    const normalizedSkills = candidate.skills.map((skill) => ({
      ...skill,
      category: normalizeSkillCategory(skill.category),
    }))
    const userSkillNames = normalizedSkills.map((s) => s.name.toLowerCase())
    const userCategories = normalizedSkills.map((skill) => skill.category)
    const matchedQuerySkills = skillNames.filter((querySkill) =>
      userSkillNames.some((userSkill) => skillsLooselyMatch(userSkill, querySkill))
    )
    const matchedQueryPillars = pillarQueries.filter((pillar) => userCategories.includes(pillar))
    const matchedJobSkills = targetJobSkills.filter((jobSkill) =>
      normalizedSkills.some((userSkill) => skillsLooselyMatch(userSkill.name, jobSkill))
    )
    const matchedJobPillars = targetJobPillars.filter((pillar) => userCategories.includes(pillar))
    const jobRequirementCoverage = computeJobRequirementCoverage(targetJobSkills, normalizedSkills)
    const matchedVerifiedSignals = normalizedSkills.filter((skill) => {
      if (!skill.verified) return false
      return (
        matchedQuerySkills.some((querySkill) => skillsLooselyMatch(skill.name, querySkill)) ||
        matchedJobSkills.some((jobSkill) => skillsLooselyMatch(skill.name, jobSkill))
      )
    }).length

    const querySkillCoverage =
      skillNames.length > 0 ? matchedQuerySkills.length / skillNames.length : 0
    const queryPillarCoverage =
      pillarQueries.length > 0 ? matchedQueryPillars.length / pillarQueries.length : 0
    const jobSkillCoverage =
      targetJobSkills.length > 0 ? matchedJobSkills.length / targetJobSkills.length : 0
    const jobPillarCoverage =
      targetJobPillars.length > 0 ? matchedJobPillars.length / targetJobPillars.length : 0
    const jobRequirementBlend =
      targetJobSkills.length > 0
        ? jobSkillCoverage * 0.62 + jobRequirementCoverage.combinedRatio * 0.38
        : 0
    const verifiedCoverage =
      matchedJobSkills.length + matchedQuerySkills.length > 0
        ? matchedVerifiedSignals / Math.max(1, matchedJobSkills.length + matchedQuerySkills.length)
        : normalizedSkills.filter((skill) => skill.verified).length /
          Math.max(1, normalizedSkills.length)

    let matchScore = 100
    if (hasTargetJob) {
      matchScore =
        jobRequirementBlend * 58 +
        jobPillarCoverage * 22 +
        querySkillCoverage * 10 +
        queryPillarCoverage * 5 +
        Math.min(1, verifiedCoverage) * 5
    } else if (skillNames.length > 0 || pillarQueries.length > 0) {
      matchScore =
        querySkillCoverage * 70 + queryPillarCoverage * 20 + Math.min(1, verifiedCoverage) * 10
    } else {
      const verifiedRatio =
        normalizedSkills.filter((skill) => skill.verified).length /
        Math.max(1, normalizedSkills.length)
      matchScore = Math.min(
        100,
        45 +
          verifiedRatio * 25 +
          Math.min(20, normalizedSkills.length * 4) +
          Math.min(10, userCategories.length * 2)
      )
    }

    return {
      ...candidate,
      skills: normalizedSkills,
      matchedPillars: Array.from(new Set([...matchedQueryPillars, ...matchedJobPillars])),
      matchedVerifiedSignals,
      matchScore,
    }
  })

  return scored
    .filter((candidate) => candidate.matchScore > 0 || skillNames.length === 0)
    .sort((a, b) => b.matchScore - a.matchScore)
}
