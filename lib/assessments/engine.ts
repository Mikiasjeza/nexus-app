/**
 * The challenge engine: what each workspace shows per stage, what a practice
 * run returns, and how a finished attempt is checked deterministically.
 * Everything here runs on the server from the attempt's stored seed.
 */

import type { AssessmentDefinition } from './catalog'
import type {
  AssessmentMode,
  CodeLanguage,
  IntegrityFlag,
  PublicBrief,
  RunReport,
  Stage,
  StageWork,
} from './types'
import {
  LEDGER_EXPLAIN_QUESTIONS,
  ledgerFunctionName,
  ledgerHiddenTests,
  ledgerInstructions,
  ledgerStarter,
  ledgerVisibleTests,
} from './challenges/ledger'
import {
  SALES_EXPLAIN_QUESTIONS,
  SALES_TABLES,
  SALES_TASKS,
  salesDataset,
  salesInstructions,
  salesTasksFor,
} from './challenges/sales'
import {
  EMAIL_EXPLAIN_QUESTIONS,
  EMAIL_WORD_RANGE,
  emailChecks,
  emailInstructions,
  emailScenario,
  formatDate,
} from './challenges/client-email'
import { runInQuickJS, stripTypes, type GuestCall, type GuestRun } from './runners/quickjs'
import { judge0RunsJavaScript, runInJudge0 } from './runners/judge0'
import { runSqlBatch, type SqlResult } from './runners/sqlite'
import { sameRows, sameValue } from './compare'
import { shareOf } from './grading'
import type { GradingInput } from './ai-grader'

/** Size limits for saved work, enforced on every save and submit. */
export const WORK_LIMITS = { code: 50_000, query: 5_000, text: 10_000, answer: 4_000, answers: 5 }

const SAMPLE_ROWS = 8
const RUN_ROWS = 50

/** Trim saved work to the fields and sizes this workspace accepts. */
export function cleanWork(def: AssessmentDefinition, stage: Stage, raw: unknown): StageWork {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  if (stage === 'explain') {
    const answers = Array.isArray(input.answers) ? input.answers : []
    return { answers: answers.slice(0, WORK_LIMITS.answers).map((a) => str(a, WORK_LIMITS.answer)) }
  }
  if (def.workspace === 'code') return { code: str(input.code, WORK_LIMITS.code) }
  if (def.workspace === 'sql') {
    const queries: Record<string, string> = {}
    const given = (
      input.queries && typeof input.queries === 'object' ? input.queries : {}
    ) as Record<string, unknown>
    for (const task of SALES_TASKS) {
      if (typeof given[task.id] === 'string')
        queries[task.id] = str(given[task.id], WORK_LIMITS.query)
    }
    return { queries }
  }
  return { text: str(input.text, WORK_LIMITS.text) }
}

export function explainQuestions(def: AssessmentDefinition): string[] {
  if (def.workspace === 'code') return LEDGER_EXPLAIN_QUESTIONS
  if (def.workspace === 'sql') return SALES_EXPLAIN_QUESTIONS
  return EMAIL_EXPLAIN_QUESTIONS
}

function instructionsFor(def: AssessmentDefinition, seed: number, stage: Stage): string[] {
  if (def.workspace === 'code') return ledgerInstructions(seed, stage, def.language as CodeLanguage)
  if (def.workspace === 'sql') return salesInstructions(stage)
  return emailInstructions(seed, stage)
}

/** First rows of each table, for the schema panel. */
async function sampleRows(setup: string): Promise<Record<string, unknown[][]>> {
  const results = await runSqlBatch(
    setup,
    SALES_TABLES.map((t) => ({ id: t.name, query: `SELECT * FROM ${t.name} LIMIT ${SAMPLE_ROWS}` }))
  )
  return Object.fromEntries(results.map((r) => [r.id, r.rows ?? []]))
}

/**
 * What the browser gets for a stage. `previous` is the work submitted for
 * the stage before (the follow-up starts from it; the explain stage shows it).
 */
