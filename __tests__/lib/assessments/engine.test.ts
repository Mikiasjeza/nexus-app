/**
 * @jest-environment node
 */

import { getAssessment } from '@/lib/assessments/catalog'
import { buildBrief, evaluateDeterministic, practiceRun } from '@/lib/assessments/engine'
import {
  ledgerHiddenTests,
  referenceLedger,
  ledgerParams,
} from '@/lib/assessments/challenges/ledger'
import { emailChecks, mentionsDate } from '@/lib/assessments/challenges/client-email'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInQuickJS } from '@/lib/assessments/runners/quickjs'
import { javascriptProgram } from '@/lib/assessments/runners/judge0'
import { runSqlBatch, validateReadQuery } from '@/lib/assessments/runners/sqlite'
import { sameRows, sameValue } from '@/lib/assessments/compare'
import {
  delayEmail,
  ledgerSolutionJs,
  ledgerSolutionTs,
  salesQueries,
} from '@/test-utils/assessment-fixtures'

jest.setTimeout(30_000)

const SEED = 424242

describe('ledger challenge', () => {
  it('generates different hidden tests for different seeds', () => {
    const a = ledgerHiddenTests(1, 'main')
    const b = ledgerHiddenTests(2, 'main')
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b))
    expect(JSON.stringify(ledgerHiddenTests(1, 'main'))).toEqual(JSON.stringify(a))
  })

  it('applies the fee strictly above the threshold', () => {
    const params = { feeThreshold: 100, fee: 2.5 }
    const out = referenceLedger(
      [
        { id: '1', account: 'ops', type: 'debit', amount: 100 },
        { id: '2', account: 'ops', type: 'debit', amount: 100.01 },
      ],
      params,
      false
    )
    expect(out.ops).toEqual({ balance: -202.51, count: 2 })
  })

  it('counts the first record of a duplicated id even when it is malformed', () => {
    const out = referenceLedger(
      [
        { id: 'x', account: 'ops', type: 'credit', amount: 'n/a' },
        { id: 'x', account: 'ops', type: 'credit', amount: 50 },
      ],
      ledgerParams(SEED),
      true
    )
    expect(out).toEqual({})
  })

  it('a correct JavaScript answer passes every hidden test', async () => {
    const def = getAssessment('javascript')!
    const result = await evaluateDeterministic(def, SEED, {
      main: { code: ledgerSolutionJs(SEED, false) },
      followup: { code: ledgerSolutionJs(SEED, true) },
    })
    expect(result.systemError).toBeUndefined()
    expect(result.scores['tests:main:core'].score).toBe(1)
    expect(result.scores['tests:main:edge'].score).toBe(1)
    expect(result.scores['tests:followup'].score).toBe(1)
  })

  it('a correct TypeScript answer passes too', async () => {
    const def = getAssessment('typescript')!
    const result = await evaluateDeterministic(def, SEED, {
      main: { code: ledgerSolutionTs(SEED, false) },
      followup: { code: ledgerSolutionTs(SEED, true) },
    })
    expect(result.scores['tests:main:core'].score).toBe(1)
    expect(result.scores['tests:followup'].score).toBe(1)
  })

  it('an answer that ignores the follow-up rule loses the follow-up tests', async () => {
    const def = getAssessment('javascript')!
    const result = await evaluateDeterministic(def, SEED, {
      main: { code: ledgerSolutionJs(SEED, false) },
      followup: { code: ledgerSolutionJs(SEED, false) },
    })
    expect(result.scores['tests:followup'].score).toBeLessThan(1)
  })

  it('scores empty work as zero without a system error', async () => {
    const def = getAssessment('javascript')!
    const result = await evaluateDeterministic(def, SEED, {})
    expect(result.systemError).toBeUndefined()
    expect(result.scores['tests:main:core'].score).toBe(0)
  })

  it('practice runs show visible examples only', async () => {
    const def = getAssessment('javascript')!
    const run = await practiceRun(def, SEED, 'main', { code: ledgerSolutionJs(SEED, false) })
    expect(run.kind).toBe('code')
    if (run.kind !== 'code') return
    expect(run.report.outcomes.every((o) => o.id.startsWith('v-'))).toBe(true)
    expect(run.report.outcomes.every((o) => o.passed)).toBe(true)
  })

  it('the follow-up brief starts from the submitted main code', async () => {
    const def = getAssessment('javascript')!
    const brief = await buildBrief(def, SEED, 'followup', { code: 'function summarizeLedger() {}' })
    expect(brief.starter).toBe('function summarizeLedger() {}')
    expect(brief.visibleTests?.some((t) => t.id === 'v-dupe')).toBe(true)
  })
})

