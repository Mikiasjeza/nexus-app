/**
 * Helpers for the deterministic checks on written work: dates, figures,
 * word and character counts, placeholders. They are lenient about format
 * (June 5, 5 June, 2026-06-05; $12,400, 12.4k) and strict about substance
 * (the right date, the right number).
 */

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export type DayMonth = { day: number; month: number }

/** One result of a deterministic check, shown to the candidate as evidence. */
export interface CheckResult {
  id: string
  label: string
  passed: boolean
}

export const formatDate = (d: DayMonth) => `${MONTHS[d.month - 1]} ${d.day}`

/** "Monday, June 1". The year is 2026 in every scenario. */
export function formatDay(d: DayMonth): string {
  const weekday = new Date(Date.UTC(2026, d.month - 1, d.day)).getUTCDay()
  return `${WEEKDAYS[weekday]}, ${formatDate(d)}`
}

/** The date `days` after `d`, rolling into the next month where needed. */
export function addDays(d: DayMonth, days: number): DayMonth {
  const date = new Date(Date.UTC(2026, d.month - 1, d.day + days))
  return { day: date.getUTCDate(), month: date.getUTCMonth() + 1 }
}

/** Orders dates within the same year. */
export const dayIndex = (d: DayMonth) => d.month * 100 + d.day

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Characters as people count them (an emoji is one). */
export function charCount(text: string): number {
  return [...text.trim()].length
}

/** Brackets, braces, TODO or XXX left in, as from a template. */
export function hasPlaceholder(text: string): boolean {
  return /\[[^\]]*\]|\{[^}]*\}|\bTODO\b|\bXX+\b|<[^>]+>/i.test(text)
}

/** True when the text names this date in a common written form. */
export function mentionsDate(text: string, d: DayMonth): boolean {
  const name = MONTHS[d.month - 1]
  const short = name.slice(0, 3)
  const day = String(d.day)
  const mm = String(d.month).padStart(2, '0')
  const dd = day.padStart(2, '0')
  const patterns = [
    new RegExp(`\\b(${name}|${short})\\.?\\s+${day}(st|nd|rd|th)?\\b`, 'i'),
    new RegExp(`\\b${day}(st|nd|rd|th)?\\s+(of\\s+)?(${name}|${short})\\b`, 'i'),
    new RegExp(`\\b\\d{4}-${mm}-${dd}\\b`),
    new RegExp(`\\b0?${d.month}/0?${day}\\b`),
    new RegExp(`\\b0?${day}/0?${d.month}\\b`),
  ]
  return patterns.some((p) => p.test(text))
}

const MONTH_TOKEN = MONTHS.map((m) => `${m}|${m.slice(0, 3)}`).join('|') + '|Sept'

const monthNumber = (token: string) => {
  const lower = token.toLowerCase()
  return MONTHS.findIndex((m) => m.toLowerCase().startsWith(lower.slice(0, 3))) + 1
}

const valid = (d: DayMonth) => d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= 31

/**
 * Every date written in the text, in order of appearance: "June 5",
 * "5 June", "2026-06-05" or "6/5" (read month first, as in the US, unless
 * that is impossible).
 */
export function findDates(text: string): DayMonth[] {
  const found: { at: number; date: DayMonth }[] = []
  const add = (at: number, date: DayMonth) => {
    if (valid(date)) found.push({ at, date })
  }
  const named = new RegExp(`\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'gi')
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_TOKEN})\\b`,
    'gi'
  )
  for (const m of text.matchAll(named)) {
    add(m.index!, { month: monthNumber(m[1]), day: Number(m[2]) })
  }
  for (const m of text.matchAll(dayFirst)) {
    add(m.index!, { month: monthNumber(m[2]), day: Number(m[1]) })
  }
  for (const m of text.matchAll(/\b\d{4}-(\d{2})-(\d{2})\b/g)) {
    add(m.index!, { month: Number(m[1]), day: Number(m[2]) })
  }
  for (const m of text.matchAll(/(?<![\d-])(\d{1,2})\/(\d{1,2})(?![\d/])/g)) {
    const a = Number(m[1])
    const b = Number(m[2])
    add(m.index!, a <= 12 ? { month: a, day: b } : { month: b, day: a })
  }
  return found.sort((x, y) => x.at - y.at).map((f) => f.date)
}

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
}

/**
 * A figure typed into an answer box: "$1,234.50", "-4,200", "(4,200)",
 * "12.4k", "8.3%", "3.2x". Null when it isn't a single number.
 */
export function parseNumber(raw: string): number | null {
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[−‒–—]/g, '-')
    .replace(/us\$|usd|\$|€|£|,|\s/g, '')
    .replace(/(percent|[x×%])$/, '')
  let negative = false
  const paren = s.match(/^\((.*)\)$/)
  if (paren) {
    negative = true
    s = paren[1]
  }
  const m = s.match(/^([+-])?(\d+(?:\.\d+)?|\.\d+)(k|thousand|mn|m|million|bn|b|billion)?$/)
  if (!m) return null
  const value = parseFloat(m[2]) * (m[3] ? MULTIPLIERS[m[3]] : 1)
  return (m[1] === '-') !== negative ? -value : value
}

/** Every figure in prose, as positive values: "$411,560", "$412k", "0.4 million". */
export function numbersIn(text: string): number[] {
  const out: number[] = []
  const re =
    /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s?(k|thousand|mn|m|million|bn|billion)(?![a-z]))?/gi
  for (const m of text.matchAll(re)) {
    const value = parseFloat(m[1].replace(/,/g, '') + (m[2] ?? ''))
    out.push(value * (m[3] ? MULTIPLIERS[m[3].toLowerCase()] : 1))
  }
  return out
}

/** Whether the prose states this amount, to within `share` of it (sign ignored). */
export function mentionsAmount(text: string, value: number, share = 0.015): boolean {
  const target = Math.abs(value)
  const slack = Math.max(target * share, 0.5)
  return numbersIn(text).some((n) => Math.abs(n - target) <= slack)
}

/** Whether the prose states this percentage ("8.3%", "8.3 percent"), sign ignored. */
export function mentionsPercent(text: string, value: number, slack = 0.15): boolean {
  const target = Math.abs(value)
  const re = /(\d+(?:\.\d+)?)\s?(%|percent\b|per cent\b)/gi
  for (const m of text.matchAll(re)) {
    if (Math.abs(parseFloat(m[1]) - target) <= slack) return true
  }
  return false
}

/** A figure in an answer box is right when it is within `slack` of the answer. */
export function closeTo(raw: string | undefined, expected: number, slack: number): boolean {
  const value = parseNumber(raw ?? '')
  return value !== null && Math.abs(value - expected) <= slack
}

/** Money answers: within half a percent, or $500 for small amounts. */
export const moneySlack = (expected: number) => Math.max(Math.abs(expected) * 0.005, 500)

export const usd = (value: number) =>
  `${value < 0 ? '-' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`
