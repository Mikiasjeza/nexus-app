/**
 * Code execution through Judge0, an open-source sandbox built for untrusted
 * code: each run gets an isolated box with CPU, memory, process and network
 * limits, on a separate server from the app.
 *
 * Python always runs here. JavaScript and TypeScript run here too whenever
 * the server offers Node.js 18 or newer (set JUDGE0_JAVASCRIPT=off to keep
 * them in the in-process QuickJS sandbox instead). Language ids are read from
 * the server's /languages list, newest first, unless pinned with
 * JUDGE0_PYTHON_LANGUAGE_ID / JUDGE0_JAVASCRIPT_LANGUAGE_ID.
 *
 * Self-host Judge0 CE (infra/judge0) and set JUDGE0_URL and
 * JUDGE0_AUTH_TOKEN, or use RapidAPI's plan with JUDGE0_RAPIDAPI_KEY. Never
 * point this at a Judge0 server that can reach your database or internal
 * network.
 */

import { asScript, type GuestCall, type GuestRun } from './quickjs'

const MARKER = '<<NEXUS-RESULTS>>'
const REQUEST_TIMEOUT_MS = 20_000
const POLL_INTERVAL_MS = 500
const POLL_ATTEMPTS = 30
const LANGUAGE_TTL_MS = 10 * 60_000
const LANGUAGE_RETRY_MS = 30_000

export type Judge0Language = 'python' | 'javascript'

export interface RuntimeInfo {
  id: number
  name: string
}

export function judge0Configured(): boolean {
  return Boolean(process.env.JUDGE0_URL || process.env.JUDGE0_RAPIDAPI_KEY)
}

function endpoint(): {
  url: string
  headers: Record<string, string>
  provider: 'self-hosted' | 'rapidapi'
} {
  const rapidKey = process.env.JUDGE0_RAPIDAPI_KEY
  if (!process.env.JUDGE0_URL && rapidKey) {
    return {
      url: 'https://judge0-ce.p.rapidapi.com',
      headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' },
      provider: 'rapidapi',
    }
  }
  const headers: Record<string, string> = {}
  if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN
  return {
    url: (process.env.JUDGE0_URL || '').replace(/\/$/, ''),
    headers,
    provider: 'self-hosted',
  }
}

