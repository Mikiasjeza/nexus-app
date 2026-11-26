/**
 * GET /api/jobs/external
 * Real job listings from public sources, with filters:
 *   q, location, remote=1, salaryMin, type (full-time|part-time|contract|internship),
 *   level (internship|entry|mid|senior), page
 * Signed-in users only (the marketplace is behind sign-in).
 */

import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const PAGE = 20
const TYPES = new Set(['full-time', 'part-time', 'contract', 'internship'])
const LEVELS = new Set(['internship', 'entry', 'mid', 'senior'])
const SOURCE_LABEL: Record<string, string> = {
  usajobs: 'USAJOBS',
  greenhouse: 'Company careers page',
  lever: 'Company careers page',
  adzuna: 'Adzuna',
}

export async function GET(request: Request) {
  try {
    const userId = (await isGuestRequest()) ? 'guest' : await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`jobs:external:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many searches. Slow down a little.' }, { status: 429 })
    }

    const p = new URL(request.url).searchParams
    const q = (p.get('q') ?? '').trim().slice(0, 100)
    const location = (p.get('location') ?? '').trim().slice(0, 100)
    const type = p.get('type') ?? ''
    const level = p.get('level') ?? ''
    const salaryMin = Math.max(0, Math.min(2_000_000, Number(p.get('salaryMin')) || 0))
    const page = Math.max(1, Math.min(50, Number(p.get('page')) || 1))

    const and: Prisma.ExternalJobWhereInput[] = [{ active: true }]
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { skills: { has: q } },
        ],
      })
    }
    if (location) and.push({ location: { contains: location, mode: 'insensitive' } })
    if (p.get('remote') === '1') and.push({ remote: true })
    if (TYPES.has(type)) and.push({ employmentType: type })
    if (LEVELS.has(level)) and.push({ experienceLevel: level })
    // Jobs that list pay at or above the minimum; jobs with no pay listed stay in.
    if (salaryMin) and.push({ OR: [{ salaryMax: { gte: salaryMin } }, { salaryMax: null }] })

    const where = { AND: and }
    const [total, jobs] = await Promise.all([
      prisma.externalJob.count({ where }),
      prisma.externalJob.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { firstSeenAt: 'desc' }],
        skip: (page - 1) * PAGE,
        take: PAGE,
        select: {
          id: true,
          source: true,
          title: true,
          company: true,
          location: true,
          remote: true,
          salaryMin: true,
          salaryMax: true,
          salaryText: true,
          employmentType: true,
          experienceLevel: true,
          skills: true,
          requirements: true,
          applyUrl: true,
          postedAt: true,
          expiresAt: true,
        },
      }),
    ])

    return NextResponse.json({
      total,
      page,
      pages: Math.ceil(total / PAGE),
      jobs: jobs.map((j) => ({ ...j, sourceLabel: SOURCE_LABEL[j.source] ?? j.source })),
    })
  } catch (e) {
    return (
      dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not load jobs' }, { status: 500 })
    )
  }
}
