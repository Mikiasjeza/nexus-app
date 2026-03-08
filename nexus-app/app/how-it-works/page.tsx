'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Upload, Brain, Shield, Share2, CheckCircle2, Sparkles } from 'lucide-react'
import { easing } from '@/lib/utils/animations'

// MetaLab scroll animation pattern
const metalabScroll = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.primary },
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-20 border-b border-black/10 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
          >
            <span className="inline-flex items-center gap-2 border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Four simple steps
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 md:mb-8 leading-[1.1] tracking-tight max-w-[13ch] md:max-w-none">
              How It Works
            </h1>
            <p className="text-base md:text-2xl text-black/60 dark:text-white/60 leading-relaxed max-w-[38ch]">
              A simple, powerful process for verifying and sharing your skills.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="mb-14 border border-black/10 dark:border-white/10 p-5 bg-white/70 dark:bg-black/45">
            <div className="h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500"
                initial={{ width: '0%' }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: easing.primary }}
              />
            </div>
            <p className="mt-3 text-sm text-black/60 dark:text-white/60">From first skill to shared passport in under 10 minutes.</p>
          </div>
          <div className="space-y-16 md:space-y-32">
            {[
              {
                icon: Upload,
                title: 'Add Your Skills',
                description: 'Start by adding skills to your passport. Define your proficiency level, add descriptions, and attach evidence of your capabilities.',
                features: [
                  'Multiple skill categories',
                  'Progress tracking',
                  'Evidence attachments',
                  'Notes and descriptions',
                ],
              },
              {
                icon: Brain,
                title: 'AI Verification',
                description: 'Our multimodal AI analyzes your evidence—code repositories, video demonstrations, portfolio pieces, and project outputs—to verify your skills objectively.',
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
                description: 'Your skills are verified and stored securely. Privacy controls let you choose what to share publicly and what to keep private.',
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
                description: 'Generate a shareable link to your public skill passport. Share with employers, collaborators, or clients to showcase your verified capabilities.',
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
                  transition={{ duration: 0.8, delay: index * 0.15, ease: easing.primary }}
                  className="flex flex-col md:flex-row gap-12 items-start border border-black/10 dark:border-white/10 bg-gradient-to-br from-white/85 to-black/[0.02] dark:from-white/[0.04] dark:to-white/[0.01] p-8"
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 flex items-center justify-center border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                      <Icon className="w-8 h-8 text-black dark:text-white" />
                    </div>
                    <div className="text-6xl font-bold text-black/10 dark:text-white/10 mt-4">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-6 tracking-tight">
                      {step.title}
                    </h2>
                    <p className="text-lg text-black/60 dark:text-white/60 mb-8 leading-relaxed">
                      {step.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {step.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-black dark:text-white mt-0.5 flex-shrink-0" />
                          <span className="text-black/70 dark:text-white/70">{feature}</span>
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

      {/* CTA */}
      <section className="py-20 md:py-32 border-t border-black/10 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-6 tracking-tight">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-black/60 dark:text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Create your Nexus profile in minutes and start verifying your capabilities.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Create Your Passport
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