export async function buildBrief(
  def: AssessmentDefinition,
  seed: number,
  stage: Stage,
  previous: StageWork | undefined
): Promise<PublicBrief> {
  const brief: PublicBrief = {
    challengeId: def.challengeId,
    challengeVersion: def.challengeVersion,
    title: def.title,
    skillName: def.skillName,
    workspace: def.workspace,
    language: def.language,
    level: def.level,
    stage,
    instructions: instructionsFor(def, seed, stage),
  }
  if (stage === 'explain') {
    brief.explainQuestions = explainQuestions(def)
    brief.starter = previous?.code ?? previous?.text
    brief.starterQueries = previous?.queries
    return brief
  }

  if (def.workspace === 'code') {
    const language = def.language as CodeLanguage
    brief.functionName = ledgerFunctionName(language)
    brief.starter =
      stage === 'main' ? ledgerStarter(language) : previous?.code || ledgerStarter(language)
    brief.visibleTests = ledgerVisibleTests(seed, stage)
  } else if (def.workspace === 'sql') {
    const setup = salesDataset(seed, stage === 'main' ? 'visible' : 'changed')
    brief.sql = {
      tables: SALES_TABLES,
      sample: await sampleRows(setup),
      tasks: salesTasksFor(stage),
    }
    brief.starterQueries = stage === 'main' ? {} : (previous?.queries ?? {})
  } else {
    const s = emailScenario(seed)
    brief.writing = {
      minWords: EMAIL_WORD_RANGE.min,
      maxWords: EMAIL_WORD_RANGE.max,
      facts: [
        `Client: ${s.client}, project lead ${s.contact}`,
        `Project: ${s.project}`,
        `Original date: ${formatDate(s.originalDate)}`,
        `New date: ${formatDate(s.newDate)}`,
        `Reason: ${s.reason}`,
        `Mitigation: ${s.mitigation}`,
        ...(stage === 'followup'
          ? [`Can ship early: ${s.partialPart}, by ${formatDate(s.originalDate)}`]
          : []),
      ],
    }
    brief.starter = stage === 'main' ? '' : (previous?.text ?? '')
  }
  return brief
}

/**
 * Run candidate code for the challenge's language. Python always runs on
 * Judge0. JavaScript and TypeScript run there too when it is set up for
 * them, keeping untrusted code off the app server; otherwise they run in the
 * QuickJS WebAssembly sandbox in this process.
 */
async function execute(
  def: AssessmentDefinition,
  code: string,
  calls: GuestCall[]
): Promise<GuestRun> {
  const language = def.language as CodeLanguage
  const functionName = ledgerFunctionName(language)
  if (!code.trim()) return { error: 'No code was submitted.', results: [], logs: '' }
  if (language === 'python') return runInJudge0({ language: 'python', code, functionName, calls })
  let source = code
  if (language === 'typescript') {
    const stripped = await stripTypes(code)
    if (stripped.error) return { error: stripped.error, results: [], logs: '' }
    source = stripped.code!
  }
  if (judge0RunsJavaScript()) {
    return runInJudge0({ language: 'javascript', code: source, functionName, calls })
  }
  return runInQuickJS({ code: source, functionName, calls })
}

export type PracticeRun =
  | { kind: 'code'; report: RunReport }
  | { kind: 'sql'; results: SqlResult[]; durationMs: number }

/** A practice run on visible material only. Never touches hidden tests. */
export async function practiceRun(
  def: AssessmentDefinition,
  seed: number,
  stage: 'main' | 'followup',
  work: StageWork
): Promise<PracticeRun> {
  const started = Date.now()
  if (def.workspace === 'code') {
    const tests = ledgerVisibleTests(seed, stage)
    const run = await execute(
      def,
      work.code ?? '',
      tests.map((t) => ({ id: t.id, args: t.args }))
    )
    const outcomes = run.error
      ? []
      : tests.map((t) => {
          const r = run.results.find((x) => x.id === t.id)
          return {
            id: t.id,
            passed: Boolean(r && !r.error && sameValue(r.value, t.expected)),
            actual: r?.value,
            error: r?.error,
          }
        })
    return {
      kind: 'code',
      report: {
        ok: !run.error,
        error: run.error,
        outcomes,
        logs: run.logs,
        durationMs: Date.now() - started,
      },
    }
  }
  const setup = salesDataset(seed, stage === 'main' ? 'visible' : 'changed')
  const jobs = Object.entries(work.queries ?? {})
    .filter(([, query]) => query.trim())
    .map(([id, query]) => ({ id, query }))
  const results = (await runSqlBatch(setup, jobs)).map((r) => ({
    ...r,
    rows: r.rows?.slice(0, RUN_ROWS),
  }))
  return { kind: 'sql', results, durationMs: Date.now() - started }
}

export interface DeterministicResult {
  /** Keyed by rubric source, e.g. `tests:main:core`. */
  scores: Record<string, { score: number; evidence: string[]; assessedBy: 'tests' | 'checks' }>
  /** Plain lines for the AI grader's context. */
  context: string[]
  flags: IntegrityFlag[]
  /** Extra material for the AI grader (e.g. the candidate's query results). */
  extraWork: { label: string; content: string }[]
  /** The runner failed; nothing here can be trusted as the candidate's score. */
  systemError?: string
}

