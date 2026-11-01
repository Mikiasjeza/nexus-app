/**
 * Runs candidate SQL against a throwaway in-memory SQLite database (sql.js,
 * SQLite compiled to WebAssembly) inside a worker thread.
 *
 * Every query gets a fresh database built from the challenge's setup script,
 * so nothing a query does can touch real data or other runs. Only a single
 * SELECT/WITH statement is accepted, SQLite's heap is capped, and the worker
 * is terminated if a batch runs past its deadline (e.g. a runaway recursive
 * query).
 */

import { Worker } from 'node:worker_threads'
import { createRequire } from 'node:module'
import path from 'node:path'

const BATCH_TIMEOUT_MS = 4000
const MAX_ROWS = 500
const HEAP_LIMIT_BYTES = 64 * 1024 * 1024

export interface SqlJob {
  id: string
  query: string
}

export interface SqlResult {
  id: string
  columns?: string[]
  rows?: unknown[][]
  error?: string
}

/** Strip comments and one trailing semicolon; reject anything but one read query. */
export function validateReadQuery(raw: string): { query?: string; error?: string } {
  let query = ''
  let i = 0
  let quote: string | null = null
  while (i < raw.length) {
    const c = raw[i]
    if (quote) {
      query += c
      if (c === quote) quote = null
      i++
    } else if (c === "'" || c === '"' || c === '`') {
      quote = c
      query += c
      i++
    } else if (c === '-' && raw[i + 1] === '-') {
      while (i < raw.length && raw[i] !== '\n') i++
    } else if (c === '/' && raw[i + 1] === '*') {
      const end = raw.indexOf('*/', i + 2)
      i = end < 0 ? raw.length : end + 2
    } else {
      query += c
      i++
    }
  }
  query = query.trim().replace(/;\s*$/, '').trim()
  if (!query) return { error: 'Write a query first.' }
  // A semicolon outside quotes means a second statement.
  let inQuote: string | null = null
  for (const c of query) {
    if (inQuote) {
      if (c === inQuote) inQuote = null
    } else if (c === "'" || c === '"' || c === '`') inQuote = c
    else if (c === ';') return { error: 'Use a single query (one statement).' }
  }
  if (!/^(select|with)\b/i.test(query)) return { error: 'Only SELECT queries can run here.' }
  return { query }
}

const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads')
const init = require(workerData.modulePath)
init().then((SQL) => {
  const out = []
  for (const job of workerData.jobs) {
    const db = new SQL.Database()
    try {
      db.exec('PRAGMA hard_heap_limit=' + workerData.heapLimit + ';' + workerData.setup)
      const res = db.exec(job.query)
      const last = res[res.length - 1]
      out.push({
        id: job.id,
        columns: last ? last.columns : [],
        rows: last ? last.values.slice(0, workerData.maxRows) : [],
      })
    } catch (e) {
      out.push({ id: job.id, error: String((e && e.message) || e).slice(0, 300) })
    } finally {
      db.close()
    }
  }
  parentPort.postMessage(out)
}).catch((e) => parentPort.postMessage({ fatal: String(e && e.message) }))
`

/**
 * The real file path of sql.js for the worker to require. Resolved at run
 * time from the project root: a bundler would turn a literal require.resolve
 * into a module id that means nothing inside a worker thread.
 */
function sqlJsPath(): string {
  const spec = ['sql.js', 'dist', 'sql-wasm-inline.js'].join('/')
  return createRequire(path.join(process.cwd(), 'package.json')).resolve(spec)
}

/** Run several queries, each on its own fresh copy of the setup data. */
export function runSqlBatch(setup: string, jobs: SqlJob[]): Promise<SqlResult[]> {
  const prepared: SqlJob[] = []
  const rejected: SqlResult[] = []
  for (const job of jobs) {
    const checked = validateReadQuery(job.query)
    if (checked.error) rejected.push({ id: job.id, error: checked.error })
    else prepared.push({ id: job.id, query: checked.query! })
  }
  if (prepared.length === 0) return Promise.resolve(rejected)

  const modulePath = sqlJsPath()
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      env: {},
      resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16 },
      workerData: {
        modulePath,
        setup,
        jobs: prepared,
        heapLimit: HEAP_LIMIT_BYTES,
        maxRows: MAX_ROWS,
      },
    })
    const finish = (results: SqlResult[]) => {
      clearTimeout(timer)
      void worker.terminate()
      resolve([...rejected, ...results])
    }
    const timer = setTimeout(
      () => finish(prepared.map((job) => ({ id: job.id, error: 'Timed out' }))),
      BATCH_TIMEOUT_MS
    )
    worker.once('message', (message: SqlResult[] | { fatal: string }) => {
      if (Array.isArray(message)) finish(message)
      else finish(prepared.map((job) => ({ id: job.id, error: message.fatal })))
    })
    worker.once('error', (error) =>
      finish(prepared.map((job) => ({ id: job.id, error: error.message.slice(0, 200) })))
    )
  })
}
