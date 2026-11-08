/**
 * @jest-environment node
 */

import { ASSESSMENTS, getAssessment } from '@/lib/assessments/catalog'
import { LABS } from '@/lib/assessments/labs'
import {
  CODE_CHALLENGES,
  SQL_CHALLENGES,
  WRITING_CHALLENGES,
  sqlChallenge,
} from '@/lib/assessments/challenges'
import {
  buildBrief,
  cleanWork,
  evaluateDeterministic,
  gradingInput,
  type Ctx,
} from '@/lib/assessments/engine'
import {
  CELL,
  EXPANSION_DECISION,
  expansionCase,
  expansionFigures,
  expansionInputs,
} from '@/lib/assessments/challenges/expansion'
import { sheetValues } from '@/lib/sheets/sheet'
import {
  LAUNCH_PLAN,
  itemsFor,
  launchScenario,
  readPlan,
} from '@/lib/assessments/challenges/launch-plan'
import { INTERFACE_COPY } from '@/lib/assessments/challenges/interface-copy'
import {
  addDays,
  charCount,
  findDates,
  formatDate,
  mentionsAmount,
  mentionsPercent,
  parseNumber,
} from '@/lib/assessments/challenges/text'
import { runSqlBatch } from '@/lib/assessments/runners/sqlite'
import { setupScript } from '@/lib/assessments/challenges/sql'
import { sameRows } from '@/lib/assessments/compare'
import { practiceRunFor } from '@/lib/assessments/service'
import type { StageWork } from '@/lib/assessments/types'
import {
  expansionAnswer,
  interfaceStrings,
  launchPlanText,
  referenceQueries,
} from '@/test-utils/assessment-fixtures'

jest.setTimeout(60_000)

const SEEDS = Array.from({ length: 30 }, (_, i) => 1000 + i * 7919)
const ctxFor = (slug: string, seed: number): Ctx => {
  const def = getAssessment(slug)!
  return { def, challengeId: def.challengeIds[0], seed }
}
const failed = (checks: { id: string; passed: boolean }[]) =>
  checks.filter((c) => !c.passed).map((c) => c.id)

