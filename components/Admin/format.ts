/** Small formatters and the shared fetch helper for the admin screens. */

export async function adminApi<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include', cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

const UNITS: [limit: number, size: number, name: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'minute'],
  [24 * 60, 60, 'hour'],
  [30 * 24 * 60, 24 * 60, 'day'],
  [365 * 24 * 60, 30 * 24 * 60, 'month'],
  [Infinity, 365 * 24 * 60, 'year'],
]

/** "3 days ago", "just now"; "Never" when there is no date. */
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'Never'
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'Just now'
  const [, size, name] = UNITS.find(([limit]) => minutes < limit)!
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
    -Math.floor(minutes / size),
    name
  )
}

/** "1 person", "3 people". */
export function count(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

const ATTEMPT_STATUS: Record<string, string> = {
  CREATED: 'Not started',
  READY: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Being graded',
  EVALUATING: 'Being graded',
  PENDING_REVIEW: 'Waiting for review',
  FAILED_SYSTEM: 'Grading failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Ran out of time',
}

const ATTEMPT_RESULT: Record<string, string> = {
  PASSED: 'Passed',
  NOT_PASSED: 'Not passed',
  INCONCLUSIVE: 'Inconclusive',
  PENDING_REVIEW: 'Waiting for review',
}

/** An attempt's state in plain words: its result once finished, its stage before that. */
export function attemptOutcome(status: string, result: string | null): string {
  if (status === 'COMPLETED') return (result && ATTEMPT_RESULT[result]) || 'Finished'
  return ATTEMPT_STATUS[status] ?? status
}

const MODES: Record<string, string> = {
  independent: 'Independent',
  ai_assisted: 'AI-assisted',
}

export const modeLabel = (mode: string) => MODES[mode] ?? mode

const CREDENTIAL_STATUS: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
  SUPERSEDED: 'Replaced by a newer one',
}

export const credentialStatus = (status: string) => CREDENTIAL_STATUS[status] ?? status

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  linkedin: 'LinkedIn',
  github: 'GitHub',
}

export const providerName = (id: string) => PROVIDER_NAMES[id] ?? id
