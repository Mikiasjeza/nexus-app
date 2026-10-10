/**
 * The single path by which a skill becomes (or stops being) verified.
 *
 * Every place a user submits evidence calls verifySkill: the evidence upload
 * form, the verification page, and anything added later. It assesses all of
 * the skill's stored evidence plus anything just submitted, applies the
 * policy in ./verification.ts, records an AIAnalysis row and updates
 * Skill.verified in either direction.
 */

import { prisma } from '@/lib/db'
import { checkAiAnalysisQuota } from '@/lib/plan-usage'
import { normalizeSkillCategory } from '@/lib/skills-taxonomy'
import { aiClient } from './client'
import { decideVerification, type EvidenceInput } from './verification'

type StoredEvidence = {
  type: string
  url: string | null
  fileUrl: string | null
  fileName: string | null
  mimeType: string | null
  description: string | null
}

/** Describe stored evidence to the model. Uploaded binaries are described, not sent. */
export function storedEvidenceToInput(item: StoredEvidence): EvidenceInput {
  const description = item.description?.trim() ?? ''
  if (item.url) {
    return { type: 'link', content: description, metadata: { url: item.url } }
  }
  if (item.fileUrl) {
    const label = `Uploaded file "${item.fileName ?? 'file'}" (${item.mimeType ?? 'unknown type'}).`
    return {
      type: 'file',
      content: description ? `${label}\n${description}` : label,
      metadata: { fileName: item.fileName ?? undefined, mimeType: item.mimeType ?? undefined },
    }
  }
  return { type: 'text', content: description }
}

export type VerifySkillOutcome =
  | {
      status: 'assessed'
      analysisId: string
      skillId: string
      skillName: string
      verified: boolean
      verifiedChanged: boolean
      confidenceScore: number
      explanation: string
      suggestedLevel: string | null
      improvements: string[]
      reasons: string[]
      model: string
      tokensUsed: number
      cost: number
      createdAt: string
    }
  | { status: 'not_found' }
  | { status: 'no_evidence' }
  | { status: 'quota_exceeded'; plan: string; limit: number; used: number }

export async function verifySkill(options: {
  userId: string
  skillId: string
  /** Evidence submitted with this request that is not (or not fully) stored, e.g. pasted code. */
  submittedEvidence?: EvidenceInput[]
  evidenceId?: string
}): Promise<VerifySkillOutcome> {
  const { userId, skillId, submittedEvidence = [], evidenceId } = options

  const skill = await prisma.skill.findFirst({
    where: { id: skillId, userId },
    include: { evidence: { orderBy: { createdAt: 'desc' } } },
  })
  if (!skill) return { status: 'not_found' }

  const evidence = [...submittedEvidence, ...skill.evidence.map(storedEvidenceToInput)].filter(
    (item) => item.content.trim() || item.metadata?.url
  )
  if (evidence.length === 0) return { status: 'no_evidence' }

  const quota = await checkAiAnalysisQuota(userId)
  if (!quota.allowed) {
    return { status: 'quota_exceeded', plan: quota.plan, limit: quota.limit, used: quota.used }
  }

  const result = await aiClient.analyzeEvidence(
    skill.name,
    normalizeSkillCategory(skill.category),
    skill.level,
    evidence
  )
  const decision = decideVerification(result, skill.level, evidence)
  const explanation = [result.explanation, ...decision.reasons].join(' ')

  const { analysis, verifiedChanged } = await prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        skillId,
        userId,
        evidenceId: evidenceId ?? null,
        model: result.model,
        confidenceScore: decision.confidenceScore,
        explanation,
        suggestedLevel: result.suggestedLevel,
        improvements: result.improvements,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      },
    })

    const verifiedChanged = decision.verified !== skill.verified
    if (verifiedChanged) {
      await tx.skill.update({ where: { id: skillId }, data: { verified: decision.verified } })
      await tx.skillHistory.create({
        data: {
          skillId,
          userId,
          changes: [{ field: 'verified', oldValue: skill.verified, newValue: decision.verified }],
        },
      })
      await tx.activity.create({
        data: {
          userId,
          type: 'skill_updated',
          skillId,
          skillName: skill.name,
          message: decision.verified
            ? `AI verified ${skill.name}`
            : `${skill.name} is no longer verified`,
        },
      })
    }
    return { analysis, verifiedChanged }
  })

  return {
    status: 'assessed',
    analysisId: analysis.id,
    skillId,
    skillName: skill.name,
    verified: decision.verified,
    verifiedChanged,
    confidenceScore: analysis.confidenceScore,
    explanation: analysis.explanation,
    suggestedLevel: analysis.suggestedLevel,
    improvements: analysis.improvements,
    reasons: decision.reasons,
    model: analysis.model,
    tokensUsed: analysis.tokensUsed ?? 0,
    cost: analysis.cost ?? 0,
    createdAt: analysis.createdAt.toISOString(),
  }
}
