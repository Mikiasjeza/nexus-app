# Design

Nexus looks like a report someone had fun with: a white page, black ink,
hairline rules, square corners, tight headings, and big flat fields of colour.

The design language is adapted from the **Accountant website template by 8B**
(<https://8b.com>, MIT licence; the licence text is in
`docs/licenses/8b-accountant-template-LICENSE.txt`). The layout ideas, colours
and type scale come from it. The code is our own, and so is all the text.

## Colours

Defined once as CSS variables in `app/globals.css`, and read by Tailwind
(`tailwind.config.ts`).

| Name        | Value     | Used for                                                    |
| ----------- | --------- | ----------------------------------------------------------- |
| `ground`    | `#ffffff` | The page                                                    |
| `ink`       | `#0b0b0b` | Text, rules, black fields, the main button                  |
| `verified`  | `#fe7141` | Orange fields, the call-to-action, verified state in charts |
| `lavender`  | `#cdabfe` | Lavender fields, highlights, hover fills                    |
| `sage`      | `#d1ddd3` | Sage fields                                                 |
| `ink-muted` | `#595959` | Secondary text on white                                     |
| `ink-faint` | `#737373` | Quiet labels on white                                       |

Text is never set in an accent colour on white. Where orange has to be text
(a "Verified" label), use `verified-ink`, which is dark enough to read.

### Black and colour fields

Put `on-ink` on any black section and everything inside reads in white: the
same class names (`text-ink`, `border-line`, `text-ink-muted`) flip. Put
`on-accent` on an orange, lavender or sage section for black ink with darker
secondary text. Each field takes one accent, never two.

## Type

One typeface, **Google Sans** (weights 400 to 700, self-hosted by `next/font`).
Headings are weight 500 and tightly tracked.

| Class            | Size            | Use                                  |
| ---------------- | --------------- | ------------------------------------ |
| `page-title`     | 32px to 52px    | The title of a screen                |
| `section-title`  | 34px to 56px    | A section heading on marketing pages |
| `label`          | 12px, uppercase | Small labels above lists             |
| `display-number` | set by the page | Headline numbers                     |
| `mark`           | (highlight)     | One key phrase per heading           |

Body text is 16px. Keep weights simple: 500 for headings, 400 for text, 600
for labels, 700 only for big numerals and the wordmark.

## Shape and spacing

- Every corner is square. Tailwind's `rounded-*` utilities all give 0; only
  `rounded-full` (dots, avatars, switches) stays round.
- Structure comes from 1px rules, not from shadows, cards or glass.
- A section head is a full-width rule, the heading on the left and a short
  intro on the right (`section-head`).
- `page-shell` gives the page its width and gutter. Sections sit close:
  56px to 80px of vertical padding on marketing pages, less inside the app.

## Components

- **Navigation:** a 48px white bar with a black bottom rule. The black logo
  block sits on the left; links are divided by vertical rules and fill
  lavender on hover.
- **Buttons:** `button-primary` is black and turns orange on hover.
  `button-accent` is the orange call-to-action. `button-secondary` is outlined.
- **Pills** (filters, tabs): outlined squares; the selected one is black.
- **Logo:** the word "Nexus", bold and tight, in a solid black block
  (`components/UI/NexusLogo.tsx`). The app icon is a solid N on black
  (`lib/brand/nexus-mark.ts`).
- **Footer:** black, with the interactive "nexus" wordmark printed in dots
  (`components/UI/HalftoneWord.tsx`).
- **Charts:** orange carries the verified or passed series; black and greys
  carry everything else (`--chart-*` in `globals.css`).

## Do and don't

- Do keep one accent per block, and one highlighted phrase per heading.
- Do keep text black, white or grey.
- Don't add shadows, rounded cards, gradients or stock icons.
- Don't invent facts, numbers or testimonials for marketing pages: every
  figure on the home page comes from the product itself.
