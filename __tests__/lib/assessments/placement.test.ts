/**
 * @jest-environment node
 *
 * In production, candidate code never runs on the app server: without the
 * code runner, JavaScript, TypeScript and SQL close instead of falling back
 * to the in-process sandboxes, and grading waits rather than inventing a
 * score.
 */

import { getAssessment, isAvailable } from '@/lib/assessments/catalog'
import {
  buildBrief,
  evaluateDeterministic,
  practiceRun,
  runnerFor,
  usesExternalRunner,
  type Ctx,
} from '@/lib/assessments/engine'
import { judge0Health } from '@/lib/assessments/runners/judge0'
import { runInQuickJS } from '@/lib/assessments/runners/quickjs'
import { runSqlBatch } from '@/lib/assessments/runners/sqlite'
import { runSql } from '@/lib/assessments/runners/sql-runner'
import { LOCAL_ONLY_MESSAGE } from '@/lib/assessments/runners/local'
import { referenceQueries, solutionJs } from '@/test-utils/assessment-fixtures'

const RUNNER_VARS = ['JUDGE0_URL', 'JUDGE0_RAPIDAPI_KEY', 'JUDGE0_AUTH_TOKEN']
const saved = { ...process.env }
// Changed in place: other modules hold on to the same process.env object.
const env = process.env as Record<string, string | undefined>

beforeEach(() => {
  for (const name of RUNNER_VARS) delete env[name]
  env.NODE_ENV = 'production'
})

afterEach(() => {
  for (const key of Object.keys(env)) if (!(key in saved)) delete env[key]
  Object.assign(env, saved)
})

const ctx = (slug: string, challengeId: string): Ctx => ({
  def: getAssessment(slug)!,
  challengeId,
  seed: 77,
})

describe('production without a code runner', () => {
  it('closes JavaScript, TypeScript and SQL, and keeps the writing tasks open', async () => {
    for (const slug of ['javascript', 'typescript', 'sql', 'python']) {
      expect(await isAvailable(getAssessment(slug)!)).toBe(false)
    }
    for (const slug of ['business-writing', 'financial-analysis', 'ux-writing']) {
      expect(await isAvailable(getAssessment(slug)!)).toBe(true)
    }
  })

  it('never picks the in-process sandbox', async () => {
    expect((await runnerFor(getAssessment('javascript')!)).kind).toBe('none')
    expect(await usesExternalRunner(getAssessment('sql')!)).toBe(false)
    const health = await judge0Health()
    expect(health.javascriptRunsOn).toBe('unavailable')
    expect(health.sqlRunsOn).toBe('unavailable')
  })

  it('the local sandboxes refuse to run at all', async () => {
    const js = await runInQuickJS({
      code: 'function f() { return 1 }',
      functionName: 'f',
      calls: [],
    })
    expect(js).toMatchObject({ error: LOCAL_ONLY_MESSAGE, systemError: true })
    const sql = await runSqlBatch('CREATE TABLE t (x INTEGER);', [{ id: 'a', query: 'SELECT 1' }])
    expect(sql).toEqual([{ id: 'a', error: LOCAL_ONLY_MESSAGE }])
  })

  it('grading waits for the runner instead of scoring', async () => {
    const js = await evaluateDeterministic(ctx('javascript', 'ledger-summary'), {
      main: { code: solutionJs('ledger-summary', 77, false) },
      followup: { code: solutionJs('ledger-summary', 77, true) },
    })
    expect(js.systemError).toBe('The code runner is not set up yet.')
    expect(js.scores).toEqual({})

    const sql = await evaluateDeterministic(ctx('sql', 'sales-cleanup'), {
      main: { queries: referenceQueries('sales-cleanup', 'main') },
      followup: { queries: referenceQueries('sales-cleanup', 'followup') },
    })
    expect(sql.systemError).toBe('The code runner is not set up yet.')
  })

  it('practice runs say why nothing ran', async () => {
    const run = await practiceRun(ctx('sql', 'customer-retention'), 'main', {
      queries: { cohorts: 'SELECT 1' },
    })
    expect(run).toMatchObject({
      kind: 'sql',
      results: [{ id: 'cohorts', error: 'The code runner is not set up yet.' }],
    })
    expect(await runSql([{ setup: '', jobs: [{ id: 'a', query: 'SELECT 1' }] }], 'run')).toEqual({
      error: 'The code runner is not set up yet.',
      systemError: true,
    })
  })

  it('still shows the SQL brief: sample rows come from the data, nothing runs', async () => {
    const brief = await buildBrief(ctx('sql', 'customer-retention'), 'main', undefined)
    expect(brief.sql?.sample.customers).toHaveLength(8)
    expect(brief.sql?.sample.orders[0]).toHaveLength(4)
  })
})
