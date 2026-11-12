'use client'

import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import { LABS, type Lab } from '@/lib/assessments/labs'

/** The four things a candidate comes to Nexus for, in the order they meet them. */
const PROMISES = [
  {
    title: 'See what’s verified',
    body: 'Every skill shows whether the AI verified it, how confident it was, and when it last checked.',
  },
  {
    title: 'Know the next step',
    body: 'When a check falls short, it says what proof is missing, so the next thing to do is never a guess.',
  },
  {
    title: 'Trust the result',
    body: 'Each verdict comes with its reasons in plain language. Code links are checked for authorship too.',
  },
  {
    title: 'Share your proof',
    body: 'One link. Employers see your verified skills first, with the work behind each one.',
  },
]

const PROOF_KINDS = [
  {
    name: 'Code',
    detail: 'Repositories and snippets, read for depth, correctness and whose commits they are.',
  },
  { name: 'Video', detail: 'Demos and talks, judged on what you actually show and explain.' },
  {
    name: 'Documents',
    detail: 'Case studies, writing and plans, read for structure and outcomes.',
  },
  { name: 'Audio', detail: 'Recordings of you speaking, teaching or presenting.' },
  { name: 'Projects', detail: 'Live work with your part in it described in your own words.' },
]

// Product facts only; never usage numbers or ratings we can't back up.
const FACTS = [
  { value: '0', label: 'Ad trackers' },
  { value: 'Private', label: 'Until you share it' },
  { value: '1 click', label: 'To export your data' },
  { value: '5', label: 'Skill pillars' },
]

/**
 * One flat colour tile per lab, arranged around the cover: its short caption,
 * where it sits, and which corner the caption takes. Typed by lab, so a new
 * lab can't be added without a tile.
 */
const TILES: Record<Lab, { caption: string; box: string; badge: string }> = {
  'Coding Lab': {
    caption: 'Coding',
    box: 'left-[1.5%] top-[5%] h-[36%] w-[19%] bg-lavender',
    badge: 'bottom-0 right-0',
  },
  'Data Analytics Lab': {
    caption: 'Data analytics',
    box: 'left-[4.5%] top-[50%] h-[30%] w-[12%] bg-sage',
    badge: 'bottom-0 left-0',
  },
  'Finance Lab': {
    caption: 'Finance',
    box: 'left-[15%] bottom-[3%] h-[27%] w-[11%] bg-verified',
    badge: 'bottom-0 left-0',
  },
  'Creative and Design Studio': {
    caption: 'Design',
    box: 'left-[73%] top-[-3%] h-[25%] w-[13%] bg-verified',
    badge: 'bottom-0 right-0',
  },
  'Business Simulation Lab': {
    caption: 'Business',
    box: 'right-[2%] top-[14%] h-[30%] w-[11.5%] bg-lavender',
    badge: 'bottom-0 right-0',
  },
  'Communication Studio': {
    caption: 'Communication',
    box: 'right-[3%] bottom-[7%] h-[38%] w-[16%] bg-sage',
    badge: 'bottom-0 right-0',
  },
}

