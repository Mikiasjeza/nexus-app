/**
 * Email Service
 * 
 * Handles transactional emails (verification, password reset, etc.)
 * 
 * TODO: Choose email provider (Resend or SendGrid)
 * TODO: Add API keys to .env:
 * - RESEND_API_KEY (for Resend)
 * - SENDGRID_API_KEY (for SendGrid)
 * 
 * TODO: Create email templates
 * TODO: Add email queue for high volume
 */

import { Resend } from 'resend'

export type EmailProvider = 'resend' | 'sendgrid'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

class EmailService {
  private provider: EmailProvider
  private resend: Resend | null = null

  constructor() {
    // TODO: Make configurable via env var
    this.provider = (process.env.EMAIL_PROVIDER as EmailProvider) || 'resend'

    if (this.provider === 'resend') {
      this.initializeResend()
    }
  }

  private initializeResend() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not configured. Emails will not be sent.')
      return
    }

    this.resend = new Resend(apiKey)
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.provider === 'resend') {
      await this.sendWithResend(options)
    } else if (this.provider === 'sendgrid') {
      await this.sendWithSendGrid(options)
    } else {
      throw new Error(`Email provider ${this.provider} not implemented`)
    }
  }

  private async sendWithResend(options: EmailOptions): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend client not initialized')
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
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<void> {
    // TODO: Implement SendGrid
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // 
    // await sgMail.send({
    //   to: options.to,
    //   from: options.from || process.env.EMAIL_FROM,
    //   subject: options.subject,
    //   html: options.html,
    //   text: options.text,
    // })

    throw new Error('SendGrid not yet implemented')
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
