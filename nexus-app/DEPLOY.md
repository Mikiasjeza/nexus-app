# Nexus - Vercel Deployment Checklist

## Before deploying, verify:

1. **You're in the project folder**
   ```powershell
   cd "c:\Users\mikia\Documents"
   ```

2. **All changes are saved** (next.config.js, vercel.json, package.json, scripts/remove-windows-dirs.js)

3. **Deploy via CLI** (uploads from this folder)
   ```powershell
   npx.cmd vercel --prod
   ```

## Vercel Dashboard Settings

1. **Project → Settings → Environment Variables**
   - If `NEXT_PUBLIC_APP_URL` exists and its value is literally `NEXT_PUBLIC_APP_URL` → **Delete it** or fix to `https://nexus-app.vercel.app`
   - Add: `NEXT_PUBLIC_APP_URL` = `https://nexus-app.vercel.app` (or your real domain)

2. **Project → Settings → Build & Development Settings**
   - **Build Command**: Leave empty (uses vercel.json) OR set to:
     ```
     node scripts/remove-windows-dirs.js && npm run build
     ```
   - If it says `next build` only → Remove that override so vercel.json is used

## If using Git

If this project is connected to a Git repo in Vercel:
- **Push your changes** to the repo first
- Then trigger deploy (or it deploys automatically on push)
