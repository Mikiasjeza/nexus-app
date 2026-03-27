import { NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email/client'
import { getSupportInbox } from '@/lib/config/env'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please complete all fields with valid information.' },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = parsed.data

    const rl = rateLimit(`contact:${ip}:${email.toLowerCase()}`, {
      maxRequests: 5,
      windowMs: 1000 * 60 * 10,
    })

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many messages sent recently. Please try again in a few minutes.' },
        { status: 429 }
      )
    }

    const inbox = getSupportInbox()
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

    await emailService.sendEmail({
      to: inbox,
      from: process.env.EMAIL_FROM,
      subject: `[Nexus Contact] ${subject}`,
      text: `New contact message from ${name} <${email}>\n\nSubject: ${subject}\n\n${message}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 16px;">New Nexus contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <div style="margin-top: 24px; padding: 16px; border: 1px solid #e5e7eb; background: #f9fafb;">
            ${safeMessage}
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          (error.message.includes('not initialized') || error.message.includes('not yet implemented'))
            ? 'Contact inbox is not configured yet. Please use the direct support email for now.'
            : 'Unable to send your message right now. Please try again later.',
      },
      {
        status:
          error instanceof Error &&
          (error.message.includes('not initialized') || error.message.includes('not yet implemented'))
            ? 503
            : 500,
      }
    )
  }
}
