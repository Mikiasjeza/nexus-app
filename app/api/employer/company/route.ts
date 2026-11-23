/**
 * GET /api/employer/company
 * Returns the current user's company (if they are an employer).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { GUEST_COMPANY, GUEST_READ_ONLY } from '@/lib/mock/employer'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ company: GUEST_COMPANY })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        company: {
          include: {
            _count: {
              select: { jobListings: true, talentPools: true },
            },
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ company: null })
    }

    const { company } = membership
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo ?? undefined,
        website: company.website ?? undefined,
        description: company.description ?? undefined,
        role: membership.role,
        jobCount: company._count.jobListings,
        poolCount: company._count.talentPools,
      },
    })
  } catch (e) {
    console.error('Employer company error:', e)
    return NextResponse.json({ error: 'Failed to load company' }, { status: 500 })
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
    'Use a full web address, starting https://'
  )
  .optional()

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(200).optional(),
  website: optionalUrl,
  logo: optionalUrl,
  description: z
    .string()
    .trim()
    .max(2000, 'Keep the description under 2,000 characters')
    .optional(),
})

/** Who may change the company profile. */
const EDITOR_ROLES = new Set(['owner', 'admin'])

/**
 * PATCH /api/employer/company
 * Updates the public company profile (name, website, logo, description).
 * Owners and admins only; empty strings clear a field.
 */
export async function PATCH(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json(GUEST_READ_ONLY, { status: 403 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, companyId: true },
    })
    if (!membership) {
      return NextResponse.json({ error: 'No company for this account' }, { status: 404 })
    }
    if (!EDITOR_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can edit the company profile' },
        { status: 403 }
      )
    }

    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { name, website, logo, description } = parsed.data

    const company = await prisma.company.update({
      where: { id: membership.companyId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(website !== undefined ? { website: website || null } : {}),
        ...(logo !== undefined ? { logo: logo || null } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
    })

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo ?? undefined,
        website: company.website ?? undefined,
        description: company.description ?? undefined,
        role: membership.role,
      },
    })
  } catch (e) {
    console.error('Employer company update error:', e)
    return NextResponse.json({ error: 'Failed to save company profile' }, { status: 500 })
  }
}
