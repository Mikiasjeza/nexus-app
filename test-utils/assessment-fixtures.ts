/** Reference answers written the way a strong candidate would, for tests. */

import { ledgerParams } from '@/lib/assessments/challenges/ledger'
import { SALES_TASKS } from '@/lib/assessments/challenges/sales'
import { emailScenario, formatDate } from '@/lib/assessments/challenges/client-email'

export function ledgerSolutionJs(seed: number, dedupe: boolean): string {
  const { feeThreshold, fee } = ledgerParams(seed)
  return `const FEE_THRESHOLD = ${feeThreshold}
const FEE = ${fee}

function parseAmount(raw) {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && /^\\s*\\d+(\\.\\d+)?\\s*$/.test(raw)) return Number(raw)
  return null
}

function summarizeLedger(records) {
  const summary = {}
  const seen = new Set()
  for (const record of records) {
    ${dedupe ? 'if (seen.has(record.id)) continue\n    seen.add(record.id)' : ''}
    if (typeof record.account !== 'string' || typeof record.type !== 'string') continue
    const account = record.account.trim().toLowerCase()
    const type = record.type.trim().toLowerCase()
    const amount = parseAmount(record.amount)
    if (!account || amount === null || !(amount > 0)) continue
    if (type !== 'credit' && type !== 'debit') continue
    let delta = type === 'credit' ? amount : -amount
    if (type === 'debit' && amount > FEE_THRESHOLD) delta -= FEE
    const entry = summary[account] || (summary[account] = { balance: 0, count: 0 })
    entry.balance += delta
    entry.count += 1
  }
  for (const entry of Object.values(summary)) entry.balance = Math.round(entry.balance * 100) / 100
  return summary
}
`
}

export function ledgerSolutionTs(seed: number, dedupe: boolean): string {
  return ledgerSolutionJs(seed, dedupe)
    .replace('function parseAmount(raw)', 'function parseAmount(raw: unknown): number | null')
    .replace(
      'function summarizeLedger(records)',
      'type Summary = Record<string, { balance: number; count: number }>\n\nfunction summarizeLedger(records: { id: string; account?: unknown; type?: unknown; amount?: unknown }[]): Summary'
    )
    .replace('const summary = {}', 'const summary: Summary = {}')
    .replace('const seen = new Set()', 'const seen = new Set<string>()')
}

export function salesQueries(stage: 'main' | 'followup'): Record<string, string> {
  return Object.fromEntries(
    SALES_TASKS.filter((t) => stage === 'followup' || t.stage === 'main').map((t) => [
      t.id,
      t.reference,
    ])
  )
}

export function delayEmail(seed: number, revised: boolean): string {
  const s = emailScenario(seed)
  const lines = [
    `Hi ${s.contact},`,
    '',
    `I'm sorry to tell you that the ${s.project} will not be ready on ${formatDate(s.originalDate)}. Our new delivery date is ${formatDate(s.newDate)}.`,
    `The reason is that ${s.reason}. We would rather fix this properly than hand over something that could cause problems after launch.`,
    `To keep things on track we are ${s.mitigation}, and I will confirm progress with you every Friday until delivery.`,
  ]
  if (revised) {
    lines.push(
      `Because your launch event on ${formatDate(s.originalDate)} cannot move, we will deliver the ${s.partialPart} by ${formatDate(s.originalDate)} so you can launch with them. Everything else will follow on ${formatDate(s.newDate)}.`
    )
  }
  lines.push(
    'I know this affects your plans, and I am happy to talk it through on a call this week if that would help.',
    '',
    'Best regards,',
    'Sam'
  )
  return lines.join('\n')
}
