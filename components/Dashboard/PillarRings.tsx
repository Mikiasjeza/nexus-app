'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import { Ring } from '@/components/charts/ring'
import { RingCenter } from '@/components/charts/ring-center'
import { RingChart } from '@/components/charts/ring-chart'
import { PILLAR_RING_COLORS } from './chart-settings'

type Props = {
  pillars: { label: string; claimed: number; verified: number }[]
}

/**
 * Verified out of claimed, one ring per pillar. Render it after data has
 * loaded on the client: the animated centre number does not server-render
 * the same way it hydrates.
 */
export default function PillarRings({ pillars }: Props) {
  const reduce = useReducedMotion()
  const data = useMemo(
    () =>
      pillars.map((pillar, i) => ({
        label: pillar.label,
        value: pillar.verified,
        // A ring needs a non-zero maximum; the legend shows the real count.
        maxValue: Math.max(pillar.claimed, 1),
        claimed: pillar.claimed,
        color: PILLAR_RING_COLORS[i % PILLAR_RING_COLORS.length],
      })),
    [pillars]
  )

  return (
    <div className="mt-6 flex flex-wrap items-center gap-8">
      <RingChart data={data} size={224} strokeWidth={9} ringGap={5} baseInnerRadius={58}>
        {data.map((ring, i) => (
          <Ring key={ring.label} index={i} color={ring.color} animate={!reduce} />
        ))}
        <RingCenter
          defaultLabel="verified"
          valueClassName="display-number text-4xl leading-none"
          labelClassName="mt-1 text-xs text-ink-faint"
        />
      </RingChart>
      <ul className="min-w-[9rem] flex-1 space-y-2 text-sm">
        {data.map((ring) => (
          <li key={ring.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: ring.color }} />
              {ring.label}
            </span>
            <span className="tabular text-ink-muted">
              {ring.claimed === 0 ? 'None claimed' : `${ring.value} of ${ring.claimed}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
