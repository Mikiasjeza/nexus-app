/**
 * Company membership and team invites on the server. Roles and what each may
 * do live in ./roles.ts, which the browser can use too.
 */

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

export * from './roles'

/** The person's company and role, or null if they aren't on the employer side. */
export async function membershipFor(userId: string) {
  return prisma.companyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      companyId: true,
      company: { select: { name: true, slug: true } },
    },
  })
}

// ----- Invite tokens: only the hash is stored -----

export const INVITE_DAYS = 7

export function newInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashInviteToken(token) }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
