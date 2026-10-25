/**
 * @jest-environment node
 */

import { getAssessment, pickChallenge } from '@/lib/assessments/catalog'
import { buildBrief, evaluateDeterministic, practiceRun, type Ctx } from '@/lib/assessments/engine'
import { CODE_CHALLENGES } from '@/lib/assessments/challenges'
import {
  ledgerHiddenTests,
  referenceLedger,
  ledgerParams,
} from '@/lib/assessments/challenges/ledger'
import { referenceTriage } from '@/lib/assessments/challenges/log-triage'
import { referencePlan } from '@/lib/assessments/challenges/reorder-plan'
import { emailChecks, mentionsDate } from '@/lib/assessments/challenges/client-email'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInQuickJS } from '@/lib/assessments/runners/quickjs'
import { javascriptProgram, newestLanguage, pickLanguages } from '@/lib/assessments/runners/judge0'
import { runInPyodide } from '@/lib/assessments/runners/pyodide-dev'
import { runSqlBatch, validateReadQuery } from '@/lib/assessments/runners/sqlite'
import { sameRows, sameValue } from '@/lib/assessments/compare'
import {
  delayEmail,
  ledgerSolutionJs,
  ledgerSolutionTs,
  salesQueries,
  solutionJs,
  solutionPy,
} from '@/test-utils/assessment-fixtures'

jest.setTimeout(60_000)

const SEED = 424242
const CHALLENGE_IDS = Object.keys(CODE_CHALLENGES)

const ctxFor = (slug: string, challengeId: string, seed = SEED): Ctx => ({
  def: getAssessment(slug)!,
  challengeId,
  seed,
})

describe('challenge pool', () => {
  it('draws different challenges for different seeds and avoids repeats', () => {
    const def = getAssessment('python')!
    const drawn = new Set([0, 1, 2, 3, 4, 5].map((seed) => pickChallenge(def, seed)))
    expect(drawn.size).toBe(CHALLENGE_IDS.length)
    expect(pickChallenge(def, 7, ['ledger-summary', 'log-triage'])).toBe('reorder-plan')
    // With everything used, it still draws something.
    expect(CHALLENGE_IDS).toContain(pickChallenge(def, 7, CHALLENGE_IDS))
  })

  it.each(CHALLENGE_IDS)('%s: hidden tests differ by seed and repeat for the same seed', (id) => {
    const challenge = CODE_CHALLENGES[id]
    const a = JSON.stringify(challenge.hiddenTests(1, 'main'))
    expect(a).not.toEqual(JSON.stringify(challenge.hiddenTests(2, 'main')))
    expect(a).toEqual(JSON.stringify(challenge.hiddenTests(1, 'main')))
  })

  it.each(CHALLENGE_IDS)('%s: visible examples never repeat hidden tests', (id) => {
    const challenge = CODE_CHALLENGES[id]
    for (const stage of ['main', 'followup'] as const) {
      const visible = new Set(
        challenge.visibleTests(SEED, stage).map((t) => JSON.stringify(t.args))
      )
      for (const hidden of challenge.hiddenTests(SEED, stage)) {
        expect(visible.has(JSON.stringify(hidden.args))).toBe(false)
      }
    }
  })
})

describe.each(CHALLENGE_IDS)('%s in JavaScript', (challengeId) => {
  it('a correct answer passes every hidden test', async () => {
    const result = await evaluateDeterministic(ctxFor('javascript', challengeId), {
      main: { code: solutionJs(challengeId, SEED, false) },
      followup: { code: solutionJs(challengeId, SEED, true) },
    })
    expect(result.systemError).toBeUndefined()
    expect(result.scores['tests:main:core'].score).toBe(1)
    expect(result.scores['tests:main:edge'].score).toBe(1)
    expect(result.scores['tests:followup'].score).toBe(1)
  })

  it('ignoring the follow-up loses follow-up tests but keeps the main ones', async () => {
    const result = await evaluateDeterministic(ctxFor('javascript', challengeId), {
      main: { code: solutionJs(challengeId, SEED, false) },
      followup: { code: solutionJs(challengeId, SEED, false) },
    })
    expect(result.scores['tests:main:core'].score).toBe(1)
    expect(result.scores['tests:followup'].score).toBeLessThan(1)
  })

  it('practice runs show and pass the visible examples only', async () => {
    const run = await practiceRun(ctxFor('javascript', challengeId), 'main', {
      code: solutionJs(challengeId, SEED, false),
    })
    if (run.kind !== 'code') throw new Error('expected a code run')
    expect(run.report.outcomes.length).toBeGreaterThan(0)
    expect(run.report.outcomes.every((o) => o.id.startsWith('v-') && o.passed)).toBe(true)
  })
})

