# Privacy, Third-Party SDK & Dark-Pattern Audit

_Audited 2026-10-08 against the deployed app (repo root). Re-run this checklist whenever a dependency, vendor or data field is added._

> `nexus-app/` is a stale copy that is **not deployed** (Vercel builds the repo root). Don't make fixes there.

## 1. Third-party SDK inventory

| Package | Runs | Sends data to | What | Status |
|---|---|---|---|---|
| `@google/genai`, `openai`, `@anthropic-ai/sdk` | Server (`lib/ai/client.ts`) | Google / OpenAI / Anthropic | Evidence, skill names/levels, chat messages, public job listings. Never name/email. | Disclosed. **Use paid API tiers** (the Privacy Policy says providers don't train on our data; Gemini's free tier does). |
| `@sentry/nextjs` | **Browser** + server + edge | Sentry (browser via `/monitoring` tunnel) | Errors, URLs, browser info | Fixed: `sendDefaultPii: false`, secrets/emails scrubbed from URLs (`lib/sentry-scrub.ts`), Session Replay removed from default and only loaded with "Diagnostics" consent, masked. |
| `stripe` | Server | Stripe | Name, email, userId metadata | Disclosed. |
| `@aws-sdk/*` | Server | AWS S3 | Uploaded evidence files | SSE (AES256) on upload; `deleteFile` implemented; files removed on account deletion. |
| `resend` | Server | Resend | Email + message (password reset, contact form) | Disclosed. |
| `octokit` | Server | GitHub | Sign-in only | Scope `read:user user:email` (was `repo`), token not stored. |
| `next/font/google` | Build | — | Self-hosted at build | No runtime Google request. |
| `next-auth`, `jsonwebtoken`, `uuid`, `react-hook-form`, `@hookform/resolvers` | — | — | — | **Removed** (never imported). |

Production CSP: `connect-src 'self'`, so browser code can only talk to our origin. Adding any client-side vendor requires a deliberate CSP change.

## 2. Security fixes

- **GitHub account takeover:** the callback matched existing accounts by the (unverified, attacker-editable) GitHub profile email. It now matches by GitHub user ID only, requires a GitHub-verified primary email for new accounts, refuses to auto-link when the email already exists, and supports explicit linking from Settings → Connect GitHub. Tests: `__tests__/app/api/auth/github-callback.test.ts`.
- **Cross-user GitHub client race:** a shared Octokit instance was re-initialised per request; concurrent sign-ins could read the wrong user's profile. Now per-request (`githubClientFor`).
- **Talent pools ignored consent:** pools showed candidates who later opted out, and employers could add any user ID. Pools now re-check `publicProfile && discoverableByEmployers` on read and on add.

## 3. Data minimisation

| Was | Now |
|---|---|
| `AIAnalysis.rawResponse` stored the full provider response | Not written; column dropped by migration `20261008120000_drop_unneeded_personal_data` |
| `OAuthConnection.accessToken/refreshToken` stored in plaintext | Not written; columns dropped by the same migration |
| Public share API returned internal `user.id` | Removed |
| Sentry sent IPs/cookies/headers and recorded 10% of all sessions | No PII; replay only on error, opt-in, masked |
| `Referrer-Policy: origin-when-cross-origin` | `strict-origin-when-cross-origin` |

## 4. Dark patterns removed

| Pattern | Fix |
|---|---|
| Cookie banner: unequal buttons, "dismiss" recorded as a choice, claimed marketing cookies | Equal Reject/Accept, Customize, off by default, 12-month versioned choice, re-open from footer/Settings/`/cookies` |
| Delete Account did nothing (route missing) | `DELETE /api/auth/account`: typed confirmation, cancels Stripe, removes from talent pools, deletes sole-member companies, deletes S3 files |
| No data export | `GET /api/auth/account/export` + Settings → Download my data |
| Pricing: $29 shown vs $9.99 charged; fake 14-day trial; "Save 20% annually"; "Most Popular"; "accepted worldwide by employers"; "multimodal video/audio" | Renders from `lib/plans.ts` (same source as Stripe + AI quota); honest FAQ; renewal/cancel terms beside the paid CTA |
| Home stats "2.1k+ / 94% / 4.9 rating" | Replaced with verifiable product facts |
| Onboarding blocked until goals & skills picked; "N Skills Added" before saving | Steps skippable; "N skills to add" |
| "Response in 24h" promise | "We reply by email" |
| No terms/privacy notice at sign-up | Plain notice, no pre-ticked box |
| Terms: "AI decisions are final and binding" | Re-run / human-review path; employer obligations added |

## 5. Owner to-dos

- [ ] **Run the migration** (`npm run db:migrate:deploy`) after deploying this code. It irreversibly deletes the stored AI raw responses and GitHub tokens. Deploy the code first; the old code still writes those columns.
- [ ] Confirm Stripe Price amounts = `lib/plans.ts` (Pro $9.99/mo).
- [ ] Enable cancellation in the Stripe Customer Portal.
- [ ] Use paid tiers for the AI providers (esp. Gemini), as the Privacy Policy states.
- [ ] Sentry project settings: enable "Prevent storing of IP addresses" and set data retention ≤ 90 days (policy says up to 90).
- [ ] Fill in `LEGAL_ENTITY`, `POSTAL_ADDRESS`, `GOVERNING_LAW` and the DB host in `lib/legal.ts`; create the privacy@/legal@/support@ mailboxes; legal review.
- [ ] Back-up retention ≤ 30 days (policy promise).
- [ ] Free-plan skill limit is now `-1` (it was never enforced). Enforce in `POST /api/skills` before lowering it.
- [x] `types/lucide-react.d.ts` was missing 4 icons (`BadgeCheck`, `Network`, `ChevronRight`, `LogOut`), which failed `next build`. Added. This file shadows lucide's real types, so add any new icon there too.

## 6. Rules for adding anything new

1. New cookie/storage key → `STORAGE_ITEMS` in `lib/legal.ts` (renders on `/cookies`).
2. New vendor receiving personal data → `SUBPROCESSORS` (renders in the Privacy Policy).
3. Non-essential client code → gate on `hasConsent('analytics')` from `lib/consent.ts`, listen for `CONSENT_CHANGED_EVENT`, and widen `connect-src` only for that host.
4. Plan/price/feature changes → `lib/plans.ts` only.
5. Anything employers can see → must require `publicProfile && discoverableByEmployers`.
