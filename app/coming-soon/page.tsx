import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import NexusLogo from '@/components/UI/NexusLogo'
import Reveal from '@/components/Launch/Reveal'
import Countdown from '@/components/Launch/Countdown'
import WaitlistForm from '@/components/Launch/WaitlistForm'
import { CONSENT_TEXT, recordView } from '@/lib/waitlist'
import { approvedLaunchDate } from '@/lib/prelaunch'

const TITLE = 'Nexus is coming soon'
const DESCRIPTION =
  'Prove what you can do with practical skill assessments, earn an evidence-backed Skill Passport, and find work that fits it. Join the waitlist to hear first.'

export const metadata: Metadata = {
  title: { absolute: 'Nexus | Coming soon' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', url: '/' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const PILLARS = [
  {
    tint: 'bg-lavender',
    title: 'Practical skill assessments',
    body: 'Real tasks, not quizzes. Write and run code, work through scenarios, or submit your own work, and an AI reviewer checks it against a clear rubric.',
  },
  {
    tint: 'bg-sage',
    title: 'An evidence-backed Skill Passport',
    body: 'Every verified skill links to the work behind it, with the reasons for each verdict in plain language. Private until you choose to share it.',
  },
  {
    tint: 'bg-verified',
    title: 'Career opportunities that fit',
    body: 'Set the roles you want and Nexus shows matching jobs, what you already have, and the skills to prove next.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Pick your skills',
    body: 'Choose from five skill pillars, or start from the role you want.',
  },
  {
    n: '02',
    title: 'Prove them',
    body: 'Take a hands-on lab or upload work you have already done.',
  },
  {
    n: '03',
    title: 'Get verified',
    body: 'See what passed, how confident the review was, and what to do next.',
  },
  {
    n: '04',
    title: 'Share and apply',
    body: 'Send one link to employers and track the jobs you go for.',
  },
]

const STATUS: Record<string, { tone: 'ok' | 'warn'; text: string }> = {
  confirmed: { tone: 'ok', text: 'You’re on the list. We’ll email you when Nexus opens.' },
  unsubscribed: { tone: 'ok', text: 'You’ve been unsubscribed. We won’t email you again.' },
  expired: { tone: 'warn', text: 'That link has expired or was already used. Join again below.' },
  slow: { tone: 'warn', text: 'Too many tries. Please wait a few minutes and try again.' },
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp/i

/** Keep a short, safe label for where a visitor came from (utm_source). */
const cleanSource = (v: unknown) =>
  typeof v === 'string' && /^[a-z0-9_.-]{1,60}$/i.test(v) ? v.toLowerCase() : 'direct'

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const ua = (await headers()).get('user-agent') || ''
  if (!BOT.test(ua) && !params.waitlist) await recordView()

  const status = typeof params.waitlist === 'string' ? STATUS[params.waitlist] : undefined
  const source = cleanSource(params.utm_source ?? params.ref)
  const launchDate = approvedLaunchDate()

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <NexusLogo size={40} />
        <Link href="/auth/login" className="text-sm text-ink-muted hover:text-ink">
          Sign in
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10">
          <div className="on-ink grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-14">
            <Reveal>
              <p className="label text-ink-faint">Coming soon</p>
              <h1 className="mt-5 text-[clamp(2.75rem,8vw,5.25rem)] font-medium leading-[0.94] tracking-[-0.055em]">
                Show what you can do. Prove it.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-muted">
                Nexus verifies real skills with hands-on assessments, turns them into a Skill
                Passport backed by evidence, and connects you with work that fits.
              </p>
            </Reveal>
            <Reveal delay={120} className="self-end">
              <div id="waitlist" className="scroll-mt-8">
                <p className="mb-4 font-medium">Be first in when we open.</p>
                {status && (
                  <p
                    role="status"
                    className={`mb-4 border p-4 text-sm ${status.tone === 'ok' ? 'border-verified text-ink' : 'border-line text-ink-muted'}`}
                  >
                    {status.text}
                  </p>
                )}
                <WaitlistForm consentText={CONSENT_TEXT} source={source} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* What Nexus is */}
        <section aria-labelledby="what" className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
          <Reveal>
            <h2
              id="what"
              className="max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-medium leading-[1.02] tracking-[-0.04em]"
            >
              Résumés say what you’ve done. Nexus shows what you can do.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <article className="flex h-full flex-col border border-line">
                  <div className={`${p.tint} h-24`} aria-hidden="true" />
                  <div className="p-5 sm:p-6">
                    <h3 className="text-xl font-medium tracking-tight">{p.title}</h3>
                    <p className="mt-3 text-ink-muted">{p.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <p className="label text-ink-faint">How it works</p>
              <h2
                id="how"
                className="mt-4 text-[clamp(1.9rem,4.5vw,3rem)] font-medium leading-[1.02] tracking-[-0.04em]"
              >
                Four steps from skill to opportunity.
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.n} className="bg-ground">
                  <Reveal delay={i * 80} className="h-full p-5 sm:p-6">
                    <span className="display-number text-3xl text-ink-faint">{s.n}</span>
                    <h3 className="mt-6 text-lg font-medium">{s.title}</h3>
                    <p className="mt-2 text-ink-muted">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Launch announcement */}
        <section aria-labelledby="launch" className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
          <Reveal>
            <div className="border border-line p-6 sm:p-10">
              <p className="label text-ink-faint">Launch</p>
              <h2
                id="launch"
                className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.035em]"
              >
                {launchDate
                  ? `Opening ${launchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.`
                  : 'We’re putting the finishing touches on Nexus.'}
              </h2>
              <p className="mt-4 max-w-2xl text-ink-muted">
                {launchDate
                  ? 'Waitlist members get the first invitations.'
                  : 'Join the waitlist and you’ll be the first to know the date. Launch news only, never spam, and you can unsubscribe at any time.'}
              </p>
              {launchDate && (
                <div className="mt-8 max-w-xl">
                  <Countdown to={launchDate.toISOString()} />
                </div>
              )}
              <a
                href="#waitlist"
                className="button-base button-accent mt-8 inline-flex min-h-12 items-center px-6"
              >
                Join the waitlist
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Nexus</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-ink">
              Cookies
            </Link>
            <Link href="/accessibility" className="hover:text-ink">
              Accessibility
            </Link>
            <Link href="/contact" className="hover:text-ink">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
