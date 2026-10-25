/**
 * Coding challenge "Log triage". The candidate turns raw log lines into a
 * per-service count of errors and warnings with the most common error,
 * skipping lines that don't parse. Each attempt gets its own reporting
 * threshold; the follow-up adds a `since` cut-off argument.
 *
 * Hidden tests are generated from the seed and answered by `referenceTriage`
 * on the server; the browser never sees them.
 */

import type { CodeLanguage, CodeTestCase, Stage } from '../types'
import { createRng, deriveSeed, type Rng } from '../random'
import { namesFor, type CodeChallenge, type GroupedTest } from './code'

export type TriageParams = { minIssues: number }

export type TriageSummary = Record<string, { errors: number; warnings: number; top: string | null }>

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

const LEVELS: Record<string, 'error' | 'warning' | 'quiet'> = {
  DEBUG: 'quiet',
  INFO: 'quiet',
  WARN: 'warning',
  WARNING: 'warning',
  ERROR: 'error',
}

export function triageParams(seed: number): TriageParams {
  const rng = createRng(deriveSeed(seed, 'triage:params'))
  return { minIssues: rng.pick([1, 2, 3]) }
}

/** The trusted answer key. `since` is the follow-up's cut-off, or null. */
export function referenceTriage(
  lines: unknown[],
  params: TriageParams,
  since: string | null
): TriageSummary {
  const stats = new Map<
    string,
    { errors: number; warnings: number; messages: Map<string, number> }
  >()
  for (const line of lines) {
    if (typeof line !== 'string') continue
    const parts = line.trim().split(/\s+/)
    if (parts.length < 4) continue
    const [timestamp, rawLevel, rawService, ...words] = parts
    if (!TIMESTAMP.test(timestamp)) continue
    const kind = LEVELS[rawLevel.toUpperCase()]
    if (!kind) continue
    if (since !== null && timestamp < since) continue
    const service = rawService.toLowerCase()
    const entry = stats.get(service) ?? { errors: 0, warnings: 0, messages: new Map() }
    stats.set(service, entry)
    if (kind === 'error') {
      entry.errors += 1
      const message = words.join(' ').replace(/\d+/g, 'N')
      entry.messages.set(message, (entry.messages.get(message) ?? 0) + 1)
    } else if (kind === 'warning') {
      entry.warnings += 1
    }
  }
  const out: TriageSummary = {}
  for (const [service, entry] of stats) {
    if (entry.errors + entry.warnings < params.minIssues) continue
    let top: string | null = null
    let best = 0
    for (const [message, count] of entry.messages) {
      if (count > best || (count === best && top !== null && message < top)) {
        top = message
        best = count
      }
    }
    out[service] = { errors: entry.errors, warnings: entry.warnings, top }
  }
  return out
}

const SERVICES = ['payments', 'search', 'auth', 'billing', 'email', 'catalog']

const ERROR_MESSAGES = [
  (rng: Rng) => `Timeout after ${rng.pick([250, 1000, 3000, 5000])} ms`,
  (rng: Rng) => `Connection refused by db-${rng.int(1, 4)}`,
  () => 'Card declined',
  (rng: Rng) => `User ${rng.int(100, 999)} not found`,
  (rng: Rng) => `Retry ${rng.int(1, 5)} of 5 failed`,
]

const OTHER_MESSAGES = [
  (rng: Rng) => `Queue length ${rng.int(10, 400)}`,
  (rng: Rng) => `Disk usage at ${rng.int(70, 99)}%`,
  () => 'Cache miss',
  () => 'Request served',
]

const pad = (n: number) => String(n).padStart(2, '0')

function timestamp(rng: Rng): string {
  return `2026-03-${pad(rng.int(1, 9))}T${pad(rng.int(0, 23))}:${pad(rng.int(0, 59))}:${pad(rng.int(0, 59))}Z`
}

function goodLine(rng: Rng): string {
  const level = rng.pick(['ERROR', 'ERROR', 'WARN', 'WARNING', 'INFO', 'DEBUG', 'error', 'Warn'])
  const message =
    level.toUpperCase() === 'ERROR' ? rng.pick(ERROR_MESSAGES)(rng) : rng.pick(OTHER_MESSAGES)(rng)
  const service = rng.chance(0.15) ? rng.pick(SERVICES).toUpperCase() : rng.pick(SERVICES)
  const gap = rng.chance(0.15) ? '  ' : ' '
  return [timestamp(rng), level, service, message].join(gap)
}

