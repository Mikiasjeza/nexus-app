/**
 * Storage for assessment records behind one interface: Postgres through
 * Prisma in production (prisma-store.ts) and an in-memory version for tests.
 * The service layer only talks to this interface.
 */

import type {
  AssessmentMode,
  AttemptResult,
  AttemptStatus,
  CredentialStatus,
  EvaluationRecord,
  IdentityAssurance,
  Stage,
  StageWork,
} from './types'

export interface AttemptRecord {
  id: string
  userId: string
  slug: string
  challengeId: string
  challengeVersion: number
  rubricId: string
  rubricVersion: number
  mode: AssessmentMode
  seed: number
  status: AttemptStatus
  stage: Stage
  drafts: Partial<Record<Stage, StageWork>>
  submissions: Partial<Record<Stage, { work: StageWork; hash: string; submittedAt: Date }>>
  runCount: number
  result: AttemptResult | null
  score: number | null
  createdAt: Date
  startedAt: Date | null
  deadlineAt: Date | null
  submittedAt: Date | null
  completedAt: Date | null
}

export type NewAttempt = Pick<
  AttemptRecord,
  | 'userId'
  | 'slug'
  | 'challengeId'
  | 'challengeVersion'
  | 'rubricId'
  | 'rubricVersion'
  | 'mode'
  | 'seed'
  | 'status'
>

export type AttemptPatch = Partial<
  Pick<
    AttemptRecord,
    | 'status'
    | 'stage'
    | 'drafts'
    | 'runCount'
    | 'result'
    | 'score'
    | 'startedAt'
    | 'deadlineAt'
    | 'submittedAt'
    | 'completedAt'
  >
>

export interface AttemptEventRecord {
  type: string
  stage: Stage
  data: Record<string, unknown>
  at: Date
}

export interface StoredEvaluation extends EvaluationRecord {
  evaluatedBy: string
}

export interface CredentialRecord {
  id: string
  userId: string
  attemptId: string
  slug: string
  skillName: string
  level: string
  mode: AssessmentMode
  identityLevel: IdentityAssurance
  score: number
  rubricId: string
  rubricVersion: number
  challengeId: string
  challengeVersion: number
  status: Exclude<CredentialStatus, 'EXPIRED'>
  issuedAt: Date
  expiresAt: Date
  revokedAt: Date | null
  revokedReason: string | null
}

export type AppealStatus = 'OPEN' | 'UPHELD' | 'REJECTED'

export interface AppealRecord {
  id: string
  attemptId: string
  userId: string
  reason: string
  status: AppealStatus
  resolution: string | null
  resolvedBy: string | null
  createdAt: Date
  resolvedAt: Date | null
}

export interface CostSummary {
  /** Automatic gradings (not reviewer passes). */
  graded: number
  /** Of those, how many made an AI call. */
  withAi: number
  aiCostUsd: number
  /** Runs candidates made while working, across attempts started in the window. */
  codeRuns: number
}

/** Raised when an attempt changed under us (e.g. a double submit). */
export class ConflictError extends Error {
  constructor(message = 'This attempt changed in another tab. Reload to continue.') {
    super(message)
  }
}

export interface AssessmentStore {
  createAttempt(data: NewAttempt): Promise<AttemptRecord>
  getAttempt(id: string): Promise<AttemptRecord | null>
  listAttempts(userId: string, slug?: string): Promise<AttemptRecord[]>
  listAttemptsByStatus(status: AttemptStatus, limit?: number): Promise<AttemptRecord[]>
  /** Applies the patch only if the attempt is still in `expected` status; else ConflictError. */
  updateAttempt(id: string, expected: AttemptStatus, patch: AttemptPatch): Promise<AttemptRecord>
  /** Locks one stage's work. A second submission for the same stage is a ConflictError. */
  saveSubmission(attemptId: string, stage: Stage, work: StageWork, hash: string): Promise<void>
  addEvents(attemptId: string, events: AttemptEventRecord[]): Promise<void>
  listEvents(attemptId: string): Promise<AttemptEventRecord[]>
  countEvents(attemptId: string): Promise<number>
  addEvaluation(attemptId: string, evaluation: StoredEvaluation): Promise<void>
  /** System gradings since a date, with their AI cost and the practice runs they used. */
  costSummary(since: Date): Promise<CostSummary>
  latestEvaluation(attemptId: string): Promise<StoredEvaluation | null>
  createCredential(
    data: Omit<CredentialRecord, 'revokedAt' | 'revokedReason'>
  ): Promise<CredentialRecord>
  getCredential(id: string): Promise<CredentialRecord | null>
  credentialForAttempt(attemptId: string): Promise<CredentialRecord | null>
  listCredentials(userId: string): Promise<CredentialRecord[]>
  updateCredential(
    id: string,
    patch: Partial<Pick<CredentialRecord, 'status' | 'revokedAt' | 'revokedReason'>>
  ): Promise<CredentialRecord>
  createAppeal(data: Pick<AppealRecord, 'attemptId' | 'userId' | 'reason'>): Promise<AppealRecord>
  getAppeal(id: string): Promise<AppealRecord | null>
  listAppeals(filter: { status?: AppealStatus; attemptId?: string }): Promise<AppealRecord[]>
  updateAppeal(
    id: string,
    patch: Pick<AppealRecord, 'status' | 'resolution' | 'resolvedBy' | 'resolvedAt'>
  ): Promise<AppealRecord>
  audit(entry: {
    actor: string
    action: string
    targetType: string
    targetId: string
    data?: Record<string, unknown>
  }): Promise<void>
}

const clone = <T>(value: T): T => structuredClone(value)