describe('text helpers', () => {
  it('finds dates in the forms people write them, in order', () => {
    expect(findDates('Screens — Leo — June 5, then 12 Jun, then 2026-06-20')).toEqual([
      { month: 6, day: 5 },
      { month: 6, day: 12 },
      { month: 6, day: 20 },
    ])
    expect(findDates('due 6/9 or 25/6')).toEqual([
      { month: 6, day: 9 },
      { month: 6, day: 25 },
    ])
    expect(findDates('Marcus 12 hours, May 3rd')).toEqual([{ month: 5, day: 3 }])
    expect(findDates('Sept 9')).toEqual([{ month: 9, day: 9 }])
  })

  it('reads figures typed into answer boxes', () => {
    expect(parseNumber('$1,234.50')).toBe(1234.5)
    expect(parseNumber('-4,200')).toBe(-4200)
    expect(parseNumber('−4,200')).toBe(-4200)
    expect(parseNumber('(4,200)')).toBe(-4200)
    expect(parseNumber('$(4,200)')).toBe(-4200)
    expect(parseNumber('12.4k')).toBe(12400)
    expect(parseNumber('1.2m')).toBe(1_200_000)
    expect(parseNumber('8.3%')).toBe(8.3)
    expect(parseNumber('8.3 percent')).toBe(8.3)
    expect(parseNumber('3.2x')).toBe(3.2)
    expect(parseNumber('about 4,200')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })

  it('finds amounts and percentages in prose, to a tolerance', () => {
    expect(mentionsAmount('we need about $412k', 411_560)).toBe(true)
    expect(mentionsAmount('we need $411,560', 411_560)).toBe(true)
    expect(mentionsAmount('we need $0.4 million', 411_560)).toBe(false)
    expect(mentionsAmount('3 months of runway', 3_000_000)).toBe(false)
    expect(mentionsPercent('a margin of 8.3%', 8.31)).toBe(true)
    expect(mentionsPercent('a margin of 9%', 8.31)).toBe(false)
  })

  it('counts an emoji as one character', () => {
    expect(charCount('Saved 🎉')).toBe(7)
  })
})

describe('catalog', () => {
  const registry = { code: CODE_CHALLENGES, sql: SQL_CHALLENGES, writing: WRITING_CHALLENGES }

  it('every assessment draws only challenges its workspace knows', () => {
    for (const def of ASSESSMENTS) {
      const known = registry[def.workspace as keyof typeof registry]
      expect(known).toBeDefined()
      for (const id of def.challengeIds) expect(known[id]).toBeDefined()
    }
  })

  it('every rubric adds up to 100 and gates real criteria', () => {
    for (const def of ASSESSMENTS) {
      const total = def.rubric.criteria.reduce((sum, c) => sum + c.weight, 0)
      expect(total).toBe(100)
      for (const gate of def.rubric.gates) {
        expect(def.rubric.criteria.some((c) => c.id === gate.criterionId)).toBe(true)
      }
    }
  })

  it('every assessment sits in a lab', () => {
    for (const def of ASSESSMENTS) expect(LABS).toContain(def.lab)
  })

  it('states what the simulations do not show', () => {
    expect(getAssessment('project-management')!.note).toMatch(/not proof of leadership/)
    expect(getAssessment('financial-analysis')!.note).toMatch(/recommendation itself is not scored/)
  })
})

describe('customer retention (SQL)', () => {
  const def = getAssessment('sql')!
  const ctx = (seed: number): Ctx => ({ def, challengeId: 'customer-retention', seed })

  it('is in the SQL pool next to sales cleanup', () => {
    expect(def.challengeIds).toEqual(['sales-cleanup', 'customer-retention'])
  })

  it('the reference queries score full marks on both exports', async () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const result = await evaluateDeterministic(ctx(seed), {
        main: { queries: referenceQueries('customer-retention', 'main') },
        followup: { queries: referenceQueries('customer-retention', 'followup') },
      })
      expect(result.systemError).toBeUndefined()
      expect(result.scores['sql:main'].score).toBe(1)
      expect(result.scores['sql:followup'].score).toBe(1)
    }
  })

  it('every trap changes an answer on every dataset', async () => {
    const challenge = sqlChallenge('customer-retention')
    const ref = Object.fromEntries(challenge.tasks.map((t) => [t.id, t.reference]))
    const careless: Record<string, { task: string; query: string }> = {
      'counts test accounts': {
        task: 'cohorts',
        query: ref.cohorts.replace('WHERE is_test = 0', ''),
      },
      'groups raw channel names': {
        task: 'channels',
        query: ref.channels.replace('LOWER(TRIM(channel))', 'channel'),
      },
      'counts repeated rows': {
        task: 'channels',
        query: ref.channels.replace('COUNT(DISTINCT order_id)', 'COUNT(*)'),
      },
      'counts cancelled orders as retained': {
        task: 'retention',
        query: ref.retention.replace("WHERE o.status = 'completed' AND", 'WHERE'),
      },
      'counts cancelled orders as activity': {
        task: 'lapsed',
        query: ref.lapsed.replace(" AND o.status = 'completed'", ''),
      },
    }
    for (const seed of SEEDS.slice(0, 12)) {
      for (const variant of ['visible', 'changed'] as const) {
        const setup = setupScript(challenge, seed, variant)
        const results = await runSqlBatch(setup, [
          ...challenge.tasks.map((t) => ({ id: `ref:${t.id}`, query: t.reference })),
          ...Object.entries(careless).map(([name, c]) => ({ id: name, query: c.query })),
        ])
        const byId = Object.fromEntries(results.map((r) => [r.id, r]))
        for (const [name, c] of Object.entries(careless)) {
          const task = challenge.tasks.find((t) => t.id === c.task)!
          expect(byId[name].error).toBeUndefined()
          const same = sameRows(
            byId[name].rows ?? [],
            byId[`ref:${c.task}`].rows ?? [],
            task.ordered
          )
          if (same) throw new Error(`"${name}" passed on seed ${seed} (${variant})`)
        }
      }
    }
  })

  it('the brief shows its own tables and tasks', async () => {
    const brief = await buildBrief(ctx(SEEDS[0]), 'main', undefined)
    expect(brief.title).toBe('Customer retention report')
    expect(brief.sql?.tables.map((t) => t.name)).toEqual(['customers', 'orders'])
    expect(brief.sql?.tasks.map((t) => t.id)).toEqual(['cohorts', 'retention', 'channels'])
    const follow = await buildBrief(ctx(SEEDS[0]), 'followup', { queries: { cohorts: 'x' } })
    expect(follow.sql?.tasks.map((t) => t.id)).toContain('lapsed')
    expect(follow.starterQueries).toEqual({ cohorts: 'x' })
  })

  it('keeps only this challenge’s query ids', () => {
    const work = cleanWork(ctx(1), 'main', {
      queries: { cohorts: 'SELECT 1', revenue: 'SELECT 2' },
    })
    expect(work.queries).toEqual({ cohorts: 'SELECT 1' })
  })
})

