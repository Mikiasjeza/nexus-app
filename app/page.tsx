'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'

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

export default function HomePage() {
  const { user } = useUser()
  const startHref = user ? '/dashboard' : '/auth/register'

  return (
    <div className="page-shell !pt-0">
      {/* Hero: the claim, and a real-looking check result beside it. */}
      <section className="grid min-h-[calc(100vh-5rem)] items-center gap-16 py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <h1 className="font-display font-extralight leading-[0.98] tracking-[-0.03em] text-[clamp(3.5rem,9vw,8.5rem)]">
            Prove what
            <br />
            you can do.
          </h1>
          <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
            Add the skills you have and attach real work. An AI checks whether the work backs up the
            level you claim, and what passes becomes a passport you can send to any employer.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link href={startHref} className="button-base button-primary min-h-12 px-6 text-base">
              {user ? 'Go to your dashboard' : 'Start your passport'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/how-it-works"
              className="button-base button-secondary min-h-12 px-6 text-base"
            >
              How it works
            </Link>
          </div>
        </div>

        <SampleCheck />
      </section>

      {/* What you get, as an index. */}
      <section aria-labelledby="promises-heading" className="border-t border-line py-24">
        <h2
          id="promises-heading"
          className="page-title max-w-[16ch] !text-[clamp(2.25rem,4.5vw,4rem)]"
        >
          Built around the proof, not the profile.
        </h2>
        <ol className="ruled-list mt-14 border-y border-line">
          {PROMISES.map((promise, i) => (
            <li
              key={promise.title}
              className="grid gap-3 py-8 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-8"
            >
              <span className="display-number text-2xl text-ink-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] font-light leading-tight">
                {promise.title}
              </h3>
              <p className="max-w-[30rem] leading-relaxed text-ink-muted">{promise.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pillars and kinds of proof, side by side. */}
      <section
        aria-labelledby="pillars-heading"
        className="grid gap-16 border-t border-line py-24 lg:grid-cols-2"
      >
        <div>
          <h2 id="pillars-heading" className="text-base font-medium">
            Five pillars
          </h2>
          <p className="mt-2 max-w-[28rem] text-ink-muted">
            Every skill sits in one, and each pillar is checked for what matters in it.
          </p>
          <ul className="ruled-list mt-8 border-y border-line">
            {SKILL_PILLAR_DETAILS.map((pillar) => (
              <li key={pillar.category} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-6 py-5">
                <span className="font-medium">{pillar.shortLabel}</span>
                <span className="text-ink-muted">{pillar.summary}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-medium">Kinds of proof</h2>
          <p className="mt-2 max-w-[28rem] text-ink-muted">
            Attach whatever shows the skill best. Files are scanned before anything reads them.
          </p>
          <ul className="ruled-list mt-8 border-y border-line">
            {PROOF_KINDS.map((kind) => (
              <li key={kind.name} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-6 py-5">
                <span className="font-medium">{kind.name}</span>
                <span className="text-ink-muted">{kind.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* A CV against a passport. */}
      <section aria-labelledby="compare-heading" className="border-t border-line py-24">
        <h2
          id="compare-heading"
          className="page-title max-w-[18ch] !text-[clamp(2.25rem,4.5vw,4rem)]"
        >
          A CV says it. A passport shows it.
        </h2>
        <div className="mt-14 grid gap-12 md:grid-cols-2">
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
            highlight
            items={[
              'Skills checked against real work you attached',
              'A confidence score and the reasons for every verdict',
              'One link that shows verified skills first',
            ]}
          />
        </div>
      </section>

      <section aria-label="Product facts" className="border-y border-line">
        <dl className="grid grid-cols-2 md:grid-cols-4">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              className={`py-10 ${i % 2 === 1 ? 'pl-6 md:pl-8' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i > 0 ? 'md:border-l md:border-line md:pl-8' : ''}`}
            >
              <dt className="sr-only">{fact.label}</dt>
              <dd className="display-number text-[clamp(2.5rem,4vw,3.5rem)] leading-none">
                {fact.value}
              </dd>
              <dd className="mt-3 text-sm text-ink-faint">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-28 md:py-40">
        <h2 className="page-title !text-[clamp(2.75rem,7vw,6rem)]">
          Start with one skill
          <span className="title-rule" aria-hidden />
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href={startHref} className="button-base button-primary min-h-12 px-6 text-base">
            {user ? 'Go to your dashboard' : 'Start your passport'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/employer/dashboard"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            Hiring? Nexus for employers →
          </Link>
        </div>
      </section>
    </div>
  )
}

/** A check result the way the Verification page shows it, labelled as a sample. */
function SampleCheck() {
  return (
    <figure className="rounded-[1.5rem] border border-line p-2">
      <div className="rounded-2xl border border-line bg-raised p-6 shadow-[inset_0_2px_1.5px_rgba(233,228,218,0.08)]">
        <figcaption className="flex items-center justify-between text-sm text-ink-faint">
          <span>Sample check</span>
          <span>React · Advanced</span>
        </figcaption>
        <p className="mt-8 flex items-baseline gap-3">
          <span className="display-number text-score leading-none">86%</span>
          <span className="text-verified">Verified</span>
        </p>
        <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-muted">
          The repository shows component design, state management and tests across 40 commits, all
          authored by this account. That supports an Advanced claim.
        </p>
        <ul className="ruled-list mt-6 border-t border-line text-sm">
          <li className="flex justify-between gap-4 py-3">
            <span className="text-ink-faint">Evidence</span>
            <span>GitHub repository</span>
          </li>
          <li className="flex justify-between gap-4 py-3">
            <span className="text-ink-faint">Authorship</span>
            <span>Commits match the account</span>
          </li>
          <li className="flex justify-between gap-4 py-3">
            <span className="text-ink-faint">Next step</span>
            <span>Add a deployed project for Expert</span>
          </li>
        </ul>
      </div>
    </figure>
  )
}

function ComparisonList({
  title,
  items,
  highlight = false,
}: {
  title: string
  items: string[]
  highlight?: boolean
}) {
  return (
    <div>
      <h3 className={`text-base font-medium ${highlight ? 'text-ink' : 'text-ink-faint'}`}>
        {title}
      </h3>
      <ul className="ruled-list mt-6 border-y border-line">
        {items.map((item) => (
          <li key={item} className={`flex gap-3 py-4 ${highlight ? 'text-ink' : 'text-ink-faint'}`}>
            <span
              aria-hidden
              className={`mt-2 size-1.5 shrink-0 rounded-full ${highlight ? 'bg-verified' : 'bg-ink-faint'}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
