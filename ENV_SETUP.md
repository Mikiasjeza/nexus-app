# Environment Variables Setup

Copy this template to `.env.local` and fill in your values.

## First-time database setup

1. Set `DATABASE_URL` in `.env.local` (see template below).
2. Run migrations: `npx prisma migrate dev --name init` (or `npm run db:migrate`).
3. Seed a demo user (optional): `npx prisma db seed` or `npm run db:seed`.
   - Demo login: `demo@nexus.ai` / `demo123`.
   - After seeding, your shareable URL uses the user's `shareableId` (e.g. `/share/<shareableId>`).

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nexus?schema=public"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GUEST_MODE="false"

# AI Providers (at least one required)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
AI_PROVIDER="openai"
AI_MODEL="gpt-4-turbo-preview"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"

# Stripe (Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# File Storage
STORAGE_PROVIDER="s3"

# AWS S3
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET="nexus-uploads"

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Email Service
EMAIL_PROVIDER="resend"
EMAIL_FROM="noreply@nexus.ai"
RESEND_API_KEY="re_..."
SENDGRID_API_KEY="SG..."

# Monitoring (optional but recommended)
SENTRY_DSN=""
```

## Production Fail-Fast Rules

On production boot, the app requires:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GUEST_MODE` must not be `true`

Stripe flows require:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_ENTERPRISE_PRICE_ID`

Stripe webhook endpoint additionally requires:

- `STRIPE_WEBHOOK_SECRET`

AI analysis requires:

- `AI_PROVIDER=openai` with `OPENAI_API_KEY`, or
- `AI_PROVIDER=anthropic` with `ANTHROPIC_API_KEY`

Email delivery (password reset) requires:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`

## Launch Commands

Run these in order before production release:

```bash
npm run launch:gate
npm run db:migrate:deploy
SMOKE_BASE_URL="https://your-domain.com" npm run health:verify
SMOKE_BASE_URL="https://your-domain.com" SMOKE_EMAIL="..." SMOKE_PASSWORD="..." SMOKE_RUN_AI=true SMOKE_RUN_STRIPE=true npm run smoke:prod
```
