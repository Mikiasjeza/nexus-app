'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MessageSquare, Send, CheckCircle2, Clock } from 'lucide-react'
import { easing } from '@/lib/utils/animations'

// MetaLab scroll animation pattern
const metalabScroll = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.primary },
}
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSubmitted(true)
      addToast({
        type: 'success',
        title: 'Message Sent',
        message: 'We&apos;ll get back to you soon!',
      })
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

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
            <div className="inline-flex items-center gap-2 border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200 mb-6">
              <Clock className="w-3.5 h-3.5" />
              Response in 24h
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 md:mb-8 leading-[1.1] tracking-tight max-w-[12ch] md:max-w-none">
              Get In Touch
            </h1>
            <p className="text-base md:text-2xl text-black/60 dark:text-white/60 leading-relaxed max-w-[36ch]">
              Have questions? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 md:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: easing.primary }}
                className="space-y-8"
              >
                <div>
                  <div className="w-12 h-12 mb-4 flex items-center justify-center border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <Mail className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-2">Email</h3>
                  <a
                    href="mailto:hello@nexus.ai"
                    className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                  >
                    hello@nexus.ai
                  </a>
                </div>

                <div>
                  <div className="w-12 h-12 mb-4 flex items-center justify-center border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <MessageSquare className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-2">Support</h3>
                  <a
                    href="mailto:support@nexus.ai"
                    className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                  >
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
                  <div className="border border-black/10 dark:border-white/10 p-12 text-center bg-white/70 dark:bg-black/45">
                    <CheckCircle2 className="w-16 h-16 text-black dark:text-white mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-black dark:text-white mb-4">
                      Message Sent!
                    </h2>
                    <p className="text-black/60 dark:text-white/60 mb-8">
                      We&apos;ll get back to you as soon as possible.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/45 p-6 md:p-8">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-black dark:text-white mb-2 uppercase tracking-wider">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-2 uppercase tracking-wider">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-black dark:text-white mb-2 uppercase tracking-wider">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="What&apos;s this about?"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-black dark:text-white mb-2 uppercase tracking-wider">
                        Message
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={8}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
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
  )
}
