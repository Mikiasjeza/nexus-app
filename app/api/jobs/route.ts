/**
 * GET /api/jobs - List active job listings (public for marketplace)
 * POST /api/jobs - Create job (employer only)
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const companyId = searchParams.get('companyId') || ''
    const companySlug = searchParams.get('companySlug') || ''

    const where: Record<string, unknown> = { status: 'active' }
    if (type) where.type = type
    if (companyId) where.companyId = companyId
    if (companySlug) {
      const company = await prisma.company.findUnique({
        where: { slug: companySlug },
        select: { id: true },
      })
      if (company) where.companyId = company.id
    }

    const jobs = await prisma.jobListing.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description || undefined,
        skills: j.skills,
        location: j.location || undefined,
        type: j.type,
        salary: j.salary || undefined,
        status: j.status,
        company: j.company,
        createdAt: j.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('Jobs list error:', e)
    return NextResponse.json(
      { error: 'Failed to load jobs' },
      { status: 500 }
    )
  }
}

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  skills: z.array(z.string()).default([]),
  location: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']).default('full-time'),
  salary: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const job = await prisma.jobListing.create({
      data: {
        companyId: membership.companyId,
        title: parsed.data.title,
        description: parsed.data.description,
        skills: parsed.data.skills,
        location: parsed.data.location,
        type: parsed.data.type,
        salary: parsed.data.salary,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return NextResponse.json({
      id: job.id,
      title: job.title,
      description: job.description || undefined,
      skills: job.skills,
      location: job.location || undefined,
      type: job.type,
      salary: job.salary || undefined,
      company: job.company,
      createdAt: job.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('Job create error:', e)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}
