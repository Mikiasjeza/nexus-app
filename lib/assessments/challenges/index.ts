/** Every coding challenge by id. Coding assessments draw from this pool. */

import type { CodeChallenge } from './code'
import { LEDGER } from './ledger'
import { LOG_TRIAGE } from './log-triage'
import { REORDER_PLAN } from './reorder-plan'

export const CODE_CHALLENGES: Record<string, CodeChallenge> = {
  [LEDGER.id]: LEDGER,
  [LOG_TRIAGE.id]: LOG_TRIAGE,
  [REORDER_PLAN.id]: REORDER_PLAN,
}

export function codeChallenge(id: string): CodeChallenge {
  const challenge = CODE_CHALLENGES[id]
  if (!challenge) throw new Error(`Unknown coding challenge: ${id}`)
  return challenge
}