export default function HomePage() {
  const { user } = useUser()
  const startHref = user ? '/dashboard' : '/auth/register'
  const startLabel = user ? 'Go to your dashboard' : 'Start your passport'

  return (
    <div>
      {/* Cover: the claim on a black block, over a collage of the six labs. */}
      <section className="relative overflow-hidden px-3 py-6 sm:px-5 md:py-10">
        <div aria-hidden className="absolute inset-0 hidden md:block">
          {LABS.map((lab) => (
            <div key={lab} className={`absolute ${TILES[lab].box}`}>
              <span
                className={`label absolute ${TILES[lab].badge} whitespace-nowrap bg-ground px-2 py-1.5 text-[0.6875rem] text-ink`}
              >
                {TILES[lab].caption}
              </span>
            </div>
          ))}
        </div>

        <div className="on-ink relative mx-auto flex min-h-[min(34rem,calc(100vh-7rem))] max-w-[42.5rem] flex-col justify-between gap-12 p-5 sm:p-7">
          <div>
            <h1 className="text-[clamp(2.75rem,8vw,5.25rem)] font-medium leading-[0.94] tracking-[-0.055em]">
              Prove what
              <br />
              you can do.
            </h1>
            <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-snug text-ink">
              Add the skills you have and attach real work. An AI checks whether the work backs up
              the level you claim, and what passes becomes a passport you can send to any employer.
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-center gap-5">
              <Link href={startHref} className="button-base button-accent min-h-12 gap-8 px-4">
                {startLabel} <span aria-hidden>+</span>
              </Link>
              <Link
                href="/how-it-works"
                className="font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
              >
                How it works
              </Link>
            </div>
            <p className="leading-none sm:text-right">
              <span className="block text-[clamp(2.75rem,6vw,4rem)] font-bold tracking-[-0.065em]">
                {LABS.length} labs
              </span>
              <span className="label mt-2 block text-ink-faint">of skill assessments</span>
            </p>
          </div>
        </div>
      </section>

      {/* A check, the way it reads: notes on the left, the sheet on the right. */}
      <section aria-labelledby="promises-heading" className="on-accent bg-lavender">
        <div className="page-shell grid gap-10 !py-14 md:!py-20 lg:grid-cols-12 lg:gap-4">
          <div className="lg:col-span-5">
            <div className="border-t border-ink pt-5">
              <h2 id="promises-heading" className="section-title">
                Built around the proof, <span className="mark mark-white">not the profile.</span>
              </h2>
            </div>
            <ol className="mt-10">
              {PROMISES.map((promise, i) => (
                <li key={promise.title} className="flex gap-4 border-t border-ink py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center border border-ink text-sm font-medium">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[1.375rem] font-medium leading-tight tracking-[-0.03em]">
                      {promise.title}
                    </h3>
                    <p className="mt-1.5 max-w-[26rem] text-[0.9375rem] leading-snug">
                      {promise.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <SampleCheck />
          </div>
        </div>
      </section>

      {/* Pillars and kinds of proof, side by side. */}
      <section aria-labelledby="pillars-heading" className="page-shell !py-14 md:!py-20">
        <div className="section-head">
          <h2 id="pillars-heading" className="section-title">
            Five pillars, checked for <span className="mark">what matters</span> in each.
          </h2>
          <p className="max-w-[24rem] text-[0.9375rem] leading-snug text-ink-muted">
            Every skill sits in one pillar. Attach whatever shows the skill best; files are scanned
            before anything reads them.
          </p>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-4">
          <div>
            <h3 className="label">Pillars</h3>
            <ul className="mt-3 border-t border-ink">
              {SKILL_PILLAR_DETAILS.map((pillar) => (
                <li
                  key={pillar.category}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-line py-3.5 text-[0.9375rem]"
                >
                  <span className="font-medium">{pillar.shortLabel}</span>
                  <span className="text-ink-muted">{pillar.summary}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="label">Kinds of proof</h3>
            <ul className="mt-3 border-t border-ink">
              {PROOF_KINDS.map((kind) => (
                <li
                  key={kind.name}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-line py-3.5 text-[0.9375rem]"
                >
                  <span className="font-medium">{kind.name}</span>
                  <span className="text-ink-muted">{kind.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* A CV against a passport, as an orange slab. */}
      <section aria-labelledby="compare-heading" className="on-accent bg-verified">
        <div className="page-shell !py-14 md:!py-20">
          <div className="border-t border-ink pt-5">
            <h2
              id="compare-heading"
              className="text-[clamp(2.5rem,7vw,6rem)] font-medium leading-[0.94] tracking-[-0.055em]"
            >
              A CV says it.
              <br />A passport shows it.
            </h2>
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-4">
            <ComparisonList
              title="A CV or profile"
              items={[
                'Skills you typed in, with nothing behind them',
                'The same page whether the claim is true or not',
                'Employers left to guess, or to test you from scratch',
              ]}
            />
            <ComparisonList
              title="A Nexus passport"
              items={[
                'Skills checked against real work you attached',
                'A confidence score and the reasons for every verdict',
                'One link that shows verified skills first',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Product facts on sage. */}
      <section aria-label="Product facts" className="on-accent bg-sage">
        <dl className="page-shell grid grid-cols-2 gap-y-8 !py-10 md:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="border-l border-ink pl-4">
              <dt className="sr-only">{fact.label}</dt>
              <dd className="text-[clamp(2rem,4vw,3.25rem)] font-medium leading-none tracking-[-0.055em]">
                {fact.value}
              </dd>
              <dd className="label mt-3">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The close, on black; the footer's wordmark follows straight on. */}
      <section className="on-ink">
        <div className="page-shell !py-14 md:!py-20">
          <div className="section-head !border-line-strong">
            <h2 className="section-title">
              Start with <span className="mark mark-orange">one skill.</span>
            </h2>
            <p className="max-w-[24rem] text-[0.9375rem] leading-snug text-ink-muted">
              It is free to start, and your passport stays private until you share it.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={startHref} className="button-base button-accent min-h-12 gap-8 px-4">
              {startLabel} <span aria-hidden>+</span>
            </Link>
            <Link
              href="/employer/dashboard"
              className="font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
            >
              Hiring? Nexus for employers
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/** A check result the way the Verification page shows it, labelled as a sample. */
function SampleCheck() {
  return (
    <figure className="border border-ink bg-white p-5 text-[#0b0b0b] sm:p-7 lg:sticky lg:top-16">
      <figcaption className="label flex items-center justify-between border-b border-[#0b0b0b] pb-3">
        <span>Sample check</span>
        <span>React · Advanced</span>
      </figcaption>
      <p className="mt-6 flex items-end gap-3">
        <span className="text-[clamp(4rem,9vw,6.5rem)] font-bold leading-[0.8] tracking-[-0.065em]">
          86%
        </span>
        <span className="mark mark-orange mb-1 font-medium">Verified</span>
      </p>
      <p className="mt-6 text-[0.9375rem] leading-snug">
        The repository shows component design, state management and tests across 40 commits, all
        authored by this account. That supports an Advanced claim.
      </p>
      <ul className="mt-6 border-t border-[#0b0b0b] text-sm">
        {[
          ['Evidence', 'GitHub repository'],
          ['Authorship', 'Commits match the account'],
          ['Next step', 'Add a deployed project for Expert'],
        ].map(([label, value]) => (
          <li
            key={label}
            className="flex justify-between gap-4 border-b border-[rgba(11,11,11,0.25)] py-3"
          >
            <span className="label self-center text-[#595959]">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function ComparisonList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="label">{title}</h3>
      <ul className="mt-3 border-t border-ink">
        {items.map((item) => (
          <li
            key={item}
            className="border-b border-ink py-3.5 text-[1.0625rem] font-medium tracking-[-0.02em]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
