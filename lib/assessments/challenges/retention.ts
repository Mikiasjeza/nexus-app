/**
 * SQL / data analytics challenge "Customer retention report". A fictional
 * meal-kit service's customers and orders, with internal test accounts
 * mixed in, hand-typed channel names, duplicated order rows and cancelled
 * orders. The candidate builds signup cohorts, month-1 retention and repeat
 * rates by channel; the follow-up re-runs those queries on a newer export
 * and asks for the lapsed customers.
 *
 * Every dataset is built so each trap changes at least one answer: a query
 * that forgets one of them is marked wrong rather than passing by luck.
 */

import type { SqlTable, Stage } from '../types'
import { createRng, deriveSeed } from '../random'
import type { SqlChallenge, SqlRows, SqlTaskDef } from './sql'

const TABLES: SqlTable[] = [
  {
    name: 'customers',
    columns: [
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'signup_date', type: 'TEXT', note: 'YYYY-MM-DD' },
      { name: 'channel', type: 'TEXT', note: 'typed by hand; spelling and spacing vary' },
      { name: 'is_test', type: 'INTEGER', note: '1 = internal test account' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'order_id', type: 'INTEGER', note: 'can appear more than once' },
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'order_date', type: 'TEXT', note: 'YYYY-MM-DD' },
      { name: 'status', type: 'TEXT', note: "'completed' or 'cancelled'" },
    ],
  },
]

const CHANNELS = ['email', 'referral', 'search', 'social'] as const
const SPELLINGS: Record<(typeof CHANNELS)[number], string[]> = {
  email: ['Email', 'email ', 'EMAIL'],
  referral: ['Referral', ' referral', 'REFERRAL'],
  search: ['Search', 'search ', 'SEARCH'],
  social: ['Social', 'social ', ' Social'],
}

/** Signups run January to May 2026; orders run to the end of June. */
const COHORT_MONTHS = [1, 2, 3, 4, 5]
const LAST_MONTH = 6
/** The lapsed cut-off in the follow-up task. */
const LAPSED_BEFORE = '2026-05-01'

type Customer = { id: number; signup: string; channel: string; test: boolean }
type Order = { customer: number; date: string; status: 'completed' | 'cancelled'; id?: number }

const day = (month: number, d: number) =>
  `2026-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const monthOf = (date: string) => Number(date.slice(5, 7))

function rows(seed: number, variant: 'visible' | 'changed'): SqlRows {
  const rng = createRng(deriveSeed(seed, `retention:${variant}`))
  const customers: Customer[] = []
  const orders: Order[] = []
  const spelled = () => {
    const channel = rng.pick(CHANNELS)
    return rng.chance(0.3) ? rng.pick(SPELLINGS[channel]) : channel
  }

  for (const month of COHORT_MONTHS) {
    for (let i = 0, n = rng.int(4, 7); i < n; i++) {
      const signupDay = rng.int(1, 24)
      const customer: Customer = {
        id: customers.length + 1,
        signup: day(month, signupDay),
        channel: spelled(),
        test: false,
      }
      customers.push(customer)
      if (rng.chance(0.1)) continue // signed up, never ordered
      orders.push({
        customer: customer.id,
        date: day(month, signupDay + rng.int(0, 4)),
        status: 'completed',
      })
      for (let later = month + 1; later <= LAST_MONTH; later++) {
        if (!rng.chance(later === month + 1 ? 0.5 : 0.35)) continue
        orders.push({
          customer: customer.id,
          date: day(later, rng.int(1, 28)),
          status: rng.chance(0.15) ? 'cancelled' : 'completed',
        })
      }
    }
  }

  // Internal test accounts, active enough to change every answer if counted.
  for (let i = 0, n = rng.int(2, 3); i < n; i++) {
    const month = rng.pick([1, 2, 3])
    const customer: Customer = {
      id: customers.length + 1,
      signup: day(month, rng.int(1, 20)),
      channel: rng.pick(CHANNELS),
      test: true,
    }
    customers.push(customer)
    orders.push(
      { customer: customer.id, date: day(month, 25), status: 'completed' },
      { customer: customer.id, date: day(month + 1, rng.int(2, 26)), status: 'completed' }
    )
  }

  const real = customers.filter((c) => !c.test)
  const completed = (id: number) =>
    orders.filter((o) => o.customer === id && o.status === 'completed')
  const nextMonth = (c: Customer) => monthOf(c.signup) + 1

  // At least two hand-typed channel names, so LOWER(TRIM()) matters.
  const tidy = real.filter((c) => c.channel === c.channel.trim().toLowerCase())
  for (const c of rng.shuffle(tidy).slice(0, Math.max(0, 2 - (real.length - tidy.length)))) {
    c.channel = rng.pick(SPELLINGS[c.channel.trim().toLowerCase() as (typeof CHANNELS)[number]])
  }

  // A cancelled order in the month after signup for someone not retained,
  // so ignoring the status inflates retention.
  const notRetained = real.find(
    (c) =>
      nextMonth(c) <= LAST_MONTH && !completed(c.id).some((o) => monthOf(o.date) === nextMonth(c))
  )
  if (notRetained) {
    orders.push({
      customer: notRetained.id,
      date: day(nextMonth(notRetained), 27),
      status: 'cancelled',
    })
  }

  // A lapsed customer with a cancelled order after the cut-off, so ignoring
  // the status hides them from the lapsed list.
  const lapsed = real.find((c) => {
    const done = completed(c.id)
    return done.length > 0 && done.every((o) => o.date < LAPSED_BEFORE)
  })
  if (lapsed) orders.push({ customer: lapsed.id, date: day(LAST_MONTH, 20), status: 'cancelled' })

  // Number the orders, then repeat some rows exactly, as a bad export does.
  // One repeat is a one-time buyer's only order, so counting rows instead of
  // order ids turns them into a repeat customer.
  const numbered = rng.shuffle(orders).map((o, i) => ({ ...o, id: 5001 + i }))
  const oneTime = rng
    .shuffle(real)
    .map((c) => numbered.filter((o) => o.customer === c.id && o.status === 'completed'))
    .find((done) => done.length === 1)
  const dupes = [...(oneTime ?? []), ...rng.shuffle(numbered).slice(0, rng.int(2, 4))]
  const exported = rng.shuffle([...numbered, ...dupes])
  return {
    customers: customers.map((c) => [c.id, c.signup, c.channel, c.test ? 1 : 0]),
    orders: exported.map((o) => [o.id, o.customer, o.date, o.status]),
  }
}

const TASKS: SqlTaskDef[] = [
  {
    id: 'cohorts',
    stage: 'main',
    ordered: true,
    prompt:
      'Signup cohorts: the number of real customers (not test accounts) who signed up in each month. Columns cohort (YYYY-MM) and customers, oldest month first.',
    reference: `SELECT substr(signup_date, 1, 7) AS cohort, COUNT(*) AS customers
