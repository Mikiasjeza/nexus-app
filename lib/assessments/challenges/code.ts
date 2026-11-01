/**
 * What every coding challenge provides, so one engine can run any of them in
 * any supported language. A candidate writes one function; hidden tests call
 * it with JSON arguments and compare the JSON it returns with the answer
 * from a trusted reference implementation on the server.
 *
 * Coding assessments draw one challenge from a pool per attempt, so a leaked
 * task (or a friend's solution) covers only part of what a candidate may get.
 */

import type { CodeLanguage, CodeTestCase, Rubric, Stage } from '../types'

export type GroupedTest = CodeTestCase & { group: 'core' | 'edge' }

export interface CodeChallenge {
  id: string
  version: number
  /** Short name shown in the workspace, e.g. "Log triage". */
  title: string
  functionName: (language: CodeLanguage) => string
  starter: (language: CodeLanguage) => string
  instructions: (seed: number, stage: Stage, language: CodeLanguage) => string[]
  /** Examples the candidate can run. Never the hidden tests. */
  visibleTests: (seed: number, stage: 'main' | 'followup') => CodeTestCase[]
  /** Deterministic hidden tests for a stage, different for every seed. */
  hiddenTests: (seed: number, stage: 'main' | 'followup') => GroupedTest[]
  explainQuestions: string[]
}

/** Shared by every coding challenge. Initial weights; see docs/assessments.md. */
export const CODE_RUBRIC: Rubric = {
  id: 'code-core',
  version: 1,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'correctness',
      label: 'Functional correctness',
      weight: 40,
      source: 'tests:main:core',
      description: 'Hidden tests on ordinary inputs.',
    },
    {
      id: 'quality',
      label: 'Code quality and maintainability',
      weight: 20,
      source: 'ai:quality',
      description: 'Readable structure, clear names, no needless complexity.',
    },
    {
      id: 'edge-cases',
      label: 'Error handling and edge cases',
      weight: 15,
      source: 'tests:main:edge',
      description: 'Hidden tests on malformed input, boundaries and empty input.',
    },
    {
      id: 'follow-up',
      label: 'Live modification',
      weight: 15,
      source: 'tests:followup',
      description: 'Hidden tests after the requirement changes.',
    },
    {
      id: 'explanation',
      label: 'Explanation and reasoning',
      weight: 10,
      source: 'ai:explanation',
      description: 'Answers match the submitted code and show understanding.',
    },
  ],
  gates: [
    { criterionId: 'correctness', minimum: 0.7 },
    { criterionId: 'follow-up', minimum: 0.5 },
  ],
}

/** Both naming styles, so each language reads naturally. */
export function namesFor(camel: string, snake: string) {
  return (language: CodeLanguage) => (language === 'python' ? snake : camel)
}