/** In-memory store for tests and local experiments. Not shared between server instances. */
export class MemoryAssessmentStore implements AssessmentStore {
  attempts = new Map<string, AttemptRecord>()
  events = new Map<string, AttemptEventRecord[]>()
  evaluations = new Map<string, StoredEvaluation[]>()
  credentials = new Map<string, CredentialRecord>()
  appeals = new Map<string, AppealRecord>()
  auditLog: { actor: string; action: string; targetType: string; targetId: string }[] = []
  private counter = 0

  private nextId(prefix: string) {
    return `${prefix}_${(++this.counter).toString(36)}`
  }

  async createAttempt(data: NewAttempt) {
    const record: AttemptRecord = {
      ...data,
      id: this.nextId('att'),
      stage: 'main',
      drafts: {},
      submissions: {},
      runCount: 0,
      result: null,
      score: null,
      createdAt: new Date(),
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      completedAt: null,
    }
    this.attempts.set(record.id, record)
    return clone(record)
  }

  async getAttempt(id: string) {
    const found = this.attempts.get(id)
    return found ? clone(found) : null
  }

  async listAttempts(userId: string, slug?: string) {
    return [...this.attempts.values()]
      .filter((a) => a.userId === userId && (!slug || a.slug === slug))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone)
  }

  async listAttemptsByStatus(status: AttemptStatus, limit = 100) {
    return [...this.attempts.values()]
      .filter((a) => a.status === status)
      .slice(0, limit)
      .map(clone)
  }

  async updateAttempt(id: string, expected: AttemptStatus, patch: AttemptPatch) {
    const current = this.attempts.get(id)
    if (!current || current.status !== expected) throw new ConflictError()
    const next = { ...current, ...clone(patch) }
    this.attempts.set(id, next)
    return clone(next)
  }

  async saveSubmission(attemptId: string, stage: Stage, work: StageWork, hash: string) {
    const current = this.attempts.get(attemptId)
    if (!current || current.submissions[stage])
      throw new ConflictError('This step was already submitted.')
    current.submissions[stage] = { work: clone(work), hash, submittedAt: new Date() }
  }

  async addEvents(attemptId: string, events: AttemptEventRecord[]) {
    const list = this.events.get(attemptId) ?? []
    list.push(...clone(events))
    this.events.set(attemptId, list)
  }

  async listEvents(attemptId: string) {
    return clone(this.events.get(attemptId) ?? [])
  }

  async countEvents(attemptId: string) {
    return this.events.get(attemptId)?.length ?? 0
  }

  async addEvaluation(attemptId: string, evaluation: StoredEvaluation) {
    const list = this.evaluations.get(attemptId) ?? []
    list.push(clone(evaluation))
    this.evaluations.set(attemptId, list)
  }

  async costSummary(since: Date): Promise<CostSummary> {
    const gradings = [...this.evaluations.values()]
      .flat()
      .filter((e) => e.evaluatedBy === 'system' && new Date(e.evaluatedAt) >= since)
    const attempts = [...this.attempts.values()].filter((a) => a.createdAt >= since)
    return {
      graded: gradings.length,
      withAi: gradings.filter((e) => e.usage).length,
      aiCostUsd: gradings.reduce((sum, e) => sum + (e.usage?.costUsd ?? 0), 0),
      codeRuns: attempts.reduce((sum, a) => sum + a.runCount, 0),
    }
  }

  async latestEvaluation(attemptId: string) {
    const list = this.evaluations.get(attemptId)
    return list?.length ? clone(list[list.length - 1]) : null
  }

  async createCredential(data: Omit<CredentialRecord, 'revokedAt' | 'revokedReason'>) {
    const record: CredentialRecord = { ...data, revokedAt: null, revokedReason: null }
    this.credentials.set(record.id, record)
    return clone(record)
  }

  async getCredential(id: string) {
    const found = this.credentials.get(id)
    return found ? clone(found) : null
  }

  async credentialForAttempt(attemptId: string) {
    const found = [...this.credentials.values()].find((c) => c.attemptId === attemptId)
    return found ? clone(found) : null
  }

  async listCredentials(userId: string) {
    return [...this.credentials.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
      .map(clone)
  }

  async updateCredential(
    id: string,
    patch: Partial<Pick<CredentialRecord, 'status' | 'revokedAt' | 'revokedReason'>>
  ) {
    const current = this.credentials.get(id)
    if (!current) throw new Error('Credential not found')
    const next = { ...current, ...patch }
    this.credentials.set(id, next)
    return clone(next)
  }

  async createAppeal(data: Pick<AppealRecord, 'attemptId' | 'userId' | 'reason'>) {
    const record: AppealRecord = {
      ...data,
      id: this.nextId('apl'),
      status: 'OPEN',
      resolution: null,
      resolvedBy: null,
      createdAt: new Date(),
      resolvedAt: null,
    }
    this.appeals.set(record.id, record)
    return clone(record)
  }

  async getAppeal(id: string) {
    const found = this.appeals.get(id)
    return found ? clone(found) : null
  }

  async listAppeals(filter: { status?: AppealStatus; attemptId?: string }) {
    return [...this.appeals.values()]
      .filter(
        (a) =>
          (!filter.status || a.status === filter.status) &&
          (!filter.attemptId || a.attemptId === filter.attemptId)
      )
      .map(clone)
  }

  async updateAppeal(
    id: string,
    patch: Pick<AppealRecord, 'status' | 'resolution' | 'resolvedBy' | 'resolvedAt'>
  ) {
    const current = this.appeals.get(id)
    if (!current) throw new Error('Appeal not found')
    const next = { ...current, ...patch }
    this.appeals.set(id, next)
    return clone(next)
  }

  async audit(entry: { actor: string; action: string; targetType: string; targetId: string }) {
    this.auditLog.push({ ...entry })
  }
}
