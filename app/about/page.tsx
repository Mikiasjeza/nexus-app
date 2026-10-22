'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Target,
  Shield,
  Globe,
  Zap,
  Users,
  Sparkles,
  Upload,
  Brain,
  BadgeCheck,
  Building2,
} from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import { useUser } from '@/lib/hooks/useUser'

export default function AboutPage() {
  const { user } = useUser()
  const ctaHref = user ? '/dashboard' : '/auth/register'

  return (
    <AppPageShell>
      <div className="page-shell">
        <section className="relative mb-16 md:mb-24">
          <div className="hero-panel p-8 md:p-10">
            <span className="hero-kicker mb-6 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Why Nexus Exists
            </span>
            <h1 className="mb-6 max-w-[14ch] text-4xl font-bold leading-[1.1] tracking-tight text-ink md:mb-8 md:max-w-none md:text-6xl lg:text-7xl">
              About <span className="text-ink">Nexus</span>
            </h1>
            <p className="mb-8 max-w-[42ch] text-base leading-relaxed text-ink-muted md:mb-10 md:text-2xl md:max-w-2xl">
              Building a clearer way to verify, organize, and share skills across the five pillars
              that shape modern work.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['Evidence over claims', 'Portable skill identity', 'Human + AI clarity'].map(
                (item) => (
                  <div key={item} className="insight-card px-4 py-3 text-sm text-ink-muted">
                    {item}
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-line py-16 md:py-24">
          <div className="gradient-border-card p-8 md:p-10">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Our Mission
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-ink-muted">
              We believe that skills should be transparent, verifiable, and portable. In a world
              where traditional credentials often fail to capture real capabilities, Nexus provides
              a new standard for talent verification.
            </p>
            <p className="text-lg leading-relaxed text-ink-muted">
              Using multimodal AI, we evaluate skills through direct evidence—code, videos,
              portfolios, and real project outputs—not just self-reported claims. Nexus organizes
              that proof across five pillars: build, create, explain, lead, and grow. This creates a
              trusted skill identity that works across employers, industries, and countries.
            </p>
          </div>
        </section>

        {/* How verification works — 3-step visual */}
        <section className="border-t border-line py-16 md:py-24">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              How verification works
            </h2>
            <p className="mx-auto max-w-xl text-ink-muted">
              Three steps from skill claim to verified passport.
            </p>
          </div>

          <div className="relative mx-auto max-w-4xl">
            {/* Connector line (desktop) */}
            <div className="absolute left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] top-[2.5rem] hidden h-px md:block" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: '01',
                  icon: Upload,
                  title: 'Upload evidence',
                  description:
                    'Attach code, videos, certificates, or project links as proof of each skill.',
                  color: 'text-verified',
                  border: 'border-verified/40',
                  bg: 'bg-verified-wash',
                },
                {
                  step: '02',
                  icon: Brain,
                  title: 'AI analyzes',
                  description:
                    'Our multimodal AI reviews your evidence, scores capability, and suggests a verified level.',
                  color: 'text-verified',
                  border: 'border-verified/40',
                  bg: 'bg-verified-wash',
                },
                {
                  step: '03',
                  icon: BadgeCheck,
                  title: 'Passport updated',
                  description:
                    'Your verified skill appears in your shareable passport, visible to employers you choose.',
                  color: 'text-critical',
                  border: 'border-critical/40',
                  bg: 'bg-critical/15',
                },
              ].map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.step} className={`insight-card border p-6 ${s.border}`}>
                    <div
                      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <div className="mb-2 text-sm text-ink-faint">{s.step}</div>
                    <h3 className="mb-2 text-lg font-bold tracking-tight text-ink">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">{s.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-line py-16 md:py-24">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Our Values
            </h2>
            <p className="mx-auto max-w-xl text-ink-muted">
              Principles that shape how we verify and present capability.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {[
              {
                icon: Shield,
                title: 'Trust & Transparency',
                description:
                  'Skills backed by concrete evidence, verified through AI analysis. No fluff, just facts.',
              },
              {
                icon: Globe,
                title: 'Universal Standard',
                description:
                  'A portable skill identity that transcends borders, industries, and traditional credentials.',
              },
              {
                icon: Zap,
                title: 'Innovation',
                description:
                  "Pushing the boundaries of what's possible with AI-powered skill verification.",
              },
              {
                icon: Target,
                title: 'Accuracy',
                description:
                  'Multimodal AI evaluation ensures skills are measured by capability, not claims.',
              },
              {
                icon: Users,
                title: 'Empowerment',
                description:
                  'Giving individuals control over their professional identity and career trajectory.',
              },
              {
                icon: ArrowRight,
                title: 'Future-Focused',
                description:
                  'Built for the future of work—remote, global, and skills-based hiring.',
              },
            ].map((value) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="group insight-card p-6 transition-shadow duration-300"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised transition-colors group-hover:border-verified/40 group-hover:bg-verified-wash">
                    <Icon className="h-6 w-6 text-ink" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-ink">{value.title}</h3>
                  <p className="leading-relaxed text-ink-muted">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA section — two buttons: talent + employers */}
        <section className="border-t border-line py-16 md:py-28">
          <div className="gradient-border-card mx-auto max-w-3xl p-10 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Join the revolution
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-ink-muted">
              Start building your verifiable skill passport today and take control of your
              professional identity.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={ctaHref}
                className="button-base button-primary inline-flex min-h-[48px] rounded-xl px-8 py-3 text-sm font-medium"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/employer/signup"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-line-strong px-8 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <Building2 className="h-4 w-4" />
                For employers
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}
