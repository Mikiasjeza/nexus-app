/**
 * Coding challenge "Reorder plan". The candidate decides which stock items
 * to reorder and how many units, skipping malformed items. Each attempt gets
 * its own safety and cover periods; the follow-up combines items that share
 * a SKU across warehouses and rounds orders up to whole packs.
 *
 * Hidden tests are generated from the seed and answered by `referencePlan`
 * on the server; the browser never sees them. Generated numbers are whole
 * or halves, so floating-point arithmetic is exact in every language.
 */

import type { CodeLanguage, CodeTestCase, Stage } from '../types'
import { createRng, deriveSeed, type Rng } from '../random'
import { namesFor, type CodeChallenge, type GroupedTest } from './code'

export type ReorderParams = { safetyDays: number; coverDays: number }

export type StockItem = {
  sku?: unknown
  stock?: unknown
  daily?: unknown
  lead?: unknown
  pack?: unknown
}

export type OrderLine = { sku: string; qty: number }

export function reorderParams(seed: number): ReorderParams {
  const rng = createRng(deriveSeed(seed, 'reorder:params'))
  return { safetyDays: rng.pick([2, 3, 5]), coverDays: rng.pick([7, 10, 14]) }
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

type Clean = { sku: string; stock: number; daily: number; lead: number; pack: number }

function clean(raw: unknown): Clean | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as StockItem
  if (typeof item.sku !== 'string' || !item.sku.trim()) return null
  if (!isNumber(item.stock) || item.stock < 0) return null
  if (!isNumber(item.daily) || item.daily < 0) return null
  if (!isNumber(item.lead) || !Number.isInteger(item.lead) || item.lead < 0) return null
  const pack = isNumber(item.pack) && Number.isInteger(item.pack) && item.pack > 0 ? item.pack : 1
  return { sku: item.sku.trim(), stock: item.stock, daily: item.daily, lead: item.lead, pack }
}

/** The trusted answer key. `combine` switches on the follow-up rules. */
export function referencePlan(
  items: unknown[],
  params: ReorderParams,
  combine: boolean
): OrderLine[] {
  let valid = items.map(clean).filter((i): i is Clean => i !== null)
  if (combine) {
    const merged = new Map<string, Clean>()
    for (const item of valid) {
      const seen = merged.get(item.sku)
      merged.set(
        item.sku,
        seen
          ? {
              sku: item.sku,
              stock: seen.stock + item.stock,
              daily: seen.daily + item.daily,
              lead: Math.max(seen.lead, item.lead),
              pack: Math.max(seen.pack, item.pack),
            }
          : item
      )
    }
    valid = [...merged.values()]
  }
  const out: OrderLine[] = []
  for (const item of valid) {
    const reorderPoint = item.daily * (item.lead + params.safetyDays)
    if (item.stock > reorderPoint) continue
    let qty = Math.ceil(
      item.daily * (item.lead + params.safetyDays + params.coverDays) - item.stock
    )
    if (combine) qty = Math.ceil(qty / item.pack) * item.pack
    if (qty > 0) out.push({ sku: item.sku, qty })
  }
  return out.sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0))
}

const PREFIXES = ['BOLT', 'CABLE', 'FILTER', 'GLOVE', 'LAMP', 'PUMP', 'TAPE', 'VALVE']