describe('expansion decision (finance)', () => {
  it('a strong answer passes every check, before and after the new terms', () => {
    for (const seed of SEEDS) {
      expect(failed(EXPANSION_DECISION.checks(seed, 'main', expansionAnswer(seed, false)))).toEqual(
        []
      )
      expect(
        failed(EXPANSION_DECISION.checks(seed, 'followup', expansionAnswer(seed, true)))
      ).toEqual([])
    }
  })

  it('either recommendation passes the automatic checks', () => {
    const seed = SEEDS[3]
    const yes = expansionAnswer(seed, false)
    const no = {
      ...yes,
      text: yes.text!.replace(/go ahead with the .*?, but only once/, 'do not open the site until'),
    }
    expect(no.text).not.toEqual(yes.text)
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', no))).toEqual([])
  })

  it('marks a wrong formula wrong, and only that one', () => {
    const seed = SEEDS[5]
    const answer = expansionAnswer(seed, false)
    // Interest cover against Year 1's interest plus one: wrong, and nothing depends on it.
    const off = { ...answer, sheet: { ...answer.sheet, [CELL.cover3]: '=D20/B21+1' } }
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', off))).toEqual(['y3-cover'])
  })

  it('typed-in numbers pass on the plan but fail when the assumptions change', () => {
    const seed = SEEDS[6]
    const answer = expansionAnswer(seed, false)
    const c = expansionCase(seed)
    const template = EXPANSION_DECISION.sheet!(seed, 'main')
    const values = sheetValues(template, answer.sheet, expansionInputs(c, false))
    // Every model cell replaced by the number it showed.
    const typed = Object.fromEntries(
      Object.keys(answer.sheet!).map((id) => [id, String(values[id])])
    )
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', { ...answer, sheet: typed }))).toEqual([
      'downside',
      'formulas',
    ])
    expect(
      failed(EXPANSION_DECISION.checks(seed, 'followup', { ...answer, sheet: typed }))
    ).toEqual(expect.arrayContaining(['y3-ebit', 'y3-cover', 'peak-cash', 'downside']))
  })

  it('a model that ignores the scenario cell fails only the downside case', () => {
    const seed = SEEDS[7]
    const answer = expansionAnswer(seed, false)
    const ignoring = { ...answer, sheet: { ...answer.sheet, B16: '=B2' } }
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', ignoring))).toEqual(['downside'])
  })

  it('grading resets the assumptions, so experimenting with them costs nothing', () => {
    const seed = SEEDS[8]
    const answer = expansionAnswer(seed, false)
    const playing = { ...answer, sheet: { ...answer.sheet, B13: '85%', B12: '12%' } }
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', playing))).toEqual([])
  })

  it('reads the margin as a share or a percentage, and the cash need with either sign', () => {
    const seed = SEEDS[9]
    const answer = expansionAnswer(seed, false)
    const variant = {
      ...answer,
      sheet: { ...answer.sheet, B27: '=D20/D16*100', B29: '=MIN(B23, B24:D24)' },
    }
    expect(failed(EXPANSION_DECISION.checks(seed, 'main', variant))).toEqual([])
  })

  it('the answer key behaves like a new site: a slow first year, then profit', () => {
    for (const seed of SEEDS) {
      const c = expansionCase(seed)
      const base = expansionFigures(c, false)
      const revised = expansionFigures(c, true)
      expect(base.cashFlow[0]).toBeLessThan(0)
      expect(base.cashFlow[2]).toBeGreaterThan(0)
      expect(base.peakCash).toBeGreaterThan(c.capex + c.launch - c.loan)
      expect(revised.ebit[2]).toBeLessThan(base.ebit[2])
      expect(revised.cover3).toBeLessThan(base.cover3)
      expect(revised.peakCash).toBeGreaterThan(base.peakCash)
    }
  })

  it('the follow-up sheet already holds the new terms', () => {
    const c = expansionCase(1)
    const main = EXPANSION_DECISION.sheet!(1, 'main')
    const follow = EXPANSION_DECISION.sheet!(1, 'followup')
    expect(main.cells[CELL.fixed1].value).toBe(String(c.fixed1))
    expect(follow.cells[CELL.fixed1].value).toBe(String(c.fixed1 + c.extraRent))
    expect(follow.cells[CELL.rate].value).toBe(`${Math.round(c.newRate * 1000) / 10}%`)
    expect(main.cells.A20).toEqual({ value: 'EBIT', role: 'label' })
    expect(main.cells[CELL.ebit3].role).toBe('answer')
  })
})

