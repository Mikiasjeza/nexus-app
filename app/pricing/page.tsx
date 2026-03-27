'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Users, Building2, Zap, Shield, Globe, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { authApi, billingApi } from '@/lib/api'
import { useToast } from '@/components/UI/ToastProvider'
import type { User } from '@/lib/types'

const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for individuals exploring skill verification',
    icon: Sparkles,
    features: [
      'Up to 10 skills verified',
      'Basic AI analysis',
      'Public Nexus profile',
      'Skill progress tracking',
      'Analytics dashboard',
      'Email support',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$29',
    period: 'per month',
    description: 'For professionals building their skill portfolio',
    icon: Zap,
    features: [
      'Unlimited skills verified',
      'Advanced AI analysis',
      'Priority verification processing',
      'Detailed skill insights',
      'Career matching',
      'Export to PDF/Resume',
      'Priority email support',
      'Skill recommendations',
    ],
    cta: 'Start Free Trial',
    popular: true,
    savings: 'Save 20% annually',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For teams and organizations',
    icon: Building2,
    features: [
      'Everything in Professional',
      'Team management dashboard',
      'Bulk skill verification',
      'Custom AI models',
      'API access',
      'White-label options',
      'Dedicated account manager',
      'SLA guarantees',
      'Advanced analytics',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const features = [
  {
    icon: Shield,
    title: 'AI-Powered Verification',
    description: 'Multimodal AI analyzes video, code, audio, and documents',
  },
  {
    icon: Globe,
    title: 'Global Recognition',
    description: 'Verified skills accepted worldwide by employers',
  },
  {
    icon: Users,
    title: 'Career Matching',
    description: 'AI matches your skills with relevant opportunities',
  },
]

export default function PricingPage() {
  const { addToast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const isSignedIn = !!user && user.id !== 'guest-user'

  useEffect(() => {
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null))
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
    <div className="aurora-shell min-h-screen bg-black">
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
          <div className="hero-panel p-8 md:p-10 text-center">
            <Badge variant="primary" size="lg" className="mb-4">
              Flexible Pricing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight max-w-[12ch] md:max-w-none mx-auto">
              Choose Your Plan
            </h1>
            <p className="text-base md:text-lg text-white/68 max-w-[42ch] md:max-w-3xl mx-auto">
              Start with the free plan, prove your capabilities, and upgrade when you are ready for paid verification and billing features.
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
          {[
            'Solo builders',
            'Growing professionals',
            'Hiring teams',
          ].map((item) => (
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
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge variant="primary" size="sm">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className={`gradient-border-card p-8 h-full ${plan.popular ? 'ring-1 ring-cyan-300/30' : ''}`}>
                  <div className="w-16 h-16 border border-white/10 bg-white/5 flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period !== 'forever' && plan.period !== 'pricing' && (
                      <span className="text-white/60">/{plan.period}</span>
                    )}
                  </div>
                  {plan.savings && (
                    <Badge variant="default" size="sm" className="mb-4">
                      {plan.savings}
                    </Badge>
                  )}
                  <p className="text-white/60 mb-6">{plan.description}</p>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                        <span className="text-white">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'free' ? (
                    <Link href="/auth/register">
                      <Button
                        variant={plan.popular ? 'primary' : 'outline'}
                        fullWidth
                        size="lg"
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : plan.id === 'enterprise' ? (
                    <div className="space-y-3">
                      <Link href="/contact">
                        <Button variant={plan.popular ? 'primary' : 'outline'} fullWidth size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                          Contact Sales
                        </Button>
                      </Link>
                      <p className="text-xs text-white/45 text-center">
                        Enterprise setup is handled with a custom conversation.
                      </p>
                    </div>
                  ) : (
                    isSignedIn ? (
                      <Button
                        variant={plan.popular ? 'primary' : 'outline'}
                        fullWidth
                        size="lg"
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                        onClick={() => handleCheckout('professional')}
                        isLoading={loadingPlan === 'professional'}
                        disabled={loadingPlan !== null}
                      >
                        Upgrade to Professional
                      </Button>
                    ) : (
                      <Link href="/auth/register">
                        <Button
                          variant={plan.popular ? 'primary' : 'outline'}
                          fullWidth
                          size="lg"
                          rightIcon={<ArrowRight className="w-5 h-5" />}
                        >
                          Create Account First
                        </Button>
                      </Link>
                    )
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
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="gradient-border-card p-6 text-left">
              <h3 className="font-medium text-white mb-2">Can I change plans later?</h3>
              <p className="text-white/60">
                Yes. You can manage your subscription from the billing section in Settings once billing is enabled on your account.
              </p>
            </div>
            <div className="gradient-border-card p-6 text-left">
              <h3 className="font-medium text-white mb-2">How is billing handled?</h3>
              <p className="text-white/60">
                Paid subscriptions are processed securely through Stripe after you sign in and choose an upgrade.
              </p>
            </div>
            <div className="gradient-border-card p-6 text-left">
              <h3 className="font-medium text-white mb-2">What is the no-risk way to start?</h3>
              <p className="text-white/60">
                Start on the free Starter plan, explore the product, and upgrade only when you are ready for paid verification and billing features.
              </p>
            </div>
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
              Launch with the free plan today and upgrade when you want billing, deeper analytics, and higher-volume verification.
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
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Create Your Account
                  </Button>
                </Link>
              )}
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