type Submissions = Partial<Record<Stage, StageWork>>

async function evaluateCode(def: AssessmentDefinition, seed: number, work: Submissions) {
  const mainTests = ledgerHiddenTests(seed, 'main')
  const followTests = ledgerHiddenTests(seed, 'followup')
  const visible = ledgerVisibleTests(seed, 'main')
  const [mainRun, followRun] = await Promise.all([
    execute(def, work.main?.code ?? '', [
      ...mainTests.map((t) => ({ id: t.id, args: t.args })),
      ...visible.map((t) => ({ id: t.id, args: t.args })),
    ]),
    execute(
      def,
      work.followup?.code ?? '',
      followTests.map((t) => ({ id: t.id, args: t.args }))
    ),
  ])
  const result: DeterministicResult = { scores: {}, context: [], flags: [], extraWork: [] }
  const broken = [mainRun, followRun].find((r) => r.systemError)
  if (broken) return { ...result, systemError: broken.error ?? 'The code runner failed.' }

  const passes = (run: GuestRun, id: string, expected: unknown) => {
    const r = run.results.find((x) => x.id === id)
    return Boolean(r && !r.error && sameValue(r.value, expected))
  }
  const tally = (run: GuestRun, tests: typeof mainTests, label: string) => {
    const passed = tests.filter((t) => passes(run, t.id, t.expected))
    const failed = tests.filter((t) => !passes(run, t.id, t.expected)).map((t) => t.description)
    const evidence = [`${passed.length} of ${tests.length} hidden ${label} tests passed.`]
    if (run.error) evidence.push(`The code did not run: ${run.error}`)
    else if (failed.length) evidence.push(`Failed: ${[...new Set(failed)].join(', ')}.`)
    return { score: shareOf(passed.length, tests.length), evidence, assessedBy: 'tests' as const }
  }

  const core = tally(
    mainRun,
    mainTests.filter((t) => t.group === 'core'),
    'core'
  )
  const edge = tally(
    mainRun,
    mainTests.filter((t) => t.group === 'edge'),
    'edge-case'
  )
  const follow = tally(followRun, followTests, 'follow-up')
  result.scores['tests:main:core'] = core
  result.scores['tests:main:edge'] = edge
  result.scores['tests:followup'] = follow
  result.context.push(core.evidence[0], edge.evidence[0], follow.evidence[0])

  const visiblePassed = visible.every((t) => passes(mainRun, t.id, t.expected))
  if (visiblePassed && core.score < 0.4) {
    result.flags.push({
      code: 'visible-only',
      detail: 'Passed the visible examples but few hidden tests.',
      severity: 'info',
    })
  }
  return result
}

const formatTable = (r: SqlResult | undefined) => {
  if (!r) return '(no query)'
  if (r.error) return `Error: ${r.error}`
  const rows = (r.rows ?? []).slice(0, 12).map((row) => row.map((c) => String(c)).join(' | '))
  return [r.columns?.join(' | ') ?? '', ...rows].join('\n')
}

