/**
 * Python for local development and tests only: CPython compiled to
 * WebAssembly (Pyodide), run in a worker thread that is killed on timeout.
 *
 * Pyodide is NOT a security sandbox (Python can reach the JavaScript host),
 * so this never runs in production: it needs NODE_ENV other than
 * "production" and ASSESSMENT_DEV_PYTHON=pyodide. Production Python always
 * goes to Judge0. Tests call `runInPyodide` directly to check the real
 * Python harness and reference answers without a Judge0 server.
 */

import { Worker } from 'node:worker_threads'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pythonProgram, parseProgramOutput } from './judge0'
import type { GuestCall, GuestRun } from './quickjs'

const TIMEOUT_MS = 20_000

export function devPythonEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ASSESSMENT_DEV_PYTHON === 'pyodide'
}

export const DEV_PYTHON_RUNTIME = { id: 0, name: 'Python (Pyodide, local development)' }

const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads')
const { loadPyodide } = require(workerData.modulePath)
const out = []
const err = []
loadPyodide({ stdout: (line) => out.push(line), stderr: (line) => err.push(line) })
  .then((py) => {
    try {
      py.runPython(workerData.program)
    } catch (e) {
      err.push(String((e && e.message) || e))
    }
    parentPort.postMessage({ stdout: out.join('\\n'), stderr: err.join('\\n') })
  })
  .catch((e) => parentPort.postMessage({ fatal: String((e && e.message) || e) }))
`

/** The real path of Pyodide's loader, resolved at run time (bundlers rewrite literals). */
function pyodidePath(): string {
  const spec = ['pyodide', 'pyodide.js'].join('/')
  return createRequire(path.join(process.cwd(), 'package.json')).resolve(spec)
}

export function runInPyodide(options: {
  code: string
  functionName: string
  calls: GuestCall[]
}): Promise<GuestRun> {
  const program = pythonProgram(options.code, options.functionName, options.calls)
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      env: {},
      workerData: { modulePath: pyodidePath(), program },
    })
    const finish = (run: GuestRun) => {
      clearTimeout(timer)
      void worker.terminate()
      resolve(run)
    }
    const timer = setTimeout(
      () => finish({ error: 'Time limit exceeded.', results: [], logs: '' }),
      TIMEOUT_MS
    )
    worker.once('message', (message: { stdout?: string; stderr?: string; fatal?: string }) => {
      if (message.fatal) {
        finish({
          error: 'The local Python runner failed.',
          systemError: true,
          results: [],
          logs: '',
        })
        return
      }
      const stderr = (message.stderr ?? '').trim()
      // Keep the last lines of a traceback: the error itself is at the end.
      const fallback = stderr.split('\n').slice(-3).join(' ') || 'The code produced no result.'
      finish(parseProgramOutput(message.stdout ?? '', fallback))
    })
    worker.once('error', (error) =>
      finish({ error: error.message.slice(0, 200), systemError: true, results: [], logs: '' })
    )
  })
}
