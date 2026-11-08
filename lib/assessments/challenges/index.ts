/**
 * Every challenge by id, one registry per workspace. An assessment lists the
 * challenges it draws from (catalog.ts); each attempt stores the one it got.
 */

import type { CodeChallenge } from './code'
import type { SqlChallenge } from './sql'
import type { WritingChallenge } from './writing'
import { LEDGER } from './ledger'
import { LOG_TRIAGE } from './log-triage'
import { REORDER_PLAN } from './reorder-plan'
import { SALES_CLEANUP } from './sales'
import { CUSTOMER_RETENTION } from './retention'
import { DELAY_EMAIL } from './client-email'
import { EXPANSION_DECISION } from './expansion'
import { LAUNCH_PLAN } from './launch-plan'
import { INTERFACE_COPY } from './interface-copy'

const byId = <T extends { id: string }>(list: T[]): Record<string, T> =>
  Object.fromEntries(list.map((c) => [c.id, c]))

export const CODE_CHALLENGES: Record<string, CodeChallenge> = byId([
  LEDGER,
  LOG_TRIAGE,
  REORDER_PLAN,
])

export const SQL_CHALLENGES: Record<string, SqlChallenge> = byId([
  SALES_CLEANUP,
  CUSTOMER_RETENTION,
])

export const WRITING_CHALLENGES: Record<string, WritingChallenge> = byId([
  DELAY_EMAIL,
  EXPANSION_DECISION,
  LAUNCH_PLAN,
  INTERFACE_COPY,
])

function find<T>(registry: Record<string, T>, kind: string, id: string): T {
  const challenge = registry[id]
  if (!challenge) throw new Error(`Unknown ${kind} challenge: ${id}`)
  return challenge
}

export const codeChallenge = (id: string) => find(CODE_CHALLENGES, 'coding', id)
export const sqlChallenge = (id: string) => find(SQL_CHALLENGES, 'SQL', id)
export const writingChallenge = (id: string) => find(WRITING_CHALLENGES, 'writing', id)

/** Title and version of any challenge, for attempts, results and credentials. */
export function challengeInfo(id: string): { title: string; version: number } | undefined {
  const challenge = CODE_CHALLENGES[id] ?? SQL_CHALLENGES[id] ?? WRITING_CHALLENGES[id]
  return challenge && { title: challenge.title, version: challenge.version }
}
