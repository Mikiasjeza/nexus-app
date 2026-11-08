/**
 * The challenge engine: what each workspace shows per stage, what a practice
 * run returns, and how a finished attempt is checked deterministically.
 * Everything here runs on the server from the attempt's stored challenge and
 * seed (its `Ctx`).
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
import { codeChallenge, sqlChallenge, writingChallenge } from './challenges'
import type { CodeChallenge } from './challenges/code'
import { tasksFor, type SqlChallenge, type SqlTaskDef } from './challenges/sql'
import { fieldIds, type WritingChallenge } from './challenges/writing'
import { describeSheet, inBounds, isLocked, MAX_CELL_LENGTH } from '@/lib/sheets/sheet'
import { runInQuickJS, stripTypes, type GuestCall, type GuestRun } from './runners/quickjs'
import { javascriptRuntime, pythonRuntime, runInJudge0 } from './runners/judge0'
import { DEV_PYTHON_RUNTIME, devPythonEnabled, runInPyodide } from './runners/pyodide-dev'
import { runSqlBatch, type SqlResult } from './runners/sqlite'
import { BUDGET_MESSAGE, takeRunnerBudget, type RunnerPurpose } from './budget'
import { sameRows, sameValue } from './compare'
import { shareOf } from './grading'
import type { GradingInput } from './ai-grader'

/** What identifies an attempt's content: the assessment, its challenge and its seed. */
export interface Ctx {
  def: AssessmentDefinition
  challengeId: string
  seed: number
}

/** Size limits for saved work, enforced on every save and submit. */
export const WORK_LIMITS = {
  code: 50_000,
  query: 5_000,
  text: 10_000,
  field: 1_000,
  /** Spreadsheet cells a stage may fill. */
  cells: 400,
  answer: 4_000,
  answers: 5,
}

const SAMPLE_ROWS = 8
const RUN_ROWS = 50

const codeOf = (ctx: Ctx): CodeChallenge => codeChallenge(ctx.challengeId)
const sqlOf = (ctx: Ctx): SqlChallenge => sqlChallenge(ctx.challengeId)
const writingOf = (ctx: Ctx): WritingChallenge => writingChallenge(ctx.challengeId)
const languageOf = (ctx: Ctx) => ctx.def.language as CodeLanguage

/** The challenge behind an attempt, whatever its workspace. */
function challengeOf(ctx: Ctx): CodeChallenge | SqlChallenge | WritingChallenge {
  if (ctx.def.workspace === 'code') return codeOf(ctx)
  if (ctx.def.workspace === 'sql') return sqlOf(ctx)
  return writingOf(ctx)
}

/** Trim saved work to the fields and sizes this challenge accepts. */
export function cleanWork(ctx: Ctx, stage: Stage, raw: unknown): StageWork {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  const pick = (value: unknown, ids: string[], max: number) => {
    const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const id of ids) if (typeof given[id] === 'string') out[id] = str(given[id], max)
    return out
  }
  if (stage === 'explain') {
    const answers = Array.isArray(input.answers) ? input.answers : []
    return { answers: answers.slice(0, WORK_LIMITS.answers).map((a) => str(a, WORK_LIMITS.answer)) }
  }
  if (ctx.def.workspace === 'code') return { code: str(input.code, WORK_LIMITS.code) }
  if (ctx.def.workspace === 'sql') {
    const ids = sqlOf(ctx).tasks.map((t) => t.id)
    return { queries: pick(input.queries, ids, WORK_LIMITS.query) }
  }
  const challenge = writingOf(ctx)
  const work: StageWork = {}
  if (challenge.text) work.text = str(input.text, WORK_LIMITS.text)
  if (challenge.fields) {
    work.fields = pick(input.fields, fieldIds(challenge, ctx.seed), WORK_LIMITS.field)
  }
  if (challenge.sheet) {
    const template = challenge.sheet(ctx.seed, stage === 'main' ? 'main' : 'followup')
    const given = (input.sheet && typeof input.sheet === 'object' ? input.sheet : {}) as Record<
      string,
      unknown
    >
    const ids = Object.keys(given).filter(
      (id) => typeof given[id] === 'string' && inBounds(template, id) && !isLocked(template, id)
    )
    work.sheet = Object.fromEntries(
      ids.slice(0, WORK_LIMITS.cells).map((id) => [id, str(given[id], MAX_CELL_LENGTH)])
    )
  }
  return work
}

export function explainQuestions(ctx: Ctx): string[] {
  return challengeOf(ctx).explainQuestions
}

