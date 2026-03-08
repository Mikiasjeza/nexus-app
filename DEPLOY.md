# Deploying Nexus to Vercel

Step-by-step guide to deploy your Nexus app to Vercel.

---

## Prerequisites

- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account (free tier works)
- Your code pushed to a GitHub repository

---

## Step 1: Push Your Code to GitHub

If your project isn't on GitHub yet:

```bash
# Initialize git (if needed)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js — keep the defaults:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (leave blank)
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** (auto)
   - **Install Command:** `npm install`

5. **Do not deploy yet** — we need to add environment variables first.

---

## Step 3: Add Environment Variables

In the Vercel project setup, expand **Environment Variables** and add:

### Required (minimum to run)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Use [Vercel Postgres](https://vercel.com/storage/postgres) or [Neon](https://neon.tech), [Supabase](https://supabase.com), etc. |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Your Vercel URL (update after first deploy) |
| `NEXTAUTH_SECRET` | Long random string | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | Same as `NEXT_PUBLIC_APP_URL` |

### AI (at least one)

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | `sk-...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `AI_PROVIDER` | `openai` or `anthropic` |
| `AI_MODEL` | `gpt-4-turbo-preview` |

### Auth & OAuth

| Variable | Value |
|----------|-------|
| `GITHUB_CLIENT_ID` | From GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth app |
| `GITHUB_REDIRECT_URI` | `https://your-project.vercel.app/api/auth/github/callback` |

### Stripe (if using payments)

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (create webhook for your Vercel URL) |
| `STRIPE_PRO_PRICE_ID` | `price_...` |
| `STRIPE_ENTERPRISE_PRICE_ID` | `price_...` |

### Storage (S3)

| Variable | Value |
|----------|-------|
| `STORAGE_PROVIDER` | `s3` |
| `AWS_ACCESS_KEY_ID` | Your AWS key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret |
| `AWS_REGION` | `us-east-1` |
| `AWS_S3_BUCKET` | Your bucket name |

### Email

| Variable | Value |
|----------|-------|
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `noreply@yourdomain.com` |

### Optional

| Variable | Value |
|----------|-------|
| `GUEST_MODE` | `false` (or `true` to allow unauthenticated access) |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | For Google Search Console |

---

## Step 4: Database Setup

Nexus uses PostgreSQL. Options:

### Option A: Vercel Postgres

1. In your Vercel project, go to **Storage** → **Create Database** → **Postgres**
2. Connect it to your project
3. Vercel adds `POSTGRES_URL` — map it to `DATABASE_URL` in env vars, or update `prisma/schema.prisma` to use `POSTGRES_URL` if needed

### Option B: Neon / Supabase / Railway

1. Create a Postgres database at [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
2. Copy the connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`)
3. Add as `DATABASE_URL` in Vercel

### Run migrations

After first deploy, run migrations against your production DB:

```bash
# Set DATABASE_URL to your production URL, then:
npm run db:migrate:deploy
```

Or use Vercel's build command to run migrations before build (add a script if needed).

---

## Step 5: Deploy

1. Click **Deploy**
2. Wait for the build to complete (usually 2–5 minutes)
3. You'll get a URL like `https://nexus-xxx.vercel.app`

---

## Step 6: Post-Deploy

### Update URLs

If you used a placeholder for `NEXT_PUBLIC_APP_URL`, update it to your actual Vercel URL:

1. **Vercel** → Project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to `https://your-actual-url.vercel.app`
3. **Redeploy** (Deployments → ⋮ → Redeploy)

### Stripe webhook

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → Add endpoint
2. URL: `https://your-project.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, etc.
4. Copy the webhook secret → add as `STRIPE_WEBHOOK_SECRET` in Vercel

### GitHub OAuth

1. In [GitHub Developer Settings](https://github.com/settings/developers) → OAuth App
2. Set **Authorization callback URL** to `https://your-project.vercel.app/api/auth/github/callback` (or your custom domain)

---

## Step 7: Sentry (optional)

For source maps and error tracking:

1. Go to [vercel.com/integrations/sentry](https://vercel.com/integrations/sentry)
2. Add the integration and link your project
3. Redeploy — the integration adds `SENTRY_AUTH_TOKEN` and related vars automatically

---

## Custom Domain

1. **Vercel** → Project → **Settings** → **Domains**
2. Add your domain (e.g. `nexus.ai`)
3. Update DNS as instructed (CNAME or A record)
4. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to `https://nexus.ai`
5. Redeploy

---

## Quick Reference

| Action | Where |
|--------|-------|
| View deployments | Vercel Dashboard → Project → Deployments |
| View logs | Vercel Dashboard → Project → Deployments → [deployment] → Logs |
| Env vars | Vercel Dashboard → Project → Settings → Environment Variables |
| Redeploy | Deployments → ⋮ → Redeploy |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check build logs; ensure `npm run build` works locally |
| "Invalid URL" | Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://xxx.vercel.app`) |
| DB connection errors | Ensure `DATABASE_URL` is correct and DB allows connections from Vercel IPs |
| Auth redirects | Ensure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set |
| Stripe webhook 401 | Check `STRIPE_WEBHOOK_SECRET` matches your webhook |
