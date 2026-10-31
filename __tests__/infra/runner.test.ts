/**
 * @jest-environment node
 *
 * The Nexus runner against the app's real Judge0 client. Docker isn't
 * available in tests, so the runner's executor is swapped for one that runs
 * the same program with the local Node binary; everything else (HTTP, auth,
 * base64, language detection, result parsing) is the production path.
 */

import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import type { Server } from 'node:http'
import {
  judge0Health,
  judge0Languages,
  javascriptRuntime,
  runInJudge0,
} from '@/lib/assessments/runners/judge0'
import { CODE_CHALLENGES } from '@/lib/assessments/challenges'
import { sameValue } from '@/lib/assessments/compare'
import { solutionJs } from '@/test-utils/assessment-fixtures'

const { createRunnerServer, STATUS } = require('../../infra/runner/server.js')

jest.setTimeout(30_000)

const TOKEN = 'test-token-0123456789'

/** Runs JavaScript with local Node, mapping outcomes like the Docker executor. */
function localNode(_language: unknown, source: string, limits: { wallSeconds: number }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-'], { stdio: ['pipe', 'pipe', 'pipe'] })
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
  server = createRunnerServer({ config: { token: TOKEN }, execute: localNode })
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
    expect(health.javascriptRunsOn).toBe('judge0')
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
