# Product Identity

> This is NOT a CRUD app.  
> This is NOT a dashboard-first product.  
> This is a consumer-facing, design-forward AI platform.

Your job is not just to make things work.  
Your job is to make things feel **inevitable, calm, and intelligent**.

---

## Before Building Anything

1. Does this improve clarity?
2. Does this reduce cognitive load?
3. Does this feel premium and intentional?
4. Does this motion or UI element communicate meaning?
5. Would removing this make the product stronger?

**If the answer to #5 is "yes," do NOT build it.**

---

## Product Identity Rules (Non-Negotiable)

### This product should feel:
- Quietly confident
- Intelligent but not loud
- Minimal but not empty
- Alive but never busy

### Avoid:
- Flashy animations
- Obvious "AI gimmicks"
- Overuse of gradients
- Excessive shadows
- Hard edges or abrupt transitions

### Default to:
- Subtle motion
- Soft easing
- Negative space
- Typography doing the heavy lifting

---

## Motion Philosophy

**Motion must have meaning.**

### Allowed reasons for motion:
- Progress
- Focus
- Hierarchy
- Feedback
- Growth

### Forbidden reasons for motion:
- Decoration
- "Looks cool"
- Filler
- Trend-chasing

### Motion rules:
- No animation under 200ms unless micro-interaction
- No animation over 700ms
- Use easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Scroll-based motion must be **scrubbed**, never triggered
- Nothing animates unless the user invites it

**If motion does not teach the user something, remove it.**

---

## AI Integration Rules

### AI must be:
- Useful before impressive
- Observable without explanation
- Calm, not chatty

### Do NOT:
- Add a chatbot unless explicitly requested
- Fake intelligence with hardcoded responses
- Pretend something is AI if it isn't

### DO:
- Surface AI via:
  - Predictions
  - Scoring
  - Confidence levels
  - Recommendations
  - Subtle state changes

### AI should feel like:
> "A silent analyst working in the background."

---

## UI & Layout Standards

- Every screen must have:
  - One primary action
  - One focal point
  - One clear narrative

- Navigation is a control surface, not a menu.
- Headers must earn their size.
- If two elements compete for attention, one must lose.

**Whitespace is not empty space. Whitespace is structure.**

---

## Engineering Standards

- Prefer composition over configuration
- Reusable primitives over one-off components
- No premature abstraction
- Remove unused props immediately
- If a component grows too large, split by responsibility, not by file size

---

## Development Behavior

### Before implementing anything:
- Briefly explain why it should exist
- Explain what would happen if it didn't exist
- State how it reinforces the product's core idea

### When uncertain:
- Ask one clarifying question max
- Otherwise make a strong, defensible decision

### If a request conflicts with taste:
Push back respectfully and propose a better alternative.

**You are allowed to say: "I would not build this yet."**

---

## Success Definition

Success is not feature count.

Success is:
- Immediate comprehension
- Emotional confidence
- Desire to explore
- Trust in the system

**Build less. Make it matter.**
