/**
 * Geometry for the Nexus mark: an N whose diagonal passes over the left stem
 * and under the right one ("nexus", from nectere: to bind).
 *
 * Every crossing is drawn as a real gap rather than a knockout in the
 * background colour, so the mark works on any ground and in any renderer.
 * Small sizes use heavier strokes and wider gaps so the weave still reads.
 */

export type MarkSegment = { x1: number; y1: number; x2: number; y2: number }

type Variant = {
  stroke: number
  gap: number
  left: number
  right: number
  top: number
  bottom: number
  /** The diagonal runs along y = x from `start` to `end`. */
  start: number
  end: number
}

const VARIANTS: Record<'regular' | 'compact', Variant> = {
  regular: { stroke: 7, gap: 0.74, left: 22, right: 58, top: 6, bottom: 74, start: 12, end: 72 },
  compact: { stroke: 9, gap: 1.51, left: 24, right: 56, top: 8, bottom: 72, start: 12, end: 73 },
}

export const MARK_VIEWBOX = '0 0 80 80'

export function markGeometry(variant: keyof typeof VARIANTS): {
  stroke: number
  segments: MarkSegment[]
} {
  const v = VARIANTS[variant]
  // A round-capped end leaves `gap` of clear space beside the other stroke
  // when its centre sits stroke + gap from that stroke's centre line. The
  // diagonal meets the vertical stems at 45°, so measured along a stem the
  // cut is √2 times longer.
  const along = v.stroke + v.gap
  const clearance = along * Math.SQRT2

  const segments: MarkSegment[] = []
  const line = (x1: number, y1: number, x2: number, y2: number) => segments.push({ x1, y1, x2, y2 })

  // Left stem, cut where the diagonal passes over it.
  if (v.left - clearance > v.top) line(v.left, v.top, v.left, v.left - clearance)
  line(v.left, v.left + clearance, v.left, v.bottom)
  // Right stem, whole: the diagonal passes under it.
  line(v.right, v.top, v.right, v.bottom)
  // Diagonal, cut where it passes under the right stem.
  line(v.start, v.start, v.right - along, v.right - along)
  if (v.right + along < v.end) line(v.right + along, v.right + along, v.end, v.end)

  return { stroke: v.stroke, segments }
}
