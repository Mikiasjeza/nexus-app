/**
 * Messages between a company's team and a candidate.
 *
 * Employers start conversations, only with people who applied to one of
 * their jobs or chose to be discoverable. Candidates reply; they can't
 * cold-message companies. Anyone on the company's team can read and write
 * the company's side.
 */

import { prisma } from '@/lib/db'
import { verifiedForEmployers } from '@/lib/auth/email-verification'

export const MAX_MESSAGE = 4000

export type Side = 'company' | 'candidate'

/** Which side of this conversation the person is on, or null if it isn't theirs. */
export async function sideOf(
  conversation: { companyId: string; candidateId: string },
  userId: string
): Promise<Side | null> {
  if (conversation.candidateId === userId) return 'candidate'
  const member = await prisma.companyMember.findFirst({
    where: { userId, companyId: conversation.companyId },
    select: { id: true },
  })
  return member ? 'company' : null
}

/** May this company start a conversation with this person? */
export async function canContact(companyId: string, candidateId: string): Promise<boolean> {
  const applied = await prisma.jobApplication.findFirst({
    where: { userId: candidateId, job: { companyId }, status: { not: 'withdrawn' } },
    select: { id: true },
  })
  if (applied) return true
  const discoverable = await prisma.user.findFirst({
    where: {
      id: candidateId,
      publicProfile: true,
      discoverableByEmployers: true,
      ...verifiedForEmployers(),
    },
    select: { id: true },
  })
  return Boolean(discoverable)
}
