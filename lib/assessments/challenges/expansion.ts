/**
 * Finance challenge "Expansion decision". A fictional company is deciding
 * whether to open another site. The candidate builds a three-year forecast
 * from the base-case assumptions, works out the key ratios, the peak cash
 * the company must put in and a downside case, and recommends in a memo.
 * The follow-up changes the loan rate and the rent.
 *
 * The candidate builds the model in a spreadsheet. Grading resets the
 * assumption cells, reads the results, then changes the assumptions (the
 * downside case, and the follow-up's new terms) and reads them again, so
 * only formulas that really depend on the assumptions pass; typed-in
 * numbers don't. The figures are compared with a model computed from the
 * seed. The recommendation itself is never scored: either answer can earn full marks
 * when the reasoning holds, so the rubric tests financial reasoning rather
 * than one predetermined opinion.
 */

import type { BriefTable, Rubric, Stage, StageWork } from '../types'
import { createRng, deriveSeed, round2 } from '../random'
import { classify } from '@/lib/sheets/formula'
import { numberAt, sheetValues, type CellFormat, type SheetTemplate } from '@/lib/sheets/sheet'
import {
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

/** Where everything sits in the sheet. */
export const CELL = {
  revenue1: 'B2',
  growth2: 'B3',
  growth3: 'B4',
  costOfSales: 'B5',
  fixed1: 'B6',
  fixedGrowth: 'B7',
  capex: 'B8',
  years: 'B9',
  launch: 'B10',
  loan: 'B11',
  rate: 'B12',
  scenario: 'B13',
  revenue3: 'D16',
  ebit3: 'D20',
  margin3: 'B27',
  cover3: 'B28',
  peakCash: 'B29',
} as const

const ASSUMPTIONS: [string, string, CellFormat][] = [
  [CELL.revenue1, 'Year 1 revenue', 'money'],
  [CELL.growth2, 'Revenue growth, Year 2', 'percent'],
  [CELL.growth3, 'Revenue growth, Year 3', 'percent'],
  [CELL.costOfSales, 'Cost of sales, share of revenue', 'percent'],
  [CELL.fixed1, 'Fixed costs, Year 1', 'money'],
  [CELL.fixedGrowth, 'Fixed costs rise each year by', 'percent'],
  [CELL.capex, 'Fit-out and equipment', 'money'],
  [CELL.years, 'Depreciation, years', 'number'],
  [CELL.launch, 'Launch costs', 'money'],
  [CELL.loan, 'Bank loan', 'money'],
  [CELL.rate, 'Loan interest rate', 'percent'],
  [CELL.scenario, 'Revenue vs plan (scenario)', 'percent'],
]

const MODEL_ROWS: [number, string][] = [
  [16, 'Revenue'],
  [17, 'Cost of sales'],
  [18, 'Fixed costs'],
  [19, 'Depreciation'],
  [20, 'EBIT'],
  [21, 'Interest'],
  [22, 'Cash flow'],
  [24, 'Cash position at year end'],
]

/** The assumption cells, as typed, under the base or revised terms and a revenue scenario. */
export function expansionInputs(
  c: ExpansionCase,
  revised: boolean,
  scenario = 1
): Record<string, string> {
  return {
    [CELL.revenue1]: String(c.revenue1),
    [CELL.growth2]: pct(c.growth2),
    [CELL.growth3]: pct(c.growth3),
    [CELL.costOfSales]: pct(c.costOfSales),
    [CELL.fixed1]: String(c.fixed1 + (revised ? c.extraRent : 0)),
    [CELL.fixedGrowth]: pct(FIXED_GROWTH),
    [CELL.capex]: String(c.capex),
    [CELL.years]: String(DEPRECIATION_YEARS),
    [CELL.launch]: String(c.launch),
    [CELL.loan]: String(c.loan),
    [CELL.rate]: pct(revised ? c.newRate : c.rate),
    [CELL.scenario]: pct(scenario),
  }
}

/** The sheet: the assumptions to build from, the forecast to fill, and the results. */
function sheet(seed: number, stage: 'main' | 'followup'): SheetTemplate {
  const c = expansionCase(seed)
  const values = expansionInputs(c, stage === 'followup')
  const cells: SheetTemplate['cells'] = {}
  const label = (id: string, value: string) => (cells[id] = { value, role: 'label' })
  const heading = (id: string, value: string) => (cells[id] = { value, role: 'heading' })
  const answer = (id: string, format: CellFormat) =>
    (cells[id] = { value: '', role: 'answer', format })

  heading('A1', 'Assumptions')
  for (const [id, text, format] of ASSUMPTIONS) {
    label(`A${id.slice(1)}`, text)
    cells[id] = { value: values[id], role: 'input', format }
  }
  heading('A15', 'Forecast')
  heading('B15', 'Year 1')
  heading('C15', 'Year 2')
  heading('D15', 'Year 3')
  for (const [row, text] of MODEL_ROWS) {
    label(`A${row}`, text)
    for (const col of ['B', 'C', 'D']) answer(`${col}${row}`, 'money')
  }
  label('A23', 'Cash position at opening')
  answer('B23', 'money')
  heading('A26', 'Results')
  label('A27', 'Year 3 operating margin')
  answer(CELL.margin3, 'percent')
  label('A28', 'Year 3 interest cover')
  answer(CELL.cover3, 'ratio')
  label('A29', 'Peak cash need')
  answer(CELL.peakCash, 'money')
  return { columns: 4, rows: 30, cells }
}

function facts(seed: number, stage: 'main' | 'followup'): string[] {
  const c = expansionCase(seed)
  const lines = [
    'The assumptions are in the sheet. Grading resets them to these values, so try other scenarios freely.',
    `Fit-out is depreciated straight-line over ${DEPRECIATION_YEARS} years. Launch costs are paid at opening and are not part of any year’s EBIT.`,
    'The loan is interest only for these three years. Ignore tax and working capital.',
    'EBIT = revenue − cost of sales − fixed costs − depreciation. Cash flow each year = EBIT + depreciation − interest.',
    'Cash position at opening = −(fit-out + launch costs − loan). Each year end adds that year’s cash flow. Peak cash need = the lowest position, as a positive amount.',
    `Downside case: set B13 to ${pct(1 - DOWNSIDE)}, so revenue is ${pct(DOWNSIDE)} below plan every year and cost of sales stays the same share of it.`,
  ]
  if (stage === 'followup') {
    lines.push(
      `New terms, already in the sheet: the loan rate is ${pct(c.newRate)} (B12), and fixed costs are ${usd(c.extraRent)} higher from Year 1 (B6), still rising ${pct(FIXED_GROWTH)} a year.`
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

const RECOMMENDS =
  /\b(recommend|recommendation|go ahead|proceed|approve|should|shouldn['’]t|do not|don['’]t|hold off|wait|delay|postpone|reject|decline|pass on)\b/i

/** The cells that must be formulas, so the model reacts when an assumption changes. */
const RESULT_CELLS = [CELL.revenue3, CELL.ebit3, CELL.margin3, CELL.cover3, CELL.peakCash]

function checks(seed: number, stage: 'main' | 'followup', work: StageWork): CheckResult[] {
  const c = expansionCase(seed)
  const revised = stage === 'followup'
  const f = expansionFigures(c, revised)
  const template = sheet(seed, stage)
  // Grading puts the task's assumptions back, then reads the candidate's formulas.
  const plan = sheetValues(template, work.sheet, expansionInputs(c, revised))
  const downside = sheetValues(template, work.sheet, expansionInputs(c, revised, 1 - DOWNSIDE))
  const near = (value: number | null, expected: number, slack: number) =>
    value !== null && Math.abs(value - expected) <= slack
  const margin = numberAt(plan, CELL.margin3)
  const peak = numberAt(plan, CELL.peakCash)
  const text = work.text ?? ''
  const words = wordCount(text)
  const results: CheckResult[] = []
  if (!revised) {
    results.push({
      id: 'y3-revenue',
      label: `Year 3 revenue is right (${CELL.revenue3})`,
      passed: near(numberAt(plan, CELL.revenue3), f.revenue[2], moneySlack(f.revenue[2])),
    })
  }
  results.push(
    {
      id: 'y3-ebit',
      label: `Year 3 EBIT is right (${CELL.ebit3})`,
      passed: near(numberAt(plan, CELL.ebit3), f.ebit[2], moneySlack(f.ebit[2])),
    },
    {
      id: 'y3-margin',
      label: `Year 3 operating margin is right (${CELL.margin3})`,
      // As a share (0.099) or as a percentage (9.9): both read the same.
      passed:
        margin !== null &&
        (Math.abs(margin * 100 - f.margin3) <= 0.15 || Math.abs(margin - f.margin3) <= 0.15),
    },
    {
      id: 'y3-cover',
      label: `Year 3 interest cover is right (${CELL.cover3})`,
      passed: near(numberAt(plan, CELL.cover3), f.cover3, 0.1),
    },
    {
      id: 'peak-cash',
      label: `Peak cash need is right (${CELL.peakCash})`,
      passed: peak !== null && near(Math.abs(peak), f.peakCash, moneySlack(f.peakCash)),
    },
    {
      id: 'downside',
      label: `The downside case works: at ${pct(1 - DOWNSIDE)} in ${CELL.scenario}, Year 3 EBIT is right`,
      passed: near(numberAt(downside, CELL.ebit3), f.downsideEbit3, moneySlack(f.downsideEbit3)),
    }
  )
  if (!revised) {
    results.push({
      id: 'formulas',
      label: 'The results are formulas, not typed numbers',
      passed: RESULT_CELLS.every((id) => classify(work.sheet?.[id]) === 'formula'),
    })
  }
  results.push(
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
    },
    revised
      ? {
          id: 'new-terms',
          label: 'The memo covers the new loan rate and costs',
          passed: /(interest|rate|rent|landlord|bank|fixed costs)/i.test(text),
        }
      : {
          id: 'downside-memo',
          label: 'The memo discusses the downside case',
          passed:
            /(downside|worse case|worst case|weaker|lower revenue|revenue (falls|drops|is lower)|15%)/i.test(
              text
            ),
        }
  )
  return results
}

function instructions(seed: number, stage: Stage): string[] {
  const c = expansionCase(seed)
  if (stage === 'main') {
    return [
      `${c.owner}, the founder of ${c.company}, is deciding whether to open a new ${c.site} in ${c.city}. The sheet holds the base-case assumptions; the table shows how the existing ${c.sites} have done.`,
      `Build the three-year forecast in the sheet with formulas that point at the assumption cells, so it updates when an assumption changes. Make revenue use the scenario cell ${CELL.scenario}: grading checks your model at 100% and at ${pct(1 - DOWNSIDE)}.`,
      `Then write a short memo to ${c.owner}: your recommendation, the numbers behind it, the cash it needs and what the downside case means. Either recommendation can score full marks. What counts is the reasoning.`,
    ]
  }
  if (stage === 'followup') {
    return [
      `The bank’s final offer is ${pct(c.newRate)}, not ${pct(c.rate)}, and the landlord wants ${usd(c.extraRent)} more a year from Year 1, rising with the other fixed costs. Both are already in the sheet.`,
      'Check that your model reflects them, and revise the memo. Say whether your recommendation changes, and why. Your previous work is loaded below.',
    ]
  }
  return ['Answer briefly in your own words.']
}

export const EXPANSION_DECISION: WritingChallenge = {
  id: 'expansion-decision',
  version: 2,
  title: 'Expansion decision',
  instructions,
  facts,
  table,
  sheet,
  text: {
    label: 'Your memo',
    placeholder: 'Recommendation: …',
    minWords: WORDS.min,
    maxWords: WORDS.max,
  },
  checks,
  explainQuestions: [
    'Which base-case assumption worries you most, and how would you test it before committing?',
    'Walk through how your sheet works out the peak cash need, and what it means for the company.',
  ],
  workLabels: { main: 'First model and memo', followup: 'Revised model and memo' },
}

export const FINANCE_RUBRIC: Rubric = {
  id: 'finance-core',
  version: 2,
  passThreshold: 0.7,
  criteria: [
    {
      id: 'accuracy',
      label: 'Calculations',
      weight: 35,
      source: 'checks:all',
      description:
        'The forecast, ratios, cash need and downside case are right in both versions, from formulas that react when the assumptions change, and the memo states the cash need.',
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
