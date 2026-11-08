/**
 * Finance challenge "Expansion decision". A fictional company is deciding
 * whether to open another site. The candidate builds a three-year forecast
 * from the base-case assumptions, works out the key ratios, the peak cash
 * the company must put in and a downside case, and recommends in a memo.
 * The follow-up changes the loan rate and the rent.
 *
 * The figures are checked against a model computed from the seed. The
 * recommendation itself is never scored: either answer can earn full marks
 * when the reasoning holds, so the rubric tests financial reasoning rather
 * than one predetermined opinion.
 */

import type { BriefTable, Rubric, Stage, StageWork, WritingField } from '../types'
import { createRng, deriveSeed, round2 } from '../random'
import {
  closeTo,
  hasPlaceholder,
  mentionsAmount,
  moneySlack,
  usd,
  wordCount,
  type CheckResult,
} from './text'
import type { WritingChallenge } from './writing'

const BUSINESSES = [
  { company: 'Kestrel Coffee', site: 'café', sites: 'cafés' },
  { company: 'Bluefin Bikes', site: 'store', sites: 'stores' },
  { company: 'Marlow Dental', site: 'clinic', sites: 'clinics' },
  { company: 'Tandem Fitness', site: 'studio', sites: 'studios' },
]
const CITIES = ['Denver', 'Raleigh', 'Columbus', 'Tucson', 'Boise']
const OWNERS = ['Rosa', 'Malik', 'Hannah', 'Theo']

/** Fixed costs rise this much a year; the downside case loses this share of revenue. */
const FIXED_GROWTH = 0.03
const DOWNSIDE = 0.15
const DEPRECIATION_YEARS = 5
const WORDS = { min: 120, max: 300 }

export interface ExpansionCase {
  company: string
  site: string
  sites: string
  existingSites: number
  city: string
  owner: string
  revenue1: number
  growth2: number
  growth3: number
  costOfSales: number
  fixed1: number
  capex: number
  launch: number
  loan: number
  rate: number
  /** The follow-up's terms. */
  newRate: number
  extraRent: number
  history: { year: number; revenue: number; ebit: number; cash: number }[]
}

export function expansionCase(seed: number): ExpansionCase {
  const rng = createRng(deriveSeed(seed, 'expansion'))
  const business = rng.pick(BUSINESSES)
  const revenue1 = rng.int(9, 16) * 100_000
  const costOfSales = rng.pick([0.32, 0.35, 0.38, 0.4])
  const capex = Math.round((revenue1 * rng.int(25, 35)) / 100 / 5_000) * 5_000
  // Fixed costs at or above Year 1 gross profit: a slow first year, as new sites have.
  const fixed1 =
    Math.round((revenue1 * (1 - costOfSales) * rng.int(100, 106)) / 100 / 10_000) * 10_000
  const loan = Math.round((capex * rng.int(55, 75)) / 100 / 10_000) * 10_000
  const rate = rng.pick([0.06, 0.065, 0.07, 0.075])
  const existingSites = rng.int(3, 6)
  const history: ExpansionCase['history'] = []
  let revenue = Math.round((revenue1 * existingSites * rng.int(90, 110)) / 100 / 10_000) * 10_000
  let cash = Math.round((capex * rng.int(0, 20)) / 100 / 10_000) * 10_000
  for (const year of [2023, 2024, 2025]) {
    const ebit = Math.round((revenue * rng.int(6, 11)) / 100 / 1_000) * 1_000
    cash += Math.round(ebit * 0.15)
    history.push({ year, revenue, ebit, cash: Math.round(cash / 1_000) * 1_000 })
    revenue = Math.round((revenue * (100 + rng.int(3, 8))) / 100 / 10_000) * 10_000
  }
  return {
    ...business,
    existingSites,
    city: rng.pick(CITIES),
    owner: rng.pick(OWNERS),
    revenue1,
    growth2: rng.pick([0.2, 0.25, 0.3]),
    growth3: rng.pick([0.1, 0.12, 0.15]),
    costOfSales,
    fixed1,
    capex,
    launch: rng.int(3, 6) * 10_000,
    loan,
    rate,
    newRate: Math.round((rate + rng.pick([0.015, 0.02, 0.025])) * 1000) / 1000,
    extraRent: rng.int(3, 6) * 10_000,
    history,
  }
}

export interface ExpansionFigures {
  revenue: number[]
  ebit: number[]
  cashFlow: number[]
  interest: number
  /** Year 3 operating margin, percent. */
  margin3: number
  /** Year 3 EBIT over interest. */
  cover3: number
  peakCash: number
  downsideEbit3: number
}

