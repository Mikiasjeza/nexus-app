'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowRight,
  Brain,
  Shield,
  BarChart3,
  Users,
  CheckCircle2,
  Zap,
  Network,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import { useUser } from '@/lib/hooks/useUser'
import { DEMO_SKILL_NODES, DEMO_SKILL_CONNECTIONS, type SkillNode } from '@/components/UI/SkillBrain'
import { useState, useCallback, useRef, type MouseEvent, type ReactNode, type CSSProperties } from 'react'

const SkillBrain = dynamic(
  () => import('@/components/UI/SkillBrain').then(m => ({ default: m.SkillBrain })),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
)

const CATEGORY_COLORS: Record<string, string> = {
  build: '#22d3ee',
  create: '#a78bfa',
  explain: '#34d399',
  lead: '#fbbf24',
  grow: '#f472b6',
}

const TICKER = [
  'AI Skill Validation',
  'Neural Passport',
  'Evidence-Backed',
  'Career-Ready',
  'Tamper-Proof',
  'Live Graph',
  'Multimodal AI',
  'Verified Credentials',
]

function TiltCard({
  children,
  className,
  strength = 8,
  style,
}: {
  children: ReactNode
  className?: string
  strength?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform = `perspective(1000px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg)`
      el.style.transition = 'transform 0.08s linear'
    },
    [strength]
  )

  const handleMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)'
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ willChange: 'transform', ...style }}
    >
      {children}
    </div>
  )
}

const FEATURES = [
  {
    icon: Brain,
    title: 'AI skill validation',
    desc: 'Evidence analyzed for depth, consistency, and real-world confidence across code, video, and project outputs.',
    color: '#22d3ee',
    accent: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.15)',
  },
  {
    icon: Lock,
    title: 'Tamper-resistant records',
    desc: 'Passport history with traceable updates, evidence links, and AI confidence scores.',
    color: '#a78bfa',
    accent: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.15)',
  },
  {
    icon: BarChart3,
    title: 'Progress over time',
    desc: 'Growth trends by pillar, level, and verification signal quality. Gap analysis included.',
    color: '#34d399',
    accent: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.15)',
  },
  {
    icon: Network,
    title: 'Neural skill graph',
    desc: 'Skills connect and reinforce each other. Your graph evolves as you prove new capabilities.',
    color: '#fbbf24',
    accent: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.15)',
  },
  {
    icon: Shield,
    title: 'Verifiable credentials',
    desc: 'Employers validate in seconds. No more guessing — proof is baked in.',
    color: '#f472b6',
    accent: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.15)',
  },
]

