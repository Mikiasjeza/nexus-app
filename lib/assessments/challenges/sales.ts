/**
 * SQL / data analytics challenge "Sales cleanup". A fictional company's
 * orders, with duplicated rows, missing amounts and refunds. The candidate
 * writes one query per task against their own seeded dataset. The follow-up
 * re-runs those queries on a changed export (catching hard-coded answers)
 * and adds a task. Reference queries produce the expected results.
 */

import type { SqlTable, Stage } from '../types'
import { createRng, deriveSeed, round2 } from '../random'
import type { SqlChallenge, SqlRows, SqlTaskDef } from './sql'

const TABLES: SqlTable[] = [
  {
    name: 'customers',
    columns: [
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'name', type: 'TEXT' },
      { name: 'region', type: 'TEXT' },
      { name: 'signup_date', type: 'TEXT', note: 'YYYY-MM-DD' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'order_id', type: 'INTEGER', note: 'can appear more than once' },
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'order_date', type: 'TEXT', note: 'YYYY-MM-DD' },
      { name: 'amount', type: 'REAL', note: 'can be NULL' },
      { name: 'status', type: 'TEXT', note: "'completed', 'refunded' or 'pending'" },
    ],
  },
]

const FIRST = [
  'Ada',
  'Bo',
  'Chen',
  'Dara',
  'Eli',
  'Femi',
  'Gus',
  'Hana',
  'Ivo',
  'Jun',
  'Kai',
  'Lena',
]
const LAST = ['Okoro', 'Lind', 'Moreau', 'Sato', 'Reyes', 'Novak', 'Haddad', 'Berg']
const REGIONS = ['North', 'South', 'East', 'West']

type Customer = { id: number; name: string; region: string; signup: string }
type Order = { id: number; customer: number; date: string; amount: number | null; status: string }

function rows(seed: number, variant: 'visible' | 'changed'): SqlRows {
  const rng = createRng(deriveSeed(seed, `sales:${variant}`))
  const year = 2026
  const startMonth = rng.int(1, 4)
  const customers: Customer[] = Array.from({ length: rng.int(9, 12) }, (_, i) => ({
    id: i + 1,
    name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
    region: rng.pick(REGIONS),
    signup: `${year - 1}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
  }))
  const orders: Order[] = []
  let orderId = 1000
  for (let m = 0; m < 6; m++) {
    const month = startMonth + m
    const count = rng.int(4, 9)
    for (let i = 0; i < count; i++) {
      // Leave a couple of customers without completed orders.
      const customer = rng.int(1, customers.length - 2)
      const status = rng.chance(0.15) ? 'refunded' : rng.chance(0.1) ? 'pending' : 'completed'
      const amount = rng.chance(0.08) ? null : round2(rng.int(20, 480) + rng.int(0, 99) / 100)
      orders.push({
        id: ++orderId,
        customer,
        date: `${year}-${String(month).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
        amount,
        status,
      })
    }
  }
  // Exact duplicate rows, as a bad export would produce.
  const dupes = rng.shuffle(orders).slice(0, rng.int(3, 6))
  const exported = rng.shuffle([...orders, ...dupes])
  return {
    customers: customers.map((c) => [c.id, c.name, c.region, c.signup]),
    orders: exported.map((o) => [o.id, o.customer, o.date, o.amount, o.status]),
  }
}

/** Completed orders, one row per order_id, with an amount. */
const CLEAN = `clean AS (
  SELECT DISTINCT order_id, customer_id, order_date, amount
  FROM orders WHERE status = 'completed' AND amount IS NOT NULL
)`

const TASKS: SqlTaskDef[] = [
  {
    id: 'revenue',
    stage: 'main',
    ordered: false,
    prompt:
      'Total revenue: the sum of amount over completed orders, counting each order_id once and ignoring orders with no amount. One row, one column named revenue, rounded to 2 decimals.',
    reference: `WITH ${CLEAN} SELECT ROUND(SUM(amount), 2) AS revenue FROM clean`,
  },
  {
    id: 'by-region',
    stage: 'main',
    ordered: true,
    prompt:
      'Revenue by customer region, using the same rules. Columns region and revenue (2 decimals), highest revenue first.',
    reference: `WITH ${CLEAN}
SELECT c.region, ROUND(SUM(o.amount), 2) AS revenue
FROM clean o JOIN customers c ON c.customer_id = o.customer_id
GROUP BY c.region ORDER BY revenue DESC`,
  },
  {
    id: 'growth',
    stage: 'main',
    ordered: true,
    prompt:
      'Monthly revenue and growth. Columns month (YYYY-MM), revenue (2 decimals) and growth_pct: the percentage change from the previous month, rounded to 1 decimal, NULL for the first month. Oldest month first.',
    reference: `WITH ${CLEAN},
monthly AS (SELECT substr(order_date, 1, 7) AS month, SUM(amount) AS revenue FROM clean GROUP BY month)
SELECT month, ROUND(revenue, 2) AS revenue,
  ROUND((revenue - LAG(revenue) OVER (ORDER BY month)) * 100.0 / LAG(revenue) OVER (ORDER BY month), 1) AS growth_pct
FROM monthly ORDER BY month`,
  },
  {
    id: 'inactive',
    stage: 'followup',
    ordered: true,
    prompt:
      'New request: customers with no completed orders at all. Columns customer_id and name, ordered by customer_id.',
    reference: `SELECT customer_id, name FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE status = 'completed')
ORDER BY customer_id`,
  },
]

function instructions(stage: Stage): string[] {
  if (stage === 'main') {
    return [
      'You have the orders and customers tables for a fictional shop. The export is messy: some orders appear twice, some amounts are missing, and refunded or pending orders must not count as revenue.',
      'Write one SELECT query per task. Run them as often as you like; your saved queries are what gets graded.',
      'Your queries will also be run on a second, newer export of the same tables, so compute the answers from the data rather than typing numbers in.',
    ]
  }
  if (stage === 'followup') {
    return [
      'A newer export has arrived with different rows. Your earlier queries will be re-run on it.',
      'There is also one new request below. Your earlier queries are kept; adjust them if they relied on anything specific to the old data.',
    ]
  }
  return ['Answer in your own words, referring to your queries and results.']
}

const EXPLAIN_QUESTIONS = [
  'How did your queries deal with duplicated orders, missing amounts and refunds?',
  'Looking at your results, what is the most important business problem or opportunity, and what would you recommend the shop do?',
]

export const SALES_CLEANUP: SqlChallenge = {
  id: 'sales-cleanup',
  version: 1,
  title: 'Sales cleanup',
  tables: TABLES,
  rows,
  tasks: TASKS,
  instructions,
  explainQuestions: EXPLAIN_QUESTIONS,
}