function badLine(rng: Rng): unknown {
  return rng.pick<unknown>([
    'not a log line',
    `2026-03-04 10:15:02 ERROR payments Timeout after 3000 ms`,
    `${timestamp(rng)} ERROR payments`,
    `${timestamp(rng)} FATAL payments Crash`,
    `${timestamp(rng)} [ERROR] payments Crash`,
    '',
    '   ',
    null,
    42,
    `2026-3-4T10:15:02Z ERROR auth Card declined`,
  ])
}

function lines(rng: Rng, count: number, badShare: number): unknown[] {
  return Array.from({ length: count }, () => (rng.chance(badShare) ? badLine(rng) : goodLine(rng)))
}

function caseFor(
  id: string,
  group: GroupedTest['group'],
  description: string,
  input: unknown[],
  params: TriageParams,
  since: string | null | undefined
): GroupedTest {
  return {
    id,
    group,
    description,
    args: since === undefined ? [input] : [input, since],
    expected: referenceTriage(input, params, since ?? null),
  }
}

function triageHiddenTests(seed: number, stage: 'main' | 'followup'): GroupedTest[] {
  const params = triageParams(seed)
  const rng = createRng(deriveSeed(seed, `triage:hidden:${stage}`))
  // Main calls pass one argument; follow-up calls always pass `since` too.
  const cut = (value: string | null) => (stage === 'followup' ? value : undefined)
  const tie = timestamp(rng)
  const tests: GroupedTest[] = [
    caseFor('h-empty', 'edge', 'no lines', [], params, cut(null)),
    caseFor('h-basic', 'core', 'a few services', lines(rng, 12, 0), params, cut(null)),
    caseFor('h-mixed', 'core', 'many lines', lines(rng, 60, 0), params, cut(null)),
    caseFor('h-bad', 'edge', 'lines that do not parse', lines(rng, 30, 0.5), params, cut(null)),
    caseFor(
      'h-tie',
      'edge',
      'tied error messages',
      [
        `${tie} ERROR search Timeout after 30 ms`,
        `${tie} ERROR search Card declined`,
        `${tie} ERROR search Timeout after 9 ms`,
        `${tie} ERROR search Card declined`,
        `${tie} WARN search Queue length 3`,
        `${tie} WARN search Queue length 4`,
      ],
      params,
      cut(null)
    ),
    caseFor(
      'h-threshold',
      'edge',
      'services around the threshold',
      [
        `${tie} WARN auth Disk usage at 91%`,
        `${tie} ERROR email Retry 1 of 5 failed`,
        `${tie} WARN email Queue length 12`,
        `${tie} INFO catalog Request served`,
        `${tie} error billing Card declined`,
        `${tie} Warning billing Cache miss`,
        `${tie} ERROR billing Card declined`,
      ],
      params,
      cut(null)
    ),
    caseFor('h-large', 'core', 'a long log', lines(rng, 400, 0.1), params, cut(null)),
  ]
  if (stage === 'followup') {
    const input = lines(rng, 80, 0.1)
    const since = `2026-03-0${rng.int(3, 6)}T12:00:00Z`
    tests.push(
      caseFor('h-since', 'core', 'cut-off in the middle', input, params, since),
      caseFor(
        'h-since-exact',
        'edge',
        'a line exactly at the cut-off',
        // Three issues after the cut-off, so it shows at every threshold.
        [
          '2026-03-05T12:00:00Z ERROR auth Card declined',
          '2026-03-05T11:59:59Z ERROR auth Timeout after 5 ms',
          '2026-03-05T12:00:01Z WARN auth Cache miss',
          '2026-03-05T12:30:00Z ERROR auth Card declined',
        ],
        params,
        '2026-03-05T12:00:00Z'
      ),
      caseFor(
        'h-since-late',
        'edge',
        'cut-off after every line',
        input,
        params,
        '2026-04-01T00:00:00Z'
      )
    )
  }
  return tests
}

