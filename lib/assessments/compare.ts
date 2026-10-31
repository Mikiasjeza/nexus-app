/**
 * Answer comparison, done on the server (never inside the sandbox) so a
 * candidate's code can't fake a pass by patching the comparison.
 */

const TOLERANCE = 0.005

export function sameValue(actual: unknown, expected: unknown): boolean {
  if (typeof expected === 'number') {
    return typeof actual === 'number' && Math.abs(actual - expected) <= TOLERANCE
  }
  if (expected === null || typeof expected !== 'object') {
    return actual === expected
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, i) => sameValue(actual[i], item))
    )
  }
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false
  const a = actual as Record<string, unknown>
  const e = expected as Record<string, unknown>
  const keys = Object.keys(e)
  return (
    Object.keys(a).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(a, key) && sameValue(a[key], e[key]))
  )
}

/** Result sets: rows compared cell by cell, in order or as a multiset. */
export function sameRows(actual: unknown[][], expected: unknown[][], ordered: boolean): boolean {
  if (actual.length !== expected.length) return false
  const norm = (row: unknown[]) =>
    row.map((cell) => (typeof cell === 'number' ? Math.round(cell * 100) / 100 : cell))
  if (ordered) return expected.every((row, i) => sameValue(norm(actual[i]), norm(row)))
  const remaining = actual.map(norm)
  return expected.every((row) => {
    const target = norm(row)
    const at = remaining.findIndex((candidate) => sameValue(candidate, target))
    if (at < 0) return false
    remaining.splice(at, 1)
    return true
  })
}
