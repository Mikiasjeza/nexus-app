# Billing and subscriptions

Nexus sells monthly plans through Stripe. This document covers what each plan
includes and how that is enforced, the policies behind usage limits and
promotions, how the code is organised, how to set Stripe up in test mode, and
how to go live.

## Launch stages

| Stage | Plans on sale                                      | Status                                                                                              |
| ----- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1     | Free, Pro ($9.99), optional founding offer ($6.99) | Built. Pro is purchasable once Stripe is configured; live charges need explicit approval.           |
| 2     | Career+ ($19.99)                                   | Shown as "Coming soon" with a waitlist. Opens when its career features exist (see below).           |
| 3     | Business ($99 per organization)                    | Shown with "Contact Sales" and a waitlist. Opens when employer assessments exist and are validated. |

A plan is sold only when `lib/plans.ts` marks it `available`. Nothing that
isn't built is listed as included: planned items appear under "Coming soon".

## What existed before this work

- Stripe Checkout for Pro and "Enterprise", a billing portal link, and a
  webhook with signature checks and idempotency (`StripeWebhookEvent`).
- A `Subscription` row per user, but subscription updates never changed the
  plan, and unknown Stripe statuses (`incomplete`, `unpaid`, `paused`) were
  treated as active.
- Only AI evidence verifications had a monthly quota. Assessments were
  unlimited apart from the retake rules.
- No upgrade/downgrade flow, no promotions, no usage records, and the checkout
  success page announced success before Stripe confirmed anything.

## Plans and what enforces them

| Plan     | Formal assessments / month | AI verifications / month | Paid features (entitlements)                                                                    |
| -------- | -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| Free     | 1                          | 10                       | none                                                                                            |
| Pro      | 5                          | 50                       | advanced feedback, detailed reports, growth analytics, all practice challenges, career insights |
| Career+  | 12                         | 100                      | as Pro (its own features are still to be built)                                                 |
| Business | 10 sponsored (per org)     | n/a                      | employer assessments                                                                            |

Every check runs on the server, in `lib/billing/entitlements.ts`:

| Feature                            | Where it's enforced                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Formal assessment allowance        | `createAttempt` (check) and `beginAttempt` (use), via `Deps.allowance`                    |
| Reasons and evidence behind scores | `GET /api/assessments/attempts/[id]/result` strips them on Free                           |
| Detailed (printable) report        | `GET /api/assessments/attempts/[id]/report` returns 402 on Free                           |
| Skill growth analytics             | `GET /api/analytics/assessment-growth` returns 402 on Free                                |
| Every practice challenge           | practice routes pick from the full pool only for paid plans                               |
| AI career coach and job matching   | `/api/ai/chat`, `/api/ai/job-matches` return 402 on Free (guest preview still demos them) |
| Employer assessments               | `canCreateEmployerAssessment(companyId)`: off until Business is on sale                   |

Denied requests answer HTTP 402 with `{ error, code: 'upgrade_required', upgradeTo }`
(or `code: 'allowance_exhausted'` for the assessment allowance). Nothing ever
starts a checkout or charges anyone without the person clicking.

## Policies

**What counts as a formal assessment.** A timed assessment that can earn a
credential. It counts when the candidate starts the timer (`READY →
IN_PROGRESS`). Creating an attempt and reading the brief uses nothing. One
attempt uses at most one, however often the start request is retried or
races. Practice rounds never count.

**Failures and abandoned attempts.** If grading fails on our side
(`FAILED_SYSTEM`), the assessment is given back, and it isn't charged again if
the attempt is later regraded. A started attempt can't be cancelled, and
letting the timer run out still counts, because the task has been seen. The
existing retake rules (24 hours after a fail, 3 attempts per skill in 30 days)
still apply on top.

**Monthly reset.** Allowances reset on the 1st of every month at 00:00 UTC, on
every plan. Upgrading mid-month applies the higher limit straight away; what
was used still counts. Unused assessments don't roll over. Each month's row
(`UsagePeriod`) is kept as history.

**Failed payments.** Stripe retries the card and marks the subscription
`past_due`. Paid features continue for 14 days from the failed renewal
(`PAST_DUE_GRACE_DAYS`), and the billing page asks the subscriber to update
their card. After that, or when Stripe gives up (`unpaid`, `canceled`), the
account is on Free.

**Credentials are never held hostage.** Credentials, results, history, the
basic Skill Passport and public verification don't depend on a subscription.
Cancelling only switches off paid extras. Results always show scores; only
the explanation is a paid feature.

