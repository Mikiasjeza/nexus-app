/**
 * Project management challenge "Launch recovery plan". The candidate runs
 * the launch of a client's new mobile checkout: a budget, a team with one
 * person on leave, deadlines and dependencies. They write the plan with an
 * owner and finish date for every item, the biggest risk, and a call on
 * the launch date. The follow-up brings two complications: the client adds
 * a requirement, and the contractor's rate goes up.
 *
 * Deterministic checks read one line per work item (owner = the first team
 * member named on it, finish date = the last date on it) and confirm the
 * owners, dates, dependencies, leave and budget. Planning judgement, risk
 * and communication are scored against the rubric. A short scenario shows
 * how someone plans on paper; it is not proof of leadership on a real team.
 */

import type { Rubric, Stage, StageWork } from '../types'
import { createRng, deriveSeed } from '../random'
import {
  addDays,
  dayIndex,
  findDates,
  formatDate,
  formatDay,
  hasPlaceholder,
  mentionsDate,
  usd,
  wordCount,
  type CheckResult,
  type DayMonth,
} from './text'
import type { WritingChallenge } from './writing'

type Role = 'backend' | 'frontend' | 'qa' | 'design'

const ROLE_NAMES: Record<Role, string> = {
  backend: 'backend engineer',
  frontend: 'frontend engineer',
  qa: 'QA analyst',
  design: 'designer',
}

interface Item {
  id: string
  name: string
  roles: Role[]
  days: number
  after: string[]
  match: RegExp
  note: string
}

const ITEMS: Item[] = [
  {
    id: 'payment',
    name: 'Payment timeout fix',
    roles: ['backend'],
    days: 3,
    after: [],
    match: /\bpayment/i,
    note: 'backend',
  },
  {
    id: 'screens',
    name: 'Checkout screens',
    roles: ['frontend'],
    days: 4,
    after: [],
    match: /\bscreens\b|checkout (screen|page|ui)/i,
    note: 'frontend',
  },
  {
    id: 'accessibility',
    name: 'Accessibility review',
    roles: ['design', 'qa'],
    days: 1,
    after: ['screens'],
    match: /accessib|a11y/i,
    note: 'design or QA, after the checkout screens',
  },
  {
    id: 'regression',
    name: 'Regression testing',
    roles: ['qa'],
    days: 2,
    after: ['payment', 'screens'],
    match: /regression/i,
    note: 'QA, after the payment fix and the checkout screens',
  },
  {
    id: 'notes',
    name: 'Release notes and support guide',
    roles: ['backend', 'frontend', 'qa', 'design'],
    days: 1,
    after: [],
    match: /release notes?|support guide/i,
    note: 'anyone',
  },
]

const SCHEDULING: Item = {
  id: 'scheduling',
  name: 'Delivery scheduling',
  roles: ['frontend'],
  days: 3,
  after: [],
  match: /\bdeliver\w*[\s-]+(slot|schedul|time|date|window)|schedul\w*[\s-]+(a\s+)?deliver/i,
  note: 'frontend',
}

/** The work in a stage. The follow-up adds scheduling, which the reviews must cover. */
export function itemsFor(stage: 'main' | 'followup'): Item[] {
  if (stage === 'main') return ITEMS
  return [
    ...ITEMS.map((item) =>
      item.id === 'accessibility' || item.id === 'regression'
        ? { ...item, after: [...item.after, 'scheduling'] }
        : item
    ),
    SCHEDULING,
  ]
}

const NAMES = ['Priya', 'Marcus', 'Sofia', 'Amara', 'Tomas', 'Noor', 'Leo', 'Dana', 'Wen', 'Kofi']
const CLIENTS = ['Harbor Foods', 'Lumen Travel', 'Atlas Freight', 'Juniper Home']
const SPONSORS = ['Rosa', 'Malik', 'Hannah', 'Theo']

interface Person {
  name: string
  role: Role
}

export interface LaunchScenario {
  client: string
  sponsor: string
  today: DayMonth
  launch: DayMonth
  team: Person[]
  onLeave: Person
  contractor: Person & { start: DayMonth; rate: number; newRate: number }
  budget: number
}

export function launchScenario(seed: number): LaunchScenario {
  const rng = createRng(deriveSeed(seed, 'launch'))
  const names = rng.shuffle(NAMES)
  const start = { month: rng.int(3, 9), day: rng.int(1, 20) }
  const weekday = new Date(Date.UTC(2026, start.month - 1, start.day)).getUTCDay()
  const today = addDays(start, (8 - weekday) % 7) // the next Monday, or today if Monday
  const rate = rng.pick([500, 550, 600, 650])
  return {
    client: rng.pick(CLIENTS),
    sponsor: rng.pick(SPONSORS),
    today,
    launch: addDays(today, 18),
    team: [
      { name: names[0], role: 'backend' },
      { name: names[1], role: 'frontend' },
      { name: names[2], role: 'qa' },
      { name: names[3], role: 'design' },
    ],
    onLeave: { name: names[4], role: 'frontend' },
    contractor: {
      name: names[5],
      role: 'frontend',
      start: addDays(today, 2),
      rate,
      newRate: Math.round((rate * 1.3) / 50) * 50,
    },
    // Room for the checkout screens and a little more, not for every frontend task.
    budget: rate * 5,
  }
}