function instructionsFor(ctx: Ctx, stage: Stage): string[] {
  if (ctx.def.workspace === 'code')
    return codeOf(ctx).instructions(ctx.seed, stage, languageOf(ctx))
  if (ctx.def.workspace === 'sql') return sqlOf(ctx).instructions(stage)
  return writingOf(ctx).instructions(ctx.seed, stage)
}

// ─── Where code runs ──────────────────────────────────────────────────────

export type RunnerKind = 'judge0-python' | 'judge0-javascript' | 'pyodide' | 'quickjs'

/**
 * Python runs on Judge0 (or Pyodide in local development). JavaScript and
 * TypeScript run on Judge0 when it offers Node.js 18+, keeping untrusted code
 * off the app server; otherwise in the QuickJS WebAssembly sandbox here.
 */
export async function runnerFor(
  def: AssessmentDefinition
): Promise<{ kind: RunnerKind; label: string }> {
  if (def.language === 'python') {
    if (devPythonEnabled()) return { kind: 'pyodide', label: DEV_PYTHON_RUNTIME.name }
    return { kind: 'judge0-python', label: (await pythonRuntime())?.name ?? 'Python 3' }
  }
  const node = await javascriptRuntime()
  if (node) return { kind: 'judge0-javascript', label: node.name }
  return { kind: 'quickjs', label: 'JavaScript (QuickJS sandbox)' }
}

/** Whether runs for this assessment go to the paid, rate-limited external runner. */
export async function usesExternalRunner(def: AssessmentDefinition): Promise<boolean> {
  if (def.workspace !== 'code') return false
  return (await runnerFor(def)).kind.startsWith('judge0')
}

async function runtimeLabel(def: AssessmentDefinition): Promise<string> {
  const { label } = await runnerFor(def)
  return def.language === 'typescript' ? `TypeScript, run as ${label}` : label
}

async function execute(
  ctx: Ctx,
  code: string,
  calls: GuestCall[],
  purpose: RunnerPurpose
): Promise<GuestRun> {
  const language = languageOf(ctx)
  const functionName = codeOf(ctx).functionName(language)
  if (!code.trim()) return { error: 'No code was submitted.', results: [], logs: '' }
  let source = code
  if (language === 'typescript') {
    const stripped = await stripTypes(code)
    if (stripped.error) return { error: stripped.error, results: [], logs: '' }
    source = stripped.code!
  }
  const runner = await runnerFor(ctx.def)
  if (runner.kind === 'quickjs') return runInQuickJS({ code: source, functionName, calls })
  if (runner.kind === 'pyodide') return runInPyodide({ code: source, functionName, calls })
  if (!(await takeRunnerBudget(purpose))) {
    // Out of allowance is never the candidate's fault: grading retries later.
    return { error: BUDGET_MESSAGE, systemError: purpose === 'grade', results: [], logs: '' }
  }
  return runInJudge0({
    language: runner.kind === 'judge0-python' ? 'python' : 'javascript',
    code: source,
    functionName,
    calls,
  })
}

// ─── Briefs ───────────────────────────────────────────────────────────────

/** First rows of each table, for the schema panel. */
async function sampleRows(
  challenge: SqlChallenge,
  setup: string
): Promise<Record<string, unknown[][]>> {
  const results = await runSqlBatch(
    setup,
    challenge.tables.map((t) => ({
      id: t.name,
      query: `SELECT * FROM ${t.name} LIMIT ${SAMPLE_ROWS}`,
    }))
  )
  return Object.fromEntries(results.map((r) => [r.id, r.rows ?? []]))
}

/**
 * What the browser gets for a stage. `previous` is the work submitted for
 * the stage before (the follow-up starts from it; the explain stage shows it).
 */
