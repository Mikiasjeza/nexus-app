'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Upload, Brain, Shield, Share2, CheckCircle2, Sparkles } from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function HowItWorksPage() {
  return (
    <AppPageShell>
      <div className="page-shell">
        <section className="relative mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="hero-panel p-8 md:p-10"
          >
            <span className="hero-kicker mb-6 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Four workflow steps
            </span>
            <h1 className="mb-6 max-w-[13ch] text-4xl font-bold leading-[1.1] tracking-tight text-white md:mb-8 md:max-w-none md:text-6xl lg:text-7xl">
              How it{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
                works
              </span>
            </h1>
            <p className="max-w-[38ch] text-base leading-relaxed text-white/65 md:text-2xl md:max-w-2xl">
              A simple process for turning skills across five pillars into proof you can verify and
              share.
            </p>
          </motion.div>
        </section>

        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease: easing.primary }}
              className="insight-card mb-14 p-5 md:p-6"
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: easing.primary }}
                />
              </div>
              <p className="mt-4 text-sm text-white/65">
                From first skill to shared passport in under 10 minutes.
              </p>
              <p className="mt-2 text-sm text-white/45">
                The four steps below are the workflow. Your skills still roll up into five pillars:
                build, create, explain, lead, and grow.
              </p>
            </motion.div>

            <div className="space-y-10 md:space-y-16">
              {[
                {
                  icon: Upload,
                  title: 'Add Your Skills',
                  description:
                    'Start by adding skills to your passport. Define your proficiency level, add descriptions, and attach evidence of your capabilities.',
                  features: [
                    'Five skill pillars',
                    'Progress tracking',
                    'Evidence attachments',
                    'Notes and descriptions',
                  ],
                },
                {
                  icon: Brain,
                  title: 'AI Verification',
                  description:
                    'Our multimodal AI analyzes your evidence—code repositories, video demonstrations, portfolio pieces, and project outputs—to verify your skills objectively.',
                  features: [
                    'Multimodal analysis',
                    'Evidence-based verification',
                    'Objective assessment',
                    'Transparent results',
                  ],
                },
                {
                  icon: Shield,
                  title: 'Secure & Trusted',
                  description:
                    'Your skills are verified and stored securely. Privacy controls let you choose what to share publicly and what to keep private.',
                  features: [
                    'Secure storage',
                    'Privacy controls',
                    'Verified credentials',
                    'Trust indicators',
                  ],
                },
                {
                  icon: Share2,
                  title: 'Share Your Passport',
                  description:
                    'Generate a shareable link to your public skill passport. Share with employers, collaborators, or clients to showcase your verified capabilities.',
                  features: [
                    'Public profile URL',
                    'Custom branding',
                    'Export capabilities',
                    'Open Graph previews',
                  ],
                },
              ].map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, delay: index * 0.12, ease: easing.primary }}
                    className="gradient-border-card flex flex-col gap-10 p-8 md:flex-row md:items-start md:gap-12 md:p-10"
                  >
                    <div className="shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="mt-4 font-mono text-5xl font-bold text-white/15 md:text-6xl">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:mb-6 md:text-4xl">
                        {step.title}
                      </h2>
                      <p className="mb-8 text-lg leading-relaxed text-white/65">
                        {step.description}
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {step.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300/90" />
                            <span className="text-white/70">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] py-16 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="gradient-border-card mx-auto max-w-3xl p-10 text-center md:p-12"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/60">
              Create your Nexus profile in minutes and start verifying your capabilities.
            </p>
            <Link
              href="/auth/register"
              className="button-base button-primary inline-flex min-h-[48px] rounded-xl px-8 py-3 text-sm font-medium"
            >
              Create your passport
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>
      </div>
    </AppPageShell>
  )
}
