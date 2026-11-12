import { ImageResponse } from 'next/og'
import { MARK_PATH, MARK_VIEWBOX } from './nexus-mark'

/** The mark in white on a black square, as a PNG of the given size. */
export function renderNexusIcon(size: number) {
  const mark = Math.round(size * 0.72)
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0b',
      }}
    >
      <svg width={mark} height={mark} viewBox={MARK_VIEWBOX} fill="#ffffff">
        <path d={MARK_PATH} />
      </svg>
    </div>,
    { width: size, height: size }
  )
}
