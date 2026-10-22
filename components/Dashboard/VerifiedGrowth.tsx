'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import { curveStepAfter } from '@visx/curve'
import { Area, AreaChart } from '@/components/charts/area-chart'
import { Grid } from '@/components/charts/grid'
import { ChartTooltip } from '@/components/charts/tooltip'
import { XAxis } from '@/components/charts/x-axis'
import { CHART_ENTER_MS } from './chart-settings'

type Props = {
  points: { date: string; verified: number }[]
}

/** Verified skills at the end of each week. Steps, because the count only moves on a check. */
export default function VerifiedGrowth({ points }: Props) {
  const reduce = useReducedMotion()
  const data = useMemo(
    () => points.map((point) => ({ date: new Date(point.date), verified: point.verified })),
    [points]
  )

  return (
    <AreaChart
      data={data}
      aspectRatio="2 / 1"
      animationDuration={CHART_ENTER_MS}
      margin={{ top: 16, right: 8, bottom: 28, left: 8 }}
      className="mt-6"
    >
      <Grid horizontal numTicksRows={4} />
      <Area
        dataKey="verified"
        fill="var(--chart-1)"
        fillOpacity={0.28}
        strokeWidth={1.5}
        curve={curveStepAfter}
        animate={!reduce}
      />
      <XAxis numTicks={3} />
      <ChartTooltip
        rows={(point) => [
          { color: 'var(--chart-1)', label: 'Verified skills', value: Number(point.verified) },
        ]}
      />
    </AreaChart>
  )
}
