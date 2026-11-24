/**
 * The Career Profile summary shown after onboarding: recommended assessments
 * and first job matches, from the person's real data and real listings only.
 */

import { prisma } from '@/lib/db'
import { ASSESSMENTS } from '@/lib/assessments/catalog'
import { skillsLooselyMatch } from '@/lib/skills-taxonomy'
import { INTEREST_ASSESSMENTS } from './profile-options'

export type RecommendedAssessment = {
  slug: string
  title: string
  skillName: string
  reason: string
}

/**
 * Assessments that would prove a skill they listed but haven't verified,
 * then ones that fit their interests. Already-passed ones are skipped.
 */
export function recommendAssessments(
  skills: { name: string; verified: boolean }[],
  interests: string[],
  passedSlugs: Set<string>,
  limit = 4
): RecommendedAssessment[] {
  const out: RecommendedAssessment[] = []
  const add = (slug: string, reason: string) => {
    if (out.length >= limit || passedSlugs.has(slug) || out.some((a) => a.slug === slug)) return
    const a = ASSESSMENTS.find((x) => x.slug === slug)
    if (a) out.push({ slug, title: a.title, skillName: a.skillName, reason })
  }
  for (const skill of skills.filter((s) => !s.verified)) {
    const a = ASSESSMENTS.find((x) => skillsLooselyMatch(x.skillName, skill.name))
    if (a) add(a.slug, `Turns your self-reported ${skill.name} into a verified skill.`)
  }
  for (const interest of interests) {
    for (const slug of INTEREST_ASSESSMENTS[interest] ?? []) {
      add(slug, `Common in ${interest} roles.`)
    }
  }
  return out
}

export type InitialJob = {
  id: string
  title: string
  company: string
  location: string | null
  type: string
  matched: string[]
  missing: string[]
}

/** Open listings on Nexus that share skills with the person, best overlap first. */
export async function initialJobMatches(
  skills: { name: string }[],
  limit = 5
): Promise<InitialJob[]> {
  if (skills.length === 0) return []
  const jobs = await prisma.jobListing.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      title: true,
      location: true,
      type: true,
      skills: true,
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return jobs
    .map((j) => {
      const matched = j.skills.filter((req) => skills.some((s) => skillsLooselyMatch(s.name, req)))
      return {
        id: j.id,
        title: j.title,
        company: j.company.name,
        location: j.location,
        type: j.type,
        matched,
        missing: j.skills.filter((req) => !matched.includes(req)),
        ratio: j.skills.length ? matched.length / j.skills.length : 0,
      }
    })
    .filter((j) => j.matched.length > 0)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit)
    .map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      matched: job.matched,
      missing: job.missing,
    }))
}

export async function careerSummary(userId: string) {
  const [skills, profile, passed] = await Promise.all([
    prisma.skill.findMany({ where: { userId }, select: { name: true, verified: true } }),
    prisma.careerProfile.findUnique({ where: { userId }, select: { interests: true } }),
    prisma.credential.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { assessmentSlug: true },
    }),
  ])
  return {
    assessments: recommendAssessments(
      skills,
      profile?.interests ?? [],
      new Set(passed.map((p) => p.assessmentSlug))
    ),
    jobs: await initialJobMatches(skills),
  }
}
