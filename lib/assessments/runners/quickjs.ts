/**
 * Runs candidate JavaScript inside QuickJS compiled to WebAssembly.
 *
 * The guest has no access to Node: no process, require, filesystem, network
 * or timers. Memory, stack and CPU time are capped per run, and every test
 * call has its own deadline. Answers leave the sandbox as JSON and are
 * compared on the server. TypeScript is turned into JavaScript first with
 * Node's built-in type stripping.
 */

import { createRequire } from 'node:module'
import {
  newQuickJSWASMModule,
  type QuickJSSyncVariant,
  type QuickJSWASMModule,
} from 'quickjs-emscripten'

const MEMORY_LIMIT = 64 * 1024 * 1024
const STACK_LIMIT = 1024 * 1024
const LOAD_TIMEOUT_MS = 1000
const LOG_LIMIT = 8000
/** Harness names the candidate can't shadow without a redeclaration error. */
const HARNESS = '__nexusHarness_7f3a'

/**
 * The release-sync build, loaded with require. The package's default loader
 * uses a dynamic import() that Jest can't run and file tracing can miss.
 */
function loadQuickJS(): Promise<QuickJSWASMModule> {
  const require = createRequire(import.meta.url)
  const variant: QuickJSSyncVariant = {
    type: 'sync',
    importFFI: async () => require('@jitl/quickjs-wasmfile-release-sync/ffi').QuickJSFFI,
    importModuleLoader: async () =>
      require('@jitl/quickjs-wasmfile-release-sync/emscripten-module'),
  }
  return newQuickJSWASMModule(variant)
}

let modulePromise: Promise<QuickJSWASMModule> | null = null
const quickjs = () => (modulePromise ??= loadQuickJS())

export interface GuestCall {
  id: string
  args: unknown[]
}

export interface GuestResult {
  id: string
  value?: unknown
  error?: string
}

export interface GuestRun {
  /** Set when the code didn't load (syntax error, missing function, timeout). */
  error?: string
  /** The runner itself failed (not the candidate's code); the run proves nothing. */
  systemError?: boolean
  results: GuestResult[]
  logs: string
}

export async function stripTypes(source: string): Promise<{ code?: string; error?: string }> {
  try {
    // Node 22.13+; older type definitions don't declare it yet.
    const { stripTypeScriptTypes } = (await import('node:module')) as unknown as {
      stripTypeScriptTypes?: (code: string, options: { mode: 'strip' | 'transform' }) => string
    }
    if (!stripTypeScriptTypes) return { error: 'TypeScript is not available on this server.' }
    return { code: stripTypeScriptTypes(source, { mode: 'transform' }) }
  } catch (error) {
    return { error: error instanceof Error ? error.message.split('\n')[0] : 'TypeScript error' }
  }
}

/** Remove `export` keywords so module-style answers still define globals. */
export function asScript(code: string): string {
  return code.replace(/^\s*export\s+(default\s+)?(?=(async\s+)?function|const|let|var|class)/gm, '')
}

export async function runInQuickJS(options: {
  code: string
  functionName: string
  calls: GuestCall[]
  timeoutMsPerCall?: number
}): Promise<GuestRun> {
  const { code, functionName, calls, timeoutMsPerCall = 1000 } = options
  let QuickJS: QuickJSWASMModule
  try {
    QuickJS = await quickjs()
  } catch {
    modulePromise = null
    return { error: 'The code runner could not start.', systemError: true, results: [], logs: '' }
  }
  const runtime = QuickJS.newRuntime()
  runtime.setMemoryLimit(MEMORY_LIMIT)
  runtime.setMaxStackSize(STACK_LIMIT)
  let deadline = Date.now() + LOAD_TIMEOUT_MS
  runtime.setInterruptHandler(() => Date.now() > deadline)
  const vm = runtime.newContext()

  let logs = ''
  const consoleObj = vm.newObject()
  const log = vm.newFunction('log', (...args) => {
    if (logs.length < LOG_LIMIT) {
      logs +=
        args
          .map((arg) => String(vm.dump(arg)))
          .join(' ')
          .slice(0, 400) + '\n'
    }
  })
  vm.setProp(consoleObj, 'log', log)
  vm.setProp(consoleObj, 'error', log)
  vm.setProp(vm.global, 'console', consoleObj)
  log.dispose()
  consoleObj.dispose()

  const describe = (handle: Parameters<typeof vm.dump>[0]) => {
    const dumped = vm.dump(handle)
    handle.dispose()
    if (dumped && typeof dumped === 'object' && 'message' in dumped) {
      const message = String((dumped as { message: unknown }).message)
      return message === 'interrupted' ? 'Timed out' : message
    }
    return String(dumped)
  }

  try {
    const setup = vm.evalCode(
      `const ${HARNESS} = Object.freeze({ stringify: JSON.stringify, parse: JSON.parse })`
    )
    if (setup.error) return { error: describe(setup.error), results: [], logs }
    setup.value.dispose()

    const loaded = vm.evalCode(asScript(code), 'solution.js')
    if (loaded.error) return { error: describe(loaded.error), results: [], logs }
    loaded.value.dispose()

    const kind = vm.evalCode(`typeof ${functionName}`)
    const kindValue = kind.error ? 'undefined' : vm.dump(kind.value)
    if (kind.error) kind.error.dispose()
    else kind.value.dispose()
    if (kindValue !== 'function') {
      return { error: `Define a function called ${functionName}.`, results: [], logs }
    }

    const results: GuestResult[] = []
    for (const call of calls) {
      const argsHandle = vm.newString(JSON.stringify(call.args))
      vm.setProp(vm.global, `${HARNESS}_args`, argsHandle)
      argsHandle.dispose()
      deadline = Date.now() + timeoutMsPerCall
      const out = vm.evalCode(
        `${HARNESS}.stringify(${functionName}(...${HARNESS}.parse(${HARNESS}_args)))`
      )
      if (out.error) {
        results.push({ id: call.id, error: describe(out.error) })
        continue
      }
      const json = vm.dump(out.value)
      out.value.dispose()
      try {
        results.push({ id: call.id, value: json === undefined ? null : JSON.parse(String(json)) })
      } catch {
        results.push({ id: call.id, error: 'The function returned something that is not JSON.' })
      }
    }
    return { results, logs }
  } catch (error) {
    // Memory limit and other runtime aborts land here.
    return {
      error: error instanceof Error ? error.message : 'The code could not run.',
      results: [],
      logs,
    }
  } finally {
    vm.dispose()
    runtime.dispose()
  }
}
