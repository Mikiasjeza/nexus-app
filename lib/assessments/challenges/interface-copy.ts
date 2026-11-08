/**
 * UX writing challenge "Interface copy rewrite". A fictional app's
 * interface text was written by engineers; the candidate rewrites five
 * strings (an error, a button, an empty state and a delete dialog) within
 * character limits. The follow-up changes the product: deletes now go to
 * Trash for 30 days, and buttons must fit a narrower layout.
 *
 * Deterministic checks cover the limits and the job each string must do
 * (no error codes, a next step, a specific button, a dialog that matches
 * the behaviour). Clarity and voice are judged against the rubric, never
 * on an AI's taste alone, and a person can always review the result.
 */

import type { Rubric, Stage, StageWork, WritingField } from '../types'
import { createRng, deriveSeed } from '../random'
import { charCount, type CheckResult } from './text'
import type { WritingChallenge } from './writing'

const APPS = [
  { app: 'Pennywise', kind: 'budgeting app', thing: 'budget', things: 'budgets' },
  { app: 'Snapshelf', kind: 'photo album app', thing: 'album', things: 'albums' },
  { app: 'Forkful', kind: 'recipe app', thing: 'recipe', things: 'recipes' },
  { app: 'Tasklane', kind: 'to-do app', thing: 'project', things: 'projects' },
]

const ERRORS = [
  {
    situation: 'a card payment is declined when someone upgrades to the paid plan',
    original: 'Error 402: PAYMENT_DECLINED. Transaction could not be processed.',
    jargon: ['402', 'PAYMENT_DECLINED', 'transaction'],
  },
  {
    situation: 'the phone loses its connection while saving',
    original: 'Error -1009: NETWORK_UNREACHABLE. Request timed out.',
    jargon: ['1009', 'NETWORK_UNREACHABLE', 'request'],
  },
  {
    situation: 'someone was signed out after a long time away and tries to save',
    original: 'Error 401: SESSION_EXPIRED. Auth token invalid.',
    jargon: ['401', 'SESSION_EXPIRED', 'token'],
  },
]

const LIMITS = { error: 90, button: 20, narrowButton: 16, empty: 110, title: 50, body: 120 }

/** How each string is named in the check results. */
const SHORT_NAMES: Record<string, string> = {
  error: 'Error message',
  'save-button': 'Save button',
  empty: 'Empty state',
  'delete-title': 'Dialog title',
  'delete-button': 'Confirm button',
  'delete-body': 'Dialog text',
}

export function copyScenario(seed: number) {
  const rng = createRng(deriveSeed(seed, 'copy'))
  return { ...rng.pick(APPS), error: rng.pick(ERRORS) }
}

function fields(seed: number, stage: 'main' | 'followup'): WritingField[] {
  const s = copyScenario(seed)
  const button = stage === 'main' ? LIMITS.button : LIMITS.narrowButton
  const list: WritingField[] = [
    {
      id: 'error',
      label: `Error message when ${s.error.situation}`,
      hint: `Now: “${s.error.original}”`,
      maxChars: LIMITS.error,
    },
    {
      id: 'save-button',
      label: `Button that saves a new ${s.thing}`,
      hint: 'Now: “Submit”',
      maxChars: button,
    },
    {
      id: 'empty',
      label: `Empty state when someone has no ${s.things} yet`,
      hint: 'Now: “No data. 0 records found.”',
      maxChars: LIMITS.empty,
    },
    {
      id: 'delete-title',
      label: `Title of the dialog shown before a ${s.thing} is deleted`,
      hint: 'Now: “Are you sure?”',
      maxChars: LIMITS.title,
    },
    {
      id: 'delete-button',
      label: 'Button in that dialog that confirms',
      hint: 'Now: “OK”',
      maxChars: button,
    },
  ]
  if (stage === 'followup') {
    list.push({
      id: 'delete-body',
      label: 'Text under the dialog title',
      hint: `New: say what happens to the ${s.thing}`,
      maxChars: LIMITS.body,
    })
  }
  return list
}

const GENERIC_BUTTON = /^(ok|okay|submit|yes|go|click here|continue|done|confirm|proceed)[.!]?$/i
const NEXT_STEP =
  /\b(try|retry|use|add|choose|check|update|enter|contact|call|pick|switch|sign|log|reconnect|wait|tap)\b/i
const STARTER =
  /\b(add|create|start|make|set up|new|tap|plan|import|upload|write|build|track|choose)\b/i
