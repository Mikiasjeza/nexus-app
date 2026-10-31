'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { useUser } from '@/lib/hooks/useUser'

const STEPS = [
  {
    title: 'Attach evidence',
    body: 'Code, videos, documents, recordings or project links: whatever shows the skill best.',
  },
  {
    title: 'The AI checks it',
    body: 'It reads the evidence against the level you claim, checks code authorship, and explains its verdict.',
  },
  {
    title: 'Your passport updates',
    body: 'Verified skills appear on your shareable passport, visible to the employers you choose.',
  },
]

const VALUES = [
  {
    title: 'Evidence over claims',
    body: 'A skill counts when the work shows it. Nothing on a passport is self-asserted without saying so.',
  },
  {
    title: 'Reasons, not scores alone',
    body: 'Every verdict comes with the why, in plain language, so people can trust it or challenge it.',
  },
  {
    title: 'Yours to control',
    body: 'Private until you share it. Export your data any time, delete it whenever you like.',
  },
  {
    title: 'One standard',
    body: 'The same five pillars and the same checks for everyone, across roles, industries and countries.',
  },
  {
    title: 'No tracking',
    body: 'No ad trackers, no selling data, and optional diagnostics stay off unless you turn them on.',
  },
  {
    title: 'Built for skills-based hiring',
    body: 'Employers hire on what people can do; Nexus makes that visible without another test.',
  },
]

export default function AboutPage() {
  const { user } = useUser()
  const startHref = user ? '/dashboard' : '/auth/register'

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="About Nexus"
          rule
          description="A clearer way to prove, organise and share skills across the five pillars that shape modern work."
        />

        <section
          aria-labelledby="mission-heading"
          className="grid gap-8 border-t border-line py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
        >
          <h2 id="mission-heading" className="text-base font-medium">
            Why it exists
          </h2>
          <div className="max-w-[44rem] space-y-6 text-lg leading-relaxed text-ink-muted">
            <p>
              <span className="text-ink">Skills should be visible, checkable and portable.</span>{' '}
              CVs and profiles list what people say they can do; credentials often miss what they
              can actually do.
            </p>
            <p>
              Nexus checks skills against direct evidence (code, videos, documents and real project
              output) and organises the result across five pillars: build, create, explain, lead and
              grow. The outcome is a skill record people can take to any employer.
            </p>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="border-t border-line py-16">
          <h2 id="steps-heading" className="text-base font-medium">
            How verification works
          </h2>
          <ol className="ruled-list mt-8 border-y border-line">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid gap-3 py-8 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-8"
              >
                <span className="display-number text-2xl text-ink-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-tight">
                  {step.title}
                </h3>
                <p className="max-w-[30rem] leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="values-heading" className="border-t border-line py-16">
          <h2 id="values-heading" className="text-base font-medium">
            What we hold to
          </h2>
          <dl className="mt-8 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.title} className="border-t border-line py-6">
                <dt className="font-medium">{value.title}</dt>
                <dd className="mt-2 leading-relaxed text-ink-muted">{value.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-line pt-20">
          <h2 className="page-title !text-[clamp(2.5rem,5vw,4.5rem)]">
            Start with one skill
            <span className="title-rule" aria-hidden />
          </h2>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link href={startHref} className="button-base button-primary min-h-12 px-6 text-base">
              {user ? 'Go to your dashboard' : 'Start your passport'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/employer/signup"
              className="button-base button-secondary min-h-12 px-6 text-base"
            >
              For employers
            </Link>
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}
