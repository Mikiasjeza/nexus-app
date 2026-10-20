import { ImageResponse } from 'next/og'
import { MARK_VIEWBOX, markGeometry } from './nexus-mark'

/** The mark in white on a black rounded square, as a PNG of the given size. */
export function renderNexusIcon(size: number, { rounded = true } = {}) {
  const { stroke, segments } = markGeometry(size < 64 ? 'compact' : 'regular')
  const mark = Math.round(size * 0.68)
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
      }}
    >
      <svg
        width={mark}
        height={mark}
        viewBox={MARK_VIEWBOX}
        fill="none"
        stroke="#ffffff"
        strokeWidth={stroke}
        strokeLinecap="round"
      >
        {segments.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </svg>
    </div>,
    { width: size, height: size }
  )
}
