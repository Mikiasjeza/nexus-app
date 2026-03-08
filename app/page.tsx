'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import * as Sentry from '@sentry/nextjs'
import { ArrowRight, Brain, Shield, BarChart3, Users, CheckCircle2, Play, Sparkles } from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import NexusLogo from '@/components/UI/NexusLogo'
import { useRef, useState } from 'react'

// Lazy load heavy hero components for faster initial load
const CursorMesh = dynamic(() => import('@/components/UI/CursorMesh'), {
  ssr: false,
})
const AISignal = dynamic(() => import('@/components/UI/AISignal'), {
  ssr: false,
})
export default function HomePage() {
  const heroRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Parallax and scroll-linked motion
  const yForeground = useTransform(scrollYProgress, [0, 1], [0, -50])
  const yBackground = useTransform(scrollYProgress, [0, 1], [0, -24])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0])
  const scaleHeadline = useTransform(scrollYProgress, [0, 0.6], [1, 0.97])
  const yNexus = useTransform(scrollYProgress, [0, 1], [0, -70])
  const rotateNexus = useTransform(scrollYProgress, [0, 1], [0, -4])
  const [isMarqueePaused, setIsMarqueePaused] = useState(false)
  const testimonials = [
    '“Nexus turned my portfolio into proof.” — Product Designer',
    '“Recruiters finally see evidence, not hype.” — Frontend Engineer',
    '“The AI feedback gave me a real growth path.” — Data Analyst',
    '“My skills feel measurable now, not vague.” — PM',
    '“Best way to show progress over time.” — Developer',
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section - Color pool, parallax, Nexus as focal point */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-14 md:pt-20 overflow-hidden"
      >
        {/* Living color field - bioluminescent and non-generic */}
        <div 
          className="absolute inset-0 pointer-events-none"
          aria-hidden
        >
          <div 
            className="absolute inset-0 opacity-[0.6] dark:opacity-100"
            style={{
              background: 'radial-gradient(ellipse 100% 80% at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
            }}
          />
          <div 
            className="absolute inset-0 opacity-[0.5] dark:opacity-100"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 70% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
            }}
          />
          <div 
            className="absolute inset-0 dark:opacity-100 opacity-0"
            style={{
              background: 'radial-gradient(ellipse 120% 100% at 50% 30%, rgba(99, 102, 241, 0.15) 0%, rgba(30, 27, 75, 0.3) 40%, transparent 70%)',
            }}
          />
          <motion.div
            className="absolute -top-24 -left-16 w-[42rem] h-[42rem] rounded-full opacity-30 dark:opacity-40 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.22) 0%, rgba(93, 63, 211, 0.08) 50%, transparent 75%)',
            }}
            animate={{
              x: [0, 36, -18, 0],
              y: [0, 20, -12, 0],
              scale: [1, 1.08, 0.96, 1],
            }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -right-12 w-[36rem] h-[36rem] rounded-full opacity-20 dark:opacity-35 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 111, 145, 0.2) 0%, rgba(255, 196, 107, 0.1) 45%, transparent 75%)',
            }}
            animate={{
              x: [0, -24, 14, 0],
              y: [0, -18, 10, 0],
              scale: [1, 0.94, 1.06, 1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {/* Interactive Layer - Cursor-reactive background */}
        <CursorMesh />

        {/* AI Signal Layer - Ambient intelligence indicators */}
        <AISignal className="absolute inset-0" />

        {/* Background grid - subtle, moves with scroll */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ y: yBackground as any }}
        >
          <div className="w-full max-w-4xl mx-auto px-6 opacity-[0.06] dark:opacity-[0.08]">
            {/* Abstract grid representing skill system - optimized for performance */}
            <div className="grid grid-cols-8 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square border border-black dark:border-white rounded-sm will-change-transform"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(i * 0.03, 0.6), // Cap max delay for faster initial render
                    ease: easing.primary,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Narrative Layer - One core promise, one focal point */}
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full"
          style={{ y: yForeground as any, opacity: opacity as any, scale: scaleHeadline as any }}
        >
          <div className="max-w-6xl grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
            <motion.div
              className="flex flex-col items-center md:items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: easing.primary }}
            >
              <div className="mb-10 md:mb-14 flex flex-col items-center md:items-start">
                <motion.div
                  className="mb-8"
                  style={{ y: yNexus as any, rotate: rotateNexus as any }}
                  animate={{ y: [0, -3, 0, 2, 0], rotate: [0, 0.6, -0.5, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <NexusLogo size="large" interactive={true} />
                </motion.div>
                <motion.h1
                  className="text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white leading-[1.08] tracking-tight max-w-[13ch] md:max-w-none"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: easing.primary }}
                >
                  What you can do,
                  <br />
                  <span className="bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 dark:from-cyan-300 dark:via-violet-300 dark:to-rose-300 bg-clip-text text-transparent">verified.</span>
                </motion.h1>
              </div>
            </motion.div>

            {/* Single product statement - no secondary explanations */}
            <motion.p
              className="text-base md:text-xl text-black/60 dark:text-white/60 leading-relaxed max-w-[36ch] md:max-w-xl mb-10 md:mb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: easing.primary }}
            >
              A living record of what you can actually do — not what you claim.
            </motion.p>

            {/* Mobile mini demo card */}
            <motion.div
              className="lg:hidden mb-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.42, ease: easing.primary }}
            >
              <div className="relative border border-black/10 dark:border-white/15 bg-white/55 dark:bg-black/55 backdrop-blur-sm p-5 shadow-lg shadow-violet-500/10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-black dark:text-white">Skill Signal Preview</p>
                  <Play className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                </div>
                <div className="space-y-3">
                  {[
                    { skill: 'TypeScript', score: 91, color: 'from-cyan-500 to-blue-500' },
                    { skill: 'React', score: 86, color: 'from-violet-500 to-fuchsia-500' },
                  ].map((item) => (
                    <div key={item.skill} className="border border-black/10 dark:border-white/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-black/75 dark:text-white/75">{item.skill}</p>
                        <p className="text-xs font-semibold text-black dark:text-white">{item.score}%</p>
                      </div>
                      <div className="h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${item.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 0.7, ease: easing.primary }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* One primary action - gradient CTA with micro-interaction */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: easing.primary }}
            >
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ y: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: easing.primary }}
              >
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 dark:from-cyan-400 dark:via-violet-400 dark:to-rose-400 text-white text-sm font-medium shadow-lg shadow-violet-500/25 dark:shadow-violet-500/15 hover:shadow-xl hover:shadow-cyan-500/25 transition-shadow duration-300"
                >
                  Create your passport
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
            </div>

            {/* Interactive mini demo card */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: easing.primary }}
            >
              <motion.div
                className="relative border border-black/10 dark:border-white/15 bg-white/55 dark:bg-black/55 backdrop-blur-sm p-7 shadow-2xl shadow-violet-500/10"
                whileHover={{ y: -6, rotateX: 1.2, rotateY: -1.2 }}
                transition={{ duration: 0.3, ease: easing.primary }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/45 dark:text-white/45">Live demo</p>
                    <h3 className="text-xl font-semibold text-black dark:text-white mt-1">Skill Signal Preview</h3>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 flex items-center justify-center text-white">
                    <Play className="w-4 h-4 ml-[1px]" />
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { skill: 'TypeScript Architecture', score: 91, color: 'from-cyan-500 to-blue-500' },
                    { skill: 'React System Design', score: 86, color: 'from-violet-500 to-fuchsia-500' },
                    { skill: 'API Reliability', score: 88, color: 'from-rose-500 to-orange-400' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.skill}
                      className="border border-black/10 dark:border-white/10 p-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.45 + i * 0.08, ease: easing.primary }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-black/75 dark:text-white/75">{item.skill}</p>
                        <p className="text-sm font-semibold text-black dark:text-white">{item.score}%</p>
                      </div>
                      <div className="h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${item.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 0.8, delay: 0.55 + i * 0.1, ease: easing.primary }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-5 inline-flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300"
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI confidence updates with each new evidence item
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How It Works - three accent cards */}
      <motion.section 
        className="relative py-24 md:py-56 border-t border-black/10 dark:border-white/10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: easing.primary }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-12 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: easing.primary }}
          >
            How it works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Add skills', desc: 'Build your profile with what you know.', accent: 'from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30', border: 'border-l-4 border-l-blue-500' },
              { step: 2, title: 'Attach evidence', desc: 'Links, code, projects. AI analyzes.', accent: 'from-emerald-500/20 to-cyan-500/20 dark:from-emerald-500/30 dark:to-cyan-500/30', border: 'border-l-4 border-l-emerald-500' },
              { step: 3, title: 'Passport grows', desc: 'Verified, portable, always current.', accent: 'from-violet-500/20 to-fuchsia-500/20 dark:from-violet-500/30 dark:to-fuchsia-500/30', border: 'border-l-4 border-l-violet-500' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className={`relative p-6 rounded-xl border border-black/10 dark:border-white/10 bg-gradient-to-br ${item.accent} ${item.border}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: easing.primary }}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: easing.primary } }}
              >
                <span className="text-2xl font-bold text-black/20 dark:text-white/20 mb-4 block">{item.step}</span>
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-black/60 dark:text-white/60">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Proof + momentum section */}
      <motion.section
        className="relative py-20 md:py-28 border-t border-black/10 dark:border-white/10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: easing.primary }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { value: '2.1k+', label: 'Skills tracked' },
              { value: '94%', label: 'Evidence accepted' },
              { value: '4.9/5', label: 'User satisfaction' },
              { value: '24/7', label: 'Passport access' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="border border-black/10 dark:border-white/10 p-6 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: easing.primary }}
              >
                <div className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">{item.value}</div>
                <div className="text-sm mt-2 text-black/60 dark:text-white/60">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Moving testimonial band */}
      <section className="relative py-8 border-t border-black/10 dark:border-white/10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white dark:from-black to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white dark:from-black to-transparent pointer-events-none z-10" />
        <div
          className="marquee-track flex gap-4 whitespace-nowrap"
          style={{ animationPlayState: isMarqueePaused ? 'paused' : 'running' }}
          onMouseEnter={() => setIsMarqueePaused(true)}
          onMouseLeave={() => setIsMarqueePaused(false)}
          onTouchStart={() => setIsMarqueePaused(true)}
          onTouchEnd={() => setIsMarqueePaused(false)}
          onTouchCancel={() => setIsMarqueePaused(false)}
        >
          {[...testimonials, ...testimonials].map((line, i) => (
            <div
              key={`${line}-${i}`}
              className="inline-flex items-center px-4 py-2 border border-black/10 dark:border-white/10 text-sm text-black/65 dark:text-white/70 bg-white/60 dark:bg-black/50"
            >
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* Product depth section */}
      <motion.section
        className="relative py-20 md:py-28 border-t border-black/10 dark:border-white/10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: easing.primary }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-12 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: easing.primary }}
          >
            Built for serious career growth
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI skill validation',
                desc: 'Evidence gets analyzed for depth, consistency, and real-world confidence.',
              },
              {
                icon: Shield,
                title: 'Tamper-resistant records',
                desc: 'Your passport history stays reliable with traceable updates and evidence links.',
              },
              {
                icon: BarChart3,
                title: 'Progress over time',
                desc: 'See growth trends by category, level, and verification signal quality.',
              },
              {
                icon: Users,
                title: 'Shareable with teams',
                desc: 'Use one profile across recruiters, collaborators, and hiring workflows.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="p-7 border border-black/10 dark:border-white/10 bg-gradient-to-br from-white to-black/[0.02] dark:from-white/[0.04] dark:to-white/[0.01]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: easing.primary }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: easing.primary } }}
              >
                <item.icon className="w-5 h-5 text-violet-600 dark:text-violet-300 mb-4" />
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Value comparison section */}
      <motion.section
        className="relative py-20 md:py-28 border-t border-black/10 dark:border-white/10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: easing.primary }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-10 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: easing.primary }}
          >
            Why it feels different
          </motion.h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              className="p-8 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]"
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: easing.primary }}
            >
              <h3 className="text-lg font-semibold text-black dark:text-white mb-5">Traditional profile</h3>
              <ul className="space-y-3 text-sm text-black/60 dark:text-white/60">
                {[
                  'Static bullet points with no confidence signal',
                  'Hard to verify recent progress',
                  'One-size-fits-all presentation',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="p-8 border border-violet-500/30 dark:border-violet-300/35 bg-gradient-to-br from-violet-500/[0.08] to-cyan-500/[0.08]"
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08, ease: easing.primary }}
            >
              <h3 className="text-lg font-semibold text-black dark:text-white mb-5">Nexus passport</h3>
              <ul className="space-y-3 text-sm text-black/70 dark:text-white/75">
                {[
                  'Evidence-backed skills with confidence scores',
                  'Continuous updates from real project proof',
                  'Portable, shareable profile for opportunities',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-[1px] text-violet-700 dark:text-violet-200" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA - gradient accent behind */}
      <motion.section 
        className="relative py-40 md:py-48 border-t border-black/10 dark:border-white/10 overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: easing.primary }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 lg:px-12 text-center">
          <motion.div
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ y: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: easing.primary }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 dark:from-cyan-400 dark:via-violet-400 dark:to-rose-400 text-white text-sm font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-shadow duration-300"
            >
              Create your passport
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={() => {
                throw new Error('Sentry test error from landing page')
              }}
              className="mt-6 text-xs text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 underline"
            >
              Test Sentry (dev only)
            </button>
          )}
        </div>
      </motion.section>
    </div>
  )
}
