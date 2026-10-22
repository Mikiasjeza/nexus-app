'use client'

import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { curveStepAfter } from '@visx/curve'
import { Area, AreaChart } from '@/components/charts/area-chart'
import { Bar } from '@/components/charts/bar'
import { BarChart } from '@/components/charts/bar-chart'
import { BarYAxis } from '@/components/charts/bar-y-axis'
import { Grid } from '@/components/charts/grid'
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from '@/components/charts/heatmap'
import { Ring } from '@/components/charts/ring'
import { RingCenter } from '@/components/charts/ring-center'
import { RingChart } from '@/components/charts/ring-chart'
import { ChartTooltip } from '@/components/charts/tooltip'
import { XAxis } from '@/components/charts/x-axis'
import { YAxis } from '@/components/charts/y-axis'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import {
  activityCalendar,
  CONFIDENCE_BY_SKILL,
  CONFIDENCE_OVER_TIME,
  NEXT_STEP,
  OTHER_STEPS,
  PILLARS,
  RECENT_CHECKS,
  SKILLS,
  TODAY,
  VERIFIED_OVER_TIME,
  type SampleSkill,
} from './sample-data'

/** One enter timing for every chart on the dashboard; quicker than Bklit's 1100ms default. */
const ENTER_MS = 600

/** Violet ladder for the pillar rings: verified is the only colour in the world. */
const RING_COLORS = ['#8b7bff', '#a396ff', '#b9b0ff', '#d0caff', '#e6e3ff']

const LAYOUTS = [
  { id: 'next', label: '1 · Next step first' },
  { id: 'index', label: '2 · Passport index' },
  { id: 'desk', label: '3 · Split desk' },
] as const

type LayoutId = (typeof LAYOUTS)[number]['id']

