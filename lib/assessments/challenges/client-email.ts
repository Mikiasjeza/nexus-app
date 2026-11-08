/**
 * Communication challenge "Project delay email". The candidate tells a
 * client a project is late, then revises the message when new information
 * arrives. Facts come from the seed; deterministic checks confirm the key
 * facts are present, and the AI grader (or a human reviewer) scores
 * clarity, tone and adaptation against the rubric.
 */

import type { Rubric, Stage, StageWork } from '../types'
import { createRng, deriveSeed } from '../random'
import { formatDate, hasPlaceholder, mentionsDate, wordCount, type CheckResult } from './text'
import type { WritingChallenge } from './writing'

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

function instructions(seed: number, stage: Stage): string[] {
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

const EXPLAIN_QUESTIONS = [
  'What did you put first in the email, and why?',
  'What did you change in the revision, and what did you deliberately leave out?',
]

const WORDS = { min: 70, max: 280 }

/** Deterministic checks for a stage's email. */
function checks(seed: number, stage: 'main' | 'followup', work: StageWork): CheckResult[] {
  const s = emailScenario(seed)
  const text = work.text ?? ''
  const words = wordCount(text)
  const results: CheckResult[] = [
    {
      id: 'length',
      label: `Between ${WORDS.min} and ${WORDS.max} words`,
      passed: words >= WORDS.min && words <= WORDS.max,
    },
    {
      id: 'no-placeholders',
      label: 'No placeholders left in',
      passed: !hasPlaceholder(text),
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
    results.push(
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
  return results
}

function facts(seed: number, stage: 'main' | 'followup'): string[] {
  const s = emailScenario(seed)
  return [
    `Client: ${s.client}, project lead ${s.contact}`,
    `Project: ${s.project}`,
    `Original date: ${formatDate(s.originalDate)}`,
    `New date: ${formatDate(s.newDate)}`,
    `Reason: ${s.reason}`,
    `Mitigation: ${s.mitigation}`,
    ...(stage === 'followup'
      ? [`Can ship early: ${s.partialPart}, by ${formatDate(s.originalDate)}`]
      : []),
  ]
}

export const DELAY_EMAIL: WritingChallenge = {
  id: 'project-delay-email',
  version: 1,
  title: 'Project delay email',
  instructions,
  facts,
  text: { label: 'Your email', placeholder: 'Hi …', minWords: WORDS.min, maxWords: WORDS.max },
  checks,
  explainQuestions: EXPLAIN_QUESTIONS,
  workLabels: { main: 'First email', followup: 'Revised email' },
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