/** The answer key: the three-year model under the base or the revised terms. */
export function expansionFigures(c: ExpansionCase, revised: boolean): ExpansionFigures {
  const rate = revised ? c.newRate : c.rate
  const fixed1 = c.fixed1 + (revised ? c.extraRent : 0)
  const revenue = [c.revenue1, c.revenue1 * (1 + c.growth2)]
  revenue.push(revenue[1] * (1 + c.growth3))
  const depreciation = c.capex / DEPRECIATION_YEARS
  const interest = round2(c.loan * rate)
  const fixed = [0, 1, 2].map((t) => fixed1 * (1 + FIXED_GROWTH) ** t)
  const ebitFor = (rev: number, t: number) =>
    round2(rev - rev * c.costOfSales - fixed[t] - depreciation)
  const ebit = revenue.map((rev, t) => ebitFor(rev, t))
  const cashFlow = ebit.map((e) => round2(e + depreciation - interest))
  let position = -(c.capex + c.launch - c.loan)
  let lowest = position
  for (const flow of cashFlow) {
    position += flow
    lowest = Math.min(lowest, position)
  }
  return {
    revenue: revenue.map(round2),
    ebit,
    cashFlow,
    interest,
    margin3: (ebit[2] / revenue[2]) * 100,
    cover3: ebit[2] / interest,
    peakCash: round2(-lowest),
    downsideEbit3: ebitFor(revenue[2] * (1 - DOWNSIDE), 2),
  }
}

const pct = (share: number) => `${round2(share * 100)}%`

function facts(seed: number, stage: 'main' | 'followup'): string[] {
  const c = expansionCase(seed)
  const lines = [
    `Year 1 revenue: ${usd(c.revenue1)}. Growth: ${pct(c.growth2)} in Year 2, ${pct(c.growth3)} in Year 3.`,
    `Cost of sales: ${pct(c.costOfSales)} of revenue.`,
    `Fixed operating costs (rent, staff, utilities): ${usd(c.fixed1)} in Year 1, rising ${pct(FIXED_GROWTH)} a year.`,
    `Fit-out and equipment: ${usd(c.capex)}, paid at opening, depreciated straight-line over ${DEPRECIATION_YEARS} years.`,
    `Launch costs: ${usd(c.launch)}, paid at opening. They are part of the upfront cash, not of any year’s EBIT.`,
    `Bank loan: ${usd(c.loan)} at ${pct(c.rate)} a year, interest only for these three years.`,
    'Ignore tax and working capital.',
    'EBIT = revenue − cost of sales − fixed costs − depreciation. Cash flow each year = EBIT + depreciation − interest.',
    'Peak cash need: the most the company’s own cash is down at opening or at any year-end, counting the upfront amount net of the loan.',
    `Downside case: revenue ${pct(DOWNSIDE)} below the base case every year, cost of sales still ${pct(c.costOfSales)} of revenue, everything else unchanged.`,
  ]
  if (stage === 'followup') {
    lines.push(
      `New terms: the loan rate is ${pct(c.newRate)}, and fixed costs are ${usd(c.extraRent)} higher from Year 1 (${usd(c.fixed1 + c.extraRent)}), still rising ${pct(FIXED_GROWTH)} a year.`
    )
  }
  return lines
}

function table(seed: number): BriefTable {
  const c = expansionCase(seed)
  return {
    caption: `${c.company}: the existing ${c.existingSites} ${c.sites} combined`,
    columns: ['Year', 'Revenue', 'Operating profit', 'Cash at year end'],
    rows: c.history.map((h) => [String(h.year), usd(h.revenue), usd(h.ebit), usd(h.cash)]),
  }
}

const FIELD_LABELS: Record<string, string> = {
  'y3-revenue': 'Year 3 revenue ($)',
  'y3-ebit': 'Year 3 operating profit, EBIT ($)',
  'y3-margin': 'Year 3 operating margin (% of revenue, 1 decimal)',
  'y3-cover': 'Year 3 interest cover (EBIT ÷ interest, 1 decimal)',
  'peak-cash': 'Peak cash need ($)',
  'downside-ebit': 'Downside case: Year 3 EBIT ($)',
}

function fields(seed: number, stage: 'main' | 'followup'): WritingField[] {
  // Revenue doesn't change in the follow-up, so it isn't asked again.
  const ids = Object.keys(FIELD_LABELS).filter((id) => stage === 'main' || id !== 'y3-revenue')
  return ids.map((id) => ({ id, label: FIELD_LABELS[id], numeric: true }))
}

const RECOMMENDS =
  /\b(recommend|recommendation|go ahead|proceed|approve|should|shouldn['’]t|do not|don['’]t|hold off|wait|delay|postpone|reject|decline|pass on)\b/i

