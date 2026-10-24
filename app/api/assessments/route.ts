import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import {
  ASSESSMENTS,
  ASSESSMENT_RULES,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  RETAKE_POLICY,
  isAvailable,
  totalMinutes,
} from '@/lib/assessments/catalog'
import { ACTIVE_STATUSES, effectiveStatus, retakeStatus } from '@/lib/assessments/service'
import { assessmentDeps, handle } from '@/lib/assessments/http'
import type { AttemptRecord, CredentialRecord } from '@/lib/assessments/store'

export const dynamic = 'force-dynamic'

/** The catalog, plus the signed-in user's attempts and credentials per skill. */
export async function GET() {
  return handle('Assessment catalog', async () => {
    const guest = await isGuestRequest()
    const userId = guest ? null : await getSessionUserId()
    const now = new Date()

    let attempts: AttemptRecord[] = []
    let credentials: CredentialRecord[] = []
    let personalError: string | null = null
    if (userId) {
      try {
        const { store } = assessmentDeps()
        ;[attempts, credentials] = await Promise.all([
          store.listAttempts(userId),
          store.listCredentials(userId),
        ])
      } catch (error) {
        // The catalog still renders before the assessment tables exist.
        console.error('Assessment history unavailable:', error)
        personalError = 'Your assessment history is unavailable right now.'
      }
    }

    return NextResponse.json({
      signedIn: Boolean(userId),
      guest,
      personalError,
      rules: ASSESSMENT_RULES,
      retakePolicy: RETAKE_POLICY,
      modes: Object.fromEntries(
        Object.entries(MODE_LABELS).map(([mode, label]) => [
          mode,
          { label, description: MODE_DESCRIPTIONS[mode as keyof typeof MODE_DESCRIPTIONS] },
        ])
      ),
      assessments: ASSESSMENTS.map((def) => {
        const mine = attempts.filter((a) => a.slug === def.slug)
        const open = mine.find((a) => ACTIVE_STATUSES.includes(a.status))
        const latest = mine.find(
          (a) => !ACTIVE_STATUSES.includes(a.status) && a.status !== 'CANCELLED'
        )
        const credential = credentials.find(
          (c) => c.slug === def.slug && effectiveStatus(c, now) === 'ACTIVE'
        )
        const retake = retakeStatus(mine, now)
        return {
          slug: def.slug,
          skillName: def.skillName,
          category: def.category,
          title: def.title,
          level: def.level,
          summary: def.summary,
          measures: def.measures,
          workspace: def.workspace,
          language: def.language ?? null,
          minutes: totalMinutes(def),
          stageMinutes: def.stageMinutes,
          modes: def.modes,
          available: isAvailable(def),
          credentialValidMonths: def.credentialValidMonths,
          rubric: {
            id: def.rubric.id,
            version: def.rubric.version,
            passThreshold: Math.round(def.rubric.passThreshold * 100),
            criteria: def.rubric.criteria.map((c) => ({
              label: c.label,
              weight: c.weight,
              description: c.description,
              automatic: !c.source.startsWith('ai:'),
            })),
          },
          personal: userId
            ? {
                openAttempt: open ? { id: open.id, status: open.status } : null,
                latest: latest
                  ? {
                      id: latest.id,
                      status: latest.status,
                      result: latest.result,
                      completedAt: latest.completedAt?.toISOString() ?? null,
                    }
                  : null,
                credential: credential
                  ? {
                      id: credential.id,
                      mode: credential.mode,
                      expiresAt: credential.expiresAt.toISOString(),
                    }
                  : null,
                retake: {
                  allowed: retake.allowed,
                  reason: retake.reason ?? null,
                  nextAt: retake.nextAt?.toISOString() ?? null,
                },
              }
            : null,
        }
      }),
    })
  })
}
