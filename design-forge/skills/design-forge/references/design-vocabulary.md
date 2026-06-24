# Design Vocabulary Glossary

Neutral term lookup: each design term → the CSS property/technique that implements it → the plain-language phrasing a development LLM understands. Grep by term name or by CSS property. Use this to translate a finding or a brief into language a development LLM acts on correctly.

Out of scope (link, do not duplicate):
- Archetype prompt phrases (warm-editorial, brutalist, etc.) → `references/archetype-library.md`.
- Anti-slop negative/positive vocabulary (what NOT to say, premium alternatives) → `references/anti-slop-rules.md`.
- Concrete reference values per design system (Apple/Material/Vercel/Linear/Stripe/Tailwind token tables) → `references/design-system-reference.md`. This file gives the canonical curve/token *form*; that file gives the per-brand numbers.

## Table of Contents
- [Typography](#typography)
- [Spacing](#spacing)
- [Color](#color)
- [Layout](#layout)
- [Elevation](#elevation)
- [Motion](#motion)
- [State](#state)
- [Responsive](#responsive)

---

## Typography

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Type scale / modular scale | Fixed-ratio `font-size` set | "Apply a Major Third 1.25 type scale" — sizes step by a constant ratio (e.g. 16/20/25/31/39px). |
| Baseline grid / vertical rhythm | `line-height` as multiples of 4px | "Align text to a 4px baseline grid" — every line-height snaps to a 4px increment. |
| Cap height / x-height / ascender / descender | Font metrics (not directly settable) | Font's intrinsic proportions; a higher x-height face needs more leading at the same size. |
| Tracking | `letter-spacing` | "Negative tracking on display headings; positive tracking on small all-caps labels." |
| Leading | `line-height` | "1.5 leading on body; 1.1–1.3 on headings." Unitless preferred. |
| Measure | `max-width: 65ch` | "Constrain the measure to ~65ch" — line length for comfortable reading (45–75 characters). |
| Rag | Ragged edge of unjustified text (`text-align: left`) | "Keep a soft rag; avoid full justification" — the uneven right edge of left-aligned text. |
| Kerning | `font-kerning: normal` | "Enable kerning" — spacing adjustments between specific glyph pairs. |
| Optical sizing | `font-optical-sizing: auto` | "Use optical sizing for variable fonts" — glyph shapes adapt to render size. |
| Variable fonts | `font-variation-settings: "wght" 600` | "Use one variable font across weights 100–900" — a single file spanning a continuous axis. |
| `font-feature-settings` | `font-feature-settings: "tnum","ss01","liga"` | "Enable tabular figures (`tnum`) for money/number columns so digits align; `ss01` for a stylistic set; `liga` for ligatures." |

---

## Spacing

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Padding / margin / gap | `padding` / `margin` / `gap` | Inner space / outer space / space between grid or flex children. |
| Gutter | Column `gap` in a grid | "The gutter is the space between columns" — the consistent channel separating grid tracks. |
| Bleed | Element extending beyond container edge (negative margin / full-bleed grid) | "Let the image bleed past the content gutter to the viewport edge." |
| Safe area | `env(safe-area-inset-top/right/bottom/left)` | "Respect device safe areas" — keep content clear of notches, home indicators, rounded corners. |
| Inset | `inset:` shorthand (top/right/bottom/left) | "Pin the overlay with `inset: 0`" — positions all four edges at once. |
| Optical compensation | Manual nudge (small `margin`/`transform`) | "Nudge for perceived alignment" — a deliberate offset so an element *looks* aligned even though it is not mathematically centered. |

---

## Color

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Hue / saturation / lightness | `hsl(243 100% 68%)` | The three HSL axes: color family / vividness / brightness. |
| Chroma | `oklch(0.7 0.15 250)` | "Define the palette in OKLCH" — chroma is OKLCH's perceptually-uniform saturation axis (L lightness, C chroma, H hue). |
| Color temperature | Warm/cool bias of neutrals (small hue shift in grays) | "Keep one consistent temperature across grays" — avoid mixing warm and cool neutrals (muddy result). |
| Semantic tokens | `--color-primary`, `--color-destructive`, `--surface`, `--on-surface`, `--border` | "Use semantic color tokens, never hardcoded hex" — names describe role, so dark mode and theming work via overrides. |
| Surface role / on-surface / container / on-container | Material color roles mapped to CSS vars | "Use `surface-container-high` for raised panels" — `surface` = base, `on-surface` = text/icons on it, `container` = filled component fill, `on-container` = its content. |
| Tonal palette | Tone ramp 0–100 (HCT/LCH), e.g. tones 0/10/…/100 plus 95/98/99 | "Generate a tonal palette from one seed color" — a full lightness ramp from which roles are picked (e.g. primary tone 40 light / 80 dark). |

---

## Layout

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Grid system / column span | CSS Grid `grid-template-columns`; `grid-column: span 4` | "Place this on a 12-column grid spanning 4 columns." |
| Breakpoint | `@media (min-width: …)` or `@container (min-width: …)` | "Reflow at this breakpoint" — width at which the layout changes. Device breakpoint = viewport-based; content breakpoint = container-based. |
| Fluid typography | `clamp(1rem, 0.5rem + 2vw, 2rem)` | "Scale type fluidly between a min and max with `clamp()`" — no hard jumps at breakpoints. Never let body drop below 16px on mobile. |
| Intrinsic sizing | `min-content` / `max-content` / `fit-content` | "Size to content" — width driven by the content itself rather than a fixed value or the parent. |
| `aspect-ratio` | `aspect-ratio: 16 / 9` | "Lock the aspect ratio to prevent layout shift (CLS)" — reserves the box's proportions before media loads. |
| Container query | `@container (min-width: …)` (with `container-type: inline-size` on parent) | "Size this component by its container, not the viewport" — responds to where it is placed, not the screen. |

---

## Elevation

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Shadow depth tokens / elevation levels | `--elevation-1` … `--elevation-5` (progressive `box-shadow` stack) | "Use a progressive elevation scale" — each level a distinct, increasing shadow; never the same shadow on everything. |
| Surface tinting (tonal elevation) | Lighter surface color = higher (no shadow) | "Convey elevation by a lighter surface, not a shadow" — the dark-mode and Material 3 default (raise = step lightness up). |
| Backdrop blur | `backdrop-filter: blur(12px)` | "Blur what is behind this overlay" — frosted effect for sticky bars/modal scrims. Use purposefully, not as blanket decoration. |
| Stacking context / layering context | `z-index` within a positioned ancestor; `isolation: isolate` | "Keep overlays above content in a controlled stacking context" — a new context is created by `position` + `z-index`, `transform`, `opacity < 1`, `filter`, etc.; nested `z-index` only competes within its own context. |

---

## Motion

Canonical curve/token *forms* below. Per-system numeric duration/easing token tables (Material, etc.) live in `references/design-system-reference.md`.

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Easing curve / cubic-bezier | `transition-timing-function: cubic-bezier(0.2,0,0,1)` | "Apply this easing curve" — defines acceleration over the animation. Entrances ease-out `cubic-bezier(0,0,0.2,1)`; exits ease-in `cubic-bezier(0.4,0,1,1)`; state changes ease-in-out `cubic-bezier(0.4,0,0.2,1)`. |
| Spring animation | Stiffness / damping (Framer Motion / Motion, not native CSS) | "Use a spring (e.g. stiffness ~400, damping ~36) for physical/interactive feedback" — physics-based, no fixed duration. Reserve for genuinely physical interactions, not UI chrome. |
| Stagger | Sequential `animation-delay` (e.g. 0 / 80 / 160ms) | "Stagger the children with increasing `animation-delay`" — reveal in sequence rather than all at once. |
| Duration tokens | `--duration-fast` / `--duration-base` / `--duration-slow` | "Use distinct durations by element size" — small/fast (100–200ms), medium (300–500ms), large/page (300–700ms). |
| Motion principles | (Design vocabulary, not a single property) | Entrance / exit (arrive vs leave), spatial continuity (objects move along coherent paths), anticipation, follow-through — describe *intent* of a transition. |

---

## State

The full interactive state set every interactive component should define. The agent flags any missing state as a finding. Missing focus-visible is CRITICAL (keyboard accessibility); other missing states are typically MAJOR — score per `references/scoring-and-report.md`.

| State | CSS selector / signal | Plain-language phrasing |
|---|---|---|
| default | base rule | The resting appearance. |
| hover | `:hover` | "On hover, lighten ~4%." Pointer-over feedback. |
| focus-visible | `:focus-visible` | "Show a 2px focus ring at ≥3:1 contrast on keyboard focus; never remove the outline without a visible replacement." |
| active / pressed | `:active` | "On press, scale to 0.98." Momentary pressed feedback. |
| disabled | `:disabled` / `[aria-disabled]` | "Disabled = ~40% opacity, no pointer events." |
| loading | `[aria-busy="true"]` | "Show a spinner / disable input while the action is in flight (>300ms)." |
| skeleton | placeholder element + subtle pulse/wave | "Render a neutral skeleton while container content loads." |
| empty | empty-state component | "When there is no data, guide the user to the first action — not a blank screen." |
| error | error styling + message + icon (not color alone) | "Show an inline, specific, actionable error adjacent to the field." |
| success | success styling + confirmation | "Confirm the completed/valid state." |

---

## Responsive

| Term | CSS property / technique | Plain-language phrasing |
|---|---|---|
| Viewport | Device screen size (`vw`/`vh`, `meta viewport`) | The physical screen/window dimensions. |
| Breakpoint | `@media` (device) / `@container` (content) | Width at which layout changes; see [Layout](#layout). |
| Fluid | `clamp()`, `%`, `vw`, `min()`/`max()` | "Scale continuously between sizes" rather than snapping at fixed breakpoints. |
| Adaptive | Discrete layouts swapped at breakpoints | "Swap to a distinct layout per device class." Adaptive = stepped layouts; fluid = continuous scaling. |

Guidance: "Prefer container (content) breakpoints over device breakpoints where possible" — a component that responds to its own width is reusable in any context. Viewport/device-class checkpoints and per-breakpoint padding/type values live in `references/design-system-reference.md`.
