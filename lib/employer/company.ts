import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

/** "Acme Inc." -> "acme-inc"; never empty. */
export function slugifyCompanyName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'company'
}

/** A company slug no other company uses yet: acme, acme-1, acme-2, ... */
export async function uniqueCompanySlug(db: Db, name: string): Promise<string> {
  const base = slugifyCompanyName(name)
  for (let suffix = 0; ; suffix++) {
    const slug = suffix === 0 ? base : `${base}-${suffix}`
    const existing = await db.company.findUnique({ where: { slug }, select: { id: true } })
    if (!existing) return slug
  }
}

/**
 * Creates a company with this person as its owner, and marks their account as
 * set up: employers skip the candidate onboarding.
 */
export async function createCompanyForUser(db: Db, userId: string, companyName: string) {
  const name = companyName.trim()
  const company = await db.company.create({
    data: {
      name,
      slug: await uniqueCompanySlug(db, name),
      members: { create: { userId, role: 'owner' } },
    },
  })
  await db.user.update({ where: { id: userId }, data: { onboardingComplete: true } })
  return company
}

/** The company this person works for, if they are on the employer side. */
export async function employerMembership(db: Db, userId: string) {
  return db.companyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, company: { select: { id: true, name: true, slug: true } } },
  })
}