describe.each(CHALLENGE_IDS)('%s in Python (real CPython via Pyodide)', (challengeId) => {
  const run = async (followup: boolean, stage: 'main' | 'followup') => {
    const challenge = CODE_CHALLENGES[challengeId]
    const tests = challenge.hiddenTests(SEED, stage)
    const result = await runInPyodide({
      code: solutionPy(challengeId, SEED, followup),
      functionName: challenge.functionName('python'),
      calls: tests.map((t) => ({ id: t.id, args: t.args })),
    })
    const passed = tests.filter((t) => {
      const r = result.results.find((x) => x.id === t.id)
      return r && !r.error && sameValue(r.value, t.expected)
    })
    return { result, passed: passed.length, total: tests.length }
  }

  it('a correct answer passes every hidden test, before and after the follow-up', async () => {
    const main = await run(false, 'main')
    expect(main.result.error).toBeUndefined()
    expect(main.passed).toBe(main.total)
    const follow = await run(true, 'followup')
    expect(follow.passed).toBe(follow.total)
  })

  it('the main answer alone fails some follow-up tests', async () => {
    const follow = await run(false, 'followup')
    expect(follow.passed).toBeLessThan(follow.total)
  })
})

describe('Python harness', () => {
  const call = (code: string, args: unknown[] = []) =>
    runInPyodide({ code, functionName: 'f', calls: [{ id: 'a', args }] })

  it('reports syntax errors as the code failing to run', async () => {
    const out = await call('def f(:\n    return 1')
    expect(out.systemError).toBeUndefined()
    expect(out.error).toMatch(/SyntaxError/)
  })

  it('names a missing function', async () => {
    const out = await call('def g():\n    return 1')
    expect(out.error).toBe('Define a function called f.')
  })

  it('keeps one failing case from hiding the others, and survives sys.exit', async () => {
    const out = await runInPyodide({
      code: 'import sys\n\ndef f(x):\n    if x == 2:\n        sys.exit(1)\n    return 1 / x',
      functionName: 'f',
      calls: [
        { id: 'a', args: [1] },
        { id: 'b', args: [0] },
        { id: 'c', args: [2] },
      ],
    })
    expect(out.results[0]).toEqual({ id: 'a', value: 1 })
    expect(out.results[1].error).toMatch(/ZeroDivisionError/)
    expect(out.results[2].error).toMatch(/SystemExit/)
  })

  it('turns sets and Decimals into JSON and rejects NaN', async () => {
    const out = await runInPyodide({
      code: 'from decimal import Decimal\n\ndef f(kind):\n    return {"set": {3, 1}, "dec": Decimal("2.50"), "nan": float("nan")}[kind]',
      functionName: 'f',
      calls: [
        { id: 'set', args: ['set'] },
        { id: 'dec', args: ['dec'] },
        { id: 'nan', args: ['nan'] },
      ],
    })
    expect(out.results[0].value).toEqual([1, 3])
    expect(out.results[1].value).toBe(2.5)
    expect(out.results[2].error).toMatch(/ValueError/)
  })

  it('cannot fake results by replacing json.dumps', async () => {
    const out = await call(
      'import json\njson.dumps = lambda *a, **k: "999"\n\ndef f():\n    return 1'
    )
    expect(out.results[0].value).toBe(1)
  })

  it('keeps printed output as logs', async () => {
    const out = await call('def f():\n    print("hello")\n    return 1')
    expect(out.logs).toBe('hello')
    expect(out.results[0].value).toBe(1)
  })
})