async function evaluateSql(seed: number, work: Submissions) {
  const visible = salesDataset(seed, 'visible')
  const changed = salesDataset(seed, 'changed')
  const mainTasks = SALES_TASKS.filter((t) => t.stage === 'main')
  const mainQueries = work.main?.queries ?? {}
  const followQueries = work.followup?.queries ?? {}

  const refVisible = await runSqlBatch(
    visible,
    mainTasks.map((t) => ({ id: t.id, query: t.reference }))
  )
  const refChanged = await runSqlBatch(
    changed,
    SALES_TASKS.map((t) => ({ id: t.id, query: t.reference }))
  )
  const result: DeterministicResult = { scores: {}, context: [], flags: [], extraWork: [] }
  if ([...refVisible, ...refChanged].some((r) => r.error)) {
    return { ...result, systemError: 'The SQL runner failed on the answer key.' }
  }
  const candVisible = await runSqlBatch(
    visible,
    mainTasks.map((t) => ({ id: t.id, query: mainQueries[t.id] ?? '' }))
  )
  const candChanged = await runSqlBatch(
    changed,
    SALES_TASKS.map((t) => ({ id: t.id, query: followQueries[t.id] ?? mainQueries[t.id] ?? '' }))
  )

  const grade = (cand: SqlResult[], ref: SqlResult[], tasks: typeof SALES_TASKS, label: string) => {
    const evidence: string[] = []
    let correct = 0
    for (const task of tasks) {
      const c = cand.find((r) => r.id === task.id)
      const r = ref.find((x) => x.id === task.id)!
      if (!c || c.error) {
        evidence.push(`${task.id}: ${c?.error ?? 'no query'}`)
      } else if (sameRows(c.rows ?? [], r.rows ?? [], task.ordered)) {
        correct++
        evidence.push(`${task.id}: correct`)
      } else {
        evidence.push(
          `${task.id}: wrong result (${c.rows?.length ?? 0} rows, expected ${r.rows?.length ?? 0})`
        )
      }
    }
    return {
      score: shareOf(correct, tasks.length),
      evidence: [`${correct} of ${tasks.length} ${label} correct.`, ...evidence],
      assessedBy: 'tests' as const,
    }
  }

  const accuracy = grade(candVisible, refVisible, mainTasks, 'tasks on your dataset')
  const robustness = grade(candChanged, refChanged, SALES_TASKS, 'tasks on the newer export')
  result.scores['sql:main'] = accuracy
  result.scores['sql:followup'] = robustness
  result.context.push(accuracy.evidence[0], robustness.evidence[0])

  for (const task of mainTasks) {
    const q = mainQueries[task.id] ?? ''
    if (q.trim() && !/\bfrom\b/i.test(q)) {
      result.flags.push({
        code: 'no-table',
        detail: `The ${task.id} query returns fixed values without reading a table.`,
        severity: 'info',
      })
    }
  }
  result.extraWork.push({
    label: 'Results of the candidate queries on their dataset',
    content: mainTasks
      .map((t) => `${t.id}:\n${formatTable(candVisible.find((r) => r.id === t.id))}`)
      .join('\n\n'),
  })
  return result
}

function evaluateWriting(seed: number, work: Submissions): DeterministicResult {
  const main = emailChecks(seed, 'main', work.main?.text ?? '')
  const follow = emailChecks(seed, 'followup', work.followup?.text ?? '')
  const all = [
    ...main.map((c) => ({ ...c, stage: 'First email' })),
    ...follow.map((c) => ({ ...c, stage: 'Revision' })),
  ]
  const passed = all.filter((c) => c.passed).length
  const failed = all.filter((c) => !c.passed).map((c) => `${c.stage}: ${c.label.toLowerCase()}`)
  const evidence = [`${passed} of ${all.length} fact checks passed.`]
  if (failed.length) evidence.push(`Missed: ${failed.join('; ')}.`)
  return {
    scores: {
      'checks:all': { score: shareOf(passed, all.length), evidence, assessedBy: 'checks' },
    },
    context: evidence,
    flags: [],
    extraWork: [],
  }
}

export async function evaluateDeterministic(
  def: AssessmentDefinition,
  seed: number,
  work: Submissions
): Promise<DeterministicResult> {
  if (def.workspace === 'code') return evaluateCode(def, seed, work)
  if (def.workspace === 'sql') return evaluateSql(seed, work)
  return evaluateWriting(seed, work)
}

/** The AI grader's view of the attempt. */
export function gradingInput(
  def: AssessmentDefinition,
  seed: number,
  mode: AssessmentMode,
  work: Submissions,
  deterministic: DeterministicResult
): GradingInput {
  const questions = explainQuestions(def)
  const answers = work.explain?.answers ?? []
  const qa = questions
    .map((q, i) => `Q: ${q}\nA: ${answers[i]?.trim() || '(no answer)'}`)
    .join('\n\n')
  const brief = [...instructionsFor(def, seed, 'main'), ...instructionsFor(def, seed, 'followup')]

  const items: { label: string; content: string }[] = []
  if (def.workspace === 'code') {
    items.push(
      { label: 'Code submitted for the main task', content: work.main?.code ?? '' },
      { label: 'Final code after the follow-up', content: work.followup?.code ?? '' }
    )
  } else if (def.workspace === 'sql') {
    const queries = (q: Record<string, string> | undefined) =>
      Object.entries(q ?? {})
        .map(([id, sql]) => `-- ${id}\n${sql}`)
        .join('\n\n')
    items.push(
      { label: 'Queries for the main tasks', content: queries(work.main?.queries) },
      { label: 'Queries after the newer export', content: queries(work.followup?.queries) },
      ...deterministic.extraWork
    )
  } else {
    items.push(
      { label: 'First email', content: work.main?.text ?? '' },
      { label: 'Revised email', content: work.followup?.text ?? '' }
    )
  }
  items.push({ label: 'Answers about the work', content: qa })
  return {
    rubric: def.rubric,
    skillName: def.skillName,
    mode,
    brief,
    work: items,
    deterministic: deterministic.context,
  }
}