**Founding-member offer.** Pro for $6.99/month for the first 12 months, then
$9.99/month. It's stored in the database (`Promotion`, seeded switched off)
so admins control it at `/admin/billing`: on/off, start and end dates, and a
cap (default 100). It's only for first-time subscribers, once per person
(unique `PromotionRedemption` per promotion and user). A checkout in progress
holds a place until it expires (60 minutes), and places are counted under a
row lock, so the cap is exact. Stripe applies it as a repeating coupon
(`$3.00 off for 12 months`), and checkout states the terms before payment.
It's advertised only while it runs and only to people it applies to.

## How it works

```
Pricing page ──POST /api/stripe/checkout──▶ Stripe Checkout ──▶ /settings?checkout=cs_… (polls)
                                                │                       │
                                                ▼                       ▼
                                   POST /api/stripe/webhook   GET /api/billing/checkout-status
                                                │                       │
                                                └──────▶ syncStripeSubscription ◀──────┘
                                                         (re-reads Stripe, writes Subscription)
```

- `lib/plans.ts`: the plan catalogue, client-safe. Prices, limits, features,
  availability, entitlements.
- `lib/billing/catalog.ts`: whether a plan can be bought: on sale, Stripe
  configured, live mode approved, price id set, and the Stripe price matching
  the catalogue (amount, USD, monthly, active).
- `lib/billing/status.ts`: Stripe statuses, the past-due grace period and the
  effective plan.
- `lib/billing/usage.ts`: the allowance in the database (conditional increment
  plus a unique `UsageEvent` per attempt), practice counts and history.
- `lib/billing/promotions.ts`: promotion rules, eligibility, place holds.
- `lib/billing/sync.ts`: copies a Stripe subscription into `Subscription`,
  always re-reading it from Stripe; ignores stale cancellations and refuses to
  overwrite a live subscription with a duplicate (logged for a refund).
- `lib/integrations/stripe.ts`: checkout, confirmation, the portal, plan
  changes and webhook dispatch.
- `lib/billing/admin.ts`: admin overview, promotion edits (audit-logged), the
  daily check.

**Webhook events handled:** `checkout.session.completed`,
`checkout.session.expired`, `customer.subscription.created`, `.updated`,
`.deleted`, `.paused`, `.resumed`, `invoice.paid`, `invoice.payment_succeeded`,
`invoice.payment_action_required`, `invoice.payment_failed`. Each is verified
by signature, recorded once in `StripeWebhookEvent`, and applied by re-reading
Stripe, so retries, duplicates and out-of-order delivery all end in Stripe's
current state.

**Upgrades and downgrades** go through Stripe's billing portal
(`subscription_update_confirm`), which shows the prorated amount and asks for
confirmation. The webhook then updates the plan. This path only matters once
a second individual plan is on sale.

**Organization billing.** A `Subscription` belongs to a user or a company (a
CHECK constraint enforces exactly one). Webhook sync handles company
subscriptions; checkout for Business stays closed until it is on sale.

**Cost controls.** Per-plan allowances, the existing rate limits and runner
caps, AI cost recorded per grading and verification, an optional monthly AI
budget (`AI_MONTHLY_BUDGET_USD`), and a daily check (`/api/cron/billing-check`,
Vercel Cron at 08:00 UTC) that alerts Sentry at 80% and 100% of budget, on
failed webhooks and on mismatched prices. `/admin/billing` shows usage, spend,
subscribers, promotions, waitlists and webhook failures.

## Settings

Set these in Vercel → Settings → Environment Variables. **Secret** values
can't be viewed again after saving; **Config** values can.

