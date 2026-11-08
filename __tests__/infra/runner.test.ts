/**
 * @jest-environment node
 *
 * The Nexus runner against the app's real Judge0 client. Docker isn't
 * available in tests, so the runner's executor is swapped for one that runs
 * the same program with the local Node binary (JavaScript) or a local
 * Python 3 (Python, and SQL through sqlite3); everything else (HTTP, auth,
 * base64, language detection, result parsing) is the production path.
 */

import type { AddressInfo } from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import type { Server } from 'node:http'
import {
  judge0Health,
  judge0Languages,
  javascriptRuntime,
  runInJudge0,
} from '@/lib/assessments/runners/judge0'
import { CODE_CHALLENGES, SQL_CHALLENGES } from '@/lib/assessments/challenges'
import { setupScript } from '@/lib/assessments/challenges/sql'
import { sameRows, sameValue } from '@/lib/assessments/compare'
import { runSql } from '@/lib/assessments/runners/sql-runner'
import { runSqlBatch } from '@/lib/assessments/runners/sqlite'
import { solutionJs } from '@/test-utils/assessment-fixtures'

const { createRunnerServer, STATUS } = require('../../infra/runner/server.js')

jest.setTimeout(30_000)

const TOKEN = 'test-token-0123456789'

/** A local Python 3 with sqlite3, if this machine has one (CI does). */
const PYTHON = ['python3', 'python'].find((cmd) => {
  const probe = spawnSync(cmd, ['-c', 'import sqlite3, sys; print(sys.version_info[0])'], {
    encoding: 'utf8',
  })
  return probe.status === 0 && probe.stdout.trim() === '3'
})
const withPython = PYTHON ? it : it.skip

/** Runs the program with local Node or Python, mapping outcomes like the Docker executor. */
function localRun(
  language: { command: string[] },
  source: string,
  limits: { wallSeconds: number }
) {
  const python = language.command[0] === 'python3'
  const [command, args] = python ? [PYTHON ?? 'python3', ['-I', '-']] : [process.execPath, ['-']]
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, limits.wallSeconds * 1000)
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.stdin.end(source)
    child.on('close', (code) => {
      clearTimeout(timer)
      const status = timedOut
        ? STATUS.timeLimit
        : code === 0
          ? STATUS.accepted
          : STATUS.runtimeError
      resolve({ stdout, stderr, status })
    })
  })
}

let server: Server
const saved = { ...process.env }

beforeAll(async () => {
  server = createRunnerServer({ config: { token: TOKEN }, execute: localRun })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  process.env.JUDGE0_URL = `http://127.0.0.1:${port}`
  process.env.JUDGE0_AUTH_TOKEN = TOKEN
  delete process.env.JUDGE0_RAPIDAPI_KEY
  delete process.env.JUDGE0_JAVASCRIPT
  delete process.env.JUDGE0_PYTHON_LANGUAGE_ID
  delete process.env.JUDGE0_JAVASCRIPT_LANGUAGE_ID
  await judge0Languages(true)
})

afterAll(async () => {
  process.env = saved
  await new Promise((resolve) => server.close(resolve))
})

describe('Nexus runner speaks Judge0', () => {
  it('is detected with its Python and Node.js versions', async () => {
    const languages = await judge0Languages(true)
    expect(languages.python?.name).toMatch(/^Python \(3\.\d+\.\d+\)$/)
    expect(languages.javascript?.name).toMatch(/^JavaScript \(Node\.js 2\d\./)
    expect(await javascriptRuntime()).toEqual(languages.javascript)
  })

  it('reports itself in the reviewer health check', async () => {
    const health = await judge0Health()
    expect(health.reachable).toBe(true)
    expect(health.version).toMatch(/^Nexus runner \d+\.\d+\.\d+$/)
    expect(health.javascriptRunsOn).toBe('runner')
    expect(health.sqlRunsOn).toBe('runner')
  })

  it.each(Object.keys(CODE_CHALLENGES))('grades %s through the runner', async (challengeId) => {
    const challenge = CODE_CHALLENGES[challengeId]
    const tests = challenge.hiddenTests(7, 'main')
    const run = await runInJudge0({
      language: 'javascript',
      code: solutionJs(challengeId, 7, false),
      functionName: challenge.functionName('javascript'),
      calls: tests.map((t) => ({ id: t.id, args: t.args })),
    })
    expect(run.error).toBeUndefined()
    for (const test of tests) {
      const result = run.results.find((r) => r.id === test.id)
      expect(sameValue(result?.value, test.expected)).toBe(true)
    }
  })

  it('turns a runaway program into a time limit, not a hang', async () => {
    const run = await runInJudge0({
      language: 'javascript',
      code: 'while (true) {}\nfunction f() {}',
      functionName: 'f',
      calls: [{ id: 'a', args: [] }],
    })
    expect(run.systemError).toBeUndefined()
    expect(run.error).toBe('Time limit exceeded.')
  })

  it('rejects a wrong token as a set-up problem, never the candidate’s fault', async () => {
    process.env.JUDGE0_AUTH_TOKEN = 'wrong'
    const run = await runInJudge0({
      language: 'javascript',
      code: 'function f() { return 1 }',
      functionName: 'f',
      calls: [{ id: 'a', args: [] }],
    })
    process.env.JUDGE0_AUTH_TOKEN = TOKEN
    expect(run.systemError).toBe(true)
    expect(run.error).toBe('The code runner is not set up correctly.')
  })

  it('refuses network access and unknown languages', async () => {
    const url = `${process.env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`
    const post = (body: unknown) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': TOKEN },
        body: JSON.stringify(body),
      })
    expect((await post({ language_id: 2, source_code: '1', enable_network: true })).status).toBe(
      422
    )
    expect((await post({ language_id: 71, source_code: '1' })).status).toBe(422)
  })

  it('refuses to start without a token', () => {
    expect(() => createRunnerServer({ config: { token: '' } })).toThrow('RUNNER_TOKEN')
  })
})

