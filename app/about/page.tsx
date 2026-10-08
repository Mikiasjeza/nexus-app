'use client'

import { motion } from 'framer-motion'
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
import { easing } from '@/lib/utils/animations'
import AppPageShell from '@/components/Layout/AppPageShell'
import { useUser } from '@/lib/hooks/useUser'

export default function AboutPage() {
  const { user } = useUser()
  const ctaHref = user ? '/dashboard' : '/auth/register'

  return (
    <AppPageShell>
      <div className="page-shell">
        <section className="relative mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="hero-panel p-8 md:p-10"
          >
            <span className="hero-kicker mb-6 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Why Nexus Exists
            </span>
            <h1 className="mb-6 max-w-[14ch] text-4xl font-bold leading-[1.1] tracking-tight text-white md:mb-8 md:max-w-none md:text-6xl lg:text-7xl">
              About{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
                Nexus
              </span>
            </h1>
            <p className="mb-8 max-w-[42ch] text-base leading-relaxed text-white/65 md:mb-10 md:text-2xl md:max-w-2xl">
              Building a clearer way to verify, organize, and share skills across the five pillars
              that shape modern work.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['Evidence over claims', 'Portable skill identity', 'Human + AI clarity'].map(
                (item) => (
                  <div key={item} className="insight-card px-4 py-3 text-sm text-white/72">
                    {item}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </section>

        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.gentle }}
            className="gradient-border-card p-8 md:p-10"
          >
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Our Mission
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-white/65">
              We believe that skills should be transparent, verifiable, and portable. In a world
              where traditional credentials often fail to capture real capabilities, Nexus provides
              a new standard for talent verification.
            </p>
            <p className="text-lg leading-relaxed text-white/65">
              Using multimodal AI, we evaluate skills through direct evidence—code, videos,
              portfolios, and real project outputs—not just self-reported claims. Nexus organizes
              that proof across five pillars: build, create, explain, lead, and grow. This creates a
              trusted skill identity that works across employers, industries, and countries.
            </p>
          </motion.div>
        </section>

        {/* How verification works — 3-step visual */}
        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="mb-14 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              How verification works
            </h2>
            <p className="mx-auto max-w-xl text-white/55">
              Three steps from skill claim to verified passport.
            </p>
          </motion.div>

          <div className="relative mx-auto max-w-4xl">
            {/* Connector line (desktop) */}
            <div className="absolute left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] top-[2.5rem] hidden h-px bg-gradient-to-r from-cyan-500/40 via-violet-500/40 to-rose-500/40 md:block" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: '01',
                  icon: Upload,
                  title: 'Upload evidence',
                  description:
                    'Attach code, videos, certificates, or project links as proof of each skill.',
                  color: 'text-cyan-400',
                  border: 'border-cyan-500/25',
                  bg: 'bg-cyan-500/10',
                },
                {
                  step: '02',
                  icon: Brain,
                  title: 'AI analyzes',
                  description:
                    'Our multimodal AI reviews your evidence, scores capability, and suggests a verified level.',
                  color: 'text-violet-400',
                  border: 'border-violet-500/25',
                  bg: 'bg-violet-500/10',
                },
                {
                  step: '03',
                  icon: BadgeCheck,
                  title: 'Passport updated',
                  description:
                    'Your verified skill appears in your shareable passport, visible to employers you choose.',
                  color: 'text-rose-400',
                  border: 'border-rose-500/25',
                  bg: 'bg-rose-500/10',
                },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: easing.primary }}
                    className={`insight-card border p-6 ${s.border}`}
                  >
                    <div
                      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      {s.step}
                    </div>
                    <h3 className="mb-2 text-lg font-bold tracking-tight text-white">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-white/60">{s.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="mb-14 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Our Values
            </h2>
            <p className="mx-auto max-w-xl text-white/55">
              Principles that shape how we verify and present capability.
            </p>
          </motion.div>

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
            ].map((value, index) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, delay: index * 0.08, ease: easing.primary }}
                  className="group insight-card p-6 transition-shadow duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors group-hover:border-cyan-400/25 group-hover:bg-cyan-500/10">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-white">
                    {value.title}
                  </h3>
                  <p className="leading-relaxed text-white/60">{value.description}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* CTA section — two buttons: talent + employers */}
        <section className="border-t border-white/[0.06] py-16 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="gradient-border-card mx-auto max-w-3xl p-10 text-center md:p-12"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Join the revolution
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/60">
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
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/15 px-8 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <Building2 className="h-4 w-4" />
                For employers
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </AppPageShell>
  )
}
