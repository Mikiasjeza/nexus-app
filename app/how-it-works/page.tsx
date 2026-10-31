'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { useUser } from '@/lib/hooks/useUser'

const STEPS = [
  {
    title: 'Add your skills',
    body: 'Name a skill, pick the level you’re claiming, and it lands in one of five pillars: build, create, explain, lead or grow.',
    details: ['Five pillars', 'Level you claim', 'Notes and tags'],
  },
  {
    title: 'Attach proof',
    body: 'Add whatever shows the skill: a repository, a recording, a document or a live project, with your part in it in your own words.',
    details: ['Code and repositories', 'Video and audio', 'Documents and projects'],
  },
  {
    title: 'The AI checks it',
    body: 'It reads the proof against your claimed level, checks that code commits are yours, and gives a confidence score with its reasons. If it falls short, it says what’s missing.',
    details: ['Confidence score', 'Plain-language reasons', 'What to add next'],
  },
  {
    title: 'Share your passport',
    body: 'Turn on your public link and send it. Employers see verified skills first, with the evidence behind them. You decide who can find you.',
    details: ['One shareable link', 'Discoverable only if you choose', 'Export any time'],
  },
]

export default function HowItWorksPage() {
  const { user } = useUser()
  const startHref = user ? '/dashboard' : '/auth/register'

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="How it works"
          rule
          description="Four steps from a skill you claim to a skill you can prove."
        />

        <ol className="ruled-list border-y border-line">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="grid gap-6 py-12 lg:grid-cols-[6rem_minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10"
            >
              <span className="display-number text-[clamp(3rem,5vw,4.5rem)] leading-none text-ink-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] font-light leading-tight">
                  {step.title}
                </h2>
                <p className="mt-4 max-w-[36rem] text-lg leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
              <ul className="self-end text-ink-muted lg:border-l lg:border-line lg:pl-8">
                {step.details.map((detail) => (
                  <li key={detail} className="flex gap-3 py-1.5">
                    <span
                      aria-hidden
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-verified"
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section
          aria-labelledby="employers-heading"
          className="grid gap-8 border-b border-line py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
        >
          <h2 id="employers-heading" className="text-base font-medium">
            For employers
          </h2>
          <div>
            <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">
              Search people by verified skill and pillar, see the evidence and the AI’s reasons
              behind each one, and keep shortlists in talent pools. Candidates only appear if they
              choose to be discoverable.
            </p>
            <Link
              href="/employer/dashboard"
              className="mt-6 inline-flex text-ink-muted transition-colors hover:text-ink"
            >
              Nexus for employers →
            </Link>
          </div>
        </section>

        <section className="pt-20">
          <h2 className="page-title !text-[clamp(2.5rem,5vw,4.5rem)]">
            Try it with one skill
            <span className="title-rule" aria-hidden />
          </h2>
          <Link
            href={startHref}
            className="button-base button-primary mt-10 min-h-12 px-6 text-base"
          >
            {user ? 'Go to your dashboard' : 'Start your passport'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </div>
    </AppPageShell>
  )
}
