# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally (confirmed):

- **Job seekers and professionals** who want proof of what they can do. They add skills, claim a level (beginner to expert), attach evidence (code, links, files, write-ups), and get each claim checked by AI. They share the result as a public skill passport and look for matching jobs.
- **Employers and hiring teams** who want candidates whose skills are already checked. They post jobs, search verified talent, save candidates into talent pools, and run a public company page.

## Product Purpose

Nexus turns skill claims into evidence-backed proof. A résumé line says "expert in React"; Nexus shows the work behind it and an AI assessment of whether that work supports the claimed level. Success for a candidate is a verified passport an employer trusts; success for an employer is less time screening people whose skills don't match what they wrote.

## Positioning

Verification is grounded in submitted work, not self-description or tests: the AI scores evidence against the claimed level, plain description alone can never verify, a claim supported only at a lower level is not verified, and linked GitHub repositories count as the person's work only when the platform confirms they own or contributed to them. The candidate owns the result and reuses it everywhere, rather than retaking employer-specific assessments.

## Operating Context

- Candidates: dashboard, skills list and skill form, the verification page (pick a skill, add code/text/links or attach a file, run an analysis, see score, explanation, suggested level and improvements), analytics, settings (account export and deletion), public share page.
- Employers: employer dashboard, job listings, talent search, talent pools, company page.
- A marketplace page with AI job matches and a career chat.
- Guest preview mode shows the app on demo data before sign-up.
- Monthly plan quotas limit AI analyses (Free 10, Pro 50, Enterprise unlimited).

## Capabilities and Constraints

- Next.js 16 App Router, React, Tailwind, Prisma/Postgres (Neon), deployed on Vercel. Stripe billing, Resend email, S3 evidence storage.
- Skills sit in five pillars (Build/Technical, Create/Creative, Explain/Communication, Lead/Professional, Grow/Learning) and four levels: beginner, intermediate, advanced, expert.
- AI analysis returns a confidence score (0 to 1, verified at 0.8 or above under the policy rules), an explanation, a suggested level, and up to three improvements. The badge can be withdrawn by a later analysis or by changing a verified skill's claim.
- Evidence uploads: images, PDF, MP4/WebM, txt/md/json up to 10MB. The AI reads text files in full; other files are judged by name and description.
- Undecided: employer pricing does not exist yet.

## Brand Commitments

- The product name is Nexus. The existing logo components (`components/UI/NexusLogo.tsx`, `Logo3D.tsx`, `MetaLabLogo.tsx`) are not confirmed as binding.
- `PRODUCT_IDENTITY.md` (calm, minimal, restrained motion) is explicitly **not binding** for the redesign: the user chose to start fresh. Its AI honesty rules remain product truth: never fake intelligence, never call something AI that isn't.

## Evidence on Hand

- Real: the product's own flows and data model, the plan catalogue in `lib/plans.ts`, the legal pages.
- Absent, never to be fabricated: customers, testimonials, user counts, employer logos, case studies, benchmarks, salary data, press.
- Demonstration data for skills, analyses and candidates may be authored for empty states and previews, labelled as examples.

## Product Principles

1. Proof over claims: every surface should show the evidence and the reasoning behind a score, not only the badge.
2. Both sides of hiring are first-class: the candidate's path and the employer's path each get a clear, complete experience.
3. Honest AI: show confidence, explanation and what would improve a claim; never present a verdict without its reasons.
4. The candidate owns their passport: what is public, what is exported and what is deleted stays in their control.
