/**
 * Career+ on the server: gathers a person's skills, credentials, open job
 * listings and passport views, and runs them through ./analysis.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { aiClient } from '@/lib/ai/client'
import { skillsLooselyMatch } from '@/lib/skills-taxonomy'
import {
  learningPlan,
  marketInsights,
  matchRole,
  recommendRoles,
  skillDemand,
  skillGaps,
  type CareerSkill,
  type PlanStep,
  type SkillGap,
} from './analysis'
import { CAREER_ROLES, getRole } from './roles'

/** Published skills, with a passed assessment counting as verified. */
export async function careerSkills(userId: string): Promise<CareerSkill[]> {
  const [skills, credentials] = await Promise.all([
    prisma.skill.findMany({
      where: { userId, status: 'published' },
      select: { name: true, level: true, verified: true },
    }),
    prisma.credential.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { skillName: true },
    }),
  ])
  return skills.map((s) => ({
    name: s.name,
    level: s.level,
    verified: s.verified || credentials.some((c) => skillsLooselyMatch(c.skillName, s.name)),
  }))
}

async function jobDemand(): Promise<Map<string, number>> {
  const jobs = await prisma.jobListing.findMany({
    where: { status: 'active' },
    select: { skills: true },
    take: 500,
    orderBy: { createdAt: 'desc' },
  })
  return skillDemand(jobs.map((j) => j.skills))
}

async function passportStats(userId: string) {
  const since30 = new Date(Date.now() - 30 * 86_400_000)
  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const [last30, last7, employerViews] = await Promise.all([
    prisma.passportView.count({ where: { userId, createdAt: { gt: since30 } } }),
    prisma.passportView.count({ where: { userId, createdAt: { gt: since7 } } }),
    prisma.passportView.groupBy({
      by: ['companyId'],
      where: { userId, createdAt: { gt: since30 }, companyId: { not: null } },
      _count: { _all: true },
    }),
  ])
  const companyIds = employerViews.map((v) => v.companyId!).filter(Boolean)
  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true, slug: true },
      })
    : []
  return {
    last7,
    last30,
    employers: employerViews
      .map((v) => {
        const c = companies.find((x) => x.id === v.companyId)
        return c ? { name: c.name, slug: c.slug, views: v._count._all } : null
      })
      .filter(Boolean)
      .sort((a, b) => b!.views - a!.views)
      .slice(0, 10),
  }
}

/** Everything on the Career+ page except the AI coaching. */
export async function careerOverview(userId: string) {
  const [skills, demand, passport, user] = await Promise.all([
    careerSkills(userId),
    jobDemand(),
    passportStats(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { publicProfile: true } }),
  ])
  const verified = skills.filter((s) => s.verified).length
  return {
    skills: { total: skills.length, verified },
    recommendations: recommendRoles(skills).map((m) => ({
      roleId: m.role.id,
      title: m.role.title,
      summary: m.role.summary,
      score: m.score,
      strengths: m.requirements
        .filter((r) => r.status === 'strong' || r.status === 'ok')
        .map((r) => r.skill),
      topGaps: skillGaps(m, demand)
        .slice(0, 3)
        .map((g) => g.skill),
    })),
    roles: CAREER_ROLES.map((r) => ({ id: r.id, title: r.title })),
    market: marketInsights(skills, demand),
    passport: { ...passport, public: Boolean(user?.publicProfile) },
  }
}

const coachSchema = z.object({
  summary: z.string().max(800),
  tips: z.array(z.object({ skill: z.string().max(80), tip: z.string().max(400) })).max(8),
})
export type CareerCoaching = z.infer<typeof coachSchema>

const COACH_SYSTEM = `You are a practical career coach on Nexus, a skill verification site.
You get a target role, the person's current skills (with level and whether verified) and their skill gaps.
Reply with JSON only: {"summary": string, "tips": [{"skill": string, "tip": string}]}.
- summary: 2-3 sentences on how close they are and what to focus on first. Plain, encouraging, specific.
- tips: one per gap given (max 6), each a concrete next action they can do this week to improve that skill (a small project idea, what to practice, what to show as evidence). No links, no course names, no made-up facts.
Never mention salaries. Never invent skills they did not list.`

async function coaching(
  title: string,
  skills: CareerSkill[],
  gaps: SkillGap[]
): Promise<CareerCoaching | null> {
  if (gaps.length === 0) return null
  try {
    const prompt = JSON.stringify({
      role: title,
      skills: skills
        .slice(0, 40)
        .map((s) => ({ name: s.name, level: s.level, verified: s.verified })),
      gaps: gaps
        .slice(0, 6)
        .map((g) => ({ skill: g.skill, status: g.status, importance: g.importance })),
    })
    const reply = await aiClient.completeJson(COACH_SYSTEM, prompt, 1500)
    const json = reply.text.slice(reply.text.indexOf('{'), reply.text.lastIndexOf('}') + 1)
    return coachSchema.parse(JSON.parse(json))
  } catch (error) {
    // The plan still works without the AI notes.
    console.error('Career coaching failed:', error instanceof Error ? error.message : error)
    return null
  }
}

export type CareerPlan = {
  roleId: string
  title: string
  score: number
  requirements: { skill: string; importance: 'core' | 'plus'; status: string }[]
  gaps: SkillGap[]
  steps: PlanStep[]
  coaching: CareerCoaching | null
}

/** Gap analysis and a learning plan for one role, with AI coaching when available. */
export async function careerPlan(userId: string, roleId: string): Promise<CareerPlan | null> {
  const role = getRole(roleId)
  if (!role) return null
  const [skills, demand] = await Promise.all([careerSkills(userId), jobDemand()])
  const match = matchRole(role, skills)
  const gaps = skillGaps(match, demand)
  return {
    roleId: role.id,
    title: role.title,
    score: match.score,
    requirements: match.requirements.map((r) => ({
      skill: r.skill,
      importance: r.importance,
      status: r.status,
    })),
    gaps,
    steps: learningPlan(gaps),
    coaching: await coaching(role.title, skills, gaps),
  }
}
