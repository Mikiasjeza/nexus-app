/**
 * What every writing challenge provides: an email, a memo, a plan or a set
 * of interface strings, with seeded facts. Deterministic checks confirm
 * the facts, figures and limits; the AI grader (or a person) scores the
 * judgement criteria against the assessment's published rubric.
 */

import type { BriefTable, Stage, StageWork, WritingField, WritingText } from '../types'
import type { CheckResult } from './text'

export interface WritingChallenge {
  id: string
  version: number
  /** Short name shown in the workspace, e.g. "Project delay email". */
  title: string
  instructions: (seed: number, stage: Stage) => string[]
  /** The facts panel for a stage. */
  facts: (seed: number, stage: 'main' | 'followup') => string[]
  table?: (seed: number, stage: 'main' | 'followup') => BriefTable
  /** Short answers (figures, interface strings), when the task has them. */
  fields?: (seed: number, stage: 'main' | 'followup') => WritingField[]
  /** The long answer, when the task has one. */
  text?: WritingText
  checks: (seed: number, stage: 'main' | 'followup', work: StageWork) => CheckResult[]
  explainQuestions: string[]
  /** What each stage's work is called in evidence and for the grader. */
  workLabels: { main: string; followup: string }
}

/** Every field id a challenge can ask for, across both stages. */
export function fieldIds(challenge: WritingChallenge, seed: number): string[] {
  if (!challenge.fields) return []
  const ids = [...challenge.fields(seed, 'main'), ...challenge.fields(seed, 'followup')].map(
    (f) => f.id
  )
  return [...new Set(ids)]
}