| Variable                         | Type   | What it is                                                                              |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`              | Secret | Stripe secret key. `sk_test_…` in Preview, `sk_live_…` in Production.                   |
| `STRIPE_WEBHOOK_SECRET`          | Secret | Signing secret of the webhook endpoint for that environment (`whsec_…`).                |
| `STRIPE_PRO_PRICE_ID`            | Config | The Pro price (`price_…`), $9.99/month USD, from the same Stripe mode.                  |
| `STRIPE_CAREER_PLUS_PRICE_ID`    | Config | Career+ price, only once it goes on sale.                                               |
| `STRIPE_BUSINESS_PRICE_ID`       | Config | Business price, only once it goes on sale.                                              |
| `BILLING_LIVE_APPROVED`          | Config | `true` is the explicit go-ahead for live charges. Without it, a live key sells nothing. |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Config | Optional; otherwise created automatically for plan changes.                             |
| `STRIPE_AUTOMATIC_TAX`           | Config | `true` only after Stripe Tax is set up.                                                 |
| `AI_MONTHLY_BUDGET_USD`          | Config | Optional AI budget for alerts, e.g. `50`.                                               |
| `CRON_SECRET`                    | Secret | Any long random string; Vercel Cron sends it to the daily check.                        |

`STRIPE_ENTERPRISE_PRICE_ID` is no longer used and can be deleted.

## Setting up Stripe in test mode

1. In the Stripe dashboard, switch to **test mode** (or a sandbox).
2. **Product catalog → Add product:** "Nexus Pro", recurring, **$9.99 USD
   monthly**. Copy its price id (`price_…`).
3. **Settings → Billing → Customer portal:** allow cancellations ("at end of
   billing period"), payment method updates and invoice history, then
   **Save**. Stripe refuses to open the portal in a mode until this has been
   saved once in that mode.
4. **Developers → Webhooks → Add endpoint:** the Preview deployment's URL plus
   `/api/stripe/webhook`, with the events listed above. Reveal and copy its
   signing secret.
5. In Vercel, add to the **Preview** environment: `STRIPE_SECRET_KEY` (test
   key), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`. Redeploy the preview.
6. Test with Stripe's test cards: `4242 4242 4242 4242` (succeeds),
   `4000 0025 0000 3155` (asks for 3-D Secure), `4000 0000 0000 0341`
   (attaches, then fails on renewal: use it with Stripe's test clocks to
   check past-due handling).

The coupon for the founding offer is created automatically the first time
someone checks out with it (`nexus-founding-pro-300c-12m`).

## Going live (needs explicit approval)

1. Apply the database migration (below).
2. Finish Stripe's account verification so live payments aren't paused.
3. Repeat steps 2–4 above in **live mode** against the production URL.
4. In Vercel **Production**: live `STRIPE_SECRET_KEY`, the live webhook's
   `STRIPE_WEBHOOK_SECRET`, the live `STRIPE_PRO_PRICE_ID`, then
   `BILLING_LIVE_APPROVED=true`. Redeploy.
5. Check `/admin/billing`: Pro should say "Can be bought". Buy it once with a
   real card, confirm the plan shows in Settings, then refund and cancel.
6. Optional: switch on the founding offer at `/admin/billing`.

Vercel's Hobby plan doesn't allow commercial use; upgrade to Pro before taking
real payments.

## Database

Migration `20261103120000_subscription_system` adds nullable columns to
`Subscription` (making `userId` optional, adding `companyId`), the tables
`UsagePeriod`, `UsageEvent`, `Promotion`, `PromotionRedemption` and
`WaitlistEntry`, renames any `enterprise` plan rows to `career_plus`, and
seeds the founding offer switched off. It is additive and safe to apply while
the current code is live, so apply it **before** deploying this code: take a
Neon backup branch, then `npx prisma migrate deploy` against the live
database's direct (non-pooler) URL.

## Tests

`npm test` covers the plan catalogue, status and grace rules, the usage window,
the allowance (limits, idempotency, races, refunds, monthly rollover), the
assessment lifecycle with the allowance, result detail by plan, the practice
pool, promotion rules and holds, the purchase gate (including mismatched and
missing prices and the live-mode interlock), Stripe sync (cancellations,
stale and duplicate subscriptions, deleted accounts), webhook handlers,
checkout (duplicates, server-side prices, the founding coupon, rollback on
Stripe failure) and checkout confirmation.

Not automated, to do by hand in test mode before going live: a real checkout
end to end, the 3-D Secure card, a renewal failure with test clocks,
cancellation in the portal, and the webhook against a deployed preview.

## Still to do

- Career+ features (career recommendations, AI gap analysis, learning plans,
  portfolio analytics) before Career+ goes on sale; then add its Stripe price.
- Employer assessment invitations, reports and validation before Business.
- Pro "Skill Passport customization" is listed as coming soon.
- Moving from founding Pro to another plan keeps the Stripe coupon; decide
  whether plan changes should drop it before Career+ opens.
- The privacy policy should mention waitlist entries and monthly usage records
  (after the pending legal-pages update merges, to avoid a conflict).
- The "detailed PDF report" is a print-ready page saved through the browser's
  print dialog, not a generated PDF file.
