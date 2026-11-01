/**
 * Postgres-backed assessment store (see store.ts for the contract).
 * Status changes are conditional updates, so two requests racing on the same
 * attempt can't both win; locked submissions rely on a unique index.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { AttemptStatus, Stage, StageWork } from './types'
import {
  ConflictError,
  type AppealRecord,
  type AppealStatus,
  type AssessmentStore,
  type AttemptEventRecord,
  type AttemptPatch,
  type AttemptRecord,
  type CredentialRecord,
  type NewAttempt,
  type StoredEvaluation,
} from './store'

const json = (value: unknown) => value as Prisma.InputJsonValue

type AttemptRow = Prisma.AssessmentAttemptGetPayload<{ include: { submissions: true } }>

function toAttempt(row: AttemptRow): AttemptRecord {
  const submissions: AttemptRecord['submissions'] = {}
  for (const s of row.submissions) {
    submissions[s.stage as Stage] = {
      work: s.payload as StageWork,
      hash: s.contentHash,
      submittedAt: s.submittedAt,
    }
  }
  return {
    id: row.id,
    userId: row.userId,
    slug: row.assessmentSlug,
    challengeId: row.challengeId,
    challengeVersion: row.challengeVersion,
    rubricId: row.rubricId,
    rubricVersion: row.rubricVersion,
    mode: row.mode as AttemptRecord['mode'],
    seed: row.seed,
    status: row.status as AttemptStatus,
    stage: row.stage as Stage,
    drafts: (row.drafts ?? {}) as AttemptRecord['drafts'],
    submissions,
    runCount: row.runCount,
    result: row.result as AttemptRecord['result'],
    score: row.score,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    deadlineAt: row.deadlineAt,
    submittedAt: row.submittedAt,
    completedAt: row.completedAt,
  }
}

type CredentialRow = Prisma.CredentialGetPayload<object>

function toCredential(row: CredentialRow): CredentialRecord {
  return {
    id: row.id,
    userId: row.userId,
    attemptId: row.attemptId,
    slug: row.assessmentSlug,
    skillName: row.skillName,
    level: row.level,
    mode: row.mode as CredentialRecord['mode'],
    identityLevel: row.identityLevel as CredentialRecord['identityLevel'],
    score: row.score,
    rubricId: row.rubricId,
    rubricVersion: row.rubricVersion,
    challengeId: row.challengeId,
    challengeVersion: row.challengeVersion,
    status: row.status as CredentialRecord['status'],
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
  }
}

type AppealRow = Prisma.AssessmentAppealGetPayload<object>

const toAppeal = (row: AppealRow): AppealRecord => ({
  ...row,
  status: row.status as AppealStatus,
})

const withSubmissions = { submissions: true } as const

export const prismaAssessmentStore: AssessmentStore = {
  async createAttempt(data: NewAttempt) {
    const row = await prisma.assessmentAttempt.create({
      data: {
        userId: data.userId,
        assessmentSlug: data.slug,
        challengeId: data.challengeId,
        challengeVersion: data.challengeVersion,
        rubricId: data.rubricId,
        rubricVersion: data.rubricVersion,
        mode: data.mode,
        seed: data.seed,
        status: data.status,
      },
      include: withSubmissions,
    })
    return toAttempt(row)
  },

  async getAttempt(id) {
    const row = await prisma.assessmentAttempt.findUnique({
      where: { id },
      include: withSubmissions,
    })
    return row ? toAttempt(row) : null
  },

  async listAttempts(userId, slug) {
    const rows = await prisma.assessmentAttempt.findMany({
      where: { userId, ...(slug ? { assessmentSlug: slug } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: withSubmissions,
    })
    return rows.map(toAttempt)
  },

  async listAttemptsByStatus(status, limit = 100) {
    const rows = await prisma.assessmentAttempt.findMany({
      where: { status },
      orderBy: { updatedAt: 'asc' },
      take: limit,
      include: withSubmissions,
    })
    return rows.map(toAttempt)
  },

  async updateAttempt(id, expected, patch: AttemptPatch) {
    const { drafts, ...rest } = patch
    const updated = await prisma.assessmentAttempt.updateMany({
      where: { id, status: expected },
      data: { ...rest, ...(drafts !== undefined ? { drafts: json(drafts) } : {}) },
    })
    if (updated.count === 0) throw new ConflictError()
    const row = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id },
      include: withSubmissions,
    })
    return toAttempt(row)
  },

  async saveSubmission(attemptId, stage, work, hash) {
    try {
      await prisma.assessmentSubmission.create({
        data: { attemptId, stage, payload: json(work), contentHash: hash },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('This step was already submitted.')
      }
      throw error
    }
  },

  async addEvents(attemptId, events: AttemptEventRecord[]) {
    if (events.length === 0) return
    await prisma.attemptEvent.createMany({
      data: events.map((e) => ({
        attemptId,
        type: e.type,
        stage: e.stage,
        data: json(e.data),
        at: e.at,
      })),
    })
  },

  async listEvents(attemptId) {
    const rows = await prisma.attemptEvent.findMany({
      where: { attemptId },
      orderBy: { at: 'asc' },
      take: 2000,
    })
    return rows.map((r) => ({
      type: r.type,
      stage: r.stage as Stage,
      data: (r.data ?? {}) as Record<string, unknown>,
      at: r.at,
    }))
  },

  async countEvents(attemptId) {
    return prisma.attemptEvent.count({ where: { attemptId } })
  },

  async addEvaluation(attemptId, evaluation: StoredEvaluation) {
    await prisma.assessmentEvaluation.create({
      data: {
        attemptId,
        rubricId: evaluation.rubricId,
        rubricVersion: evaluation.rubricVersion,
        criteria: json(evaluation.criteria),
        score: evaluation.score,
        result: evaluation.result,
        feedback: json(evaluation.feedback),
        integrity: json(evaluation.integrity),
        model: evaluation.model ?? null,
        inputTokens: evaluation.usage?.inputTokens ?? null,
        outputTokens: evaluation.usage?.outputTokens ?? null,
        aiCostUsd: evaluation.usage?.costUsd ?? null,
        evaluatedBy: evaluation.evaluatedBy,
        createdAt: new Date(evaluation.evaluatedAt),
      },
    })
  },

  async costSummary(since) {
    const [gradings, withAi, runs] = await Promise.all([
      prisma.assessmentEvaluation.aggregate({
        where: { evaluatedBy: 'system', createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { aiCostUsd: true },
      }),
      prisma.assessmentEvaluation.count({
        where: { evaluatedBy: 'system', createdAt: { gte: since }, inputTokens: { not: null } },
      }),
      prisma.assessmentAttempt.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { runCount: true },
      }),
    ])
    return {
      graded: gradings._count._all,
      withAi,
      aiCostUsd: gradings._sum.aiCostUsd ?? 0,
      codeRuns: runs._sum.runCount ?? 0,
    }
  },

  async latestEvaluation(attemptId) {
    const row = await prisma.assessmentEvaluation.findFirst({
      where: { attemptId },
      orderBy: { createdAt: 'desc' },
    })
    if (!row) return null
    return {
      rubricId: row.rubricId,
      rubricVersion: row.rubricVersion,
      criteria: row.criteria as unknown as StoredEvaluation['criteria'],
      score: row.score,
      result: row.result as StoredEvaluation['result'],
      feedback: row.feedback as unknown as string[],
      integrity: row.integrity as unknown as StoredEvaluation['integrity'],
      model: row.model ?? undefined,
      usage:
        row.inputTokens !== null && row.outputTokens !== null
          ? {
              inputTokens: row.inputTokens,
              outputTokens: row.outputTokens,
              costUsd: row.aiCostUsd ?? 0,
            }
          : undefined,
      evaluatedAt: row.createdAt.toISOString(),
      evaluatedBy: row.evaluatedBy,
    }
  },

  async createCredential(data) {
    const row = await prisma.credential.create({
      data: {
        id: data.id,
        userId: data.userId,
        attemptId: data.attemptId,
        assessmentSlug: data.slug,
        skillName: data.skillName,
        level: data.level,
        mode: data.mode,
        identityLevel: data.identityLevel,
        score: data.score,
        rubricId: data.rubricId,
        rubricVersion: data.rubricVersion,
        challengeId: data.challengeId,
        challengeVersion: data.challengeVersion,
        status: data.status,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
      },
    })
    return toCredential(row)
  },

  async getCredential(id) {
    const row = await prisma.credential.findUnique({ where: { id } })
    return row ? toCredential(row) : null
  },

  async credentialForAttempt(attemptId) {
    const row = await prisma.credential.findUnique({ where: { attemptId } })
    return row ? toCredential(row) : null
  },

  async listCredentials(userId) {
    const rows = await prisma.credential.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    })
    return rows.map(toCredential)
  },

  async updateCredential(id, patch) {
    const row = await prisma.credential.update({ where: { id }, data: patch })
    return toCredential(row)
  },

  async createAppeal(data) {
    return toAppeal(await prisma.assessmentAppeal.create({ data }))
  },

  async getAppeal(id) {
    const row = await prisma.assessmentAppeal.findUnique({ where: { id } })
    return row ? toAppeal(row) : null
  },

  async listAppeals(filter) {
    const rows = await prisma.assessmentAppeal.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.attemptId ? { attemptId: filter.attemptId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return rows.map(toAppeal)
  },

  async updateAppeal(id, patch) {
    return toAppeal(await prisma.assessmentAppeal.update({ where: { id }, data: patch }))
  },

  async audit(entry) {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        data: entry.data ? json(entry.data) : undefined,
      },
    })
  },
}