describe('launch recovery plan (project management)', () => {
  it('a strong plan passes every check, before and after the changes', () => {
    for (const seed of SEEDS) {
      expect(
        failed(LAUNCH_PLAN.checks(seed, 'main', { text: launchPlanText(seed, false) }))
      ).toEqual([])
      expect(
        failed(LAUNCH_PLAN.checks(seed, 'followup', { text: launchPlanText(seed, true) }))
      ).toEqual([])
    }
  })

  it('reads the owner as the first available person on the line', () => {
    const seed = SEEDS[2]
    const s = launchScenario(seed)
    const plan = readPlan(
      `Checkout screens (was ${s.onLeave.name}'s) — ${s.contractor.name} — June 9`,
      s,
      itemsFor('main')
    )
    expect(plan.screens.owner?.name).toBe(s.contractor.name)
    expect(plan.screens.date).toEqual({ month: 6, day: 9 })
  })

  it('reads a plan written as sentences, one item per line', () => {
    const s = launchScenario(SEEDS[3])
    const [backend, frontend, qa, design] = s.team
    const on = (days: number) => formatDate(addDays(s.today, days))
    const text = [
      `Hi ${s.sponsor}, the checkout screens are the tricky part this week.`,
      `${backend.name} will fix the payment timeouts by ${on(3)}.`,
      `${frontend.name} picks up the checkout screens from ${s.onLeave.name} and finishes them on ${on(8)}.`,
      `${design.name} does the accessibility review on ${on(10)}, and ${qa.name} runs regression testing by ${on(11)}.`,
    ].join('\n')
    const plan = readPlan(text, s, itemsFor('main'))
    expect(plan.payment.owner?.name).toBe(backend.name)
    expect(plan.screens.owner?.name).toBe(frontend.name)
    expect(plan.screens.date).toEqual(addDays(s.today, 8))
    expect(plan.accessibility.owner?.name).toBe(design.name)
  })

  it('catches work given to the person on leave', () => {
    const seed = SEEDS[4]
    const s = launchScenario(seed)
    const text = launchPlanText(seed, false).replace(
      `Checkout screens — ${s.contractor.name} (taking over from ${s.onLeave.name})`,
      `Checkout screens — ${s.onLeave.name}`
    )
    expect(failed(LAUNCH_PLAN.checks(seed, 'main', { text }))).toEqual(['leave'])
  })

  it('catches a plan that ignores the higher rate', () => {
    const seed = SEEDS[6]
    const s = launchScenario(seed)
    // The revised plan, but with the contractor still on the four-day screens.
    const text = launchPlanText(seed, true).replace(
      `Checkout screens — ${s.team[1].name}`,
      `Checkout screens — ${s.contractor.name}`
    )
    expect(failed(LAUNCH_PLAN.checks(seed, 'followup', { text }))).toEqual(['budget'])
  })

  it('catches testing scheduled before the work it tests', () => {
    const seed = SEEDS[7]
    const s = launchScenario(seed)
    const text = launchPlanText(seed, false)
      .split('\n')
      .map((line) =>
        line.startsWith('Regression testing')
          ? `Regression testing — ${s.team[2].name} — ${formatDate(addDays(s.today, 1))}`
          : line
      )
      .join('\n')
    expect(failed(LAUNCH_PLAN.checks(seed, 'main', { text }))).toEqual(['order'])
  })

  it('a revision without the new requirement misses it', () => {
    const seed = SEEDS[8]
    const text = launchPlanText(seed, true)
      .split('\n')
      .filter((line) => !line.startsWith('Delivery scheduling'))
      .join('\n')
    expect(failed(LAUNCH_PLAN.checks(seed, 'followup', { text }))).toEqual(
      expect.arrayContaining(['owners', 'dates', 'order'])
    )
  })
})