interface PlannedItem {
  line?: string
  owner?: Person
  date?: DayMonth
}

/** Which line of the plan is about which item, and who and when it names. */
export function readPlan(
  text: string,
  s: LaunchScenario,
  items: Item[]
): Record<string, PlannedItem> {
  const available: Person[] = [...s.team, s.contractor]
  const named = (line: string, people: Person[]) =>
    people
      .map((p) => ({ p, at: line.search(new RegExp(`\\b${p.name}\\b`, 'i')) }))
      .filter((x) => x.at >= 0)
      .sort((a, b) => a.at - b.at)[0]?.p
  type Candidate = { line: string; at: number }
  const candidates = new Map<string, Candidate[]>()
  for (const line of text.split(/\r?\n/).map((l) => l.trim())) {
    // A line belongs to the item it names first.
    let best: { id: string; at: number } | null = null
    for (const item of items) {
      const at = line.search(item.match)
      if (at >= 0 && (best === null || at < best.at)) best = { id: item.id, at }
    }
    if (best) {
      candidates.set(best.id, [...(candidates.get(best.id) ?? []), { line, at: best.at }])
    }
  }
  // The line that reads most like the item's plan entry: it starts with the
  // item (after any bullet), then it has a date, then it names someone. Ties
  // go to the line that names the item soonest. An intro sentence or an
  // explanation that mentions the item loses to its entry.
  const people = [...available, s.onLeave]
  const entryScore = ({ line, at }: Candidate) =>
    (at <= Math.max(0, line.search(/[a-z]/i)) + 1 ? 4 : 0) +
    (findDates(line).length > 0 ? 2 : 0) +
    (named(line, people) ? 1 : 0)
  const better = (c: Candidate, than: Candidate) =>
    entryScore(c) > entryScore(than) || (entryScore(c) === entryScore(than) && c.at < than.at)
  const plan: Record<string, PlannedItem> = {}
  for (const item of items) {
    const found = (candidates.get(item.id) ?? []).reduce<Candidate | undefined>(
      (best, c) => (best === undefined || better(c, best) ? c : best),
      undefined
    )
    const line = found?.line
    if (!line) {
      plan[item.id] = {}
      continue
    }
    const dates = findDates(line)
    plan[item.id] = {
      line,
      // Someone available first; the person on leave only if no one else is named.
      owner: named(line, available) ?? named(line, [s.onLeave]),
      date: dates[dates.length - 1],
    }
  }
  return plan
}

const WORDS = { min: 120, max: 350 }

function checks(seed: number, stage: 'main' | 'followup', work: StageWork): CheckResult[] {
  const s = launchScenario(seed)
  const items = itemsFor(stage)
  const text = work.text ?? ''
  const plan = readPlan(text, s, items)
  const words = wordCount(text)
  const rate = stage === 'main' ? s.contractor.rate : s.contractor.newRate
  const date = (id: string) => plan[id]?.date
  const spend = items
    .filter((item) => plan[item.id].owner?.name === s.contractor.name)
    .reduce((sum, item) => sum + item.days * rate, 0)
  return [
    {
      id: 'length',
      label: `Between ${WORDS.min} and ${WORDS.max} words`,
      passed: words >= WORDS.min && words <= WORDS.max,
    },
    { id: 'no-placeholders', label: 'No placeholders left in', passed: !hasPlaceholder(text) },
    {
      id: 'owners',
      label: 'Every work item has an owner',
      passed: items.every((item) => plan[item.id].owner),
    },
    {
      id: 'skills',
      label: 'Each owner has the skills for their item',
      passed: items.every((item) => {
        const owner = plan[item.id].owner
        return owner && item.roles.includes(owner.role)
      }),
    },
    {
      id: 'leave',
      label: `No work is given to ${s.onLeave.name}, who is on leave`,
      passed: items.every((item) => plan[item.id].owner?.name !== s.onLeave.name),
    },
    {
      id: 'dates',
      label: `Every item finishes after today and by the launch on ${formatDate(s.launch)}`,
      passed: items.every((item) => {
        const d = date(item.id)
        return d && dayIndex(d) > dayIndex(s.today) && dayIndex(d) <= dayIndex(s.launch)
      }),
    },
    {
      id: 'order',
      label: 'Work finishes after the work it depends on',
      passed: items.every((item) =>
        item.after.every((dep) => {
          const mine = date(item.id)
          const theirs = date(dep)
          return mine && theirs && dayIndex(mine) > dayIndex(theirs)
        })
      ),
    },
    {
      id: 'budget',
      label: `Contractor time fits the ${usd(s.budget)} budget at ${usd(rate)} a day`,
      passed: spend <= s.budget,
    },
    {
      id: 'launch-date',
      label: 'States the launch date',
      passed: mentionsDate(text, s.launch),
    },
  ]
}