/** A SKU not used yet in this list; repeats only come from the follow-up's own tests. */
function sku(rng: Rng, used: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const candidate = `${rng.pick(PREFIXES)}-${rng.int(10, 99)}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
  const fallback = `ITEM-${used.size + 100}`
  used.add(fallback)
  return fallback
}

function goodItem(rng: Rng, withPack: boolean, used: Set<string>): StockItem {
  const code = sku(rng, used)
  const item: StockItem = {
    sku: rng.chance(0.1) ? ` ${code} ` : code,
    stock: rng.int(0, 400) + (rng.chance(0.2) ? 0.5 : 0),
    daily: rng.int(0, 30) + (rng.chance(0.3) ? 0.5 : 0),
    lead: rng.int(0, 12),
  }
  if (withPack && rng.chance(0.6)) item.pack = rng.pick([6, 10, 12, 24])
  return item
}

function badItem(rng: Rng): unknown {
  return rng.pick<unknown>([
    { sku: '', stock: 10, daily: 2, lead: 3 },
    { sku: '   ', stock: 10, daily: 2, lead: 3 },
    { stock: 10, daily: 2, lead: 3 },
    { sku: 'TAPE-01', stock: -4, daily: 2, lead: 3 },
    { sku: 'TAPE-02', stock: '40', daily: 2, lead: 3 },
    { sku: 'TAPE-03', stock: 40, daily: null, lead: 3 },
    { sku: 'TAPE-04', stock: 40, daily: 2, lead: 2.5 },
    { sku: 'TAPE-05', stock: 40, daily: 2, lead: -1 },
    { sku: 'TAPE-06', stock: 40, daily: 2 },
    null,
    'LAMP-10',
  ])
}

function itemsFor(rng: Rng, count: number, badShare: number, withPack: boolean): unknown[] {
  const used = new Set<string>()
  return Array.from({ length: count }, () =>
    rng.chance(badShare) ? badItem(rng) : goodItem(rng, withPack, used)
  )
}

function caseFor(
  id: string,
  group: GroupedTest['group'],
  description: string,
  items: unknown[],
  params: ReorderParams,
  combine: boolean
): GroupedTest {
  return { id, group, description, args: [items], expected: referencePlan(items, params, combine) }
}

function reorderHiddenTests(seed: number, stage: 'main' | 'followup'): GroupedTest[] {
  const params = reorderParams(seed)
  const rng = createRng(deriveSeed(seed, `reorder:hidden:${stage}`))
  const combine = stage === 'followup'
  const point = (daily: number, lead: number) => daily * (lead + params.safetyDays)
  const tests: GroupedTest[] = [
    caseFor('h-empty', 'edge', 'no items', [], params, combine),
    caseFor('h-basic', 'core', 'a small warehouse', itemsFor(rng, 8, 0, combine), params, combine),
    caseFor(
      'h-mixed',
      'core',
      'a larger warehouse',
      itemsFor(rng, 40, 0, combine),
      params,
      combine
    ),
    caseFor('h-bad', 'edge', 'malformed items', itemsFor(rng, 24, 0.5, combine), params, combine),
    caseFor(
      'h-boundary',
      'edge',
      'stock exactly at the reorder point',
      [
        { sku: 'PUMP-11', stock: point(4, 3), daily: 4, lead: 3 },
        { sku: 'PUMP-12', stock: point(4, 3) + 0.5, daily: 4, lead: 3 },
        { sku: 'PUMP-13', stock: 0, daily: 0, lead: 5 },
        { sku: 'PUMP-14', stock: 0, daily: 0.5, lead: 0 },
      ],
      params,
      combine
    ),
    caseFor(
      'h-large',
      'core',
      'a long stock list',
      itemsFor(rng, 250, 0.1, combine),
      params,
      combine
    ),
  ]
  if (combine) {
    // The same SKUs again, from a second warehouse.
    const first = itemsFor(rng, 20, 0, true)
    const again = first
      .filter((_, i) => i % 3 === 0)
      .map((item) => ({ ...(item as StockItem), stock: rng.int(0, 60), lead: rng.int(0, 15) }))
    tests.push(
      caseFor(
        'h-dupes',
        'core',
        'items split across warehouses',
        [...first, ...again],
        params,
        true
      ),
      caseFor(
        'h-pack',
        'edge',
        'rounding up to packs, with an invalid pack size',
        [
          { sku: 'GLOVE-20', stock: 0, daily: 3, lead: 2, pack: 12 },
          { sku: 'GLOVE-21', stock: 0, daily: 3, lead: 2, pack: 0 },
          { sku: 'GLOVE-22', stock: 0, daily: 3, lead: 2, pack: '6' },
          { sku: 'GLOVE-20', stock: 5, daily: 1, lead: 4, pack: 24 },
        ],
        params,
        true
      )
    )
  }
  return tests
}

function reorderVisibleTests(seed: number, stage: 'main' | 'followup'): CodeTestCase[] {
  const params = reorderParams(seed)
  const combine = stage === 'followup'
  const examples: { id: string; description: string; items: unknown[] }[] = [
    {
      id: 'v-basic',
      description: 'One item low on stock, one fine',
      items: [
        { sku: 'BOLT-10', stock: 12, daily: 5, lead: 4 },
        { sku: 'CABLE-20', stock: 900, daily: 2, lead: 3 },
      ],
    },
    {
      id: 'v-skip',
      description: 'Malformed items are skipped',
      items: [
        { sku: ' LAMP-30 ', stock: 0, daily: 1.5, lead: 2 },
        { sku: '', stock: 0, daily: 3, lead: 1 },
        { sku: 'LAMP-31', stock: '5', daily: 3, lead: 1 },
      ],
    },
    {
      id: 'v-order',
      description: 'Results are sorted by SKU',
      items: [
        { sku: 'VALVE-50', stock: 1, daily: 2, lead: 1 },
        { sku: 'FILTER-40', stock: 0, daily: 1, lead: 6 },
      ],
    },
  ]
  if (combine) {
    examples.push({
      id: 'v-combine',
      description: 'One SKU in two warehouses, sold in packs',
      items: [
        { sku: 'TAPE-60', stock: 10, daily: 2, lead: 3, pack: 10 },
        { sku: 'TAPE-60', stock: 4, daily: 1, lead: 5 },
      ],
    })
  }
  return examples.map((e) => ({
    id: e.id,
    description: e.description,
    args: [e.items],
    expected: referencePlan(e.items, params, combine),
  }))
}

const reorderFunctionName = namesFor('reorderPlan', 'reorder_plan')

function reorderStarter(language: CodeLanguage): string {
  if (language === 'python') {
    return `def reorder_plan(items):
    """Return [{"sku": str, "qty": int}, ...] sorted by sku."""
    plan = []
    # Your code here
    return plan
`
  }
  if (language === 'typescript') {
    return `type OrderLine = { sku: string; qty: number }

function reorderPlan(items: unknown[]): OrderLine[] {
  const plan: OrderLine[] = []
  // Your code here
  return plan
}
`
  }
  return `function reorderPlan(items) {
  const plan = []
  // Your code here
  return plan
}
`
}

function reorderInstructions(seed: number, stage: Stage, language: CodeLanguage): string[] {
  const { safetyDays, coverDays } = reorderParams(seed)
  const fn = reorderFunctionName(language)
  if (stage === 'main') {
    return [
      `Write ${fn}(items). Each item has a sku (text), stock (units on hand), daily (units used per day) and lead (days a delivery takes, a whole number).`,
      `An item needs reordering when stock is at or below its reorder point: daily × (lead + ${safetyDays}).`,
      `Order enough to cover daily × (lead + ${safetyDays} + ${coverDays}) units in total: qty is that amount minus stock, rounded up to a whole unit. Leave out items whose qty would be 0.`,
      'Skip items that are not objects, have no sku (or only spaces), or have a stock or daily that is missing, negative or not a number, or a lead that is not a whole number of 0 or more. Use the sku without surrounding spaces.',
      'Return a list of { sku, qty }, sorted by sku.',
      'Use only the standard library. Visible examples help you check the format; the score comes from hidden tests.',
    ]
  }
  if (stage === 'followup') {
    return [
      'New requirement: the list now covers several warehouses, so the same sku can appear more than once.',
      'Combine valid items that share a sku before deciding anything: add their stock and daily use, and use the longest lead time. Invalid items are still skipped and never combined.',
      'Items may also have pack: the supplier sells in packs of that many units. Round qty up to a whole number of packs. If pack is missing or not a whole number above 0, use 1. When combining, use the largest pack.',
      'Keep every other rule. Update your function; your previous code is loaded below.',
    ]
  }
  return ['Answer in your own words. Point to your code where it helps.']
}

export const REORDER_PLAN: CodeChallenge = {
  id: 'reorder-plan',
  version: 1,
  title: 'Reorder plan',
  functionName: reorderFunctionName,
  starter: reorderStarter,
  instructions: reorderInstructions,
  visibleTests: reorderVisibleTests,
  hiddenTests: reorderHiddenTests,
  explainQuestions: [
    'Which items does your function leave out, and how does your code decide that?',
    'How did you combine items that share a SKU, and where in your code does that happen?',
    'Stock levels now change every minute across thousands of items. What would you change?',
  ],
}
