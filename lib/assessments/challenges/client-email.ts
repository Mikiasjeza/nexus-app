/**
 * Communication challenge "Project delay email". The candidate tells a
 * client a project is late, then revises the message when new information
 * arrives. Facts come from the seed; deterministic checks confirm the key
 * facts are present, and the AI grader (or a human reviewer) scores
 * clarity, tone and adaptation against the rubric.
 */

import type { Rubric, Stage } from '../types'
import { createRng, deriveSeed } from '../random'

const MONTHS = [
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

export interface EmailScenario {
  client: string
  contact: string
  project: string
  originalDate: { day: number; month: number }
  newDate: { day: number; month: number }
  reason: string
  mitigation: string
  partialPart: string
}

export function emailScenario(seed: number): EmailScenario {
  const rng = createRng(deriveSeed(seed, 'email'))
  const month = rng.int(3, 10)
  const day = rng.int(3, 18)
  const slip = rng.pick([7, 10, 14])
  // Let the new date roll into the next month instead of reading "June 32".
  const later = new Date(Date.UTC(2026, month - 1, day + slip))
  return {
    client: rng.pick(['Harbor Foods', 'Northwind Clinics', 'Lumen Travel', 'Atlas Freight']),
    contact: rng.pick(['Priya', 'Marcus', 'Sofia', 'Daniel']),
    project: rng.pick(['customer portal', 'booking app', 'reporting dashboard', 'mobile checkout']),
    originalDate: { day, month },
    newDate: { day: later.getUTCDate(), month: later.getUTCMonth() + 1 },
    reason: rng.pick([
      'a security review found an issue in the payment integration that must be fixed first',
      'a third-party data provider changed its API two weeks ago',
      'two engineers were out sick during the final testing week',
    ]),
    mitigation: rng.pick([
      'adding a second QA engineer for the remaining work',
      'daily progress updates until delivery',
      'a staging link the client can review from next week',
    ]),
    partialPart: rng.pick(['login and account pages', 'read-only reports', 'product catalogue']),
  }
}

export const formatDate = (d: { day: number; month: number }) => `${MONTHS[d.month - 1]} ${d.day}`

export function emailInstructions(seed: number, stage: Stage): string[] {
  const s = emailScenario(seed)
  if (stage === 'main') {
    return [
      `You lead delivery for the ${s.client} ${s.project}. It was due on ${formatDate(s.originalDate)}; it will now be ready on ${formatDate(s.newDate)}.`,
      `Reason: ${s.reason}. What you are doing about it: ${s.mitigation}.`,
      `Write the email to ${s.contact}, the client's project lead. Be accurate, clear and professional. Do not invent facts beyond the ones given.`,
    ]
  }
  if (stage === 'followup') {
    return [
      `${s.contact} replies that their launch event on ${formatDate(s.originalDate)} cannot move.`,
      `Your team confirms it can deliver the ${s.partialPart} by ${formatDate(s.originalDate)}; everything else still arrives on ${formatDate(s.newDate)}.`,
      'Revise your email to reflect this. Keep it accurate and send-ready. Your previous version is loaded below.',
    ]
  }
  return ['Answer briefly in your own words.']
}

export const EMAIL_EXPLAIN_QUESTIONS = [
  'What did you put first in the email, and why?',
  'What did you change in the revision, and what did you deliberately leave out?',
]

export const EMAIL_WORD_RANGE = { min: 70, max: 280 }

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** True when the text names this date in a common written form. */
export function mentionsDate(text: string, d: { day: number; month: number }): boolean {
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

export interface CheckResult {
  id: string
  label: string
  passed: boolean
}

/** Deterministic checks for a stage's text. */
export function emailChecks(seed: number, stage: 'main' | 'followup', text: string): CheckResult[] {
  const s = emailScenario(seed)
  const words = wordCount(text)
  const checks: CheckResult[] = [
    {
      id: 'length',
      label: `Between ${EMAIL_WORD_RANGE.min} and ${EMAIL_WORD_RANGE.max} words`,
      passed: words >= EMAIL_WORD_RANGE.min && words <= EMAIL_WORD_RANGE.max,
    },
    {
      id: 'no-placeholders',
      label: 'No placeholders left in',
      passed: !/\[[^\]]*\]|\{[^}]*\}|\bTODO\b|\bXX+\b|<[^>]+>/i.test(text),
    },
    {
      id: 'new-date',
      label: 'States the new delivery date',
      passed: mentionsDate(text, s.newDate),
    },
    {
      id: 'reason',
      label: 'Gives the reason',
      passed: /(security|issue|payment|provider|api|sick|testing|illness|out ill)/i.test(text),
    },
  ]
  if (stage === 'followup') {
    checks.push(
      {
        id: 'partial',
        label: `Mentions the ${s.partialPart} arriving early`,
        passed: s.partialPart
          .split(' ')
          .filter((w) => w.length > 3)
          .some((w) => new RegExp(`\\b${w}`, 'i').test(text)),
      },
      {
        id: 'original-date',
        label: 'Names the original date for the partial delivery',
        passed: mentionsDate(text, s.originalDate),
      }
    )
  }
  return checks
}

export const WRITING_RUBRIC: Rubric = {
  id: 'writing-core',
  version: 1,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Accuracy and completeness',
      weight: 25,
      source: 'checks:all',
      description: 'The key facts are present and no placeholders are left.',
    },
    {
      id: 'clarity',
      label: 'Clarity and structure',
      weight: 25,
      source: 'ai:clarity',
      description: 'The main point comes early; the message is easy to follow and act on.',
    },
    {
      id: 'tone',
      label: 'Audience and tone',
      weight: 20,
      source: 'ai:tone',
      description: 'Professional, honest and appropriate for a client relationship.',
    },
    {
      id: 'revision',
      label: 'Adapting to new information',
      weight: 20,
      source: 'ai:revision',
      description: 'The revision folds in the new facts accurately without contradictions.',
    },
    {
      id: 'explanation',
      label: 'Explaining choices',
      weight: 10,
      source: 'ai:explanation',
      description: 'Explains the structure and the revision decisions.',
    },
  ],
  gates: [{ criterionId: 'accuracy', minimum: 0.5 }],
}