const PERMANENT =
  /(permanent|forever|for good|can['’]?t be undone|cannot be undone|irreversible|no way back)/i
const TRASH = /(trash|bin|30 days|thirty days|restore|recover|undo)/i

function checks(seed: number, stage: 'main' | 'followup', work: StageWork): CheckResult[] {
  const s = copyScenario(seed)
  const value = (id: string) => (work.fields?.[id] ?? '').trim()
  const list = fields(seed, stage)
  const results: CheckResult[] = list.map((field) => ({
    id: `fits:${field.id}`,
    label: `${SHORT_NAMES[field.id]}: filled in, ${field.maxChars} characters or fewer`,
    passed: value(field.id).length > 0 && charCount(value(field.id)) <= (field.maxChars ?? 0),
  }))
  const error = value('error')
  const thing = new RegExp(`\\b${s.thing}s?\\b`, 'i')
  // A variable or a quoted name ("Delete {name}?", “Groceries”) names the item too.
  const namesItem = (text: string) =>
    thing.test(text) || /\{[^}]+\}|%s|%@|“[^”]+”|"[^"]+"/.test(text)
  results.push(
    {
      id: 'error-plain',
      label: 'The error drops the code and the jargon',
      passed:
        error.length > 0 &&
        !s.error.jargon.some((word) => error.toLowerCase().includes(word.toLowerCase())),
    },
    { id: 'error-next', label: 'The error says what to do next', passed: NEXT_STEP.test(error) },
    {
      id: 'button-specific',
      label: 'The save button says what it does',
      passed: value('save-button').length > 0 && !GENERIC_BUTTON.test(value('save-button')),
    },
    {
      id: 'empty-next',
      label: 'The empty state suggests a first step',
      passed: STARTER.test(value('empty')),
    },
    {
      id: 'title-names',
      label: 'The dialog title names what is deleted',
      passed: namesItem(value('delete-title')),
    },
    {
      id: 'confirm-action',
      label: 'The confirm button names the action',
      passed:
        /\b(delete|remove|erase|discard|trash|bin|move)\b/i.test(value('delete-button')) &&
        !GENERIC_BUTTON.test(value('delete-button')),
    }
  )
  if (stage === 'followup') {
    const dialog = [value('delete-title'), value('delete-body'), value('delete-button')].join('\n')
    results.push(
      {
        id: 'not-permanent',
        label: 'The dialog no longer says the delete is permanent',
        passed: !PERMANENT.test(dialog),
      },
      {
        id: 'explains-trash',
        label: 'The dialog explains Trash and the 30 days',
        passed: TRASH.test(`${value('delete-title')}\n${value('delete-body')}`),
      }
    )
  }
  return results
}

function facts(seed: number, stage: 'main' | 'followup'): string[] {
  const s = copyScenario(seed)
  const lines = [
    `${s.app} is a ${s.kind} people use on their phones.`,
    'Voice: plain, calm and friendly. No jokes in errors, no blame.',
    'Variables are fine where the app knows the value, e.g. {name}.',
  ]
  if (stage === 'main') {
    lines.push(`Today, deleting a ${s.thing} is permanent.`)
  } else {
    lines.push(
      `New: deleted ${s.things} go to Trash for 30 days and can be restored.`,
      `New: buttons must fit ${LIMITS.narrowButton} characters on the narrower mobile layout.`
    )
  }
  return lines
}

function instructions(seed: number, stage: Stage): string[] {
  const s = copyScenario(seed)
  if (stage === 'main') {
    return [
      `${s.app}’s interface text was written in a hurry by engineers, and it confuses people. Rewrite the five strings below for the people who use the app.`,
      'Each one has a character limit; the counter turns amber when you go over. Write for someone busy and possibly stressed: plain words, no codes, and a clear next step.',
    ]
  }
  if (stage === 'followup') {
    return [
      `Two changes from the product team: deleted ${s.things} now go to Trash for 30 days, where they can be restored, and the mobile layout is narrower, so buttons must fit ${LIMITS.narrowButton} characters.`,
      'Update the dialog to match (it has a new line of text under the title) and shorten anything that no longer fits. Your previous strings are loaded below.',
    ]
  }
  return ['Answer briefly in your own words.']
}

export const INTERFACE_COPY: WritingChallenge = {
  id: 'interface-copy',
  version: 1,
  title: 'Interface copy rewrite',
  instructions,
  facts,
  fields,
  checks,
  explainQuestions: [
    'Pick one string and explain why you chose those words over the alternatives you considered.',
    'What did the Trash change and the shorter limit make you change, and what did you have to give up?',
  ],
  workLabels: { main: 'First strings', followup: 'Revised strings' },
}

export const UX_WRITING_RUBRIC: Rubric = {
  id: 'ux-writing-core',
  version: 1,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Requirements and limits',
      weight: 30,
      source: 'checks:all',
      description:
        'Every string fits its limit, drops the jargon and does its job, and the revision matches the new behaviour.',
    },
    {
      id: 'clarity',
      label: 'Clarity and usefulness',
      weight: 25,
      source: 'ai:clarity',
      description:
        'Each string says what happened and what to do next, in plain words people understand at a glance.',
    },
    {
      id: 'tone',
      label: 'Voice and tone',
      weight: 15,
      source: 'ai:tone',
      description:
        'Calm, human and consistent across the strings, with no blame or misplaced jokes.',
    },
    {
      id: 'revision',
      label: 'Adapting to the change',
      weight: 20,
      source: 'ai:revision',
      description:
        'The revised dialog matches the new Trash behaviour, and the shorter buttons stay clear.',
    },
    {
      id: 'explanation',
      label: 'Explaining choices',
      weight: 10,
      source: 'ai:explanation',
      description: 'Explains the word choices and the trade-offs behind them.',
    },
  ],
  gates: [{ criterionId: 'accuracy', minimum: 0.5 }],
}