FROM customers WHERE is_test = 0
GROUP BY cohort ORDER BY cohort`,
  },
  {
    id: 'retention',
    stage: 'main',
    ordered: true,
    prompt:
      'Month-1 retention: for each signup month, the number of real customers, how many of them placed a completed order in the calendar month after the one they signed up in, and that share as a percentage rounded to 1 decimal. Columns cohort, customers, retained and retention_pct, oldest month first.',
    reference: `WITH real AS (
  SELECT customer_id, substr(signup_date, 1, 7) AS cohort,
    strftime('%Y-%m', signup_date, 'start of month', '+1 month') AS next_month
  FROM customers WHERE is_test = 0
),
kept AS (
  SELECT DISTINCT r.customer_id FROM real r
  JOIN orders o ON o.customer_id = r.customer_id
  WHERE o.status = 'completed' AND substr(o.order_date, 1, 7) = r.next_month
)
SELECT r.cohort, COUNT(*) AS customers, COUNT(k.customer_id) AS retained,
  ROUND(COUNT(k.customer_id) * 100.0 / COUNT(*), 1) AS retention_pct
FROM real r LEFT JOIN kept k ON k.customer_id = r.customer_id
GROUP BY r.cohort ORDER BY r.cohort`,
  },
  {
    id: 'channels',
    stage: 'main',
    ordered: true,
    prompt:
      'Repeat customers by channel: for each acquisition channel, written in lower case without extra spaces, the number of real customers, how many have two or more completed orders, and that share as a percentage rounded to 1 decimal. Columns channel, customers, repeat_customers and repeat_pct, ordered by channel.',
    reference: `WITH real AS (
  SELECT customer_id, LOWER(TRIM(channel)) AS channel FROM customers WHERE is_test = 0
),
done AS (
  SELECT customer_id, COUNT(DISTINCT order_id) AS orders
  FROM orders WHERE status = 'completed' GROUP BY customer_id
)
SELECT r.channel, COUNT(*) AS customers,
  SUM(CASE WHEN d.orders >= 2 THEN 1 ELSE 0 END) AS repeat_customers,
  ROUND(SUM(CASE WHEN d.orders >= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS repeat_pct
FROM real r LEFT JOIN done d ON d.customer_id = r.customer_id
GROUP BY r.channel ORDER BY r.channel`,
  },
  {
    id: 'lapsed',
    stage: 'followup',
    ordered: true,
    prompt: `New request: lapsed customers. Real customers with at least one completed order whose most recent completed order was before ${LAPSED_BEFORE}. Columns customer_id and last_order (YYYY-MM-DD), ordered by customer_id.`,
    reference: `SELECT o.customer_id, MAX(o.order_date) AS last_order
FROM orders o JOIN customers c ON c.customer_id = o.customer_id
WHERE c.is_test = 0 AND o.status = 'completed'
GROUP BY o.customer_id
HAVING MAX(o.order_date) < '${LAPSED_BEFORE}'
ORDER BY o.customer_id`,
  },
]

function instructions(stage: Stage): string[] {
  if (stage === 'main') {
    return [
      'You have the customers and orders tables for Brightbox, a fictional meal-kit delivery service. Customers signed up between January and May 2026; orders run to the end of June.',
      'The export is messy: internal test accounts are mixed in, the channel was typed by hand so its spelling and spacing vary, some orders appear twice, and cancelled orders are not purchases.',
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

export const CUSTOMER_RETENTION: SqlChallenge = {
  id: 'customer-retention',
  version: 1,
  title: 'Customer retention report',
  tables: TABLES,
  rows,
  tasks: TASKS,
  instructions,
  explainQuestions: [
    'How did your queries deal with test accounts, inconsistent channel names, repeated rows and cancelled orders?',
    'Looking at your results, which cohort or channel needs attention first, and what would you recommend Brightbox do?',
  ],
}
