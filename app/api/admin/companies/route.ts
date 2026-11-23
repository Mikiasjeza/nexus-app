import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireReviewer } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'

/** Companies for the admin list, newest first; `?q=` searches name, slug and website. */
export async function GET(request: NextRequest) {
  return handle('Admin companies', async () => {
    await requireReviewer()
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100)
    const companies = await prisma.company.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { website: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        website: true,
        verifiedAt: true,
        verifiedVia: true,
        createdAt: true,
        _count: { select: { members: true, jobListings: true } },
      },
    })
    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        website: c.website,
        verified: Boolean(c.verifiedAt),
        verifiedVia: c.verifiedVia,
        members: c._count.members,
        jobs: c._count.jobListings,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  })
}
