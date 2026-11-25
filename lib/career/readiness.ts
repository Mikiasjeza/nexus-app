/**
 * Career Readiness: how the person's demonstrated skills, education and
 * experience line up with their target career, from their real records.
 * Everyone gets this; Career+ adds deeper planning.
 */

import { prisma } from '@/lib/db'
import { skillsLooselyMatch } from '@/lib/skills-taxonomy'
import { experienceYears } from '@/lib/jobs/eligibility'
import { candidateProfile, jobMatches } from '@/lib/jobs/matching'
import { CAREER_ROLES, type CareerRole } from './roles'
import { recommendAssessments } from './summary'
import { EDUCATION_LEVELS, labelOf } from './profile-options'

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 2 && !['and', 'the', 'junior', 'senior'].includes(w))

/** The catalog role closest to what the person typed, if any. */
export function roleFor(target: string): CareerRole | null {
  const t = new Set(words(target))
  let best: { role: CareerRole; hits: number } | null = null
  for (const role of CAREER_ROLES) {
    const hits = words(role.title).filter((w) => t.has(w)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { role, hits }
  }
  return best?.role ?? null
}

export async function careerReadiness(userId: string) {
  const [profile, careerProfile, credentials] = await Promise.all([
    candidateProfile(userId),
    prisma.careerProfile.findUnique({
      where: { userId },
      select: { targetCareer: true, desiredTitles: true, interests: true },
    }),
    prisma.credential.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { assessmentSlug: true },
    }),
  ])
  const target = careerProfile?.targetCareer || careerProfile?.desiredTitles[0] || null
  const role = target ? roleFor(target) : null

  const required = role ? [...role.core, ...role.plus] : []
  const demonstrated: string[] = []
  const selfReported: string[] = []
  const missing: string[] = []
  for (const skill of required) {
    const mine = profile.skills.filter((s) => skillsLooselyMatch(s.name, skill))
    if (mine.some((s) => s.verified)) demonstrated.push(skill)
    else if (mine.length) selfReported.push(skill)
    else missing.push(skill)
  }

  const completed = profile.education.filter((e) => e.status === 'completed')
  const inProgress = profile.education.filter((e) => e.status === 'in_progress')
  const education = [
    ...completed.map(
      (e) =>
        `${labelOf(EDUCATION_LEVELS, e.level)}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''} (completed)`
    ),
    ...inProgress.map(
      (e) =>
        `${labelOf(EDUCATION_LEVELS, e.level)}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''} (in progress)`
    ),
  ]

  const years = experienceYears(profile)
  const latest = await prisma.workExperience.findFirst({
    where: { userId },
    orderBy: [{ current: 'desc' }, { startDate: 'desc' }],
    select: { title: true, employer: true },
  })

  const assessments = recommendAssessments(
    profile.skills,
    careerProfile?.interests ?? [],
    new Set(credentials.map((c) => c.assessmentSlug))
  )
  const nextSteps = [
    ...missing
      .filter((s) => role?.core.includes(s))
      .slice(0, 3)
      .map((s) => `Build and show ${s}: it's a core skill for ${role!.title} roles.`),
    ...assessments.slice(0, 3).map((a) => `Take the ${a.title} assessment. ${a.reason}`),
  ]
  if (!target) nextSteps.unshift('Set a target career in Career settings to see how ready you are.')

  const jobs = target ? (await jobMatches(userId, 'qualified', 1)).matches.slice(0, 3) : []

  return {
    target,
    role: role ? { id: role.id, title: role.title } : null,
    demonstrated,
    selfReported,
    missing,
    education,
    experience: {
      years,
      latest: latest ? `${latest.title} at ${latest.employer}` : null,
    },
    assessments,
    nextSteps,
    jobs: jobs.map((m) => ({
      ref: m.job.ref,
      title: m.job.title,
      company: m.job.company,
      location: m.job.location,
      applyUrl: m.job.applyUrl,
      relevance: m.result.relevance,
    })),
  }
}