describe('SQL on the runner', () => {
  withPython('gives every reference answer exactly as the local engine does', async () => {
    for (const challenge of Object.values(SQL_CHALLENGES)) {
      for (const seed of [11, 4242]) {
        for (const variant of ['visible', 'changed'] as const) {
          const setup = setupScript(challenge, seed, variant)
          const jobs = challenge.tasks.map((t) => ({ id: t.id, query: t.reference }))
          const remote = await runSql([{ setup, jobs }], 'grade')
          if ('error' in remote) throw new Error(remote.error)
          const local = await runSqlBatch(setup, jobs)
          for (const task of challenge.tasks) {
            const a = remote.groups[0].find((r) => r.id === task.id)!
            const b = local.find((r) => r.id === task.id)!
            expect(a.error).toBeUndefined()
            expect(a.columns).toEqual(b.columns)
            expect(sameRows(a.rows ?? [], b.rows ?? [], task.ordered)).toBe(true)
          }
        }
      }
    }
  })

  withPython('runs several datasets in one call and keeps each query on its own copy', async () => {
    const run = await runSql(
      [
        {
          setup: 'CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (1), (2);',
          jobs: [
            { id: 'sum', query: 'SELECT SUM(x) AS total FROM t' },
            { id: 'bad', query: 'SELECT nope FROM t' },
          ],
        },
        {
          setup: 'CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (10);',
          jobs: [{ id: 'sum', query: 'SELECT SUM(x) AS total FROM t;' }],
        },
      ],
      'run'
    )
    if ('error' in run) throw new Error(run.error)
    expect(run.groups[0][0]).toEqual({ id: 'sum', columns: ['total'], rows: [[3]] })
    expect(run.groups[0][1].error).toBe('no such column: nope')
    expect(run.groups[1][0].rows).toEqual([[10]])
  })

  withPython('refuses writes and stops runaway or memory-hungry queries', async () => {
    const setup = 'CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (1);'
    const run = await runSql(
      [
        {
          setup,
          jobs: [
            // Refused here before anything is sent.
            { id: 'delete', query: 'DELETE FROM t' },
            { id: 'two', query: 'SELECT 1; DROP TABLE t' },
            {
              id: 'loop',
              query:
                'WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r) SELECT count(*) FROM r',
            },
            {
              id: 'memory',
              query:
                "WITH RECURSIVE r(s) AS (SELECT 'x' UNION ALL SELECT s || s FROM r) SELECT length(s) FROM r",
            },
            { id: 'extension', query: "SELECT load_extension('evil')" },
            { id: 'after', query: 'SELECT x FROM t' },
          ],
        },
      ],
      'run'
    )
    if ('error' in run) throw new Error(run.error)
    const byId = Object.fromEntries(run.groups[0].map((r) => [r.id, r]))
    expect(byId.delete.error).toBe('Only SELECT queries can run here.')
    expect(byId.two.error).toBe('Use a single query (one statement).')
    expect(byId.loop.error).toBe('Timed out')
    expect(byId.memory.error).toBeDefined()
    expect(byId.extension.error).toBeDefined()
    // A query after the runaway ones still runs, on a fresh database.
    expect(byId.after.rows).toEqual([[1]])
  })
})
