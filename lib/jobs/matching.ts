/**
 * Personalized job matches: loads the person's profile and real open jobs
 * (synced listings plus jobs posted on Nexus), evaluates each, and sorts
 * them into Qualified Matches, Growth Opportunities, and Internships &
 * Early Careers. Jobs the person marked "not relevant" are left out.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { aiClient } from '@/lib/ai/client'
import type { JobRequirements } from './enrich'
import {
  evaluate,
  sectionOf,
  type CandidateProfile,
  type MatchJob,
  type MatchResult,
  type Section,
} from './eligibility'

const POOL = 1500
const PAGE = 15

export async function candidateProfile(userId: string): Promise<CandidateProfile> {
  const [profile, skills, education, experience, certifications, credentials] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId } }),
    prisma.skill.findMany({
      where: { userId, status: 'published' },
      select: { name: true, verified: true },
    }),
    prisma.educationRecord.findMany({
      where: { userId },
      select: { level: true, status: true, fieldOfStudy: true },
    }),
    prisma.workExperience.findMany({
      where: { userId },
      select: { startDate: true, endDate: true, current: true, employmentType: true },
    }),
    prisma.certificationRecord.findMany({ where: { userId }, select: { name: true } }),
    prisma.credential.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { skillName: true },
    }),
  ])
  const passed = new Set(credentials.map((c) => c.skillName.toLowerCase()))
  return {
    skills: skills.map((s) => ({
      name: s.name,
      verified: s.verified || passed.has(s.name.toLowerCase()),
    })),
    education,
    experience,
    certifications,
    yearsExperience: profile?.yearsExperience ?? null,
    desiredTitles: profile?.desiredTitles ?? [],
    targetCareer: profile?.targetCareer ?? null,
    interests: profile?.interests ?? [],
    locations: profile?.locations ?? [],
    workArrangements: profile?.workArrangements ?? [],
    jobTypes: profile?.jobTypes ?? [],
    experienceLevels: profile?.experienceLevels ?? [],
    willingToRelocate: profile?.willingToRelocate ?? null,
    salaryMin: profile?.salaryMin ?? null,
    currentlyStudent: profile?.currentlyStudent ?? null,
  }
}

export type JobCard = MatchJob & {
  ref: string
  source: string
  sourceLabel: string
  applyUrl: string | null
  postedAt: Date | null
}

// Every match request scores the same open jobs, so keep them in memory for
// five minutes instead of reloading up to 1,800 rows from the database each time.
const JOBS_TTL_MS = 5 * 60_000
let jobsCache: { expires: number; value: Promise<JobCard[]> } | null = null

function openJobs(): Promise<JobCard[]> {
  if (jobsCache && jobsCache.expires > Date.now()) return jobsCache.value
  const value = loadOpenJobs()
  jobsCache = { expires: Date.now() + JOBS_TTL_MS, value }
  value.catch(() => {
    jobsCache = null
  })
  return value
}

async function loadOpenJobs(): Promise<JobCard[]> {
  const [external, internal] = await Promise.all([
    prisma.externalJob.findMany({
      where: { active: true },
      orderBy: [{ postedAt: 'desc' }, { firstSeenAt: 'desc' }],
      take: POOL,
      select: {
        id: true,
        source: true,
        title: true,
        company: true,
        location: true,
        remote: true,
        employmentType: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        skills: true,
        requirements: true,
        applyUrl: true,
        postedAt: true,
      },
    }),
    prisma.jobListing.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true,
        title: true,
        location: true,
        type: true,
        skills: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    }),
  ])
  return [
    ...internal.map((j) => ({
      ref: `nexus:${j.id}`,
      source: 'nexus',
      sourceLabel: 'Posted on Nexus',
      title: j.title,
      company: j.company.name,
      location: j.location,
      remote: /remote/i.test(j.location ?? ''),
      employmentType: j.type,
      experienceLevel: null,
      salaryMin: null,
      salaryMax: null,
      skills: j.skills,
      requirements: null,
      applyUrl: null, // applied to on Nexus
      postedAt: j.createdAt,
    })),
    ...external.map((j) => ({
      ref: `ext:${j.id}`,
      source: j.source,
      sourceLabel:
        j.source === 'usajobs'
          ? 'USAJOBS'
          : j.source === 'adzuna'
            ? 'Adzuna'
            : 'Company careers page',
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      employmentType: j.employmentType,
      experienceLevel: j.experienceLevel,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      skills: j.skills,
      requirements: (j.requirements as JobRequirements | null) ?? null,
      applyUrl: j.applyUrl,
      postedAt: j.postedAt,
    })),
  ]
}

export async function jobMatches(userId: string, section: Section, page: number) {
  const [profile, jobs, hidden] = await Promise.all([
    candidateProfile(userId),
    openJobs(),
    prisma.jobFeedback.findMany({ where: { userId, helpful: false }, select: { jobRef: true } }),
  ])
  const skip = new Set(hidden.map((h) => h.jobRef))
  const rows: { job: JobCard; result: MatchResult }[] = []
  for (const job of jobs) {
    if (skip.has(job.ref)) continue
    const result = evaluate(profile, job)
    if (sectionOf(profile, result).includes(section)) rows.push({ job, result })
  }
  rows.sort((a, b) => b.result.relevance - a.result.relevance)
  const counts = { total: rows.length }
  return {
    ...counts,
    page,
    pages: Math.max(1, Math.ceil(rows.length / PAGE)),
    profileComplete:
      profile.skills.length > 0 || profile.education.length > 0 || profile.desiredTitles.length > 0,
    matches: rows.slice((page - 1) * PAGE, page * PAGE),
  }
}

const explainSchema = z.object({ explanation: z.string().min(1).max(900) })

const EXPLAIN_SYSTEM = `You explain to a job seeker, in 2-4 plain sentences, why a job was recommended and what they would still need.
Use ONLY the facts given: the person's skills (verified or self-reported), education, experience years, preferences, and the job's stated requirements and the eligibility checks. Never invent qualifications, never promise they will be hired, never say one assessment guarantees eligibility. If something is unknown, say it is unknown.
Reply with JSON only: {"explanation": string}.`

/** An AI-written explanation, grounded in the deterministic checks. */
export async function explainMatch(userId: string, ref: string): Promise<string | null> {
  const [kind, id] = ref.split(':')
  if (!id || (kind !== 'ext' && kind !== 'nexus')) return null
  const jobs = await openJobs()
  const job = jobs.find((j) => j.ref === ref)
  if (!job) return null
  const profile = await candidateProfile(userId)
  const result = evaluate(profile, job)
  const facts = {
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.employmentType,
      level: job.experienceLevel,
      skills: job.skills,
      requirements: job.requirements,
    },
    person: {
      verifiedSkills: profile.skills.filter((s) => s.verified).map((s) => s.name),
      selfReportedSkills: profile.skills.filter((s) => !s.verified).map((s) => s.name),
      education: profile.education,
      certifications: profile.certifications.map((c) => c.name),
      desiredTitles: profile.desiredTitles,
      targetCareer: profile.targetCareer,
    },
    checks: result.checks,
    relevance: result.relevance,
  }
  try {
    const reply = await aiClient.completeJson(EXPLAIN_SYSTEM, JSON.stringify(facts), 600)
    const json = JSON.parse(
      reply.text.slice(reply.text.indexOf('{'), reply.text.lastIndexOf('}') + 1)
    )
    return explainSchema.parse(json).explanation
  } catch {
    return null
  }
}
