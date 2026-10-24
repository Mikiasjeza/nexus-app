/**
 * Shared types for Nexus skill assessments.
 *
 * One platform, several workspaces: every assessment reuses the same attempt
 * lifecycle, evaluation record and credential; only the workspace, challenge
 * content and rubric change by skill. Challenge definitions (and their hidden
 * tests) live on the server only; the browser receives a `PublicBrief`.
 */

export type AssessmentMode = 'independent' | 'ai_assisted'

export type WorkspaceKind = 'code' | 'sql' | 'writing' | 'spreadsheet' | 'simulation'

export type CodeLanguage = 'javascript' | 'typescript' | 'python'

/** An attempt moves through main work, an adaptive follow-up, then explanation. */
export type Stage = 'main' | 'followup' | 'explain'
export const STAGES: Stage[] = ['main', 'followup', 'explain']

export type AttemptStatus =
  | 'CREATED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EVALUATING'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED_SYSTEM'

export type AttemptResult = 'PASSED' | 'NOT_PASSED' | 'INCONCLUSIVE' | 'PENDING_REVIEW'

export type CredentialStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED'

/** Self-asserted (A), identity-checked (B), supervised (C). Only A exists today. */
export type IdentityAssurance = 'A_SELF_ASSERTED' | 'B_IDENTITY_CHECKED' | 'C_SUPERVISED'

/** A call to the candidate's function and the answer the reference gives. */
export interface CodeTestCase {
  id: string
  /** Shown for visible tests only. */
  description: string
  args: unknown[]
  expected: unknown
}

export interface TestOutcome {
  id: string
  passed: boolean
  /** Visible tests only: what the candidate's code returned or threw. */
  actual?: unknown
  error?: string
}

export interface RunReport {
  ok: boolean
  /** A compile/syntax problem or sandbox failure, before any test ran. */
  error?: string
  outcomes: TestOutcome[]
  /** Captured console output, visible runs only, truncated. */
  logs?: string
  durationMs: number
}

/** A table the SQL workspace shows: name, columns and the visible sample rows. */
export interface SqlTable {
  name: string
  columns: { name: string; type: string; note?: string }[]
}

export interface SqlTask {
  id: string
  prompt: string
  /** Whether row order is part of the answer (an ORDER BY was asked for). */
  ordered: boolean
}

/** Rubric criterion: how one part of the score is produced. */
export interface Criterion {
  id: string
  label: string
  weight: number
  /**
   * `tests:<stage>` from deterministic hidden tests, `checks:<stage>` from
   * deterministic content checks, `ai:<topic>` from the AI grader (or a
   * human reviewer when AI is unavailable).
   */
  source: string
  description: string
}

export interface Rubric {
  id: string
  version: number
  criteria: Criterion[]
  /** Share of the weighted total needed to pass. */
  passThreshold: number
  /** Deterministic floor: these criteria must each reach this share to pass. */
  gates: { criterionId: string; minimum: number }[]
}

export interface CriterionScore {
  id: string
  label: string
  weight: number
  /** 0–1, or null when this criterion could not be assessed. */
  score: number | null
  evidence: string[]
  notes?: string
  assessedBy: 'tests' | 'checks' | 'ai' | 'human' | 'none'
}

export interface IntegrityFlag {
  code: string
  detail: string
  /** Flags never accuse; `review` ones send the attempt to a human. */
  severity: 'info' | 'review'
}

export interface EvaluationRecord {
  rubricId: string
  rubricVersion: number
  criteria: CriterionScore[]
  /** Weighted 0–100 over all criteria, or null when any criterion is unassessed. */
  score: number | null
  result: AttemptResult
  feedback: string[]
  integrity: IntegrityFlag[]
  model?: string
  /** The AI grading call's tokens and estimated cost, when one was made. */
  usage?: { inputTokens: number; outputTokens: number; costUsd: number }
  evaluatedAt: string
}

/** What the browser gets for the stage in front of the candidate. */
export interface PublicBrief {
  challengeId: string
  challengeVersion: number
  title: string
  skillName: string
  workspace: WorkspaceKind
  language?: CodeLanguage | 'sql'
  level: string
  stage: Stage
  instructions: string[]
  /** Code or writing to start from: the starter, or the previous stage's work. */
  starter?: string
  /** SQL: the previous stage's queries, by task id. */
  starterQueries?: Record<string, string>
  /** Code: the function the candidate must write. */
  functionName?: string
  visibleTests?: { id: string; description: string; args: unknown[]; expected: unknown }[]
  sql?: { tables: SqlTable[]; sample: Record<string, unknown[][]>; tasks: SqlTask[] }
  writing?: { minWords: number; maxWords: number; facts: string[] }
  explainQuestions?: string[]
}

/** What a candidate saves or submits for one stage. Which fields apply depends on the workspace. */
export interface StageWork {
  code?: string
  queries?: Record<string, string>
  text?: string
  answers?: string[]
}
