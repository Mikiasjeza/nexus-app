/**
 * GET /api/employer/company
 * Returns the current user's company (if they are an employer).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
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
    return NextResponse.json(
      { error: 'Failed to load company' },
      { status: 500 }
    )
  }
}
