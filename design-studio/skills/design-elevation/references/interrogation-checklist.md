# Design Interrogation Checklist

The sections below are diagnostic prompts used **during** the passes. The **gate** before delivery is the **Scored Validation Grid** at the top — an artifact posted with measured values, not a set of yes/no self-questions (an LLM passes any self-flattering question).

## Scored Validation Grid (the delivery gate)

Post this table in the chat before delivering. Each row carries its **real measured value**, never a bare score. Rows 5–8 are **measured mechanically** (grep + scripts), not self-judged.

| # | Criterion | Threshold | How measured |
|---|-----------|-----------|--------------|
| 1 | Display/body size ratio | ≥ 2.5× | largest display px ÷ body px |
| 2 | Section vertical padding (desktop) | ≥ 96 px | releved CSS/rendered value |
| 3 | Palette 60-30-10 | dominant ≈60 / secondary ≈30 / accent ≤10 | **counted by surface area** |
| 4 | Signature element | exactly 1, named + located | e.g. "oversized numeral, masthead" |
| 5 | Forbidden fonts in display | 0 | `grep -iE 'Inter\|Roboto\|Arial\|system-ui'` in display roles |
| 6 | Body/background contrast | ≥ 4.5:1 (≥3:1 large) | `node scripts/contrast-check.mjs <fg> <bg>` |
| 7 | Muted-text/background contrast | ≥ 4.5:1 | `node scripts/contrast-check.mjs <fg> <bg>` |
| 8 | AI-slop tells | ≤ 1 (0 ideal) | `node scripts/slop-lint.mjs <file>` |
| 9 | Spacing grid | all multiples of 4/8 | list non-conforming values (0 = pass) |
| 10 | Typographic measure | body 45–75 ch | releved max-width in ch |
| 11 | Neutrals not pure | no `#000`/`#fff` base surfaces | grep the tokens |
| 12 | Every decision justified | 0 bare adjectives without a named reason | read Design Decisions block |

**Gate**: score **< 10/12 → mandatory correction pass**, re-measure, re-post; **max 3 iterations**; residual shortfall documented as a known deviation, never silently passed. `contrast-check.mjs` and `slop-lint.mjs` live in the `claude-skills` repo `scripts/` folder.

---

## Diagnostic prompts (used during the passes)

Work through systematically while building — these feed the grid, they do not replace it.

## 1. Typography

- [ ] Is the type hierarchy clear? (3 levels max: headline, subhead, body)
- [ ] Are font choices distinctive? (No Inter, Roboto, Arial, system defaults)
- [ ] Is there contrast between display and body fonts?
- [ ] Are sizes creating proper visual weight? (Headlines should dominate)
- [ ] Is line-height appropriate? (1.2-1.4 headlines, 1.5-1.7 body)
- [ ] Is letter-spacing intentional? (Tighter headlines, normal body)
- [ ] Are widths controlled? (60-75 characters for readability)

## 2. Color

- [ ] Is there a clear dominant color? (60-30-10 rule)
- [ ] Does the palette have intentional relationships? (Complementary, analogous, triadic)
- [ ] Are accent colors used sparingly for emphasis?
- [ ] Is contrast sufficient for readability? (WCAG AA minimum)
- [ ] Does color support hierarchy? (Not just decoration)
- [ ] Are colors defined as variables for consistency?

## 3. Layout & Composition

- [ ] Is there a clear grid or structural logic?
- [ ] Is whitespace generous and intentional?
- [ ] Are elements aligned to a consistent baseline?
- [ ] Is there visual tension or interest? (Asymmetry, overlap, diagonal flow)
- [ ] Does the eye flow naturally through the content?
- [ ] Are margins and padding consistent? (Use 8pt or 4pt grid)

## 4. Visual Details

- [ ] Are corners consistent? (All sharp, all rounded, or intentionally mixed)
- [ ] Are shadows purposeful? (Creating depth, not just decoration)
- [ ] Is there texture or background interest? (Not just solid colors)
- [ ] Are borders used minimally and consistently?
- [ ] Do icons match the overall aesthetic?
- [ ] Are images high quality and properly cropped?

