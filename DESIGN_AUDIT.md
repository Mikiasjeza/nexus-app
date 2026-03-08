# Design Audit Against Product Identity

Reference: `PRODUCT_IDENTITY.md`

**Last updated:** 2025-01-31 — Applied product clarity and hierarchy fixes.

---

## Aligned ✓

| Area | Status | Notes |
|------|--------|-------|
| Easing | ✓ | Primary easing `cubic-bezier(0.22, 1, 0.36, 1)` used consistently |
| Motion purpose | ✓ | Most animations serve reveal, hierarchy, feedback |
| Typography | ✓ | Clear hierarchy, type doing heavy lifting |
| Negative space | ✓ | Generous spacing in большинстве layouts |
| AI presentation | ✓ | Confidence scores, subtle recommendations—no chatbot |

---

## Violations to Address

### 1. Motion Over 700ms

**Rule:** "No animation over 700ms"

**Current:**
- `progressPulse`: 2s, infinite repeat
- `skillBreathe`: 3s, infinite repeat  
- Share page progress bars: 1.5s
- Various section reveals: 0.8s–1.2s

**Recommendation:** Cap all at 700ms. Evaluate whether `progressPulse` and `skillBreathe` communicate meaning—if not, remove them per "If motion does not teach the user something, remove it."

---

### 2. Scroll Motion: Triggered vs. Scrubbed

**Rule:** "Scroll-based motion must be scrubbed, never triggered"

**Current:** Most scroll reveals use `whileInView`—triggered on viewport entry, not scrubbed to scroll position.

**Recommendation:** For hero/primary content, consider `useScroll` + `useTransform` so motion is tied to scroll position. For secondary content, triggered reveals may be acceptable if they communicate hierarchy (e.g., "this section is now in focus").

---

### 3. Overuse of Gradients

**Rule:** "Avoid overuse of gradients"

**Current:**
- Onboarding: `from-primary-500 to-purple-500`, `from-green-500 to-emerald-500` on circles
- Error pages: `from-primary-600 to-purple-600` on buttons
- Global error: Gradient on CTA

**Recommendation:** Prefer solid colors. Use gradients only where they communicate meaning (e.g., progress, state). Replace onboarding circle gradients with solid or very subtle tones.

---

### 4. Hover Glow

**Rule:** "Avoid flashy animations"

**Current:** `hoverGlow` uses `boxShadow: 0 0 30px rgba(139, 92, 246, 0.3)` with purple glow.

**Recommendation:** Remove or replace with a subtle lift (e.g., `hoverLift`) that conveys focus without color.

---

### 5. Elastic Easing

**Rule:** "Default to subtle motion"

**Current:** `scaleIn` uses `easing.elastic` (spring-like).

**Recommendation:** Replace with `easing.primary` unless the bounce is intentional for a specific feedback moment.

---

### 6. Infinite Animations

**Rule:** "Nothing animates unless the user invites it"

**Current:** `progressPulse` and `skillBreathe` run continuously.

**Recommendation:** Use these only when user attention is on the element (e.g., hover or focus). Otherwise remove.

---

## Screen-by-Screen Focal Point Check

**Rule:** "Every screen must have one primary action, one focal point, one clear narrative"

| Screen | Primary Action | Focal Point | Assessment |
|--------|----------------|-------------|------------|
| Home | Explore / CTA | Hero + Nexus logo | ✓ Clear |
| Login | Sign in | Form | ✓ Clear |
| Dashboard | View skills | Stats + overview | ⚠ Multiple competing (stats, chart, activity) |
| Skills | Add/edit skills | Skill grid | ✓ Clear |
| Analytics | Export / Insights | Charts | ⚠ Multiple competing (stats, charts, gap, timeline) |
| Share | View passport | Profile + skills | ✓ Clear |

**Recommendation:** On Dashboard and Analytics, establish a clear hierarchy—one primary focal point, secondary content visually subordinate.

---

## Summary

### Applied (2025-01-31)
- ✅ Homepage hero: one core promise, single CTA
- ✅ Animations capped at 700ms (progressPulse, skillBreathe)
- ✅ Removed hoverGlow purple glow
- ✅ Removed entrance animations on skill cards, stats
- ✅ Removed skillBreathe infinite animation
- ✅ AISignal: static ambient presence, no pulse
- ✅ Nav text contrast reduced
- ✅ Dashboard/Analytics: increased spacing, clearer hierarchy
- ✅ Solid background (no gradient) on homepage

### Remaining
- Consider scroll-scrubbed motion for hero
- Replace gradients on onboarding/error pages

---

*Last updated: 2025-01-31*
