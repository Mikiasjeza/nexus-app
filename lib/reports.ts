/**
 * Reports: people flag a profile, job or company; an admin reviews the queue
 * at /admin/reports and marks each one actioned or dismissed.
 */

import { prisma } from '@/lib/db'
import { type ReportTarget } from '@/lib/report-options'

export * from '@/lib/report-options'

/**
 * What the report points at, as an admin should see it, or null when it
 * doesn't exist. Profiles are addressed by their public share id or slug.
 */
export async function describeTarget(
  type: ReportTarget,
  id: string
): Promise<{ label: string; href: string; ownerId?: string } | null> {
  if (type === 'profile') {
    const user = await prisma.user.findFirst({
      where: { OR: [{ shareableId: id }, { customSlug: id }] },
      select: { id: true, name: true, shareableId: true },
    })
    return user ? { label: user.name, href: `/share/${user.shareableId}`, ownerId: user.id } : null
  }
  if (type === 'job') {
    const job = await prisma.jobListing.findUnique({
      where: { id },
      select: { title: true, company: { select: { name: true, slug: true } } },
    })
    return job
      ? { label: `${job.title} at ${job.company.name}`, href: `/company/${job.company.slug}` }
      : null
  }
  const company = await prisma.company.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { name: true, slug: true },
  })
  return company ? { label: company.name, href: `/company/${company.slug}` } : null
}
