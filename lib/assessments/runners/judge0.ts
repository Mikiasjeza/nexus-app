/**
 * Python (and any other language) through Judge0, an open-source sandbox
 * built for untrusted code: each run gets an isolated box with CPU, memory,
 * process and network limits.
 *
 * Free routes: self-host Judge0 CE (GPL) on a free VM and set JUDGE0_URL
 * (plus JUDGE0_AUTH_TOKEN if you enabled auth), or use the free RapidAPI plan
 * with JUDGE0_RAPIDAPI_KEY. Without either, Python is unavailable. With
 * JUDGE0_JAVASCRIPT_LANGUAGE_ID set too, JavaScript and TypeScript also run
 * here instead of in the in-process QuickJS sandbox. Never point this at a
 * Judge0 instance that can reach your database or internal network.
 */

import { asScript, type GuestCall, type GuestRun } from './quickjs'

const MARKER = '<<NEXUS-RESULTS>>'

export function judge0Configured(): boolean {
  return Boolean(process.env.JUDGE0_URL || process.env.JUDGE0_RAPIDAPI_KEY)
}

/**
 * JavaScript goes to Judge0 only when its language id is set explicitly:
 * the ids differ between Judge0 versions, and the oldest Node they offer
 * (12) lacks syntax candidates will use. Pick a Node 18+ id from the
 * server's /languages list.
 */
export function judge0RunsJavaScript(): boolean {
  return judge0Configured() && Boolean(process.env.JUDGE0_JAVASCRIPT_LANGUAGE_ID)
}

export type Judge0Language = 'python' | 'javascript'

function endpoint(): { url: string; headers: Record<string, string> } {
  const rapidKey = process.env.JUDGE0_RAPIDAPI_KEY
  if (!process.env.JUDGE0_URL && rapidKey) {
    return {
      url: 'https://judge0-ce.p.rapidapi.com',
      headers: {
        'X-RapidAPI-Key': rapidKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
    }
  }
  const headers: Record<string, string> = {}
  if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN
  return { url: (process.env.JUDGE0_URL || '').replace(/\/$/, ''), headers }
}

/** Candidate code, then a runner that calls the function for each case. */
export function pythonProgram(code: string, functionName: string, calls: GuestCall[]): string {
  // The data travels as a JSON string literal, so no case can inject code.
  const data = JSON.stringify(JSON.stringify(calls))
  return `${code}

def __nexus_main():
    import json as __json
    __calls = __json.loads(${data})
    __out = []
    __fn = globals().get(${JSON.stringify(functionName)})
    if not callable(__fn):
        print(${JSON.stringify(MARKER)} + __json.dumps({"error": "Define a function called ${functionName}."}))
        return
    for __c in __calls:
        try:
            __value = __fn(*__c["args"])
            __out.append({"id": __c["id"], "value": __value})
        except Exception as __e:
            __out.append({"id": __c["id"], "error": type(__e).__name__ + ": " + str(__e)[:200]})
    print(${JSON.stringify(MARKER)} + __json.dumps({"results": __out}, default=str))

__nexus_main()
`
}

/**
 * Candidate JavaScript between a prelude that keeps the real JSON functions
 * and a runner that prints the results after a marker.
 */
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

export async function runInJudge0(options: {
  language?: Judge0Language
  code: string
  functionName: string
  calls: GuestCall[]
}): Promise<GuestRun> {
  const language = options.language ?? 'python'
  const failed = (error: string): GuestRun => ({ error, systemError: true, results: [], logs: '' })
  if (!judge0Configured()) return failed('The code runner is not switched on yet.')
  const { url, headers } = endpoint()
  const languageId =
    language === 'javascript'
      ? Number(process.env.JUDGE0_JAVASCRIPT_LANGUAGE_ID)
      : Number(process.env.JUDGE0_PYTHON_LANGUAGE_ID || 71)
  if (!Number.isInteger(languageId)) return failed('The code runner has no language id for this.')
  const program =
    language === 'javascript'
      ? javascriptProgram(options.code, options.functionName, options.calls)
      : pythonProgram(options.code, options.functionName, options.calls)
  let data: {
    stdout?: string | null
    stderr?: string | null
    compile_output?: string | null
    status?: { id: number; description: string }
  }
  try {
    const response = await fetch(`${url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        source_code: program,
        language_id: languageId,
        cpu_time_limit: 3,
        wall_time_limit: 6,
        memory_limit: 128_000,
        enable_network: false,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) return failed(`The code runner returned ${response.status}.`)
    data = await response.json()
  } catch {
    return failed('The code runner could not be reached.')
  }
  // 13 Internal Error, 14 Exec Format Error: Judge0's fault, not the code's.
  if (data.status && (data.status.id === 13 || data.status.id === 14)) {
    return failed(`The code runner failed: ${data.status.description}.`)
  }
  const stdout = data.stdout ?? ''
  const markerAt = stdout.lastIndexOf(MARKER)
  const logs = (markerAt >= 0 ? stdout.slice(0, markerAt) : stdout).slice(0, 8000)
  if (markerAt < 0) {
    const reason =
      data.status && data.status.id !== 3
        ? data.status.description
        : (data.stderr || data.compile_output || 'No result')
            .toString()
            .split('\n')
            .slice(-3)
            .join(' ')
    return { error: reason.slice(0, 300), results: [], logs }
  }
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
