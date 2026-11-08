/**
 * What every SQL challenge provides. The candidate writes one query per
 * task against their own seeded dataset; the follow-up re-runs those
 * queries on a changed export (catching hard-coded answers) and adds a
 * task. Trusted reference queries produce the expected results, so the
 * answer key is always computed from the same data the candidate sees.
 */

import type { Rubric, SqlTable, SqlTask, Stage } from '../types'

export type SqlTaskDef = SqlTask & { reference: string; stage: 'main' | 'followup' }

export interface SqlChallenge {
  id: string
  version: number
  /** Short name shown in the workspace, e.g. "Sales cleanup". */
  title: string
  tables: SqlTable[]
  /** The dataset as a setup script. `changed` is the newer export for the follow-up. */
  dataset: (seed: number, variant: 'visible' | 'changed') => string
  tasks: SqlTaskDef[]
  instructions: (stage: Stage) => string[]
  explainQuestions: string[]
}

/** The tasks shown in a stage: the main ones, then all of them in the follow-up. */
export function tasksFor(challenge: SqlChallenge, stage: Stage): SqlTask[] {
  const tasks =
    stage === 'main' ? challenge.tasks.filter((t) => t.stage === 'main') : challenge.tasks
  return tasks.map(({ id, prompt, ordered }) => ({ id, prompt, ordered }))
}

export const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`

/** Shared by every SQL challenge. Initial weights; see docs/assessments.md. */
export const SQL_RUBRIC: Rubric = {
  id: 'sql-core',
  version: 2,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Numerical accuracy',
      weight: 45,
      source: 'sql:main',
      description: 'Each main task returns the right result on your dataset.',
    },
    {
      id: 'robustness',
      label: 'Changed data and new request',
      weight: 20,
      source: 'sql:followup',
      description: 'The same queries stay correct on a newer export; the new request is answered.',
    },
    {
      id: 'insight',
      label: 'Interpretation and recommendation',
      weight: 25,
      source: 'ai:insight',
      description: 'A sound reading of the results and a sensible, specific recommendation.',
    },
    {
      id: 'explanation',
      label: 'Explanation of data handling',
      weight: 10,
      source: 'ai:explanation',
      description:
        'Explains accurately how the queries dealt with duplicates, missing or inconsistent values and rows that must not count.',
    },
  ],
  gates: [{ criterionId: 'accuracy', minimum: 0.6 }],
}
