/**
 * Seeded randomness so each attempt gets its own parameters and datasets,
 * reproducible on the server from the attempt's stored seed (never from the
 * client). mulberry32: small, fast, good enough for test generation.
 */

export type Rng = {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  chance(p: number): boolean
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  return {
    next,
    int,
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle: (items) => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
    chance: (p) => next() < p,
  }
}

/** A fresh 31-bit seed from a cryptographic source, for new attempts. */
export function newSeed(): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] & 0x7fffffff
}

/** Derive an independent stream for one purpose (e.g. the hidden dataset). */
export function deriveSeed(seed: number, label: string): number {
  let h = seed ^ 0x9e3779b9
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x85ebca6b)
    h ^= h >>> 13
  }
  return (h >>> 0) & 0x7fffffff
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
