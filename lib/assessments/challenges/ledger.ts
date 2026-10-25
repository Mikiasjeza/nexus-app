/**
 * Coding challenge "Ledger summary", shared by JavaScript, TypeScript and
 * Python. The candidate writes one function that folds raw transaction
 * records into per-account balances, ignoring malformed records. Each attempt
 * gets its own fee rule from the seed, and the follow-up asks for duplicate
 * record ids to be counted once.
 *
 * Hidden tests are generated from the seed and answered by `referenceLedger`
 * on the server; the browser never sees them.
 */

import type { CodeLanguage, CodeTestCase, Stage } from '../types'
import { CODE_RUBRIC, namesFor, type CodeChallenge, type GroupedTest } from './code'
import { createRng, deriveSeed, round2, type Rng } from '../random'

export type LedgerRecord = {
  id: string
  account?: unknown
  type?: unknown
  amount?: unknown
}

export type LedgerParams = { feeThreshold: number; fee: number }

export type LedgerSummary = Record<string, { balance: number; count: number }>

export function ledgerParams(seed: number): LedgerParams {
  const rng = createRng(deriveSeed(seed, 'ledger:params'))
  return { feeThreshold: rng.pick([100, 250, 500]), fee: rng.pick([1, 2.5, 5]) }
}

function validAmount(raw: unknown): number | null {
  if (typeof raw !== 'number' && typeof raw !== 'string') return null
  if (typeof raw === 'string' && !/^\s*\d+(\.\d+)?\s*$/.test(raw)) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** The trusted answer key. `dedupe` switches on the follow-up rule. */
export function referenceLedger(
  records: LedgerRecord[],
  params: LedgerParams,
  dedupe: boolean
): LedgerSummary {
  const out: LedgerSummary = {}
  const seen = new Set<string>()
  for (const record of records) {
    if (dedupe) {
      if (seen.has(record.id)) continue
      seen.add(record.id)
    }
    if (typeof record.account !== 'string' || typeof record.type !== 'string') continue
    const account = record.account.trim().toLowerCase()
    const type = record.type.trim().toLowerCase()
    const amount = validAmount(record.amount)
    if (!account || amount === null || (type !== 'credit' && type !== 'debit')) continue
    let delta = type === 'credit' ? amount : -amount
    if (type === 'debit' && amount > params.feeThreshold) delta -= params.fee
    const entry = (out[account] ??= { balance: 0, count: 0 })
    entry.balance += delta
    entry.count += 1
  }
  for (const entry of Object.values(out)) entry.balance = round2(entry.balance)
  return out
}

const ACCOUNTS = ['ops', 'payroll', 'marketing', 'travel', 'cloud', 'rent']

function randomRecord(rng: Rng, id: string, params: LedgerParams): LedgerRecord {
  const account = rng.pick(ACCOUNTS)
  const casing = rng.pick([
    account,
    account.toUpperCase(),
    ` ${account} `,
    account[0].toUpperCase() + account.slice(1),
  ])
  const type = rng.pick(['credit', 'debit', 'Credit', ' DEBIT ', 'debit'])
  const base = rng.chance(0.25)
    ? params.feeThreshold + rng.int(-2, 2) * 0.5
    : rng.int(1, 900) + rng.int(0, 99) / 100
  const amount = rng.chance(0.3) ? base.toFixed(2) : base
  return { id, account: casing, type, amount }
}

function malformed(rng: Rng, id: string): LedgerRecord {
  return rng.pick<LedgerRecord>([
    { id, account: 'ops', type: 'credit', amount: 'abc' },
    { id, account: 'ops', type: 'debit', amount: -40 },
    { id, account: 'travel', type: 'credit', amount: 0 },
    { id, account: 'payroll', type: 'refund', amount: 25 },
    { id, account: '   ', type: 'credit', amount: 10 },
    { id, type: 'credit', amount: 10 },
    { id, account: 'cloud', type: 'debit', amount: null },
    { id, account: 'rent', type: 'debit', amount: '' },
    { id, account: 'ops', amount: 15 },
  ])
}

function caseFor(
  id: string,
  group: GroupedTest['group'],
  description: string,
  records: LedgerRecord[],
  params: LedgerParams,
  dedupe: boolean
): GroupedTest {
  return {
    id,
    group,
    description,
    args: [records],
    expected: referenceLedger(records, params, dedupe),
  }
}

/** Deterministic hidden tests for a stage, different for every seed. */
export function ledgerHiddenTests(seed: number, stage: 'main' | 'followup'): GroupedTest[] {
  const params = ledgerParams(seed)
  const rng = createRng(deriveSeed(seed, `ledger:hidden:${stage}`))
  const dedupe = stage === 'followup'
  let n = 0
  const nextId = () => `t${++n}`
  const records = (count: number, badShare: number) =>
    Array.from({ length: count }, () =>
      rng.chance(badShare) ? malformed(rng, nextId()) : randomRecord(rng, nextId(), params)
    )

  const tests: GroupedTest[] = [
    caseFor('h-empty', 'edge', 'no records', [], params, dedupe),
    caseFor('h-basic', 'core', 'credits and debits', records(6, 0), params, dedupe),
    caseFor('h-mixed', 'core', 'mixed accounts', records(25, 0), params, dedupe),
    caseFor('h-bad', 'edge', 'malformed records', records(18, 0.6), params, dedupe),
    caseFor(
      'h-boundary',
      'edge',
      'fee boundary',
      [
        { id: nextId(), account: 'ops', type: 'debit', amount: params.feeThreshold },
        { id: nextId(), account: 'ops', type: 'debit', amount: params.feeThreshold + 0.01 },
        { id: nextId(), account: 'ops', type: 'credit', amount: params.feeThreshold + 1 },
      ],
      params,
      dedupe
    ),
    caseFor(
      'h-normalise',
      'edge',
      'account and type normalisation',
      [
        { id: nextId(), account: '  Payroll ', type: ' CREDIT', amount: '100.10' },
        { id: nextId(), account: 'payroll', type: 'Debit', amount: 0.1 },
        { id: nextId(), account: 'PAYROLL', type: 'debit', amount: '0.20' },
      ],
      params,
      dedupe
    ),
    caseFor('h-large', 'core', 'larger ledger', records(220, 0.15), params, dedupe),
  ]

  if (dedupe) {
    // Repeat some ids, including one whose first occurrence is malformed.
    const base = records(30, 0.2)
    const dupes = [base[2], base[5], base[11]].map((r) => ({ ...r, amount: 999 }))
    const firstBad = { id: 'dup-x', account: 'ops', type: 'credit', amount: 'n/a' }
    const laterGood = { id: 'dup-x', account: 'ops', type: 'credit', amount: 50 }
    tests.push(
      caseFor('h-dupes', 'core', 'duplicate ids', [...base, ...dupes], params, true),
      caseFor(
        'h-dupe-first-bad',
        'edge',
        'first duplicate malformed',
        [firstBad, laterGood],
        params,
        true
      )
    )
  }
  return tests
}

export const ledgerFunctionName = namesFor('summarizeLedger', 'summarize_ledger')

export function ledgerStarter(language: CodeLanguage): string {
  if (language === 'python') {
    return `def summarize_ledger(records):
    """Return {account: {"balance": float, "count": int}}."""
    summary = {}
    # Your code here
    return summary
`
  }
  if (language === 'typescript') {
    return `type LedgerRecord = {
  id: string
  account?: unknown
  type?: unknown
  amount?: unknown
}

type Summary = Record<string, { balance: number; count: number }>

function summarizeLedger(records: LedgerRecord[]): Summary {
  const summary: Summary = {}
  // Your code here
  return summary
}
`
  }
  return `function summarizeLedger(records) {
  const summary = {}
  // Your code here
  return summary
}
`
}

export function ledgerInstructions(seed: number, stage: Stage, language: CodeLanguage): string[] {
  const { feeThreshold, fee } = ledgerParams(seed)
  const fn = ledgerFunctionName(language)
  if (stage === 'main') {
    return [
      `Write ${fn}(records). Each record has an id, an account, a type and an amount. Return ${language === 'python' ? 'a dict' : 'an object'} keyed by account, where each value is { balance, count }.`,
      'Account names: ignore surrounding spaces and letter case, and use the lowercase name as the key.',
      'Type: "credit" adds the amount, "debit" subtracts it. Ignore case and surrounding spaces; skip any other type.',
      'Amount: a positive number, or a string of digits with an optional decimal part such as "12.50". Skip records whose amount is missing, zero, negative or not a number.',
      `Fees: a debit of more than ${feeThreshold} costs an extra ${fee}, subtracted from the same account. A debit of exactly ${feeThreshold} has no fee.`,
      'count is the number of records that were used for that account. Round each balance to 2 decimal places. Leave out accounts with no usable records.',
      'Use only the standard library, with no network access. Visible examples help you check the format; the score comes from hidden tests.',
    ]
  }
  if (stage === 'followup') {
    return [
      'New requirement: the same record id can now arrive more than once.',
      'Count only the first record with a given id, and ignore every later record with that id, even if the first one was skipped as malformed.',
      'Keep every rule from before. Update your function; your previous code is loaded below.',
    ]
  }
  return ['Answer in your own words. Point to your code where it helps.']
}

export function ledgerVisibleTests(seed: number, stage: 'main' | 'followup'): CodeTestCase[] {
  const params = ledgerParams(seed)
  const dedupe = stage === 'followup'
  const examples: { id: string; description: string; records: LedgerRecord[] }[] = [
    {
      id: 'v-basic',
      description: 'A credit and a debit on one account',
      records: [
        { id: 'a1', account: 'ops', type: 'credit', amount: 120 },
        { id: 'a2', account: 'ops', type: 'debit', amount: '20.50' },
      ],
    },
    {
      id: 'v-skip',
      description: 'Malformed records are skipped',
      records: [
        { id: 'b1', account: 'Travel ', type: 'credit', amount: 40 },
        { id: 'b2', account: 'travel', type: 'refund', amount: 10 },
        { id: 'b3', account: 'travel', type: 'debit', amount: 'ten' },
      ],
    },
    {
      id: 'v-fee',
      description: 'A debit above the fee threshold',
      records: [{ id: 'c1', account: 'cloud', type: 'debit', amount: params.feeThreshold + 1 }],
    },
  ]
  if (dedupe) {
    examples.push({
      id: 'v-dupe',
      description: 'A repeated id counts once',
      records: [
        { id: 'd1', account: 'rent', type: 'debit', amount: 30 },
        { id: 'd1', account: 'rent', type: 'debit', amount: 30 },
      ],
    })
  }
  return examples.map((e) => ({
    id: e.id,
    description: e.description,
    args: [e.records],
    expected: referenceLedger(e.records, params, dedupe),
  }))
}

export const LEDGER_EXPLAIN_QUESTIONS = [
  'Which records does your function skip, and how does your code decide that?',
  'What changed in your code for the duplicate-id requirement, and why does the first occurrence win even when it is malformed?',
  'How would your function behave with ten million records, and what would you change first?',
]

export const LEDGER: CodeChallenge = {
  id: 'ledger-summary',
  version: 1,
  title: 'Ledger summary',
  functionName: ledgerFunctionName,
  starter: ledgerStarter,
  instructions: ledgerInstructions,
  visibleTests: ledgerVisibleTests,
  hiddenTests: ledgerHiddenTests,
  explainQuestions: LEDGER_EXPLAIN_QUESTIONS,
}

export { CODE_RUBRIC }
