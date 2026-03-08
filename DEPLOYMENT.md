# Deployment Guide

This guide covers deploying Nexus to production with launch gates.

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Environment variables configured (see `.env.example`)

## Quick Deploy

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard (see "Production Env Vars")
4. Deploy

Vercel will automatically detect Next.js and configure build settings.

### Docker

1. Build the image:
```bash
docker build -t ai-skill-passport .
```

2. Run the container:
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_APP_URL=https://your-domain.com \
  ai-skill-passport
```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required

- `NEXT_PUBLIC_APP_URL` - Your application URL
- `NODE_ENV` - Environment (production, development, staging)
- `DATABASE_URL` - Production PostgreSQL connection string
- `NEXTAUTH_SECRET` - Long random auth secret
- `GUEST_MODE` - Must be `false` (or unset)

### Optional

- Database URL (when backend is implemented)
- OAuth credentials (Google, GitHub)
- Email service credentials (SMTP)
- Analytics IDs
- API keys

### Production Env Vars

Set these in Vercel Production environment:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GUEST_MODE=false`
- `AI_PROVIDER` and matching API key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- `STRIPE_SECRET_KEY` (live)
- `STRIPE_PUBLISHABLE_KEY` (live)
- `STRIPE_PRO_PRICE_ID` (live)
- `STRIPE_ENTERPRISE_PRICE_ID` (live)
- `STRIPE_WEBHOOK_SECRET` (live)
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SENTRY_DSN` (recommended)

## Build for Production

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm start
```

## Health Checks

The application includes health check endpoints:

- `/api/health` - Application health status
- `/api/version` - Version and build information

Use these endpoints for monitoring and load balancer health checks.

- `/api/health` now includes database status and latency.
- Treat `503` from `/api/health` as a deployment blocker.

## Launch Gates (Required)

Before each production release, run:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run build
```

Or run the bundled gate:

```bash
npm run launch:gate
```

Also verify migrations:

```bash
npx prisma migrate deploy
```

Or:

```bash
npm run db:migrate:deploy
```

## Post-Deploy Verification

After deployment, verify health:

```bash
SMOKE_BASE_URL="https://your-domain.com" npm run health:verify
```

Run full smoke tests:

```bash
SMOKE_BASE_URL="https://your-domain.com" \
SMOKE_EMAIL="your-test-user@example.com" \
SMOKE_PASSWORD="your-test-password" \
SMOKE_RUN_AI=true \
SMOKE_RUN_STRIPE=true \
npm run smoke:prod
```

The smoke script verifies:

- `/api/health` (`status: ok`, database up)
- Protected route redirect to `/auth/login`
- Auth login/session/logout
- Skill CRUD
- AI analyze endpoint (when enabled)
- Stripe checkout + portal session creation (when enabled)

## Performance Optimization

The application is optimized for production:

- ✅ Code splitting
- ✅ Image optimization
- ✅ Static asset caching
- ✅ Server-side rendering
- ✅ Client-side caching
- ✅ Minification and compression

## Security Checklist

Before deploying:

- [ ] Review and update security headers in `next.config.js`
- [ ] Configure CORS if needed
- [ ] Set up rate limiting
- [ ] Enable HTTPS/SSL
- [ ] Configure CSP headers
- [ ] Review environment variables
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging
- [ ] Set up backup strategy
- [ ] Review privacy policy and terms

## Monitoring

Recommended monitoring setup:

1. **Error Tracking**: Sentry, LogRocket, or similar
2. **Analytics**: Google Analytics, Plausible, or similar
3. **Uptime Monitoring**: UptimeRobot, Pingdom, or similar
4. **Performance**: Vercel Analytics, Lighthouse CI
5. **Logs**: CloudWatch, LogDNA, or similar

## Scaling

### Horizontal Scaling

- Use load balancer (Vercel, AWS ALB, etc.)
- Multiple instances behind load balancer
- Session storage in Redis or database
- File storage in S3 or similar

### Database

- Use connection pooling
- Set up read replicas for read-heavy operations
- Implement caching layer (Redis)
- Monitor query performance

## Rollback Strategy

### Vercel

Vercel keeps previous deployments. Rollback via dashboard.

### Docker

Tag versions and keep previous images:

```bash
docker tag ai-skill-passport:latest ai-skill-passport:v1.0.0
```

### Manual

1. Revert code changes
2. Rebuild and redeploy
3. Restore database backup if needed

## Maintenance Mode

For maintenance, update the health check endpoint to return 503:

```typescript
// app/api/health/route.ts
export async function GET() {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.json(
      { status: 'maintenance', message: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }
  // ... rest of health check
}
```

## Support

For deployment issues:

1. Check health endpoints
2. Review logs
3. Verify environment variables
4. Check database connectivity (when implemented)
5. Review error tracking

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run (when implemented)
- [ ] SSL/HTTPS enabled
- [ ] Domain configured
- [ ] DNS configured
- [ ] Error tracking set up
- [ ] Analytics configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security headers verified
- [ ] Performance tested
- [ ] Accessibility tested
- [ ] SEO verified
- [ ] Cookie consent configured
- [ ] Privacy policy and terms accessible
- [ ] Contact information updated
