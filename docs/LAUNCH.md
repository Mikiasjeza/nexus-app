# Pre-launch ("Coming Soon") mode

Nexus can run in pre-launch mode: visitors see a Coming Soon page with a
waitlist, and the app itself is closed to the public. Turning it on or off is
one setting in Vercel plus a redeploy. Nothing is deleted either way.

## What changes when it is on

| Who / what                                                                                                     | Pre-launch mode on                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Visitors                                                                                                       | `/` shows the Coming Soon page. App pages redirect to it; app APIs answer 403.                                         |
| Legal and operational pages                                                                                    | Stay public: privacy, terms, cookies, AI, accessibility, copyright, security, status, contact, robots, sitemap, icons. |
| Stripe webhooks, Vercel Cron, health checks, sign-in and OAuth callbacks, email unsubscribe links              | Keep working.                                                                                                          |
| New sign-ups (email or Google/GitHub)                                                                          | Refused, with a pointer to the waitlist. Admins and `PRELAUNCH_ALLOWLIST` emails can still sign up.                    |
| Admins (`ADMIN_EMAILS`, confirmed email)                                                                       | Full access. Sign in at `/auth/login`. The admin area still needs two-step sign-in.                                    |
| `PRELAUNCH_ALLOWLIST` emails (confirmed)                                                                       | Full access.                                                                                                           |
| Paying customers (any non-free plan that is active, trialing or past due, personally or through their company) | Full access. Nothing they bought is taken away.                                                                        |
| Everyone else with an account                                                                                  | Their session is not accepted until launch; they see Coming Soon. Their account and data are untouched.                |
| Guest preview cookie                                                                                           | Ignored, so it is not a way in.                                                                                        |

There is no secret URL or code that skips sign-in. The only way in is a real
account that is an admin, allowlisted, or paying, checked on the server.

## Settings (Vercel → Project → Settings → Environment Variables)

| Name                  | Type                | Value                                                                                                                                  |
| --------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PRELAUNCH_MODE`      | Config (not secret) | `true` to turn on. Remove it or set `false` to open Nexus.                                                                             |
| `PRELAUNCH_ALLOWLIST` | Config (not secret) | Optional. Comma-separated emails of testers.                                                                                           |
| `LAUNCH_DATE`         | Config (not secret) | Optional, **only after the date is approved**. ISO time, e.g. `2027-02-01T17:00:00Z`. Shows the date and a countdown. Empty = no date. |

Changes take effect after a redeploy.

## Before turning it on

1. Run the database migration `20261204120000_add_launch_waitlist` on the live
   database (adds two new tables; changes nothing that exists):

   ```powershell
   $env:DATABASE_URL = Read-Host "Paste the live database URL (pooling off)"
   npx prisma migrate deploy
   Remove-Item Env:DATABASE_URL
   ```

2. Sign in as an admin and open **Admin → Waitlist**. Check **Paying people**
   and **Paying companies**. Those people keep full access. Everyone else with a
   free account will see the Coming Soon page until launch. If that would
   surprise anyone, tell them first or add them to `PRELAUNCH_ALLOWLIST`.
3. Make sure your own admin account exists, its email is confirmed, and
   two-step sign-in is on.

## Turn it on

1. Add `PRELAUNCH_MODE` = `true` (Config) in Vercel, for Production.
2. Redeploy.
3. Check, in a private window: `/` shows Coming Soon, `/dashboard` goes to
   Coming Soon, `/privacy` loads. Then sign in as an admin and open
   `/dashboard`.

## Reopen Nexus (launch)

1. In Vercel, delete `PRELAUNCH_MODE` (or set it to `false`).
2. Redeploy.
3. Check, in a private window: `/` shows the normal homepage and sign-up
   works.
4. Email the waitlist: **Admin → Waitlist → Download CSV** gives confirmed,
   still-subscribed emails. Send through your email provider and include an
   unsubscribe link. Delete the CSV afterwards.

If something goes wrong after launch, set `PRELAUNCH_MODE` back to `true` and
redeploy: the site closes again and no data is lost.

## The waitlist

- Double opt-in: joining stores the email as _pending_ and sends a
  confirmation link. Only confirmed emails are exported.
- Consent: a required checkbox; the exact wording and time are stored.
- Every email has a one-click unsubscribe link. Unsubscribed addresses are
  never emailed again and never exported.
- Duplicates never make a second entry, and the answer is the same whether or
  not an email was already on the list.
- Spam protection: Cloudflare Turnstile (when configured), a hidden honeypot
  field, and a limit of 5 tries per hour per IP address.
- Numbers: daily page views (bots skipped), signups and confirmations, kept as
  counts only, with no cookies or personal data. Add `?utm_source=linkedin`
  (or similar) to links you share to see which sources work best. If Vercel
  Web Analytics is on and the visitor allowed it, a `waitlist_signup` event is
  also recorded.
