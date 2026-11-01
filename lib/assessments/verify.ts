/**
 * The public face of a credential: what anyone holding its id may see.
 * Holder name, skill, level, mode, identity level, score and dates. Nothing
 * from the submission, the evaluation or the integrity log.
 */

import { prisma } from '@/lib/db'
import { isGuestRequest } from '@/lib/auth/session'
import { MODE_LABELS, getAssessment } from './catalog'
import { prismaAssessmentStore } from './prisma-store'
import { effectiveStatus } from './service'
import type { CredentialRecord } from './store'
import type { IdentityAssurance } from './types'

export const CREDENTIAL_ID_PATTERN = /^NX-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/

export const IDENTITY_LABELS: Record<IdentityAssurance, { label: string; detail: string }> = {
  A_SELF_ASSERTED: {
    label: 'Account holder',
    detail: 'Taken by the holder of this Nexus account. Identity documents were not checked.',
  },
  B_IDENTITY_CHECKED: {
    label: 'Identity checked',
    detail: 'The holder’s government ID was checked against a live selfie before the attempt.',
  },
  C_SUPERVISED: {
    label: 'Supervised',
    detail: 'Taken under live supervision after an identity check.',
  },
}

/** Shown for the guest preview only, so the page can be seen without real data. */
export const SAMPLE_CREDENTIAL_ID = 'NX-SAMP-LE00-0001'

export function normaliseCredentialId(raw: string): string {
  return raw.trim().toUpperCase()
}

export function toPublicCredential(
  credential: CredentialRecord,
  holder: { name: string; profilePath: string | null },
  now: Date
) {
  const def = getAssessment(credential.slug)
  const status = effectiveStatus(credential, now)
  return {
    id: credential.id,
    holder,
    skillName: credential.skillName,
    title: def?.title ?? credential.skillName,
    level: credential.level,
    mode: credential.mode,
    modeLabel: MODE_LABELS[credential.mode],
    identity: { level: credential.identityLevel, ...IDENTITY_LABELS[credential.identityLevel] },
    score: credential.score,
    passThreshold: def ? Math.round(def.rubric.passThreshold * 100) : null,
    status,
    issuedAt: credential.issuedAt.toISOString(),
    expiresAt: credential.expiresAt.toISOString(),
    revokedAt: credential.revokedAt?.toISOString() ?? null,
    rubric: { id: credential.rubricId, version: credential.rubricVersion },
    challenge: { id: credential.challengeId, version: credential.challengeVersion },
    measures: def?.measures ?? [],
    sample: false,
  }
}

export type PublicCredential = ReturnType<typeof toPublicCredential>

export function sampleCredential(now: Date): PublicCredential {
  const issued = new Date(now.getTime() - 40 * 86_400_000)
  const expires = new Date(issued)
  expires.setUTCMonth(expires.getUTCMonth() + 24)
  return {
    ...toPublicCredential(
      {
        id: SAMPLE_CREDENTIAL_ID,
        userId: 'sample',
        attemptId: 'sample',
        slug: 'sql',
        skillName: 'SQL',
        level: 'Working level',
        mode: 'independent',
        identityLevel: 'A_SELF_ASSERTED',
        score: 84,
        rubricId: 'sql-core',
        rubricVersion: 1,
        challengeId: 'sales-cleanup',
        challengeVersion: 1,
        status: 'ACTIVE',
        issuedAt: issued,
        expiresAt: expires,
        revokedAt: null,
        revokedReason: null,
      },
      { name: 'Sample candidate', profilePath: null },
      now
    ),
    sample: true,
  }
}

export async function publicCredential(rawId: string): Promise<PublicCredential | null> {
  const id = normaliseCredentialId(rawId)
  const now = new Date()
  if (id === SAMPLE_CREDENTIAL_ID && (await isGuestRequest())) return sampleCredential(now)
  if (!CREDENTIAL_ID_PATTERN.test(id)) return null
  const credential = await prismaAssessmentStore.getCredential(id)
  if (!credential) return null
  const user = await prisma.user.findUnique({
    where: { id: credential.userId },
    select: { name: true, publicProfile: true, shareableId: true },
  })
  if (!user) return null
  return toPublicCredential(
    credential,
    { name: user.name, profilePath: user.publicProfile ? `/share/${user.shareableId}` : null },
    now
  )
}

/** Live credentials for a passport: not revoked, superseded or expired. */
export async function liveCredentials(userId: string): Promise<PublicCredential[]> {
  const now = new Date()
  const all = await prismaAssessmentStore.listCredentials(userId)
  return all
    .filter((c) => effectiveStatus(c, now) === 'ACTIVE')
    .map((c) => toPublicCredential(c, { name: '', profilePath: null }, now))
}
