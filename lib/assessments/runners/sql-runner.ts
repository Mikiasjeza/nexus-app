/**
 * Where SQL runs. In production, on the code runner: a small Python program
 * (Python's built-in sqlite3) builds a fresh in-memory database from the
 * dataset for every query, makes it read-only, allows reads only through an
 * authorizer, and caps each query's time and the database's memory. The
 * candidate's text is checked here first, so only a single SELECT or WITH
 * ever leaves the app. In local development and tests, sql.js in a worker
 * thread stands in (runners/sqlite.ts).
 */

import { failureText, pythonRuntime, submitProgram } from './judge0'
import { runSqlBatch, validateReadQuery, type SqlJob, type SqlResult } from './sqlite'
import { localSandboxesAllowed } from './local'
import { BUDGET_MESSAGE, takeRunnerBudget, type RunnerPurpose } from '../budget'

const MARKER = '<<NEXUS-SQL>>'
const MAX_ROWS = 500
/** Per query, and for the whole program: it must print its results before the runner's own limits. */
const QUERY_SECONDS = 1
const TOTAL_SECONDS = 2.5
const HEAP_LIMIT_BYTES = 64 * 1024 * 1024

export interface SqlGroup {
  /** The dataset, as a setup script. */
  setup: string
  jobs: SqlJob[]
}

/** Each group's results, in job order; or why nothing could run, which is never the candidate's fault. */
export type SqlRun = { groups: SqlResult[][] } | { error: string; systemError: boolean }

export type SqlPlace = { kind: 'runner' | 'local' | 'none'; label: string }

/** The code runner when it has Python 3; the local sandbox in development; otherwise nowhere. */
export async function sqlRunner(): Promise<SqlPlace> {
  const python = await pythonRuntime()
  if (python) return { kind: 'runner', label: `SQLite, on the code runner (${python.name})` }
  if (localSandboxesAllowed()) return { kind: 'local', label: 'SQLite (sql.js, local development)' }
  return { kind: 'none', label: 'The code runner is not set up yet.' }
}

/** The Python program the runner executes. Data travels base64-encoded, so nothing in it is code. */
export function sqlProgram(groups: SqlGroup[]): string {
  const data = Buffer.from(JSON.stringify({ groups }), 'utf8').toString('base64')
  return `import base64, json, math, sqlite3, time

DATA = json.loads(base64.b64decode("${data}").decode("utf-8"))
MARKER = ${JSON.stringify(MARKER)}
STARTED = time.monotonic()
READS = {
    getattr(sqlite3, name, code)
    for name, code in (
        ("SQLITE_SELECT", 21),
        ("SQLITE_READ", 20),
        ("SQLITE_FUNCTION", 31),
        ("SQLITE_RECURSIVE", 33),
    )
}


def allow_reads(action, *rest):
    return sqlite3.SQLITE_OK if action in READS else sqlite3.SQLITE_DENY


def cell(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).hex()
    return value


def run(setup, query):
    deadline = min(time.monotonic() + ${QUERY_SECONDS}, STARTED + ${TOTAL_SECONDS})
    if time.monotonic() >= deadline:
        return {"error": "Timed out"}
    db = sqlite3.connect(":memory:")
    try:
        db.execute("PRAGMA hard_heap_limit = ${HEAP_LIMIT_BYTES}")
        db.executescript(setup)
        db.execute("PRAGMA query_only = ON")
        db.set_authorizer(allow_reads)
        db.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 1000)
        cursor = db.execute(query)
        columns = [d[0] for d in cursor.description or []]
        rows = [[cell(v) for v in row] for row in cursor.fetchmany(${MAX_ROWS})]
        return {"columns": columns, "rows": rows}
    except Exception as error:
        message = str(error)
        if message == "interrupted":
            return {"error": "Timed out"}
        return {"error": (message or type(error).__name__)[:300]}
    finally:
        db.close()


out = [
    [dict(run(group["setup"], job["query"]), id=job["id"]) for job in group["jobs"]]
    for group in DATA["groups"]
]
print("\\n" + MARKER + json.dumps({"groups": out}), flush=True)
`
}

/** Reads the result line; a program that died before printing one fails each of its queries. */
export function parseSqlOutput(stdout: string, failure: string, groups: SqlJob[][]): SqlResult[][] {
  const failAll = (error: string) => groups.map((jobs) => jobs.map((j) => ({ id: j.id, error })))
  const at = stdout.lastIndexOf(MARKER)
  if (at < 0) return failAll(failure.slice(0, 300))
  try {
    const parsed = JSON.parse(stdout.slice(at + MARKER.length).split('\n')[0]) as {
      groups?: SqlResult[][]
    }
    return Array.isArray(parsed.groups) ? parsed.groups : failAll('The SQL runner gave no results.')
  } catch {
    return failAll('The SQL runner gave no results.')
  }
}

/**
 * Runs each group's queries, each on its own fresh copy of that group's
 * dataset. One call to the runner covers every group.
 */
export async function runSql(groups: SqlGroup[], purpose: RunnerPurpose): Promise<SqlRun> {
  const checked = groups.map((group) => {
    const prepared: SqlJob[] = []
    const rejected = new Map<string, SqlResult>()
    for (const job of group.jobs) {
      const result = validateReadQuery(job.query)
      if (result.error) rejected.set(job.id, { id: job.id, error: result.error })
      else prepared.push({ id: job.id, query: result.query! })
    }
    return { ...group, prepared, rejected }
  })
  // Results back in each group's job order, with the refused queries in place.
  const inOrder = (ran: SqlResult[][]): SqlResult[][] =>
    checked.map((group, i) =>
      group.jobs.map(
        (job) =>
          group.rejected.get(job.id) ??
          ran[i]?.find((r) => r.id === job.id) ?? { id: job.id, error: 'No result.' }
      )
    )
  if (checked.every((group) => group.prepared.length === 0)) {
    return { groups: inOrder(checked.map(() => [])) }
  }

  const place = await sqlRunner()
  if (place.kind === 'none') return { error: place.label, systemError: true }
  if (place.kind === 'local') {
    const ran = await Promise.all(
      checked.map((group) =>
        group.prepared.length ? runSqlBatch(group.setup, group.prepared) : Promise.resolve([])
      )
    )
    return { groups: inOrder(ran) }
  }
  // Out of allowance is never the candidate's fault: grading retries later.
  if (!(await takeRunnerBudget(purpose))) {
    return { error: BUDGET_MESSAGE, systemError: purpose === 'grade' }
  }
  const program = sqlProgram(checked.map((group) => ({ setup: group.setup, jobs: group.prepared })))
  const outcome = await submitProgram('python', program, 256_000)
  if ('failure' in outcome) return { error: outcome.failure, systemError: true }
  const ran = parseSqlOutput(
    outcome.stdout,
    failureText(outcome),
    checked.map((group) => group.prepared)
  )
  return { groups: inOrder(ran) }
}
