'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { useUser } from '@/lib/hooks/useUser'

const STEPS = [
  {
    title: 'Create your company',
    body: 'Sign up on the hiring side and name your company. That’s the whole setup: no candidate profile, no skills passport.',
    details: ['Takes under a minute', 'Public company page', 'Separate from candidate accounts'],
  },
  {
    title: 'Search by proof',
    body: 'Filter people by skill and pillar. Every result shows what they claimed, what Nexus verified, and the evidence and reasons behind it.',
    details: ['Verified first', 'Evidence and AI reasons', 'Only people who opt in'],
  },
  {
    title: 'Keep shortlists',
    body: 'Save candidates into shortlists for each role or team, and come back to them as their verified skills grow.',
    details: ['One per role or team', 'Private to your company', 'Updated as skills are verified'],
  },
  {
    title: 'Post roles',
    body: 'Post a role with the skills it needs. It appears in the candidate marketplace, and Nexus ranks discoverable people against it.',
    details: ['Listed in the marketplace', 'Ranked matches', 'Check any credential in one click'],
  },
]

/** The public page for the hiring side of Nexus. */
export default function EmployersPage() {
  const { user } = useUser()
  const employer = user?.accountType === 'employer'
  const start = employer
    ? { href: '/employer/dashboard', label: 'Go to your hiring dashboard' }
    : user
      ? { href: '/employer/signup', label: 'Set up hiring for your company' }
      : { href: '/auth/register?type=employer', label: 'Create an employer account' }

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Hire on proof,"
          titleContinued="not claims"
          rule
          description="Nexus shows you what people can actually do: skills checked against real evidence, with the reasons in plain language."
          actions={
            <Link href={start.href} className="button-base button-primary min-h-12 px-6 text-base">
              {start.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
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
                <h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] font-medium leading-tight">
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
          aria-labelledby="privacy-heading"
          className="grid gap-8 border-b border-line py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
        >
          <h2 id="privacy-heading" className="text-base font-medium">
            Candidates stay in control
          </h2>
          <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">
            People only appear in your searches if they choose to be discoverable, and they can
            switch it off at any time. Use what you see for hiring, as our Terms set out.
          </p>
        </section>

        <section className="pt-20">
          <h2 className="page-title !text-[clamp(2.5rem,5vw,4.5rem)]">
            Find your first hire
            <span className="title-rule" aria-hidden />
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href={start.href} className="button-base button-primary min-h-12 px-6 text-base">
              {start.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {!user && (
              <Link href="/auth/login" className="text-ink-muted transition-colors hover:text-ink">
                Already hiring on Nexus? Log in
              </Link>
            )}
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}
