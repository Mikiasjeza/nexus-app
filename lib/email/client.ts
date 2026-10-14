/**
 * Transactional email (verification, password reset, contact) via Resend.
 * Needs RESEND_API_KEY and EMAIL_FROM.
 */

import { Resend } from 'resend'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

class EmailService {
  private resend: Resend | null = null

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not configured. Emails will not be sent.')
      return
    }
    this.resend = new Resend(apiKey)
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.resend) {
      throw new Error('Email not configured: set RESEND_API_KEY')
    }

    try {
      await this.resend.emails.send({
        from: options.from || process.env.EMAIL_FROM || 'noreply@nexus.ai',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
    } catch (error) {
      console.error('Resend email error:', error)
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const { verificationEmailHtml } = await import('./templates')
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: verificationEmailHtml(email, token),
      text: `Verify your email: ${url}`,
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const { passwordResetEmailHtml } = await import('./templates')
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`
    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: passwordResetEmailHtml(email, token),
      text: `Reset your password: ${url}`,
    })
  }
}

export const emailService = new EmailService()