describe('interface copy rewrite (UX writing)', () => {
  const run = (seed: number, stage: 'main' | 'followup', fields: Record<string, string>) =>
    failed(INTERFACE_COPY.checks(seed, stage, { fields }))

  it('strong strings pass every check, before and after the change', () => {
    for (const seed of SEEDS) {
      expect(run(seed, 'main', interfaceStrings(seed, false))).toEqual([])
      expect(run(seed, 'followup', interfaceStrings(seed, true))).toEqual([])
    }
  })

  it('enforces the character limits, tighter for buttons after the change', () => {
    const seed = SEEDS[1]
    const long = { ...interfaceStrings(seed, true), 'delete-button': 'Move it to the Trash' }
    expect(long['delete-button'].length).toBe(20)
    expect(
      run(seed, 'main', {
        ...interfaceStrings(seed, false),
        'delete-button': 'Move it to the Trash',
      })
    ).toEqual([])
    expect(run(seed, 'followup', long)).toEqual(['fits:delete-button'])
  })

  it('catches generic buttons, leftover codes and a dialog that still says permanent', () => {
    const seed = SEEDS[2]
    const main = interfaceStrings(seed, false)
    expect(run(seed, 'main', { ...main, 'delete-button': 'OK' })).toEqual(['confirm-action'])
    expect(run(seed, 'main', { ...main, 'save-button': 'Submit' })).toEqual(['button-specific'])
    const s = INTERFACE_COPY.fields!(seed, 'main')[0].hint!
    const code = s.match(/Error (-?\d+)/)![1]
    expect(run(seed, 'main', { ...main, error: `Error ${code}. Try again.` })).toEqual([
      'error-plain',
    ])
    const revised = interfaceStrings(seed, true)
    expect(
      run(seed, 'followup', {
        ...revised,
        'delete-body': 'This can’t be undone. Restore from Trash.',
      })
    ).toEqual(['not-permanent'])
  })
})