export async function buildBrief(
  ctx: Ctx,
  stage: Stage,
  previous: StageWork | undefined
): Promise<PublicBrief> {
  const { def, seed } = ctx
  const challenge = challengeOf(ctx)
  const brief: PublicBrief = {
    challengeId: ctx.challengeId,
    challengeVersion: challenge.version,
    title: challenge.title,
    skillName: def.skillName,
    workspace: def.workspace,
    language: def.language,
    level: def.level,
    stage,
    instructions: instructionsFor(ctx, stage),
  }
  if (def.workspace === 'code') brief.runtime = await runtimeLabel(def)
  if (stage === 'explain') {
    brief.explainQuestions = explainQuestions(ctx)
    brief.starter = previous?.code ?? previous?.text
    brief.starterQueries = previous?.queries
    brief.starterFields = previous?.fields
    brief.starterSheet = previous?.sheet
    // The field labels and the sheet, so the submitted work shows as it was.
    if (def.workspace === 'writing') {
      const writing = writingOf(ctx)
      if (writing.fields || writing.sheet) {
        brief.writing = {
          facts: [],
          fields: writing.fields?.(seed, 'followup'),
          sheet: writing.sheet?.(seed, 'followup'),
        }
      }
    }
    return brief
  }

  if (def.workspace === 'code') {
    const code = codeOf(ctx)
    const language = languageOf(ctx)
    brief.functionName = code.functionName(language)
    brief.starter =
      stage === 'main' ? code.starter(language) : previous?.code || code.starter(language)
    brief.visibleTests = code.visibleTests(seed, stage)
  } else if (def.workspace === 'sql') {
    const sql = sqlOf(ctx)
    const setup = sql.dataset(seed, stage === 'main' ? 'visible' : 'changed')
    brief.sql = {
      tables: sql.tables,
      sample: await sampleRows(sql, setup),
      tasks: tasksFor(sql, stage),
    }
    brief.starterQueries = stage === 'main' ? {} : (previous?.queries ?? {})
  } else {
    const writing = writingOf(ctx)
    brief.writing = {
      facts: writing.facts(seed, stage),
      table: writing.table?.(seed, stage),
      sheet: writing.sheet?.(seed, stage),
      fields: writing.fields?.(seed, stage),
      text: writing.text,
    }
    if (writing.text) brief.starter = stage === 'main' ? '' : (previous?.text ?? '')
    if (writing.fields) brief.starterFields = stage === 'main' ? {} : (previous?.fields ?? {})
    if (writing.sheet) brief.starterSheet = stage === 'main' ? {} : (previous?.sheet ?? {})
  }
  return brief
}

// ─── Practice runs ────────────────────────────────────────────────────────

export type PracticeRun =
  | { kind: 'code'; report: RunReport }
  | { kind: 'sql'; results: SqlResult[]; durationMs: number }

/** Writing tasks have nothing to run. */
export const canRun = (def: AssessmentDefinition) => def.workspace !== 'writing'