function checks(seed: number, stage: 'main' | 'followup', work: StageWork): CheckResult[] {
  const c = expansionCase(seed)
  const f = expansionFigures(c, stage === 'followup')
  const given = work.fields ?? {}
  const text = work.text ?? ''
  const words = wordCount(text)
  const results: CheckResult[] = []
  if (stage === 'main') {
    results.push({
      id: 'y3-revenue',
      label: 'Year 3 revenue is right',
      passed: closeTo(given['y3-revenue'], f.revenue[2], moneySlack(f.revenue[2])),
    })
  }
  results.push(
    {
      id: 'y3-ebit',
      label: 'Year 3 EBIT is right',
      passed: closeTo(given['y3-ebit'], f.ebit[2], moneySlack(f.ebit[2])),
    },
    {
      id: 'y3-margin',
      label: 'Year 3 operating margin is right',
      passed: closeTo(given['y3-margin'], f.margin3, 0.15),
    },
    {
      id: 'y3-cover',
      label: 'Year 3 interest cover is right',
      passed: closeTo(given['y3-cover'], f.cover3, 0.1),
    },
    {
      id: 'peak-cash',
      label: 'Peak cash need is right',
      passed: closeTo(given['peak-cash'], f.peakCash, moneySlack(f.peakCash)),
    },
    {
      id: 'downside-ebit',
      label: 'Downside Year 3 EBIT is right',
      passed: closeTo(given['downside-ebit'], f.downsideEbit3, moneySlack(f.downsideEbit3)),
    },
    {
      id: 'length',
      label: `Memo between ${WORDS.min} and ${WORDS.max} words`,
      passed: words >= WORDS.min && words <= WORDS.max,
    },
    { id: 'no-placeholders', label: 'No placeholders left in', passed: !hasPlaceholder(text) },
    { id: 'recommends', label: 'The memo makes a recommendation', passed: RECOMMENDS.test(text) },
    {
      id: 'states-cash',
      label: 'The memo states the peak cash need',
      passed: mentionsAmount(text, f.peakCash),
    }
  )
  results.push(
    stage === 'main'
      ? {
          id: 'downside',
          label: 'The memo discusses the downside case',
          passed:
            /(downside|worse case|worst case|weaker|lower revenue|revenue (falls|drops|is lower)|15%)/i.test(
              text
            ),
        }
      : {
          id: 'new-terms',
          label: 'The memo covers the new loan rate and costs',
          passed: /(interest|rate|rent|landlord|bank|fixed costs)/i.test(text),
        }
  )
  return results
}

function instructions(seed: number, stage: Stage): string[] {
  const c = expansionCase(seed)
  if (stage === 'main') {
    return [
      `${c.owner}, the founder of ${c.company}, is deciding whether to open a new ${c.site} in ${c.city}. The facts give the base-case assumptions; the table shows how the existing ${c.sites} have done.`,
      'Build a three-year forecast for the new site and fill in the figures. Use a spreadsheet or calculator if you like; the figures you enter and your memo are what gets graded.',
      `Then write a short memo to ${c.owner}: your recommendation, the numbers behind it, the cash it needs and what the downside case means. Either recommendation can score full marks. What counts is the reasoning.`,
    ]
  }
  if (stage === 'followup') {
    return [
      `The bank’s final offer is ${pct(c.newRate)}, not ${pct(c.rate)}, and the landlord wants ${usd(c.extraRent)} more a year from Year 1, rising with the other fixed costs.`,
      'Update your figures and revise the memo. Say whether your recommendation changes, and why. Your previous answers are loaded below.',
    ]
  }
  return ['Answer briefly in your own words.']
}

export const EXPANSION_DECISION: WritingChallenge = {
  id: 'expansion-decision',
  version: 1,
  title: 'Expansion decision',
  instructions,
  facts,
  table,
  fields,
  text: {
    label: 'Your memo',
    placeholder: 'Recommendation: …',
    minWords: WORDS.min,
    maxWords: WORDS.max,
  },
  checks,
  explainQuestions: [
    'Which base-case assumption worries you most, and how would you test it before committing?',
    'Walk through how you worked out the peak cash need, and what it means for the company.',
  ],
  workLabels: { main: 'First figures and memo', followup: 'Revised figures and memo' },
}

export const FINANCE_RUBRIC: Rubric = {
  id: 'finance-core',
  version: 1,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Calculations',
      weight: 35,
      source: 'checks:all',
      description:
        'The forecast, ratios, cash need and downside figures are right in both versions, and the memo states the cash need.',
    },
    {
      id: 'reasoning',
      label: 'Financial reasoning',
      weight: 25,
      source: 'ai:reasoning',
      description:
        'Connects margins, interest cover, cash need and the company’s own results to the decision. Either recommendation can earn full marks; the conclusion itself is not scored.',
    },
    {
      id: 'risk',
      label: 'Scenarios and risk',
      weight: 15,
      source: 'ai:risk',
      description:
        'Uses the downside case to judge the risk and says what would have to be true for the expansion to work.',
    },
    {
      id: 'revision',
      label: 'Updating for new terms',
      weight: 15,
      source: 'ai:revision',
      description:
        'The revision updates every affected figure and says whether, and why, the recommendation changes.',
    },
    {
      id: 'explanation',
      label: 'Explaining the method',
      weight: 10,
      source: 'ai:explanation',
      description: 'Explains the calculations and the assumptions accurately.',
    },
  ],
  gates: [{ criterionId: 'accuracy', minimum: 0.6 }],
}
