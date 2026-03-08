/**
 * PATCH /api/jobs/[id] - Update job
 * DELETE /api/jobs/[id] - Delete or close job
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  salary: z.string().optional(),
  status: z.enum(['active', 'closed']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const job = await prisma.jobListing.findFirst({
      where: {
        id,
        companyId: membership.companyId,
      },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const updated = await prisma.jobListing.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.skills !== undefined && { skills: parsed.data.skills }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.salary !== undefined && { salary: parsed.data.salary }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      },
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      status: updated.status,
    })
  } catch (e) {
    console.error('Job update error:', e)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    await prisma.jobListing.findFirstOrThrow({
      where: {
        id,
        companyId: membership.companyId,
      },
    })
    await prisma.jobListing.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Job delete error:', e)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
