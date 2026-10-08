'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MessageSquare, Send, CheckCircle2, Clock } from 'lucide-react'
import { easing } from '@/lib/utils/animations'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function ContactPage() {
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to send message. Please try again.'
        )
      }

      setSubmitted(true)
      addToast({
        type: 'success',
        title: 'Message Sent',
        message: 'Your message was sent to the Nexus inbox.',
      })
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Message not sent',
        message: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="page-shell pb-24 pt-8 md:pt-12">
        <section className="relative mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, ease: easing.primary }}
            className="hero-panel p-8 md:p-10"
          >
            <div className="hero-kicker mb-6">
              <Clock className="h-3.5 w-3.5" />
              We reply by email
            </div>
            <h1 className="mb-4 max-w-[14ch] text-4xl font-semibold leading-[1.08] tracking-tight text-white md:mb-6 md:max-w-none md:text-6xl lg:text-7xl">
              Get in{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">touch</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/65 md:text-xl">
              Product questions, partnerships, or support — we read every message.
            </p>
          </motion.div>
        </section>

      <section>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, ease: easing.primary }}
                className="insight-card space-y-6 p-6"
              >
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Mail className="h-5 w-5 text-cyan-200/90" />
                  </div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Email</h3>
                  <a href="mailto:hello@nexus.ai" className="text-sm text-white/72 transition-colors hover:text-white">
                    hello@nexus.ai
                  </a>
                </div>

                <div className="border-t border-white/[0.06] pt-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <MessageSquare className="h-5 w-5 text-violet-200/90" />
                  </div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Support</h3>
                  <a href="mailto:support@nexus.ai" className="text-sm text-white/72 transition-colors hover:text-white">
                    support@nexus.ai
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: easing.primary }}
              >
                {submitted ? (
                  <div className="gradient-border-card p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Message Sent!
                    </h2>
                    <p className="text-white/60 mb-8">
                      Your note was delivered. We&apos;ll reply as soon as possible.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="gradient-border-card space-y-5 p-6 md:p-8">
                    <div>
                      <label htmlFor="name" className="metalab-label">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="metalab-input"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="metalab-label">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="metalab-input"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="metalab-label">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="metalab-input"
                        placeholder="What is this about?"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="metalab-label">
                        Message
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={8}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="metalab-input resize-none"
                        placeholder="Tell us more..."
                      />
                    </div>

                    <Button
                      type="submit"
                      isLoading={loading}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Send Message
                    </Button>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </AppPageShell>
  )
}
