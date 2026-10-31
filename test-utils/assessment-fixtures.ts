/** Reference answers written the way a strong candidate would, for tests. */

import { ledgerParams } from '@/lib/assessments/challenges/ledger'
import { triageParams } from '@/lib/assessments/challenges/log-triage'
import { reorderParams } from '@/lib/assessments/challenges/reorder-plan'
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

export function triageSolutionJs(seed: number, withSince: boolean): string {
  const { minIssues } = triageParams(seed)
  return `const MIN_ISSUES = ${minIssues}
const STAMP = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/
const LEVELS = ['DEBUG', 'INFO', 'WARN', 'WARNING', 'ERROR']

function triageLogs(lines${withSince ? ', since = null' : ''}) {
  const stats = {}
  for (const line of lines) {
    if (typeof line !== 'string') continue
    const parts = line.trim().split(/\\s+/)
    if (parts.length < 4) continue
    const [stamp, rawLevel, service, ...words] = parts
    const level = rawLevel.toUpperCase()
    if (!STAMP.test(stamp) || !LEVELS.includes(level)) continue
    ${withSince ? 'if (since !== null && stamp < since) continue' : ''}
    const key = service.toLowerCase()
    const entry = stats[key] || (stats[key] = { errors: 0, warnings: 0, counts: {} })
    if (level === 'ERROR') {
      entry.errors += 1
      const message = words.join(' ').replace(/\\d+/g, 'N')
      entry.counts[message] = (entry.counts[message] || 0) + 1
    } else if (level === 'WARN' || level === 'WARNING') {
      entry.warnings += 1
    }
  }
  const summary = {}
  for (const [service, e] of Object.entries(stats)) {
    if (e.errors + e.warnings < MIN_ISSUES) continue
    const ranked = Object.keys(e.counts).sort(
      (a, b) => e.counts[b] - e.counts[a] || (a < b ? -1 : a > b ? 1 : 0)
    )
    summary[service] = { errors: e.errors, warnings: e.warnings, top: ranked[0] ?? null }
  }
  return summary
}
`
}

export function reorderSolutionJs(seed: number, combine: boolean): string {
  const { safetyDays, coverDays } = reorderParams(seed)
  return `const SAFETY_DAYS = ${safetyDays}
const COVER_DAYS = ${coverDays}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)

function clean(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  if (typeof item.sku !== 'string' || !item.sku.trim()) return null
  if (!isNumber(item.stock) || item.stock < 0) return null
  if (!isNumber(item.daily) || item.daily < 0) return null
  if (!Number.isInteger(item.lead) || item.lead < 0) return null
  const pack = Number.isInteger(item.pack) && item.pack > 0 ? item.pack : 1
  return { sku: item.sku.trim(), stock: item.stock, daily: item.daily, lead: item.lead, pack }
}

function reorderPlan(items) {
  let valid = items.map(clean).filter(Boolean)
  ${
    combine
      ? `const merged = new Map()
  for (const item of valid) {
    const seen = merged.get(item.sku)
    if (!seen) merged.set(item.sku, { ...item })
    else {
      seen.stock += item.stock
      seen.daily += item.daily
      seen.lead = Math.max(seen.lead, item.lead)
      seen.pack = Math.max(seen.pack, item.pack)
    }
  }
  valid = [...merged.values()]`
      : ''
  }
  const plan = []
  for (const item of valid) {
    if (item.stock > item.daily * (item.lead + SAFETY_DAYS)) continue
    let qty = Math.ceil(item.daily * (item.lead + SAFETY_DAYS + COVER_DAYS) - item.stock)
    ${combine ? 'qty = Math.ceil(qty / item.pack) * item.pack' : ''}
    if (qty > 0) plan.push({ sku: item.sku, qty })
  }
  return plan.sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0))
}
`
}

/** A strong candidate's JavaScript for any coding challenge, before or after the follow-up. */
export function solutionJs(challengeId: string, seed: number, followup: boolean): string {
  if (challengeId === 'log-triage') return triageSolutionJs(seed, followup)
  if (challengeId === 'reorder-plan') return reorderSolutionJs(seed, followup)
  return ledgerSolutionJs(seed, followup)
}