export default function HomePage() {
  const { user } = useUser()
  const [activeSkill, setActiveSkill] = useState<SkillNode | null>(null)

  const ctaHref = user ? '/dashboard' : '/auth/register'

  const handleSkillClick = useCallback((skill: SkillNode) => {
    setActiveSkill(prev => (prev?.id === skill.id ? null : skill))
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">

        {/* Conic gradient mesh */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] rounded-full opacity-[0.07] blur-[160px]"
            style={{ background: 'conic-gradient(from 200deg at 50% 50%, #22d3ee, #a78bfa, #f472b6, #22d3ee)' }}
          />
          <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full opacity-[0.04] blur-[100px]"
            style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-12">
          <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.15fr]">

            {/* Left */}
            <div className="flex flex-col justify-center py-16 lg:py-0">

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easing.primary }}
                className="mb-8 inline-flex items-center gap-2 self-start rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-white/50">
                  Skill verification · Live
                </span>
              </motion.div>

              <motion.h1
                className="mb-6 font-black leading-[0.96] tracking-[-0.04em] text-white"
                style={{ fontSize: 'clamp(3.5rem, 9vw, 7rem)' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease: easing.primary }}
              >
                Your skills.
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 50%, #f472b6 100%)' }}
                >
                  Verified.
                </span>
              </motion.h1>

              <motion.p
                className="mb-10 max-w-md text-lg leading-relaxed text-white/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: easing.primary }}
              >
                An AI-powered neural passport — not what you claim, but what you can prove.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: easing.primary }}
              >
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(139,92,246,0.9))',
                    boxShadow: '0 0 32px rgba(34,211,238,0.18)',
                  }}
                >
                  Build your passport
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-7 py-3.5 text-sm font-medium text-white/55 transition-all duration-200 hover:border-white/[0.2] hover:text-white/90"
                >
                  How it works
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>

              {/* Stats divide pattern */}
              <motion.div
                className="mt-14 grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07] pt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: easing.primary }}
              >
                {[
                  { value: '17', label: 'Skills mapped' },
                  { value: '28', label: 'Connections' },
                  { value: '5', label: 'Skill pillars' },
                ].map(stat => (
                  <div key={stat.label} className="pl-6 first:pl-0">
                    <div className="text-3xl font-black tracking-tight text-white">{stat.value}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — 3D SkillBrain */}
            <motion.div
              className="relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.15, ease: easing.primary }}
            >
              <div style={{ perspective: '1400px', width: '100%' }}>
                <motion.div
                  className="relative w-full overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]"
                  initial={{ rotateX: 6, rotateY: -8 }}
                  whileHover={{ rotateX: 0, rotateY: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 50px 150px rgba(0,0,0,0.7)',
                    height: '560px',
                  }}
                >
                  <div className="absolute inset-0">
                    <SkillBrain
                      nodes={DEMO_SKILL_NODES}
                      connections={DEMO_SKILL_CONNECTIONS}
                      onNodeClick={handleSkillClick}
                      className="h-full w-full"
                    />
                  </div>

                  {activeSkill && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-4 left-4 right-4"
                    >
                      <div className="rounded-xl border border-white/[0.1] bg-[rgba(9,9,11,0.88)] px-4 py-2.5 backdrop-blur-md">
                        <p className="text-[12px] font-medium text-white/75">{activeSkill.label}</p>
                      </div>
                    </motion.div>
                  )}

                  {!activeSkill && (
                    <div className="absolute bottom-4 right-4">
                      <span className="text-[10px] tracking-[0.18em] uppercase text-white/20">Hover to explore</span>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Pillar legend */}
              <div className="mt-4 flex flex-wrap gap-4 px-1">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/30">{cat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE TICKER ───────────────────────────────────── */}
      <div
        className="overflow-hidden select-none"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 0' }}
      >
        <div className="marquee-track flex items-center gap-0">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="flex items-center shrink-0">
              <span className="px-8 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">
                {item}
              </span>
              <span className="text-white/10 shrink-0">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES BENTO ───────────────────────────────────── */}
      <section className="relative py-28 md:py-36" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-12">

          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: easing.primary }}
          >
            <div className="mb-4 flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">01</span>
              <div className="h-px w-10 bg-white/[0.08]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">Capabilities</span>
            </div>
            <h2
              className="font-black tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}
            >
              Built for serious
              <br />
              career growth
            </h2>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridAutoRows: '280px' }}>

            {/* Large card */}
            {(() => {
              const HeroIcon = FEATURES[0].icon
              return (
            <motion.div
              className="md:col-span-2 md:row-span-2"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: easing.primary }}
            >
              <TiltCard
                strength={4}
                className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 flex flex-col justify-between overflow-hidden relative"
              >
                {/* Ambient color blob */}
                <div
                  className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-[0.12] blur-[80px]"
                  style={{ background: FEATURES[0].color }}
                />

                <div>
                  <div
                    className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: FEATURES[0].accent, border: `1px solid ${FEATURES[0].border}` }}
                  >
                    <HeroIcon className="h-6 w-6" style={{ color: FEATURES[0].color }} />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{FEATURES[0].title}</h3>
                  <p className="max-w-sm text-base leading-relaxed text-white/45">{FEATURES[0].desc}</p>
                </div>

                {/* Mini progress bar */}
                <div className="space-y-3">
                  {[
                    { label: 'Code analysis', pct: 94 },
                    { label: 'Video evidence', pct: 88 },
                    { label: 'Project output', pct: 91 },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="mb-1 flex justify-between">
                        <span className="text-[11px] text-white/35">{bar.label}</span>
                        <span className="text-[11px] text-white/35">{bar.pct}%</span>
                      </div>
                      <div className="h-px w-full bg-white/[0.06]">
                        <div
                          className="h-px rounded-full"
                          style={{ width: `${bar.pct}%`, background: FEATURES[0].color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TiltCard>
            </motion.div>
              )
            })()}

            {/* Small cards */}
            {FEATURES.slice(1).map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i + 1) * 0.07, ease: easing.primary }}
              >
                <TiltCard
                  strength={10}
                  className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col justify-between overflow-hidden relative"
                >
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-[0.12] blur-[60px]"
                    style={{ background: f.color }}
                  />
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: f.accent, border: `1px solid ${f.border}` }}
                  >
                    <f.icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-white/40">{f.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative py-28 md:py-36" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-5xl px-6 lg:px-12">

          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: easing.primary }}
          >
            <div className="mb-4 flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">02</span>
              <div className="h-px w-10 bg-white/[0.08]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">Process</span>
            </div>
            <h2
              className="font-black tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}
            >
              Three steps
              <br />
              to verified
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Map your skills',
                desc: 'Add skills across the five pillars: build, create, explain, lead, grow.',
                color: '#22d3ee',
                icon: Network,
                accent: 'rgba(34,211,238,0.08)',
                border: 'rgba(34,211,238,0.15)',
              },
              {
                step: '02',
                title: 'Attach evidence',
                desc: 'Code repos, videos, certificates, projects. AI analyzes and scores each one.',
                color: '#a78bfa',
                icon: Zap,
                accent: 'rgba(167,139,250,0.08)',
                border: 'rgba(167,139,250,0.15)',
              },
              {
                step: '03',
                title: 'Passport grows',
                desc: 'Your neural graph updates. Share a verified, live profile with anyone.',
                color: '#f472b6',
                icon: Shield,
                accent: 'rgba(244,114,182,0.08)',
                border: 'rgba(244,114,182,0.15)',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: easing.primary }}
              >
                <TiltCard
                  strength={8}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 h-full"
                >
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-[0.1] blur-[70px]"
                    style={{ background: item.color }}
                  />
                  <div
                    className="mb-6 text-[56px] font-black leading-none tracking-[-0.04em]"
                    style={{ color: `${item.color}0a`, WebkitTextStroke: `1px ${item.color}20` }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: item.accent, border: `1px solid ${item.border}` }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/45">{item.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0 divide-white/[0.06]">
            {[
              // Product facts only; never show usage numbers or ratings we can't back up.
              { value: '0', label: 'Ad trackers' },
              { value: 'Private', label: 'Until you share' },
              { value: '1-click', label: 'Data export' },
              { value: '24/7',  label: 'Passport access' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="px-8 py-12"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <p className="text-5xl font-black tracking-tight text-white">{stat.value}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPARISON ───────────────────────────────────────── */}
      <section className="py-28 md:py-36" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-4xl px-6 lg:px-12">

          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">03</span>
              <div className="h-px w-10 bg-white/[0.08]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">Signal comparison</span>
            </div>
            <h2
              className="font-black tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}
            >
              Why it feels
              <br />
              different
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <motion.div
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25">
                Traditional profile
              </p>
              <ul className="space-y-4">
                {[
                  'Static bullet points with no confidence signal',
                  'Self-reported skills with zero verification',
                  'One-size-fits-all presentation',
                ].map(line => (
                  <li key={line} className="flex items-start gap-3 text-sm text-white/35">
                    <span className="mt-2.5 h-px w-3 flex-shrink-0 bg-white/20" />
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-8"
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">
                Nexus passport
              </p>
              <ul className="space-y-4">
                {[
                  'Evidence-backed skills with AI confidence scores',
                  'Continuous updates from real project proof',
                  'Portable, shareable neural graph for any context',
                ].map(line => (
                  <li key={line} className="flex items-start gap-3 text-sm text-white/75">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-44 md:py-56"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div
            className="h-[600px] w-[600px] rounded-full opacity-[0.07] blur-[120px]"
            style={{ background: 'conic-gradient(from 0deg at 50% 50%, #22d3ee, #a78bfa, #f472b6, #22d3ee)' }}
          />
        </div>

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: easing.primary }}
          >
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25">Get started</p>
            <h2
              className="mb-6 font-black tracking-[-0.04em] text-white"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              Start mapping your{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }}
              >
                neural graph
              </span>
            </h2>
            <p className="mb-10 text-lg text-white/40">
              Every skill node you add becomes part of a living, verifiable record that employers can trust.
            </p>

            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-3 rounded-full px-9 py-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.04]"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.85), rgba(139,92,246,0.85))',
                boxShadow: '0 0 48px rgba(34,211,238,0.14)',
              }}
            >
              Initialize your passport
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
