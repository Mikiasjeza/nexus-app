'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Users, Building2, Zap, Shield, Globe, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { easing } from '@/lib/utils/animations'
import { billingApi } from '@/lib/api'
import { useToast } from '@/components/UI/ToastProvider'
import { useState } from 'react'

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
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <Badge variant="primary" size="lg" className="mb-4">
            Flexible Pricing
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-4 md:mb-6 tracking-tight max-w-[12ch] md:max-w-none mx-auto">
            Choose Your Plan
          </h1>
          <p className="text-base md:text-lg text-black/60 dark:text-white/60 max-w-[42ch] md:max-w-3xl mx-auto">
            Start free and upgrade as you grow. All plans include AI-powered skill verification.
          </p>
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
            <div key={item} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/45 px-4 py-3 text-sm text-black/70 dark:text-white/70 text-center">
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
                <div className={`border border-black/10 dark:border-white/10 p-8 h-full bg-gradient-to-br from-white/85 to-black/[0.02] dark:from-white/[0.05] dark:to-white/[0.01] ${plan.popular ? 'border-black dark:border-white' : ''}`}>
                  <div className="w-16 h-16 border border-black/10 dark:border-white/10 flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-black dark:text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-black dark:text-white">{plan.price}</span>
                    {plan.period !== 'forever' && plan.period !== 'pricing' && (
                      <span className="text-black/60 dark:text-white/60">/{plan.period}</span>
                    )}
                  </div>
                  {plan.savings && (
                    <Badge variant="default" size="sm" className="mb-4">
                      {plan.savings}
                    </Badge>
                  )}
                  <p className="text-black/60 dark:text-white/60 mb-6">{plan.description}</p>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5" />
                        <span className="text-black dark:text-white">{feature}</span>
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
                      <Button
                        variant={plan.popular ? 'primary' : 'outline'}
                        fullWidth
                        size="lg"
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                        onClick={() => handleCheckout('enterprise')}
                        isLoading={loadingPlan === 'enterprise'}
                        disabled={loadingPlan !== null}
                      >
                        Start Enterprise
                      </Button>
                      <Link href="/contact">
                        <Button variant="ghost" fullWidth size="sm">
                          Contact Sales
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Button
                      variant={plan.popular ? 'primary' : 'outline'}
                      fullWidth
                      size="lg"
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      onClick={() => handleCheckout('professional')}
                      isLoading={loadingPlan === 'professional'}
                      disabled={loadingPlan !== null}
                    >
                      {plan.cta}
                    </Button>
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
          <h2 className="text-3xl font-bold text-black dark:text-white text-center mb-12">All Plans Include</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="border border-black/10 dark:border-white/10 p-6 text-center">
                  <div className="w-12 h-12 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <h3 className="font-medium text-black dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">{feature.description}</p>
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
          <h2 className="text-3xl font-bold text-black dark:text-white mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border border-black/10 dark:border-white/10 p-6 text-left">
              <h3 className="font-medium text-black dark:text-white mb-2">Can I change plans later?</h3>
              <p className="text-black/60 dark:text-white/60">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="border border-black/10 dark:border-white/10 p-6 text-left">
              <h3 className="font-medium text-black dark:text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-black/60 dark:text-white/60">
                We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
              </p>
            </div>
            <div className="border border-black/10 dark:border-white/10 p-6 text-left">
              <h3 className="font-medium text-black dark:text-white mb-2">Is there a free trial?</h3>
              <p className="text-black/60 dark:text-white/60">
                Yes! Professional plan comes with a 14-day free trial. No credit card required.
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
          <div className="border border-black/10 dark:border-white/10 p-12">
            <h2 className="text-3xl font-bold text-black dark:text-white mb-4">Ready to get started?</h2>
            <p className="text-black/60 dark:text-white/60 mb-8">
              Join thousands of professionals who trust Nexus for skill verification.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    handleCheckout('professional')
                  }}
                  isLoading={loadingPlan === 'professional'}
                  disabled={loadingPlan !== null}
                >
                  Start Free Trial
                </Button>
              </Link>
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