function facts(seed: number, stage: 'main' | 'followup'): string[] {
  const s = launchScenario(seed)
  const lines = [
    `Today: ${formatDay(s.today)}. Launch: ${formatDay(s.launch)}.`,
    ...s.team.map((p) => `${p.name}: ${ROLE_NAMES[p.role]}`),
    `${s.onLeave.name}: ${ROLE_NAMES[s.onLeave.role]}, on leave from today until after the launch`,
    `${s.contractor.name}: contract ${ROLE_NAMES[s.contractor.role]}, ${usd(stage === 'main' ? s.contractor.rate : s.contractor.newRate)} a day, can start ${formatDay(s.contractor.start)}`,
    `Budget left for extra help: ${usd(s.budget)}`,
    ...ITEMS.map(
      (item) =>
        `${item.name}: about ${item.days} ${item.days === 1 ? 'day' : 'days'} (${item.note})${item.id === 'screens' ? `. ${s.onLeave.name} had started them` : ''}`
    ),
  ]
  if (stage === 'followup') {
    lines.push(
      `${SCHEDULING.name}: about ${SCHEDULING.days} days (frontend). The accessibility review and regression testing must cover it, so they come after it`
    )
  }
  return lines
}

function instructions(seed: number, stage: Stage): string[] {
  const s = launchScenario(seed)
  const [backend, frontend, qa, design] = s.team
  if (stage === 'main') {
    return [
      `You run delivery of the new mobile checkout for ${s.client}, a client. ${s.sponsor} is their product lead. Friday’s stand-up notes, unedited: “payment timeouts still happening on big baskets, ${backend.name} reckons 3 days. ${s.onLeave.name} is off from Monday (family leave), checkout screens about half done. ${qa.name} can’t start regression until payments and screens land. need an accessibility pass before launch, 1 day, ${design.name} or ${qa.name}. release notes not started. ${frontend.name} is free.”`,
      `Write the plan for ${s.sponsor}. Put each work item on its own line with its owner and finish date, like: Payment timeout fix — ${backend.name} — ${formatDate(addDays(s.today, 3))}. Then name the biggest risk and what you’ll do about it, and say whether the launch on ${formatDate(s.launch)} holds.`,
      `Every item needs an owner from the team and must be done by the launch. ${s.contractor.name} can be hired from the budget for extra help.`,
    ]
  }
  if (stage === 'followup') {
    return [
      `${s.sponsor} writes back: their customers keep asking to choose a delivery time, so the launch must include delivery scheduling. It’s about ${SCHEDULING.days} days of frontend work, and the accessibility review and regression testing have to cover it.`,
      `${s.contractor.name}’s agency also says the day rate is now ${usd(s.contractor.newRate)}, from today.`,
      `Revise the plan: add the new work, stay within the budget and the launch on ${formatDate(s.launch)}, and say what changed. Your previous plan is loaded below.`,
    ]
  }
  return ['Answer briefly in your own words.']
}

export const LAUNCH_PLAN: WritingChallenge = {
  id: 'launch-plan',
  version: 1,
  title: 'Launch recovery plan',
  instructions,
  facts,
  text: { label: 'Your plan', placeholder: 'Hi …', minWords: WORDS.min, maxWords: WORDS.max },
  checks,
  explainQuestions: [
    'Why did you order the work the way you did, and what did you treat as the biggest risk?',
    'What did the new requirement and the higher rate make you change, and what trade-off did you accept?',
  ],
  workLabels: { main: 'First plan', followup: 'Revised plan' },
}

export const PLAN_RUBRIC: Rubric = {
  id: 'project-plan-core',
  version: 1,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Plan accuracy',
      weight: 30,
      source: 'checks:all',
      description:
        'Every item has a suitable owner and a finish date before launch; dependencies, leave and the budget are respected.',
    },
    {
      id: 'planning',
      label: 'Planning and priorities',
      weight: 20,
      source: 'ai:planning',
      description:
        'Orders the work by what unblocks the launch, with a timeline that fits the estimates and the people.',
    },
    {
      id: 'risk',
      label: 'Risk and budget judgement',
      weight: 15,
      source: 'ai:risk',
      description:
        'Names the biggest risk with a concrete mitigation, and spends the budget deliberately.',
    },
    {
      id: 'communication',
      label: 'Stakeholder communication',
      weight: 15,
      source: 'ai:communication',
      description: 'Clear and honest with the client: decisions first, trade-offs stated.',
    },
    {
      id: 'revision',
      label: 'Adapting the plan',
      weight: 10,
      source: 'ai:revision',
      description:
        'Fits the new requirement and the higher rate in without breaking dependencies, the budget or the date.',
    },
    {
      id: 'explanation',
      label: 'Explaining choices',
      weight: 10,
      source: 'ai:explanation',
      description: 'Explains the sequencing and the trade-offs behind the plan.',
    },
  ],
  gates: [{ criterionId: 'accuracy', minimum: 0.5 }],
}
