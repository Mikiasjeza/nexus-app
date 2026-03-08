# Installation Guide

> **Deploying to Vercel?** See [DEPLOY.md](./DEPLOY.md) for a full run-through.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

## Troubleshooting TypeScript Errors

If you see TypeScript errors about missing modules (`react`, `lucide-react`, `next/link`), it means dependencies haven't been installed yet.

**Solution:**
```bash
npm install
```

This will install all required dependencies including:
- React and React DOM
- Next.js
- TypeScript types
- All UI libraries (Framer Motion, Lucide React, Recharts, etc.)

## Required Dependencies

All dependencies are listed in `package.json`. Key packages include:

- **next**: 14.0.4
- **react**: ^18.2.0
- **react-dom**: ^18.2.0
- **typescript**: ^5.3.3
- **framer-motion**: ^10.16.16
- **lucide-react**: ^0.294.0
- **recharts**: ^2.10.3
- **react-hot-toast**: ^2.4.1
- **uuid**: ^9.0.1
- **date-fns**: ^2.30.0
- **tailwindcss**: ^3.3.6

## After Installation

Once dependencies are installed, TypeScript errors should resolve automatically. The IDE should recognize:
- React types
- Next.js types
- All imported modules

## CodeSandbox Setup

If using CodeSandbox:

1. Create a new Next.js sandbox
2. Upload all files maintaining folder structure
3. CodeSandbox will automatically install dependencies
4. Wait for installation to complete (check terminal)
5. Errors should resolve once installation finishes

## Verification

To verify everything is working:

```bash
# Check if dependencies are installed
ls node_modules

# Run TypeScript check
npx tsc --noEmit

# Start dev server
npm run dev
```

If you still see errors after `npm install`, try:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Sentry + Vercel (Source Maps on Deploy)

To upload source maps to Sentry on each Vercel deployment:

1. Go to [vercel.com/integrations/sentry](https://vercel.com/integrations/sentry)
2. Click **Add Integration** and connect your Vercel account
3. Select your Vercel scope and the Nexus project
4. Link your Sentry project (`nexus-ki/javascript-nextjs`) to the Vercel project
5. Redeploy the project to trigger a release

The integration automatically sets these env vars in Vercel:

- `SENTRY_AUTH_TOKEN` – used for source map uploads
- `SENTRY_ORG` – `nexus-ki`
- `SENTRY_PROJECT` – `javascript-nextjs`
- `NEXT_PUBLIC_SENTRY_DSN` – DSN for the Next.js SDK

Your `next.config.js` already uses `withSentryConfig`, so source maps will upload on each build once the integration is connected.