function triageVisibleTests(seed: number, stage: 'main' | 'followup'): CodeTestCase[] {
  const params = triageParams(seed)
  const examples: { id: string; description: string; lines: unknown[]; since?: string | null }[] = [
    {
      id: 'v-basic',
      description: 'Errors and warnings for one service',
      lines: [
        '2026-03-04T10:15:02Z ERROR payments Timeout after 3000 ms',
        '2026-03-04T10:15:09Z ERROR payments Timeout after 250 ms',
        '2026-03-04T10:16:00Z WARN payments Queue length 120',
        '2026-03-04T10:17:44Z ERROR payments Card declined',
      ],
    },
    {
      id: 'v-skip',
      description: 'Lines that do not parse are skipped',
      lines: [
        '2026-03-04T10:15:02Z error AUTH User 418 not found',
        'not a log line',
        '2026-03-04T10:15:02Z FATAL auth Crash',
        '2026-03-04T10:15:03Z  warning  auth  Disk usage at 93%',
        '2026-03-04T10:15:04Z WARN auth Cache miss',
      ],
    },
    {
      id: 'v-quiet',
      description: 'INFO and DEBUG lines are not counted',
      lines: [
        '2026-03-04T09:00:00Z INFO search Request served',
        '2026-03-04T09:00:01Z DEBUG search Cache miss',
        '2026-03-04T09:00:02Z ERROR email Retry 2 of 5 failed',
        '2026-03-04T09:00:03Z ERROR email Retry 3 of 5 failed',
      ],
    },
  ]
  if (stage === 'followup') {
    for (const e of examples) e.since = null
    examples.push({
      id: 'v-since',
      description: 'Lines before the cut-off are ignored',
      lines: [
        '2026-03-04T08:00:00Z ERROR billing Card declined',
        '2026-03-04T12:00:00Z ERROR billing Timeout after 40 ms',
        '2026-03-04T13:30:00Z WARN billing Queue length 9',
      ],
      since: '2026-03-04T12:00:00Z',
    })
  }
  return examples.map((e) => ({
    id: e.id,
    description: e.description,
    args: e.since === undefined ? [e.lines] : [e.lines, e.since],
    expected: referenceTriage(e.lines, params, e.since ?? null),
  }))
}

const triageFunctionName = namesFor('triageLogs', 'triage_logs')

function triageStarter(language: CodeLanguage): string {
  if (language === 'python') {
    return `def triage_logs(lines):
    """Return {service: {"errors": int, "warnings": int, "top": str | None}}."""
    summary = {}
    # Your code here
    return summary
`
  }
  if (language === 'typescript') {
    return `type ServiceSummary = { errors: number; warnings: number; top: string | null }

function triageLogs(lines: unknown[]): Record<string, ServiceSummary> {
  const summary: Record<string, ServiceSummary> = {}
  // Your code here
  return summary
}
`
  }
  return `function triageLogs(lines) {
  const summary = {}
  // Your code here
  return summary
}
`
}

function triageInstructions(seed: number, stage: Stage, language: CodeLanguage): string[] {
  const { minIssues } = triageParams(seed)
  const fn = triageFunctionName(language)
  const none = language === 'python' ? 'None' : 'null'
  if (stage === 'main') {
    return [
      `Write ${fn}(lines). Each line looks like "2026-03-04T10:15:02Z ERROR payments Timeout after 3000 ms": a timestamp, a level, a service and a message, separated by spaces (sometimes more than one).`,
      `Return ${language === 'python' ? 'a dict' : 'an object'} keyed by service name in lowercase, where each value is { errors, warnings, top }.`,
      'Levels ignore case. ERROR is an error; WARN and WARNING are warnings; DEBUG and INFO are valid lines that are not counted. Skip lines with any other level.',
      'Skip entries that are not strings, lines with fewer than four parts, and lines whose timestamp is not exactly YYYY-MM-DDTHH:MM:SSZ.',
      `top is the service's most common error message after replacing every run of digits with N, so "Timeout after 3000 ms" and "Timeout after 250 ms" are both "Timeout after N ms". Join message words with single spaces. On a tie, use the one that sorts first. ${none} if the service has no errors.`,
      minIssues === 1
        ? 'Only include services with at least one error or warning.'
        : `Only include services with at least ${minIssues} errors and warnings combined.`,
      'Use only the standard library. Visible examples help you check the format; the score comes from hidden tests.',
    ]
  }
  if (stage === 'followup') {
    return [
      `New requirement: ${fn} now takes a second argument, since: a timestamp in the same format, or ${none}.`,
      `Ignore lines with a timestamp earlier than since. A line exactly at since still counts. With ${none}, keep every line.`,
      'Keep every rule from before. Update your function; your previous code is loaded below.',
    ]
  }
  return ['Answer in your own words. Point to your code where it helps.']
}

export const LOG_TRIAGE: CodeChallenge = {
  id: 'log-triage',
  version: 1,
  title: 'Log triage',
  functionName: triageFunctionName,
  starter: triageStarter,
  instructions: triageInstructions,
  visibleTests: triageVisibleTests,
  hiddenTests: triageHiddenTests,
  explainQuestions: [
    'How does your code decide which lines to skip?',
    'How did you find the most common error message, and how do you break ties?',
    'The logs grow to 50 GB and no longer fit in memory. What would you change?',
  ],
}