describe('QuickJS sandbox', () => {
  const call = (code: string) =>
    runInQuickJS({ code, functionName: 'f', calls: [{ id: 'a', args: [] }], timeoutMsPerCall: 300 })

  it('has no access to Node', async () => {
    const out = await call('function f() { return [typeof process, typeof require, typeof fetch] }')
    expect(out.results[0].value).toEqual(['undefined', 'undefined', 'undefined'])
  })

  it('stops infinite loops', async () => {
    const out = await call('function f() { while (true) {} }')
    expect(out.results[0].error).toBe('Timed out')
  })

  it('stops runaway top-level code', async () => {
    const out = await call('while (true) {}\nfunction f() {}')
    expect(out.error).toBe('Timed out')
  })

  it('cannot tamper with how answers leave the sandbox', async () => {
    const out = await call('JSON.stringify = () => "\\"pass\\""\nfunction f() { return 1 }')
    expect(out.results[0].value).toBe(1)
  })
})

describe('Judge0 JavaScript program', () => {
  it('runs the calls and reports through the real JSON functions', () => {
    const tests = ledgerHiddenTests(SEED, 'main')
    // The candidate breaks JSON.stringify; the harness kept its own copy.
    const program = javascriptProgram(
      `${ledgerSolutionJs(SEED, false)}\nJSON.stringify = () => '"pass"'`,
      'summarizeLedger',
      tests.map((t) => ({ id: t.id, args: t.args }))
    )
    const dir = mkdtempSync(path.join(tmpdir(), 'nexus-js-'))
    const file = path.join(dir, 'program.js')
    writeFileSync(file, program)
    const stdout = execFileSync(process.execPath, [file]).toString()
    rmSync(dir, { recursive: true, force: true })
    const marker = '<<NEXUS-RESULTS>>'
    const parsed = JSON.parse(
      stdout.slice(stdout.lastIndexOf(marker) + marker.length).split('\n')[0]
    )
    for (const test of tests) {
      const result = parsed.results.find((r: { id: string }) => r.id === test.id)
      expect(sameValue(result.value, test.expected)).toBe(true)
    }
  })
})

describe('SQL challenge', () => {
  it('rejects anything but one read query', () => {
    expect(validateReadQuery('DROP TABLE orders').error).toBeDefined()
    expect(validateReadQuery('SELECT 1; DELETE FROM orders').error).toBeDefined()
    expect(validateReadQuery("SELECT ';' AS x -- trailing\n").query).toBe("SELECT ';' AS x")
  })

  it('kills runaway recursive queries', async () => {
    const [res] = await runSqlBatch('CREATE TABLE t (x INTEGER);', [
      {
        id: 'loop',
        query:
          'WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r) SELECT count(*) FROM r',
      },
    ])
    expect(res.error).toBeDefined()
  })

  it('the reference queries score full marks on both exports', async () => {
    const def = getAssessment('sql')!
    const result = await evaluateDeterministic(def, SEED, {
      main: { queries: salesQueries('main') },
      followup: { queries: salesQueries('followup') },
    })
    expect(result.systemError).toBeUndefined()
    expect(result.scores['sql:main'].score).toBe(1)
    expect(result.scores['sql:followup'].score).toBe(1)
  })

  it('a query that forgets the duplicates is marked wrong', async () => {
    const def = getAssessment('sql')!
    const queries = {
      ...salesQueries('main'),
      revenue: "SELECT ROUND(SUM(amount), 2) AS revenue FROM orders WHERE status = 'completed'",
    }
    const result = await evaluateDeterministic(def, SEED, { main: { queries } })
    expect(result.scores['sql:main'].score).toBeCloseTo(2 / 3)
  })
})

describe('writing challenge', () => {
  it('finds dates in common formats', () => {
    expect(mentionsDate('due June 5th', { day: 5, month: 6 })).toBe(true)
    expect(mentionsDate('due 5 June', { day: 5, month: 6 })).toBe(true)
    expect(mentionsDate('due 2026-06-05', { day: 5, month: 6 })).toBe(true)
    expect(mentionsDate('due June 15', { day: 5, month: 6 })).toBe(false)
  })

  it('a good email passes every fact check', () => {
    expect(emailChecks(SEED, 'main', delayEmail(SEED, false)).every((c) => c.passed)).toBe(true)
    expect(emailChecks(SEED, 'followup', delayEmail(SEED, true)).every((c) => c.passed)).toBe(true)
  })

  it('flags placeholders', () => {
    const text = delayEmail(SEED, false).replace('Sam', '[Your name]')
    expect(emailChecks(SEED, 'main', text).find((c) => c.id === 'no-placeholders')?.passed).toBe(
      false
    )
  })
})

describe('answer comparison', () => {
  it('tolerates rounding but not extra keys', () => {
    expect(sameValue({ a: 1.004 }, { a: 1 })).toBe(true)
    expect(sameValue({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  })

  it('compares unordered result sets as multisets', () => {
    expect(sameRows([[2], [1]], [[1], [2]], false)).toBe(true)
    expect(sameRows([[2], [1]], [[1], [2]], true)).toBe(false)
    expect(sameRows([[1], [1]], [[1], [2]], false)).toBe(false)
  })
})