function judge0Fetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, headers } = endpoint()
  return fetch(`${url}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers, ...init.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  })
}

// ─── Languages ────────────────────────────────────────────────────────────

export interface DetectedLanguages {
  python: RuntimeInfo | null
  javascript: RuntimeInfo | null
  error?: string
}

const versionOf = (text: string) => text.split('.').map((n) => Number.parseInt(n, 10) || 0)

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** The newest language whose name matches, e.g. "Python (3.11.2)". */
export function newestLanguage(
  list: RuntimeInfo[],
  pattern: RegExp,
  minimumMajor = 0
): RuntimeInfo | null {
  let best: { info: RuntimeInfo; version: number[] } | null = null
  for (const info of list) {
    const match = pattern.exec(info.name)
    if (!match) continue
    const version = versionOf(match[1])
    if (version[0] < minimumMajor) continue
    if (!best || compareVersions(version, best.version) > 0) best = { info, version }
  }
  return best?.info ?? null
}

const PYTHON_NAME = /^Python \((3\.[\d.]+)\)$/
const NODE_NAME = /^JavaScript \(Node\.js ([\d.]+)\)$/

export function pickLanguages(list: RuntimeInfo[]): DetectedLanguages {
  const pinned = (value: string | undefined): RuntimeInfo | null => {
    const id = Number(value)
    if (!value || !Number.isInteger(id)) return null
    return list.find((l) => l.id === id) ?? { id, name: `Language ${id}` }
  }
  return {
    python: pinned(process.env.JUDGE0_PYTHON_LANGUAGE_ID) ?? newestLanguage(list, PYTHON_NAME, 3),
    javascript:
      pinned(process.env.JUDGE0_JAVASCRIPT_LANGUAGE_ID) ?? newestLanguage(list, NODE_NAME, 18),
  }
}

let languageCache: { expires: number; value: Promise<DetectedLanguages> } | null = null

/** The server's languages, cached for ten minutes (thirty seconds after a failure). */
export function judge0Languages(refresh = false): Promise<DetectedLanguages> {
  if (!judge0Configured()) {
    return Promise.resolve({ python: null, javascript: null, error: 'Not configured' })
  }
  if (!refresh && languageCache && languageCache.expires > Date.now()) return languageCache.value
  const value = (async (): Promise<DetectedLanguages> => {
    try {
      const response = await judge0Fetch('/languages')
      if (!response.ok) throw new Error(`/languages answered ${response.status}`)
      const list = (await response.json()) as RuntimeInfo[]
      return pickLanguages(Array.isArray(list) ? list : [])
    } catch (error) {
      if (languageCache) languageCache.expires = Date.now() + LANGUAGE_RETRY_MS
      const message = error instanceof Error ? error.message : 'unreachable'
      return { ...pickLanguages([]), error: message }
    }
  })()
  languageCache = { expires: Date.now() + LANGUAGE_TTL_MS, value }
  return value
}

/** Node.js on Judge0 for JavaScript and TypeScript, or null to use QuickJS. */
export async function javascriptRuntime(): Promise<RuntimeInfo | null> {
  if (!judge0Configured() || process.env.JUDGE0_JAVASCRIPT === 'off') return null
  return (await judge0Languages()).javascript
}

export async function pythonRuntime(): Promise<RuntimeInfo | null> {
  if (!judge0Configured()) return null
  return (await judge0Languages()).python
}

// ─── Programs ─────────────────────────────────────────────────────────────

/**
 * A prelude that keeps the real JSON functions, the candidate's code, then a
 * runner that calls the function once per case and prints the results after
 * a marker. Each value is encoded on its own so one bad return can't hide
 * the rest.
 */
export function pythonProgram(code: string, functionName: string, calls: GuestCall[]): string {
  // The data travels as a JSON string literal, so no case can inject code.
  const data = JSON.stringify(JSON.stringify(calls))
  const name = JSON.stringify(functionName)
  const marker = JSON.stringify(MARKER)
  return `import json as __nexus_json
__nexus_dumps = __nexus_json.dumps
__nexus_loads = __nexus_json.loads

${code}


def __nexus_default(value):
    if isinstance(value, (set, frozenset)):
        return sorted(value, key=repr)
    if type(value).__name__ == "Decimal":
        return float(value)
    raise TypeError(type(value).__name__ + " is not JSON")


def __nexus_main():
    calls = __nexus_loads(${data})
    fn = globals().get(${name})
    if not callable(fn):
        print("\\n" + ${marker} + __nexus_dumps({"error": "Define a function called " + ${name} + "."}), flush=True)
        return
    out = []
    for call in calls:
        try:
            encoded = __nexus_dumps(fn(*call["args"]), default=__nexus_default, allow_nan=False)
            out.append('{"id": ' + __nexus_dumps(call["id"]) + ', "value": ' + encoded + '}')
        except BaseException as error:
            message = type(error).__name__ + ": " + str(error)[:200]
            out.append(__nexus_dumps({"id": call["id"], "error": message}))
    print("\\n" + ${marker} + '{"results": [' + ", ".join(out) + "]}", flush=True)


__nexus_main()
`
}

/** The same shape for Node.js. */
export function javascriptProgram(code: string, functionName: string, calls: GuestCall[]): string {
  const data = JSON.stringify(JSON.stringify(calls))
  const name = JSON.stringify(functionName)
  const marker = JSON.stringify(MARKER)
  return `const __nexus = { stringify: JSON.stringify, parse: JSON.parse, write: process.stdout.write.bind(process.stdout) };
${asScript(code)}
;(() => {
  let fn;
  try { fn = eval(${name}); } catch (e) { fn = undefined; }
  if (typeof fn !== 'function') {
    __nexus.write('\\n' + ${marker} + __nexus.stringify({ error: 'Define a function called ' + ${name} + '.' }) + '\\n');
    return;
  }
  const out = [];
  for (const c of __nexus.parse(${data})) {
    try {
      const value = __nexus.stringify(fn(...c.args));
      out.push({ id: c.id, value: value === undefined ? null : __nexus.parse(value) });
    } catch (e) {
      out.push({ id: c.id, error: String((e && e.message) || e).slice(0, 200) });
    }
  }
  __nexus.write('\\n' + ${marker} + __nexus.stringify({ results: out }) + '\\n');
})();
`
}

/** Reads the marker line out of a program's output. */
export function parseProgramOutput(
  stdout: string,
  fallbackError: string
): Pick<GuestRun, 'error' | 'results' | 'logs'> {
  const markerAt = stdout.lastIndexOf(MARKER)
  const logs = (markerAt >= 0 ? stdout.slice(0, markerAt) : stdout).trimEnd().slice(0, 8000)
  if (markerAt < 0) return { error: fallbackError.slice(0, 300), results: [], logs }
  try {
    const parsed = JSON.parse(stdout.slice(markerAt + MARKER.length).split('\n')[0]) as {
      error?: string
      results?: GuestRun['results']
    }
    if (parsed.error) return { error: parsed.error, results: [], logs }
    return { results: parsed.results ?? [], logs }
  } catch {
    return { error: 'The code printed something that broke the result format.', results: [], logs }
  }
}

// ─── Running ──────────────────────────────────────────────────────────────

type Submission = {
  token?: string
  stdout?: string | null
  stderr?: string | null
  compile_output?: string | null
  message?: string | null
  status?: { id: number; description: string }
}

const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64')
const decode = (text: string | null | undefined) =>
  text ? Buffer.from(text, 'base64').toString('utf8') : ''

const FIELDS = 'token,stdout,stderr,compile_output,message,status'

/** In Queue (1) or Processing (2): not finished yet. */
const pending = (s: Submission) => !s.status || s.status.id === 1 || s.status.id === 2

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function busyOrBroken(status: number): string {
  if (status === 429 || status === 503) return 'The code runner is busy. Try again in a minute.'
  if (status === 401 || status === 403) return 'The code runner is not set up correctly.'
  return 'The code runner is unavailable right now.'
}

export async function runInJudge0(options: {
  language?: Judge0Language
  code: string
  functionName: string
  calls: GuestCall[]
}): Promise<GuestRun> {
  const language = options.language ?? 'python'
  const failed = (error: string, detail?: string): GuestRun => {
    if (detail) console.error(`Judge0 ${language} run failed: ${detail}`)
    return { error, systemError: true, results: [], logs: '' }
  }
  if (!judge0Configured()) return failed('The code runner is not switched on yet.')

  const runtime = language === 'javascript' ? await javascriptRuntime() : await pythonRuntime()
  if (!runtime) return failed('The code runner is unavailable right now.', 'no matching language')

  const program =
    language === 'javascript'
      ? javascriptProgram(options.code, options.functionName, options.calls)
      : pythonProgram(options.code, options.functionName, options.calls)

  let submission: Submission
  try {
    const response = await judge0Fetch(
      `/submissions?base64_encoded=true&wait=true&fields=${FIELDS}`,
      {
        method: 'POST',
        body: JSON.stringify({
          source_code: encode(program),
          language_id: runtime.id,
          cpu_time_limit: 3,
          wall_time_limit: 6,
          // Node reserves more address space than CPython at start-up.
          memory_limit: language === 'javascript' ? 256_000 : 128_000,
          enable_network: false,
        }),
      }
    )
    if (!response.ok) return failed(busyOrBroken(response.status), `status ${response.status}`)
    submission = (await response.json()) as Submission

    // Servers with ENABLE_WAIT_RESULT=false (and busy queues) answer with a token.
    for (let i = 0; pending(submission) && submission.token && i < POLL_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS)
      const poll = await judge0Fetch(
        `/submissions/${encodeURIComponent(submission.token)}?base64_encoded=true&fields=${FIELDS}`
      )
      if (!poll.ok) return failed(busyOrBroken(poll.status), `poll status ${poll.status}`)
      submission = (await poll.json()) as Submission
    }
  } catch (error) {
    return failed('The code runner could not be reached.', String(error))
  }

  if (pending(submission)) return failed('The code runner took too long.', 'still queued')
  const status = submission.status!
  // 13 Internal Error, 14 Exec Format Error: the runner's fault, not the code's.
  if (status.id === 13 || status.id === 14) {
    return failed('The code runner failed.', `${status.description}: ${decode(submission.message)}`)
  }

  const stdout = decode(submission.stdout)
  const stderr = decode(submission.stderr) || decode(submission.compile_output)
  const fallback =
    stderr.trim().split('\n').slice(-3).join(' ') ||
    (status.id === 3 ? 'The code produced no result.' : status.description)
  return parseProgramOutput(stdout, status.id === 5 ? 'Time limit exceeded.' : fallback)
}

// ─── Health ───────────────────────────────────────────────────────────────

export interface Judge0Health {
  configured: boolean
  provider: 'self-hosted' | 'rapidapi' | null
  reachable: boolean
  version: string | null
  python: RuntimeInfo | null
  javascript: RuntimeInfo | null
  javascriptRunsOn: 'judge0' | 'quickjs'
  error: string | null
}

/** For the reviewer console: is the runner up, and which languages will be used. */
export async function judge0Health(): Promise<Judge0Health> {
  if (!judge0Configured()) {
    return {
      configured: false,
      provider: null,
      reachable: false,
      version: null,
      python: null,
      javascript: null,
      javascriptRunsOn: 'quickjs',
      error: null,
    }
  }
  const { provider } = endpoint()
  let version: string | null = null
  let error: string | null = null
  try {
    const response = await judge0Fetch('/about')
    if (response.ok) {
      // Judge0 answers { version }; the Nexus runner adds its name.
      const about = (await response.json()) as { name?: string; version?: string }
      version = about.version ? `${about.name ?? 'Judge0'} ${about.version}` : null
    } else error = `/about answered ${response.status}`
  } catch (e) {
    error = e instanceof Error ? e.message : 'unreachable'
  }
  const languages = await judge0Languages(true)
  const off = process.env.JUDGE0_JAVASCRIPT === 'off'
  return {
    configured: true,
    provider,
    reachable: !error && !languages.error,
    version,
    python: languages.python,
    javascript: languages.javascript,
    javascriptRunsOn: languages.javascript && !off ? 'judge0' : 'quickjs',
    error: error ?? languages.error ?? null,
  }
}