## 5. Polish & Refinement (feeds grid rows 4, 8, 12)

These are build-time prompts, not the gate — the gate is grid rows 4/8/12 with measured values:
- [ ] Is every element intentional, with a **written** reason (no bare "clean/modern/premium")? → grid #12
- [ ] Exactly **one** named, located signature element? → grid #4
- [ ] `slop-lint.mjs` count ≤ 1 on the delivered file? → grid #8 (measured, not eyeballed)
- [ ] Reference-table rows **derived**, not reused verbatim (no house-slop)?

## 6. Responsive & Device Adaptation — delegated for web renders

For a **web page that ships and is browser-verified**, do **not** self-attest responsive behavior here and **never** claim "tested on real devices" (this skill has no browser). Hand the tooled responsive/QA loop to **`ship-polished-ui`** (Verification Ledger: surfaces × viewports × states, `scrollWidth === clientWidth` measured per element). For a **documentary artifact**, reason statically:
- [ ] Layout holds mobile (320-480) / tablet (640-1024) / desktop (1024+) by construction (fluid `clamp()`, no fixed widths that overflow)
- [ ] Typography scales via `clamp()`; content hierarchy stays sensible between breakpoints
- [ ] Any live-browser responsive verification is deferred to the `ship-polished-ui` protocol, not faked here

## 7. Accessibility (WCAG 2.2)

- [ ] Does text meet contrast ratio? **Calculated, not estimated** — `contrast-check.mjs` (4.5:1 normal, 3:1 large)
- [ ] Do UI components meet contrast ratio? (3:1 against adjacent colors)
- [ ] Are focus indicators visible? (2px outline, 3:1 contrast)
- [ ] Is information conveyed without relying on color alone?
- [ ] Are interactive elements keyboard accessible?
- [ ] Do form inputs have associated labels?
- [ ] **Touch targets** — gate vs. target: the **blocking gate is 24×24 px (WCAG 2.5.8 AA)**; the **premium target is 44×44 px (WCAG 2.5.5 AAA / Apple HIG)**. Never state "44 px = the WCAG minimum." On native `checkbox`/`radio`, do **not** force `min-width/height` (it breaks their box); extend the hit area with a pseudo-element or padded label instead.
- [ ] Are animations respectful of `prefers-reduced-motion`?

## 8. Modern Standards (2026 CSS)

- [ ] Are design tokens/CSS variables used for consistency?
- [ ] Colors in **OKLCH** with **`color-mix()`** for tints/shades (perceptually uniform; easy AA-safe derivations)?
- [ ] **`text-wrap: balance`** on headings, **`text-wrap: pretty`** on body (no orphans/rag)?
- [ ] State/structural styling via **`:has()`** instead of JS class toggling where possible?
- [ ] Full-height uses **`dvh`/`svh`**, not `100vh` (the `100vh` iOS URL-bar bug)?
- [ ] Enter animations via **`@starting-style`**; page/element morphs via **View Transitions** where they add clarity?
- [ ] Is fluid typography implemented (`clamp`) and are modern layouts used (CSS Grid, Container Queries)?
- [ ] Does it avoid current "AI aesthetic" patterns? → `slop-lint.mjs`

## Red Flags (Fix Immediately)

- Default fonts without explicit selection; **Inter/Roboto/Arial/system-ui in display roles**
- Evenly distributed color palette (no hierarchy)
- Cookie-cutter layouts without context-specific choices
- Generic gradient backgrounds (especially purple / violet→blue aurora)
- Shadows on everything or nothing
- Inconsistent spacing values
- Text contrast below 4.5:1 (measured, not estimated)
- No focus indicators for keyboard navigation
- **`html,body { overflow-x: hidden }` as a "fix"** — it masks the real overflow bug. Diagnose instead: find the offending element by comparing `el.scrollWidth` to `el.clientWidth` (or the document's), fix that element's width/padding/negative-margin.
- `-webkit-overflow-scrolling: touch` — a **no-op since iOS 13**; delete it.
- Desktop-only hover interactions without touch alternatives