/** A practice run on visible material only. Never touches hidden tests. */
export async function practiceRun(
  ctx: Ctx,
  stage: 'main' | 'followup',
  work: StageWork
): Promise<PracticeRun> {
  const started = Date.now()
  if (ctx.def.workspace === 'code') {
    const tests = codeOf(ctx).visibleTests(ctx.seed, stage)
    const run = await execute(
      ctx,
      work.code ?? '',
      tests.map((t) => ({ id: t.id, args: t.args })),
      'run'
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
  const setup = sqlOf(ctx).dataset(ctx.seed, stage === 'main' ? 'visible' : 'changed')
  const jobs = Object.entries(work.queries ?? {})
    .filter(([, query]) => query.trim())
    .map(([id, query]) => ({ id, query }))
  const results = (await runSqlBatch(setup, jobs)).map((r) => ({
    ...r,
    rows: r.rows?.slice(0, RUN_ROWS),
  }))
  return { kind: 'sql', results, durationMs: Date.now() - started }
}

// ─── Deterministic grading ────────────────────────────────────────────────

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

async function evaluateCode(ctx: Ctx, work: Submissions) {
  const challenge = codeOf(ctx)
  const mainTests = challenge.hiddenTests(ctx.seed, 'main')
  const followTests = challenge.hiddenTests(ctx.seed, 'followup')
  const visible = challenge.visibleTests(ctx.seed, 'main')
  const [mainRun, followRun] = await Promise.all([
    execute(
      ctx,
      work.main?.code ?? '',
      [
        ...mainTests.map((t) => ({ id: t.id, args: t.args })),
        ...visible.map((t) => ({ id: t.id, args: t.args })),
      ],
      'grade'
    ),
    execute(
      ctx,
      work.followup?.code ?? '',
      followTests.map((t) => ({ id: t.id, args: t.args })),
      'grade'
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

async function evaluateSql(ctx: Ctx, work: Submissions) {
  const challenge = sqlOf(ctx)
  const visible = challenge.dataset(ctx.seed, 'visible')
  const changed = challenge.dataset(ctx.seed, 'changed')
  const allTasks = challenge.tasks
  const mainTasks = allTasks.filter((t) => t.stage === 'main')
  const mainQueries = work.main?.queries ?? {}
  const followQueries = work.followup?.queries ?? {}

  const refVisible = await runSqlBatch(
    visible,
    mainTasks.map((t) => ({ id: t.id, query: t.reference }))
  )
  const refChanged = await runSqlBatch(
    changed,
    allTasks.map((t) => ({ id: t.id, query: t.reference }))
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
    allTasks.map((t) => ({ id: t.id, query: followQueries[t.id] ?? mainQueries[t.id] ?? '' }))
  )

  const grade = (cand: SqlResult[], ref: SqlResult[], tasks: SqlTaskDef[], label: string) => {
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
  const robustness = grade(candChanged, refChanged, allTasks, 'tasks on the newer export')
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

function evaluateWriting(ctx: Ctx, work: Submissions): DeterministicResult {
  const challenge = writingOf(ctx)
  const main = challenge.checks(ctx.seed, 'main', work.main ?? {})
  const follow = challenge.checks(ctx.seed, 'followup', work.followup ?? {})
  const all = [
    ...main.map((c) => ({ ...c, stage: challenge.workLabels.main })),
    ...follow.map((c) => ({ ...c, stage: challenge.workLabels.followup })),
  ]
  const passed = all.filter((c) => c.passed).length
  const failed = all.filter((c) => !c.passed).map((c) => `${c.stage}: ${c.label.toLowerCase()}`)
  const evidence = [`${passed} of ${all.length} checks passed.`]
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
  ctx: Ctx,
  work: Submissions
): Promise<DeterministicResult> {
  if (ctx.def.workspace === 'code') return evaluateCode(ctx, work)
  if (ctx.def.workspace === 'sql') return evaluateSql(ctx, work)
  return evaluateWriting(ctx, work)
}

/** A writing task's facts and table as plain lines, for the grader's brief. */
function writingBrief(ctx: Ctx, stage: 'main' | 'followup'): string[] {
  if (ctx.def.workspace !== 'writing') return []
  const challenge = writingOf(ctx)
  const lines = challenge.facts(ctx.seed, stage).map((fact) => `Fact: ${fact}`)
  const sheet = challenge.sheet?.(ctx.seed, stage)
  if (sheet) {
    const label = (id: string) => sheet.cells[`A${id.slice(1)}`]?.value ?? id
    for (const [id, cell] of Object.entries(sheet.cells)) {
      if (cell.role === 'input') lines.push(`Sheet assumption ${id} (${label(id)}): ${cell.value}`)
    }
  }
  const table = challenge.table?.(ctx.seed, stage)
  if (table) {
    lines.push(
      `Table: ${table.caption}`,
      table.columns.join(' | '),
      ...table.rows.map((row) => row.join(' | '))
    )
  }
  return lines
}

/** A writing stage's answers as the grader reads them: each field with its label, then the text. */
function writtenWork(ctx: Ctx, stage: 'main' | 'followup', work: StageWork | undefined): string {
  const challenge = writingOf(ctx)
  const parts = (challenge.fields?.(ctx.seed, stage) ?? []).map(
    (field) => `${field.label}: ${work?.fields?.[field.id]?.trim() || '(blank)'}`
  )
  const sheet = challenge.sheet?.(ctx.seed, stage)
  if (sheet) {
    const lines = describeSheet(sheet, work?.sheet)
    parts.push(`Spreadsheet (cells the candidate filled):\n${lines.join('\n') || '(empty)'}`)
  }
  if (challenge.text) parts.push(work?.text ?? '')
  return parts.join(challenge.text && parts.length > 1 ? '\n\n' : '\n')
}

/** The AI grader's view of the attempt. */
export function gradingInput(
  ctx: Ctx,
  mode: AssessmentMode,
  work: Submissions,
  deterministic: DeterministicResult
): GradingInput {
  const { def } = ctx
  const questions = explainQuestions(ctx)
  const answers = work.explain?.answers ?? []
  const qa = questions
    .map((q, i) => `Q: ${q}\nA: ${answers[i]?.trim() || '(no answer)'}`)
    .join('\n\n')
  const mainFacts = writingBrief(ctx, 'main')
  const brief = [
    ...instructionsFor(ctx, 'main'),
    ...mainFacts,
    ...instructionsFor(ctx, 'followup'),
    ...writingBrief(ctx, 'followup').filter((line) => !mainFacts.includes(line)),
  ]

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
    const challenge = writingOf(ctx)
    items.push(
      { label: challenge.workLabels.main, content: writtenWork(ctx, 'main', work.main) },
      {
        label: challenge.workLabels.followup,
        content: writtenWork(ctx, 'followup', work.followup),
      }
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
