import { MARK_VIEWBOX, markGeometry } from '@/lib/brand/nexus-mark'

type NexusMarkProps = {
  /** Rendered size in px. Below 24px the heavier compact drawing is used. */
  size?: number
  className?: string
  /** Accessible name; omit when the mark sits beside the word "Nexus". */
  title?: string
}

/** The Nexus binding mark, drawn in currentColor. */
export default function NexusMark({ size = 24, className, title }: NexusMarkProps) {
  const { stroke, segments } = markGeometry(size < 24 ? 'compact' : 'regular')
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {segments.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      ))}
    </svg>
  )
}