export default function DashboardPreview() {
  const [layout, setLayout] = useState<LayoutId>('next')

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dashboard layout">
          {LAYOUTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="pill"
              aria-pressed={layout === option.id}
              onClick={() => setLayout(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-faint">
          Preview with sample data. Hover the charts; pick a layout and it becomes the real
          dashboard.
        </p>
      </div>

      {layout === 'next' && <NextStepFirst />}
      {layout === 'index' && <PassportIndex />}
      {layout === 'desk' && <SplitDesk />}
    </div>
  )
}

/* ── Layout 1: the one thing to do now, then where you stand ───────────── */

function NextStepFirst() {
  const verifiedCount = SKILLS.filter((s) => s.status === 'verified').length

  return (
    <>
      <PageHeader
        title={`Add proof to ${NEXT_STEP.skill}`}
        rule
        description={
          <>
            <span className="text-ink">{NEXT_STEP.action}.</span> {NEXT_STEP.reason}
          </>
        }
        actions={
          <>
            <Button>Add proof</Button>
            <Button variant="secondary">Not now</Button>
          </>
        }
      />

      <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
        <section aria-labelledby="verified-heading">
          <SectionHeading id="verified-heading" note="Last 12 weeks">
            Verified skills
          </SectionHeading>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="display-number text-[4.5rem] leading-none">{verifiedCount}</span>
            <span className="text-ink-muted">of {SKILLS.length} skills</span>
          </p>
          <VerifiedGrowthChart />
        </section>

        <section aria-labelledby="pillars-heading">
          <SectionHeading id="pillars-heading" note="Verified out of claimed">
            By pillar
          </SectionHeading>
          <PillarRings />
        </section>

        <section aria-labelledby="recent-heading">
          <SectionHeading id="recent-heading">Recent checks</SectionHeading>
          <RecentChecks />
        </section>
      </div>

      <section aria-labelledby="activity-heading" className="mt-16 border-t border-line pt-10">
        <SectionHeading id="activity-heading" note="Checks run and proof added">
          Activity
        </SectionHeading>
        <ActivityHeatmap weeks={52} />
      </section>
    </>
  )
}

/* ── Layout 2: every skill as a ruled row ──────────────────────────────── */

function PassportIndex() {
  const verifiedCount = SKILLS.filter((s) => s.status === 'verified').length

  return (
    <>
      <PageHeader
        title="Your skills"
        rule
        description={`${verifiedCount} of ${SKILLS.length} verified. Employers see verified skills first; the rest show as claimed.`}
        actions={
          <>
            <Button>Add a skill</Button>
            <Button variant="secondary">View public passport</Button>
          </>
        }
      />

      <div
        className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] gap-6 border-t border-line pb-3 pt-4 text-sm text-ink-faint md:grid"
        aria-hidden
      >
        <span>Skill</span>
        <span>Pillar</span>
        <span>Level</span>
        <span>Confidence over time</span>
        <span className="text-right">Result</span>
      </div>
      <ul className="ruled-list border-y border-line">
        {SKILLS.map((skill) => (
          <li
            key={skill.name}
            className="grid grid-cols-2 items-center gap-x-6 gap-y-3 py-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)]"
          >
            <span className="col-span-2 font-display text-4xl font-light leading-none md:col-span-1">
              {skill.name}
            </span>
            <span className="text-ink-muted">{skill.pillar}</span>
            <span className="text-ink-muted">{skill.level}</span>
            <span className="col-span-2 md:col-span-1">
              <SkillSparkline skill={skill} />
            </span>
            <span className="col-span-2 md:col-span-1 md:text-right">
              <SkillResult skill={skill} />
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="confidence-heading">
          <SectionHeading id="confidence-heading" note="Latest check per skill">
            AI confidence
          </SectionHeading>
          <ConfidenceBars />
        </section>
        <section aria-labelledby="activity-heading-2">
          <SectionHeading id="activity-heading-2" note="Checks run and proof added">
            Activity
          </SectionHeading>
          <ActivityHeatmap />
        </section>
      </div>
    </>
  )
}

/* ── Layout 3: to-do on the left, what happened on the right ───────────── */

function SplitDesk() {
  const steps = [{ skill: NEXT_STEP.skill, action: NEXT_STEP.action }, ...OTHER_STEPS]

  return (
    <>
      <PageHeader
        title="Dashboard"
        rule
        description="What to do next on the left, what the AI found on the right."
      />

      <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-10">
          <section aria-labelledby="todo-heading">
            <SectionHeading id="todo-heading">To do</SectionHeading>
            <ol className="ruled-list mt-4 border-y border-line">
              {steps.map((step, i) => (
                <li key={step.skill} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-5">
                  <span className="display-number text-2xl leading-none text-ink-faint">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.skill}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.action}.</p>
                    <button type="button" className="pill mt-3">
                      {i === 0 ? 'Add proof' : 'Start'}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="stand-heading" className="mt-12">
            <SectionHeading id="stand-heading" note="Verified out of claimed">
              Where you stand
            </SectionHeading>
            <PillarRings />
          </section>
        </div>

        <div className="lg:pl-10">
          <section aria-labelledby="trend-heading">
            <SectionHeading id="trend-heading" note="Average per week, last 12 weeks">
              AI confidence
            </SectionHeading>
            <ConfidenceTrendChart />
          </section>

          <section aria-labelledby="activity-heading-3" className="mt-12">
            <SectionHeading id="activity-heading-3" note="Checks run and proof added">
              Activity
            </SectionHeading>
            <ActivityHeatmap />
          </section>

          <section aria-labelledby="recent-heading-3" className="mt-12">
            <SectionHeading id="recent-heading-3">Recent checks</SectionHeading>
            <RecentChecks />
          </section>
        </div>
      </div>
    </>
  )
}

/* ── Shared pieces ─────────────────────────────────────────────────────── */

function SectionHeading({
  id,
  note,
  children,
}: {
  id: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-base font-medium">
        {children}
      </h2>
      {note && <span className="text-sm text-ink-faint">{note}</span>}
    </div>
  )
}

function VerifiedGrowthChart() {
  const reduce = useReducedMotion()
  return (
    <AreaChart
      data={VERIFIED_OVER_TIME}
      aspectRatio="2 / 1"
      animationDuration={ENTER_MS}
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

function ConfidenceTrendChart() {
  const reduce = useReducedMotion()
  return (
    <AreaChart
      data={CONFIDENCE_OVER_TIME}
      aspectRatio="5 / 2"
      animationDuration={ENTER_MS}
      margin={{ top: 16, right: 8, bottom: 28, left: 36 }}
      className="mt-6"
    >
      <Grid horizontal numTicksRows={4} />
      <Area
        dataKey="confidence"
        fill="var(--chart-1)"
        fillOpacity={0.28}
        strokeWidth={1.5}
        animate={!reduce}
      />
      <YAxis numTicks={4} formatValue={(v) => (v === 0 ? '' : `${v}%`)} />
      <XAxis numTicks={4} />
      <ChartTooltip
        rows={(point) => [
          { color: 'var(--chart-1)', label: 'Average confidence', value: `${point.confidence}%` },
        ]}
      />
    </AreaChart>
  )
}

function PillarRings() {
  const data = useMemo(() => PILLARS.map((pillar, i) => ({ ...pillar, color: RING_COLORS[i] })), [])
  const reduce = useReducedMotion()
  // NumberFlow in the ring centre renders differently on the server, so the
  // ring mounts after hydration. Live dashboard data arrives client-side anyway.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="mt-6 flex flex-wrap items-center gap-8">
      {!mounted ? (
        <div className="size-[224px]" aria-hidden />
      ) : (
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
      )}
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

function ConfidenceBars() {
  const reduce = useReducedMotion()
  return (
    <BarChart
      data={CONFIDENCE_BY_SKILL}
      xDataKey="skill"
      orientation="horizontal"
      stacked
      aspectRatio="8 / 5"
      animationDuration={ENTER_MS}
      margin={{ top: 8, right: 16, bottom: 8, left: 80 }}
      barGap={0.45}
      className="mt-6"
    >
      <Grid vertical numTicksColumns={4} />
      <Bar dataKey="verified" fill="var(--chart-1)" lineCap={3} animate={!reduce} />
      <Bar dataKey="notYet" fill="var(--chart-3)" lineCap={3} animate={!reduce} />
      <BarYAxis />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => {
          const verified = Number(point.verified)
          return [
            verified > 0
              ? { color: 'var(--chart-1)', label: 'Verified', value: `${verified}%` }
              : { color: 'var(--chart-3)', label: 'Not yet', value: `${Number(point.notYet)}%` },
          ]
        }}
      />
    </BarChart>
  )
}

function ActivityHeatmap({ weeks = 26 }: { weeks?: number }) {
  // A year of weeks shrinks to unreadable cells on a phone; show four months there.
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const shownWeeks = narrow ? Math.min(weeks, 17) : weeks
  const { columns, domain } = useMemo(() => activityCalendar(shownWeeks), [shownWeeks])
  return (
    <div className="mt-6">
      <HeatmapChart data={columns} xDomain={domain} gap={3} animationDuration={700}>
        <HeatmapCells cornerRadius={2} hideGhostCells />
        <HeatmapXAxis />
        <HeatmapYAxis />
        <HeatmapTooltip
          formatLabel={(count) =>
            count === 0 ? 'Nothing that day' : `${count} ${count === 1 ? 'action' : 'actions'}`
          }
        />
      </HeatmapChart>
    </div>
  )
}

function RecentChecks() {
  return (
    <ul className="ruled-list mt-4 border-y border-line">
      {RECENT_CHECKS.map((check) => (
        <li
          key={`${check.skill}-${check.when}`}
          className="flex items-baseline justify-between gap-4 py-4"
        >
          <span>
            <span className="font-medium">{check.skill}</span>
            <span
              className={`ml-2 text-sm ${check.result === 'Verified' ? 'text-verified-ink' : 'text-ink-muted'}`}
            >
              {check.result}
            </span>
          </span>
          <span className="tabular text-sm text-ink-faint">
            {check.confidence}% · {check.when}
          </span>
        </li>
      ))}
    </ul>
  )
}

function SkillSparkline({ skill }: { skill: SampleSkill }) {
  const reduce = useReducedMotion()
  const data = useMemo(
    () =>
      skill.history.map((confidence, i) => ({
        date: new Date(TODAY.getTime() - (skill.history.length - 1 - i) * 14 * 86_400_000),
        confidence,
      })),
    [skill.history]
  )

  if (data.length < 2) {
    return (
      <span className="text-sm text-ink-faint">
        {data.length === 1 ? 'One check so far' : 'No checks yet'}
      </span>
    )
  }

  const stroke = skill.status === 'verified' ? 'var(--chart-1)' : 'var(--chart-3)'
  return (
    <AreaChart
      data={data}
      aspectRatio="4 / 1"
      animationDuration={ENTER_MS}
      margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
    >
      <Area
        dataKey="confidence"
        fill={stroke}
        fillOpacity={0.22}
        strokeWidth={1.5}
        showHighlight={false}
        showMarkers
        markers={{ radius: 2.5, fill: stroke, strokeWidth: 0, outlineWidth: 0 }}
        animate={!reduce}
      />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => [{ color: stroke, label: 'Confidence', value: `${point.confidence}%` }]}
      />
    </AreaChart>
  )
}

function SkillResult({ skill }: { skill: SampleSkill }) {
  if (skill.status === 'unchecked') {
    return (
      <button type="button" className="pill">
        Run first check
      </button>
    )
  }
  const verified = skill.status === 'verified'
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="display-number text-3xl leading-none">{skill.confidence}%</span>
      <span className={`text-sm ${verified ? 'text-verified-ink' : 'text-ink-muted'}`}>
        {verified ? 'Verified' : 'Not yet'}
      </span>
    </span>
  )
}