describe('Judge0 language detection', () => {
  const list = [
    { id: 71, name: 'Python (3.8.1)' },
    { id: 92, name: 'Python (3.11.2)' },
    { id: 10, name: 'Python for ML (3.12.0)' },
    { id: 70, name: 'Python (2.7.17)' },
    { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
    { id: 93, name: 'JavaScript (Node.js 18.15.0)' },
  ]

  it('picks the newest Python 3 and Node.js 18+', () => {
    expect(pickLanguages(list)).toEqual({
      python: { id: 92, name: 'Python (3.11.2)' },
      javascript: { id: 93, name: 'JavaScript (Node.js 18.15.0)' },
    })
  })

  it('leaves JavaScript in QuickJS when only old Node is offered', () => {
    expect(newestLanguage(list.slice(0, 5), /^JavaScript \(Node\.js ([\d.]+)\)$/, 18)).toBeNull()
  })
})

describe('reference answers', () => {
  it('ledger: applies the fee strictly above the threshold', () => {
    const out = referenceLedger(
      [
        { id: '1', account: 'ops', type: 'debit', amount: 100 },
        { id: '2', account: 'ops', type: 'debit', amount: 100.01 },
      ],
      { feeThreshold: 100, fee: 2.5 },
      false
    )
    expect(out.ops).toEqual({ balance: -202.51, count: 2 })
  })

  it('ledger: the first record of a duplicated id wins even when malformed', () => {
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

  it('log triage: normalises numbers, breaks ties alphabetically, applies the threshold', () => {
    const out = referenceTriage(
      [
        '2026-03-04T10:00:00Z ERROR pay Timeout after 30 ms',
        '2026-03-04T10:00:01Z error PAY Timeout after 9 ms',
        '2026-03-04T10:00:02Z ERROR pay Card declined',
        '2026-03-04T10:00:03Z ERROR pay Card declined',
        '2026-03-04T10:00:04Z WARN quiet Cache miss',
        '2026-03-04 10:00:05 ERROR pay Broken timestamp',
      ],
      { minIssues: 2 },
      null
    )
    expect(out).toEqual({ pay: { errors: 4, warnings: 0, top: 'Card declined' } })
  })

  it('reorder plan: reorders at the point, rounds to packs and combines warehouses', () => {
    const params = { safetyDays: 2, coverDays: 7 }
    expect(referencePlan([{ sku: 'A', stock: 20, daily: 4, lead: 3 }], params, false)).toEqual([
      { sku: 'A', qty: 28 },
    ])
    expect(
      referencePlan(
        [
          { sku: 'A', stock: 20, daily: 4, lead: 3, pack: 10 },
          { sku: 'A', stock: 5, daily: 1, lead: 5 },
        ],
        params,
        true
      )
    ).toEqual([{ sku: 'A', qty: 50 }])
  })
})

describe('ledger in TypeScript', () => {
  it('a correct TypeScript answer passes', async () => {
    const result = await evaluateDeterministic(ctxFor('typescript', 'ledger-summary'), {
      main: { code: ledgerSolutionTs(SEED, false) },
      followup: { code: ledgerSolutionTs(SEED, true) },
    })
    expect(result.scores['tests:main:core'].score).toBe(1)
    expect(result.scores['tests:followup'].score).toBe(1)
  })

  it('scores empty work as zero without a system error', async () => {
    const result = await evaluateDeterministic(ctxFor('javascript', 'ledger-summary'), {})
    expect(result.systemError).toBeUndefined()
    expect(result.scores['tests:main:core'].score).toBe(0)
  })

  it('the follow-up brief starts from the submitted main code', async () => {
    const brief = await buildBrief(ctxFor('javascript', 'ledger-summary'), 'followup', {
      code: 'function summarizeLedger() {}',
    })
    expect(brief.starter).toBe('function summarizeLedger() {}')
    expect(brief.title).toBe('Ledger summary')
    expect(brief.visibleTests?.some((t) => t.id === 'v-dupe')).toBe(true)
  })

  it('hidden tests are the same shape the ledger generator promises', () => {
    expect(ledgerHiddenTests(SEED, 'followup').some((t) => t.id === 'h-dupes')).toBe(true)
    expect(ledgerSolutionJs(SEED, true)).toContain('seen.add')
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
    const result = await evaluateDeterministic(
      { def, challengeId: 'sales-cleanup', seed: SEED },
      {
        main: { queries: salesQueries('main') },
        followup: { queries: salesQueries('followup') },
      }
    )
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
    const result = await evaluateDeterministic(
      { def, challengeId: 'sales-cleanup', seed: SEED },
      { main: { queries } }
    )
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
