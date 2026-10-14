'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Sparkles,
  Users,
  Building2,
  Zap,
  Shield,
  Lock,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import { PLAN_INFO, formatPlanPrice } from '@/lib/plans'
import { authApi, billingApi } from '@/lib/api'
import { useToast } from '@/components/UI/ToastProvider'
import type { User } from '@/lib/types'
import AppPageShell from '@/components/Layout/AppPageShell'
import { cn } from '@/lib/utils/cn'

// Prices, features and limits come from lib/plans.ts, the same source Stripe
// checkout and the AI quota use. Don't hard-code plan details here.
const plans = [
  {
    ...PLAN_INFO.free,
    displayPrice: formatPlanPrice(PLAN_INFO.free.price),
    period: 'forever',
    icon: Sparkles,
  },
  {
    ...PLAN_INFO.pro,
    displayPrice: formatPlanPrice(PLAN_INFO.pro.price),
    period: 'month',
    icon: Zap,
  },
  {
    ...PLAN_INFO.enterprise,
    displayPrice: 'Custom',
    period: '',
    icon: Building2,
  },
]

const features = [
  {
    icon: Shield,
    title: 'Evidence-based verification',
    description: 'AI reviews the evidence you submit and explains its score.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    description: 'Nothing is public, or visible to employers, until you turn it on.',
  },
  {
    icon: Users,
    title: 'Career Matching',
    description: 'AI matches your skills with relevant opportunities',
  },
]

const faqs = [
  {
    q: 'How do I cancel?',
    a: 'Go to Settings, then Billing, then Manage Billing, and cancel. No call or email needed. You keep paid features until the end of the period you already paid for, and you won’t be charged again.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Not on paid plans. Instead, the Free plan has no time limit and includes 10 AI verifications every month, so you can try everything before paying.',
  },
  {
    q: 'How does billing work?',
    a: 'Paid plans are billed monthly by card through Stripe, at the price shown here plus any applicable tax. They renew automatically each month until you cancel. We’ll email you at least 30 days before any price change.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade or cancel any time from Settings, then Billing, then Manage Billing.',
  },
]

export default function PricingPage() {
  const { addToast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isSignedIn = !!user && user.id !== 'guest-user'

  const linkButtonClass = (variant: 'primary' | 'outline' = 'primary') =>
    cn(
      'button-base min-h-[48px] w-full rounded-lg px-5 text-base',
      variant === 'primary' ? 'button-primary' : 'button-secondary'
    )

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const handleCheckout = async (planId: 'professional' | 'enterprise') => {
    try {
      setLoadingPlan(planId)
      const { url } = await billingApi.createCheckoutSession(planId)
      window.location.href = url
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="page-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-16"
        >
          <div className="hero-panel p-8 text-center md:p-10">
            <div className="hero-kicker mx-auto mb-6 inline-flex">Flexible pricing</div>
            <h1 className="mx-auto mb-4 max-w-[12ch] text-4xl font-semibold tracking-tight text-white md:mb-6 md:max-w-none md:text-6xl">
              Choose your{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
                plan
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/68 max-w-[42ch] md:max-w-3xl mx-auto">
              Start with the free plan, prove your capabilities, and upgrade when you are ready for
              paid verification and billing features.
            </p>
            <div className="mt-6 text-sm text-white/58">
              {isSignedIn
                ? 'You are signed in. Paid upgrades go straight to secure Stripe checkout.'
                : 'Create an account first, then upgrade when you are ready to start billing.'}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid sm:grid-cols-3 gap-3 mb-10"
        >
          {['Solo builders', 'Growing professionals', 'Hiring teams'].map((item) => (
            <div key={item} className="insight-card px-4 py-3 text-sm text-white/72 text-center">
              {item}
            </div>
          ))}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative"
              >
                <div className="gradient-border-card p-8 h-full">
                  <div className="w-16 h-16 border border-white/10 bg-white/5 flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plan.displayPrice}</span>
                    {plan.period && (
                      <span className="text-white/60">
                        {' '}
                        {plan.period === 'forever' ? 'forever' : `/ ${plan.period}`}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 mb-6">{plan.description}</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/75">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'free' ? (
                    <Link href="/auth/register" className={linkButtonClass('outline')}>
                      Get started free
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  ) : plan.id === 'enterprise' ? (
                    <div className="space-y-3">
                      <Link href="/contact" className={linkButtonClass('outline')}>
                        Contact Sales
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                      <p className="text-xs text-white/45 text-center">
                        Enterprise setup is handled with a custom conversation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {isSignedIn ? (
                        <Button
                          variant="outline"
                          fullWidth
                          size="lg"
                          rightIcon={<ArrowRight className="w-5 h-5" />}
                          onClick={() => handleCheckout('professional')}
                          isLoading={loadingPlan === 'professional'}
                          disabled={loadingPlan !== null}
                        >
                          Subscribe to {plan.name}
                        </Button>
                      ) : (
                        <Link href="/auth/register" className={linkButtonClass('outline')}>
                          Create Account First
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      )}
                      <p className="text-xs leading-relaxed text-white/50">
                        {plan.displayPrice}/month plus applicable tax, billed when you subscribe and
                        renewing monthly until you cancel. Cancel any time in Settings.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">All Plans Include</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="gradient-border-card p-6 text-center">
                  <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-2">
            {faqs.map((item, i) => (
              <div key={i} className="gradient-border-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <h3 className="font-medium text-white">{item.q}</h3>
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-white/55 text-sm leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-16 text-center"
        >
          <div className="gradient-border-card p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-white/60 mb-8">
              Start on the free plan today and upgrade only if you need more AI verifications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <Button
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  onClick={() => handleCheckout('professional')}
                  isLoading={loadingPlan === 'professional'}
                  disabled={loadingPlan !== null}
                >
                  Upgrade to Professional
                </Button>
              ) : (
                <Link
                  href="/auth/register"
                  className="button-base button-primary min-h-[48px] rounded-lg px-5 text-base"
                >
                  Create Your Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <Link
                href="/contact"
                className="button-base button-secondary min-h-[48px] rounded-lg px-5 text-base"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AppPageShell>
  )
}
