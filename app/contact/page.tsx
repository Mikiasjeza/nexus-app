'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

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
          typeof data.error === 'string' ? data.error : 'Failed to send message. Please try again.'
        )
      }

      setSubmitted(true)
      addToast({
        type: 'success',
        title: 'Message sent',
        message: 'Your message was sent to the Nexus inbox.',
      })
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Message not sent',
        message:
          error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Contact"
          rule
          description="Product questions, partnerships or support. We read every message and reply by email."
        />

        <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
          <dl className="space-y-6">
            <div>
              <dt className="text-sm text-ink-faint">General</dt>
              <dd className="mt-1">
                <a
                  href="mailto:hello@nexus.ai"
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  hello@nexus.ai
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-faint">Support</dt>
              <dd className="mt-1">
                <a
                  href="mailto:support@nexus.ai"
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  support@nexus.ai
                </a>
              </dd>
            </div>
          </dl>

          {submitted ? (
            <div role="status" className="max-w-[40rem]">
              <p className="font-display text-[clamp(2rem,3.5vw,3rem)] font-light leading-tight">
                Message sent
              </p>
              <p className="mt-3 text-ink-muted">
                It reached the Nexus inbox. We’ll reply to the email you gave as soon as we can.
              </p>
              <Button className="mt-8" variant="secondary" onClick={() => setSubmitted(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-[40rem] space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="metalab-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="metalab-input"
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
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="metalab-input"
                    placeholder="you@example.com"
                  />
                </div>
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
                />
              </div>
              <Button
                type="submit"
                isLoading={loading}
                rightIcon={<Send className="size-4" aria-hidden />}
              >
                Send message
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppPageShell>
  )
}
