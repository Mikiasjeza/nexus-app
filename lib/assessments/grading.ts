/**
 * Turns criterion scores into a result. Deterministic evidence (hidden tests,
 * content checks, SQL results) is final: the AI grader and human reviewers
 * only score the criteria marked `ai:`. A failed deterministic gate cannot be
 * rescued by anything else.
 */

import type { AttemptResult, CriterionScore, IntegrityFlag, Rubric } from './types'

/** Score anchors the AI grader and reviewers use, as shares of a criterion. */
export const ANCHORS = [
  { value: 0, label: 'Missing', share: 0 },
  { value: 1, label: 'Weak', share: 0.25 },
  { value: 2, label: 'Partial', share: 0.5 },
  { value: 3, label: 'Solid', share: 0.75 },
  { value: 4, label: 'Strong', share: 1 },
] as const

export const anchorShare = (value: number) =>
  ANCHORS[Math.max(0, Math.min(4, Math.round(value)))].share

export type ScoreSource = 'deterministic' | 'judgement'

export function sourceKind(source: string): ScoreSource {
  return source.startsWith('ai:') ? 'judgement' : 'deterministic'
}

/** A deterministic score, from passed/total. Zero total counts as zero. */
export function shareOf(passed: number, total: number): number {
  return total > 0 ? passed / total : 0
}

export interface Judgement {
  score: number | null
  evidence: string[]
  notes?: string
  assessedBy: 'ai' | 'human' | 'none'
}

/**
 * Build the per-criterion list. `deterministic` is keyed by rubric source
 * (e.g. `tests:main:core`), `judgements` by criterion id.
 */
export function scoreCriteria(
  rubric: Rubric,
  deterministic: Record<
    string,
    { score: number; evidence: string[]; assessedBy: 'tests' | 'checks' }
  >,
  judgements: Record<string, Judgement>
): CriterionScore[] {
  return rubric.criteria.map((criterion) => {
    if (sourceKind(criterion.source) === 'deterministic') {
      const found = deterministic[criterion.source]
      return {
        id: criterion.id,
        label: criterion.label,
        weight: criterion.weight,
        score: found ? clamp01(found.score) : 0,
        evidence: found?.evidence ?? ['No result was recorded.'],
        assessedBy: found?.assessedBy ?? 'tests',
      }
    }
    const judged = judgements[criterion.id]
    return {
      id: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      score: judged && judged.score !== null ? clamp01(judged.score) : null,
      evidence: judged?.evidence ?? [],
      notes: judged?.notes,
      assessedBy: judged && judged.score !== null ? judged.assessedBy : 'none',
    }
  })
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))

/** Weighted 0–100, or null while any criterion is unassessed. */
export function weightedScore(criteria: CriterionScore[]): number | null {
  if (criteria.some((c) => c.score === null)) return null
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return 0
  const earned = criteria.reduce((sum, c) => sum + c.weight * (c.score ?? 0), 0)
  return Math.round((earned / total) * 100)
}

export interface Decision {
  score: number | null
  result: AttemptResult
  /** Gates that failed, by criterion label. */
  failedGates: string[]
  /** Why the attempt needs a person, when it does. */
  reviewReasons: string[]
}

export function decide(
  rubric: Rubric,
  criteria: CriterionScore[],
  integrity: IntegrityFlag[]
): Decision {
  const byId = new Map(criteria.map((c) => [c.id, c]))
  const failedGates: string[] = []
  let gatesPending = false
  for (const gate of rubric.gates) {
    const c = byId.get(gate.criterionId)
    if (!c) continue
    if (c.score === null) gatesPending = true
    else if (c.score < gate.minimum) failedGates.push(c.label)
  }
  const score = weightedScore(criteria)

  // A failed gate is final whatever else is still open.
  if (failedGates.length > 0) {
    return { score, result: 'NOT_PASSED', failedGates, reviewReasons: [] }
  }

  // Out of reach even with full marks on everything still open: final.
  const best = weightedScore(criteria.map((c) => ({ ...c, score: c.score ?? 1 })))!
  if (best / 100 < rubric.passThreshold) {
    return { score, result: 'NOT_PASSED', failedGates, reviewReasons: [] }
  }

  const reviewReasons: string[] = []
  const unassessed = criteria.filter((c) => c.score === null)
  if (unassessed.length > 0 || gatesPending) {
    reviewReasons.push(`Needs a reviewer to score: ${unassessed.map((c) => c.label).join(', ')}`)
  }

  if (score !== null && score / 100 < rubric.passThreshold) {
    return { score, result: 'NOT_PASSED', failedGates, reviewReasons: [] }
  }

  // Integrity concerns hold back a pass; they never turn one into a fail.
  for (const flag of integrity) {
    if (flag.severity === 'review') reviewReasons.push(flag.detail)
  }
  if (reviewReasons.length > 0) {
    return { score, result: 'PENDING_REVIEW', failedGates, reviewReasons }
  }
  return { score, result: 'PASSED', failedGates, reviewReasons }
}

/** Short, specific feedback lines from the scored criteria. */
export function feedbackFor(
  rubric: Rubric,
  criteria: CriterionScore[],
  decision: Decision
): string[] {
  const lines: string[] = []
  if (decision.failedGates.length > 0) {
    const gates = rubric.gates
      .filter((g) =>
        decision.failedGates.includes(criteria.find((c) => c.id === g.criterionId)?.label ?? '')
      )
      .map((g) => {
        const c = criteria.find((x) => x.id === g.criterionId)!
        return `${c.label} needs at least ${Math.round(g.minimum * 100)}% to pass; you reached ${Math.round((c.score ?? 0) * 100)}%.`
      })
    lines.push(...gates)
  }
  const ranked = criteria
    .filter((c) => c.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  const weakest = ranked[0]
  const strongest = ranked[ranked.length - 1]
  if (strongest && (strongest.score ?? 0) >= 0.75) lines.push(`Strongest area: ${strongest.label}.`)
  if (weakest && (weakest.score ?? 0) < 0.75 && weakest !== strongest) {
    lines.push(`Most room to grow: ${weakest.label}.`)
  }
  return lines
}