describe('writing workspace', () => {
  it('briefs carry the facts, the table, the sheet and the long answer', async () => {
    const ctx = ctxFor('financial-analysis', SEEDS[0])
    const main = await buildBrief(ctx, 'main', undefined)
    expect(main.title).toBe('Expansion decision')
    expect(main.writing?.sheet?.cells[CELL.revenue1].role).toBe('input')
    expect(main.writing?.fields).toBeUndefined()
    expect(main.writing?.table?.rows).toHaveLength(3)
    expect(main.writing?.text?.label).toBe('Your memo')
    expect(main.starterSheet).toEqual({})

    const previous = expansionAnswer(SEEDS[0], false)
    const follow = await buildBrief(ctx, 'followup', previous)
    expect(follow.starterSheet).toEqual(previous.sheet)
    expect(follow.starter).toBe(previous.text)

    const explain = await buildBrief(ctx, 'explain', previous)
    expect(explain.writing?.sheet).toBeDefined()
    expect(explain.starterSheet).toEqual(previous.sheet)
  })

  it('keeps only sheet cells that exist and can be typed into', () => {
    const ctx = ctxFor('financial-analysis', 7)
    const work = cleanWork(ctx, 'main', {
      sheet: {
        D20: '=D16-D17',
        A20: 'Renamed label',
        E1: '=1',
        Z9: '1',
        B2: '2000000',
        C5: 'x'.repeat(500),
        D21: 42,
      },
      text: 'Memo',
    })
    expect(Object.keys(work.sheet!).sort()).toEqual(['B2', 'C5', 'D20'])
    expect(work.sheet!.C5).toHaveLength(300)
    expect(work.text).toBe('Memo')
  })

  it('a fields-only task has no text box', async () => {
    const brief = await buildBrief(ctxFor('ux-writing', 7), 'main', undefined)
    expect(brief.writing?.text).toBeUndefined()
    expect(brief.writing?.fields?.every((f) => f.maxChars)).toBe(true)
  })

  it('keeps known answers only, within the size limits', () => {
    const ctx = ctxFor('ux-writing', 7)
    const work = cleanWork(ctx, 'followup', {
      fields: { error: 'x'.repeat(5000), 'delete-body': 'ok', stray: 'dropped', empty: 3 },
      text: 'not used here',
    })
    expect(Object.keys(work.fields!).sort()).toEqual(['delete-body', 'error'])
    expect(work.fields!.error).toHaveLength(1000)
    expect(work.text).toBeUndefined()
    expect(
      cleanWork(ctxFor('business-writing', 7), 'main', { text: 'Hi', fields: { a: 'b' } })
    ).toEqual({
      text: 'Hi',
    })
  })

  it('the strong answers score full marks on the checks', async () => {
    const cases: [string, (seed: number, revised: boolean) => StageWork][] = [
      ['financial-analysis', expansionAnswer],
      ['project-management', (seed, revised) => ({ text: launchPlanText(seed, revised) })],
      ['ux-writing', (seed, revised) => ({ fields: interfaceStrings(seed, revised) })],
    ]
    for (const [slug, answer] of cases) {
      const ctx = ctxFor(slug, SEEDS[9])
      const result = await evaluateDeterministic(ctx, {
        main: answer(ctx.seed, false),
        followup: answer(ctx.seed, true),
      })
      expect(result.scores['checks:all'].score).toBe(1)
    }
  })

  it('the grader sees the facts, the table and each answer with its label', async () => {
    const ctx = ctxFor('financial-analysis', SEEDS[0])
    const work = {
      main: expansionAnswer(ctx.seed, false),
      followup: expansionAnswer(ctx.seed, true),
    }
    const input = gradingInput(ctx, 'independent', work, await evaluateDeterministic(ctx, work))
    expect(
      input.brief.some((line) => line.startsWith('Sheet assumption B2 (Year 1 revenue)'))
    ).toBe(true)
    expect(input.brief.some((line) => line.startsWith('Table: '))).toBe(true)
    expect(input.brief.filter((line) => line.startsWith('Fact: New terms'))).toHaveLength(1)
    expect(input.work[0].label).toBe('First model and memo')
    expect(input.work[0].content).toContain('B29 (Peak cash need): =-MIN(B23, B24:D24) → $')
    expect(input.rubric.id).toBe('finance-core')
  })

  it('there is nothing to run in a writing task', async () => {
    await expect(
      practiceRunFor('ux-writing', 7, 'main', {}, { allChallenges: true })
    ).rejects.toThrow('Nothing to run')
  })
})
