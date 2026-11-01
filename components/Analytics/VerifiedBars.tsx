'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import { Bar } from '@/components/charts/bar'
import { BarChart } from '@/components/charts/bar-chart'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { Grid } from '@/components/charts/grid'
import { ChartTooltip } from '@/components/charts/tooltip'
import { CHART_ENTER_MS } from '@/components/Dashboard/chart-settings'

type Props = {
  /** One bar per group: how many skills are claimed in it and how many are verified. */
  groups: { label: string; claimed: number; verified: number }[]
}

/** Claimed skills per group as stacked bars: verified in orange, the rest in grey. */
export default function VerifiedBars({ groups }: Props) {
  const reduce = useReducedMotion()
  const data = useMemo(
    () =>
      groups.map((group) => ({
        label: group.label,
        verified: group.verified,
        notYet: Math.max(0, group.claimed - group.verified),
      })),
    [groups]
  )

  return (
    <BarChart
      data={data}
      xDataKey="label"
      stacked
      aspectRatio="2 / 1"
      animationDuration={CHART_ENTER_MS}
      margin={{ top: 16, right: 8, bottom: 32, left: 8 }}
      barGap={0.5}
      className="mt-6"
    >
      <Grid horizontal numTicksRows={4} />
      <Bar dataKey="verified" fill="var(--chart-1)" lineCap={3} animate={!reduce} />
      <Bar dataKey="notYet" fill="var(--chart-3)" lineCap={3} animate={!reduce} />
      <BarXAxis />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => [
          { color: 'var(--chart-1)', label: 'Verified', value: Number(point.verified) },
          { color: 'var(--chart-3)', label: 'Not verified yet', value: Number(point.notYet) },
        ]}
      />
    </BarChart>
  )
}
