'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Target, Shield, Globe, Zap, Users, Sparkles } from 'lucide-react'
import { easing } from '@/lib/utils/animations'

// MetaLab scroll animation pattern
const metalabScroll = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.primary },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
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
              Why Nexus Exists
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 md:mb-8 leading-[1.1] tracking-tight max-w-[14ch] md:max-w-none">
              About Nexus
            </h1>
            <p className="text-base md:text-2xl text-black/60 dark:text-white/60 leading-relaxed mb-8 md:mb-12 max-w-[42ch]">
              Revolutionizing how skills are verified, shared, and understood in the modern workplace.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: easing.primary }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {[
              'Evidence over claims',
              'Portable skill identity',
              'Human + AI clarity',
            ].map((item) => (
              <div key={item} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 px-4 py-3 text-sm text-black/70 dark:text-white/70">
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-32 border-b border-black/10 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.gentle }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-6 tracking-tight">
              Our Mission
            </h2>
            <p className="text-lg text-black/60 dark:text-white/60 leading-relaxed mb-6">
              We believe that skills should be transparent, verifiable, and portable. In a world where traditional credentials often fail to capture real capabilities, Nexus provides a new standard for talent verification.
            </p>
            <p className="text-lg text-black/60 dark:text-white/60 leading-relaxed">
              Using multimodal AI, we evaluate skills through direct evidence—code, videos, portfolios, and real project outputs—not just self-reported claims. This creates a trusted, universal skill identity that works across employers, industries, and countries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-32 border-b border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
            className="mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4 tracking-tight text-center">
              Our Values
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: Shield,
                title: 'Trust & Transparency',
                description: 'Skills backed by concrete evidence, verified through AI analysis. No fluff, just facts.',
              },
              {
                icon: Globe,
                title: 'Universal Standard',
                description: 'A portable skill identity that transcends borders, industries, and traditional credentials.',
              },
              {
                icon: Zap,
                title: 'Innovation',
                description: 'Pushing the boundaries of what&apos;s possible with AI-powered skill verification.',
              },
              {
                icon: Target,
                title: 'Accuracy',
                description: 'Multimodal AI evaluation ensures skills are measured by capability, not claims.',
              },
              {
                icon: Users,
                title: 'Empowerment',
                description: 'Giving individuals control over their professional identity and career trajectory.',
              },
              {
                icon: ArrowRight,
                title: 'Future-Focused',
                description: 'Built for the future of work—remote, global, and skills-based hiring.',
              },
            ].map((value, index) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: easing.primary }}
                  className="group border border-black/10 dark:border-white/10 p-6 bg-gradient-to-br from-white/80 to-black/[0.02] dark:from-white/[0.05] dark:to-white/[0.01]"
                >
                  <div className="w-12 h-12 mb-6 flex items-center justify-center border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 group-hover:bg-black dark:group-hover:bg-white transition-colors">
                    <Icon className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-black dark:text-white mb-3 tracking-tight">
                    {value.title}
                  </h3>
                  <p className="text-black/60 dark:text-white/60 leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: easing.primary }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-6 tracking-tight">
              Join the Revolution
            </h2>
            <p className="text-lg text-black/60 dark:text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Start building your verifiable skill passport today and take control of your professional identity.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
