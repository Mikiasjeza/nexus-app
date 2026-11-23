import { NextResponse } from 'next/server'
import { z } from 'zod'
import { trustThisDevice } from '@/lib/auth/login-alert'
import { emailDeliveryConfigured, sendVerificationEmail } from '@/lib/auth/email-verification'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie, clearGuestPreviewCookie } from '@/lib/auth/session'
import { TURNSTILE_FAILED, TURNSTILE_FIELD, verifyTurnstile } from '@/lib/security/turnstile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { createCompanyForUser } from '@/lib/employer/company'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200)
    .transform((v) => v.trim()),
  /** The Terms require account holders to be 16 or older; the form asks them to confirm it. */
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must be 16 or older to create an account' }),
  }),
  /** Which side of Nexus the account is for. Employers also name their company. */
  accountType: z.enum(['candidate', 'employer']).default('candidate'),
  companyName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v?.trim() || undefined),
})

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:register:${ip}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    if (!(await verifyTurnstile(body?.[TURNSTILE_FIELD], request))) {
      return NextResponse.json({ error: TURNSTILE_FAILED }, { status: 400 })
    }
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { email: emailNorm, password, name, accountType, companyName } = parsed.data
    if (accountType === 'employer' && !companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({
      where: { email: emailNorm },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: emailNorm,
          name,
          passwordHash,
          onboardingComplete: false,
        },
      })

      if (accountType === 'employer' && companyName) {
        // The employer side: a company with this person as owner, no candidate onboarding.
        await createCompanyForUser(tx, created.id, companyName)
        return { ...created, onboardingComplete: true }
      }

      // Candidates start on the free plan.
      await tx.subscription.upsert({
        where: { userId: created.id },
        create: { userId: created.id, plan: 'free', status: 'active' },
        update: {},
      })
      return created
    })

    const token = await createSession(user.id)
    await clearGuestPreviewCookie()
    await setSessionCookie(token)
    await trustThisDevice()

    // Ask them to confirm their email. A delivery problem never blocks sign-up:
    // they can resend from the banner.
    if (emailDeliveryConfigured()) {
      await sendVerificationEmail(user).catch((err) =>
        console.error('Verification email failed:', err)
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
      publicProfile: user.publicProfile,
      shareableId: user.shareableId,
      customSlug: user.customSlug ?? undefined,
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete,
      createdAt: user.createdAt.toISOString(),
      accountType,
    })
  } catch (e) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