export function ledgerSolutionPy(seed: number, dedupe: boolean): string {
  const { feeThreshold, fee } = ledgerParams(seed)
  return `import re

FEE_THRESHOLD = ${feeThreshold}
FEE = ${fee}


def parse_amount(raw):
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return raw
    if isinstance(raw, str) and re.fullmatch(r"\\s*\\d+(\\.\\d+)?\\s*", raw):
        return float(raw)
    return None


def summarize_ledger(records):
    summary = {}
    seen = set()
    for record in records:
${dedupe ? '        if record.get("id") in seen:\n            continue\n        seen.add(record.get("id"))\n' : ''}        account, kind = record.get("account"), record.get("type")
        if not isinstance(account, str) or not isinstance(kind, str):
            continue
        account, kind = account.strip().lower(), kind.strip().lower()
        amount = parse_amount(record.get("amount"))
        if not account or amount is None or amount <= 0 or kind not in ("credit", "debit"):
            continue
        delta = amount if kind == "credit" else -amount
        if kind == "debit" and amount > FEE_THRESHOLD:
            delta -= FEE
        entry = summary.setdefault(account, {"balance": 0, "count": 0})
        entry["balance"] += delta
        entry["count"] += 1
    for entry in summary.values():
        entry["balance"] = round(entry["balance"], 2)
    return summary
`
}

export function triageSolutionPy(seed: number, withSince: boolean): string {
  const { minIssues } = triageParams(seed)
  return `import re
from collections import Counter

MIN_ISSUES = ${minIssues}
STAMP = re.compile(r"\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z")
COUNTED = {"WARN": "warnings", "WARNING": "warnings", "ERROR": "errors"}


def triage_logs(lines${withSince ? ', since=None' : ''}):
    stats = {}
    for line in lines:
        if not isinstance(line, str):
            continue
        parts = line.split()
        if len(parts) < 4:
            continue
        stamp, level, service, *words = parts
        level = level.upper()
        if not STAMP.fullmatch(stamp) or level not in ("DEBUG", "INFO", *COUNTED):
            continue
${withSince ? '        if since is not None and stamp < since:\n            continue\n' : ''}        entry = stats.setdefault(service.lower(), {"errors": 0, "warnings": 0, "messages": Counter()})
        kind = COUNTED.get(level)
        if kind:
            entry[kind] += 1
        if kind == "errors":
            entry["messages"][re.sub(r"\\d+", "N", " ".join(words))] += 1
    summary = {}
    for service, entry in stats.items():
        if entry["errors"] + entry["warnings"] < MIN_ISSUES:
            continue
        messages = entry["messages"]
        top = min(messages, key=lambda m: (-messages[m], m)) if messages else None
        summary[service] = {"errors": entry["errors"], "warnings": entry["warnings"], "top": top}
    return summary
`
}

export function reorderSolutionPy(seed: number, combine: boolean): string {
  const { safetyDays, coverDays } = reorderParams(seed)
  return `import math

SAFETY_DAYS = ${safetyDays}
COVER_DAYS = ${coverDays}


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_whole(value):
    return isinstance(value, int) and not isinstance(value, bool)


def clean(item):
    if not isinstance(item, dict):
        return None
    sku = item.get("sku")
    if not isinstance(sku, str) or not sku.strip():
        return None
    stock, daily, lead = item.get("stock"), item.get("daily"), item.get("lead")
    if not is_number(stock) or stock < 0 or not is_number(daily) or daily < 0:
        return None
    if not is_whole(lead) or lead < 0:
        return None
    pack = item.get("pack")
    pack = pack if is_whole(pack) and pack > 0 else 1
    return {"sku": sku.strip(), "stock": stock, "daily": daily, "lead": lead, "pack": pack}


def reorder_plan(items):
    valid = [c for c in map(clean, items) if c]
${
  combine
    ? `    merged = {}
    for item in valid:
        seen = merged.get(item["sku"])
        if seen is None:
            merged[item["sku"]] = dict(item)
        else:
            seen["stock"] += item["stock"]
            seen["daily"] += item["daily"]
            seen["lead"] = max(seen["lead"], item["lead"])
            seen["pack"] = max(seen["pack"], item["pack"])
    valid = list(merged.values())
`
    : ''
}    plan = []
    for item in valid:
        if item["stock"] > item["daily"] * (item["lead"] + SAFETY_DAYS):
            continue
        qty = math.ceil(item["daily"] * (item["lead"] + SAFETY_DAYS + COVER_DAYS) - item["stock"])
${combine ? '        qty = math.ceil(qty / item["pack"]) * item["pack"]\n' : ''}        if qty > 0:
            plan.append({"sku": item["sku"], "qty": qty})
    return sorted(plan, key=lambda line: line["sku"])
`
}

/** A strong candidate's Python for any coding challenge, before or after the follow-up. */
export function solutionPy(challengeId: string, seed: number, followup: boolean): string {
  if (challengeId === 'log-triage') return triageSolutionPy(seed, followup)
  if (challengeId === 'reorder-plan') return reorderSolutionPy(seed, followup)
  return ledgerSolutionPy(seed, followup)
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
