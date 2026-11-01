---
version: 1
slug: "app-verification-page-tsx"
primary_target: "app/verification/page.tsx"
related_targets: ["app/dashboard/page.tsx","app/skills/page.tsx","app/analytics/page.tsx","app/marketplace/page.tsx","app/settings/page.tsx","app/employer/dashboard/page.tsx"]
---

## Scope

The signed-in Nexus app: verification (model screen), skills, dashboard, analytics, marketplace, settings, and the employer screens. Mode: Operate. Redesign of the whole app; the verification screen is built first and the rest follow its system.

## Audience and job

Job seekers and employers, weighted equally. A candidate must, without thinking: see what is verified and why, know the next step, trust the AI result, and share their proof. Must not feel like a generic SaaS dashboard, a game, or a cold HR compliance tool.

## Pinned reference

User-pinned: metalab.com's design language, adapted to working app screens and to Nexus's own content. Borrow type, palette, density and motion; never MetaLab's name, logo, copy, client list or imagery. Must not feel slow: no scroll hijacking, smooth-scroll libraries, intro loaders or long fades.

## Direction contract

THESIS: A working screen set like a studio portfolio index: the evidence and the verdict carry the page, not chrome. Refuses the dark-glass dashboard with glowing orbs, card grids and tracked uppercase pill kickers.

OWN-WORLD: Warm off-black ground #0c0c0b, cream ink #e9e4da, warm greys #a39d92 and #7a746a for secondary text, hairline rules at cream 10%, translucent cream pills (12%, fully rounded) for every filter, tab and small action. One orange #e9762b reserved for verified state, selection and focus. Thin high-contrast display serif (Noto Serif Display, light) for page titles and headline numbers; Hanken Grotesk for all UI text. No cards with borders and glow; lists are hairline-ruled rows.

STORY: The candidate sees each skill's state at a glance, opens one, adds evidence, runs the check, and reads the score, the reasons and what would raise it, then shares the passport.

FIRST VIEWPORT: Verification. A floating pill bar at top centre holds navigation, the Nexus wordmark and account. Left, a thin-serif title "Verification" with a long dash. Below, the skill picker as filter pills, then two columns: evidence input on the left, result on the right led by the confidence score in display serif at ~120px with the verdict and level beside it, reasons and improvements as ruled rows. Primary action "Run AI check" sits under the evidence.

FORM: User-pinned direction (metalab.com reference), chosen outside the dealt hand; signature move: the floating pill bar plus verdicts set as large thin-serif numerals. seed:06c1e4b2f3e746b0

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
