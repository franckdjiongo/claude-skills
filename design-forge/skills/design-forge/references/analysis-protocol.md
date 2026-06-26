# Analysis Protocol — How to Look (AUDIT Mode)

This file is the order-of-operations for analyzing **passive evidence** (screenshots and video) in AUDIT mode. It defines *how to look*, not *what to look for* or *what to do next*.

- **What to look for** (specific defects): `references/defect-taxonomy.md` (visual + UX) and `references/edge-cases.md` (implementation/content-resilience).
- **Severity legend, scoring, per-finding format, JSON schema**: `references/scoring-and-report.md`.
- **Active/live driving of a running app** (clicking, keyboard nav, resizing, DevTools): `references/testing-protocol.md`. AUDIT is observation-only; if you can *operate* the app, you are in TEST mode.
- **Reference values to compare against** (type tables, spacing scales, motion tokens): `references/design-system-reference.md`.

## Table of Contents
- [Operating Principle](#operating-principle)
- [Screenshot Analysis — Order of Operations](#screenshot-analysis--order-of-operations)
- [Estimating Values From Pixels](#estimating-values-from-pixels)
- [Video Analysis Checklist](#video-analysis-checklist)
- [Cross-Page / Cross-Region Comparison](#cross-page--cross-region-comparison)
- [Annotation Methodology](#annotation-methodology)
- [Evidence Limits & Honesty Rules](#evidence-limits--honesty-rules)

---

## Operating Principle

Run passes in a **fixed sequence, coarse-to-fine**. Each pass has one job; do not jump ahead to component pixels before the squint test has told you whether the page even has a focal point. Complete a pass across the *whole* image before descending to the next level of detail. This prevents tunnel-vision on one card while a global hierarchy failure goes unrecorded.

Catalog findings as you go using the annotation format below; do not wait until the end to write them up.

---

## Screenshot Analysis — Order of Operations

Run these seven passes **in order** on every screenshot.

### Pass 1 — Squint test (overall impression)
Defocus / step back from the image. Judge only the **global** layer:
- Is there **one** clear focal point and visual hierarchy, or do multiple elements compete?
- Is visual weight **balanced** across the layout, or lopsided?
- Are there immediate **AI-slop tells** visible from across the room — purple→indigo gradient, gradient text, Inter as the sole face, repeated 3-column icon-card grid, oversized italic-serif hero, glassmorphism, side-tab accent borders? (Catalog and vocabulary: `references/anti-slop-rules.md`.)

Record the first impression before you start measuring — it is the user's first impression too.

### Pass 2 — Typography
- **Identify the typefaces.** Name the apparent display face and body face. Flag a single generic face used for everything.
- **Measure size ratios** between hierarchy steps. A healthy scale steps by ≥ `1.25` (Major Third). Flag a flat hierarchy where heading and body differ by only a few px (e.g., 16px body next to an 18px heading).
- **Line-height (leading):** estimate body leading (target `1.4`–`1.6`) and heading leading (`1.1`–`1.3`).
- **Letter-spacing (tracking):** large display headings should carry slight negative tracking; small caps/labels positive. Flag crushed glyphs.
- **Measure (line length):** estimate characters per line; target 45–75ch. Flag lines past ~80ch.

### Pass 3 — Spacing & text alignment
- Overlay a **mental 8px grid** (4px for icon-level/tight gaps). Flag arbitrary values that snap to neither (13px, 27px).
- **Padding consistency:** compare padding on same-type elements across the screen (e.g., every card). Flag one page mixing 16/20/24px on the same component.
- **Region-to-region rhythm:** measure section-to-section and group-to-group gaps. Flag monotonous identical spacing everywhere (no rhythm) and flag cramped vs over-sparse regions.

**Text alignment is a first-class check, not an afterthought.** Centering is the single most common AI-slop layout tell; treat any centered block longer than one line as suspect until proven deliberate. Walk every text block and flag:
- **Centered multi-line body copy.** Body paragraphs of ≥ 2 lines should be left-aligned (ragged-right). Centered multi-line copy creates jagged left edges that destroy scan-ability. Flag any centered paragraph past one line.
- **Centered long-form blocks.** Any centered run of body text wider than ~`50ch` or taller than ~3 lines — feature descriptions, card body text, full-width prose sections — is a defect regardless of line count.
- **Mismatched alignment between adjacent sections.** Two stacked sections (e.g., a centered hero followed by a left-aligned feature list, then a re-centered CTA block) that flip alignment with no deliberate rhythm read as inconsistent. Flag alignment that toggles section-to-section.
- **Measure & margins under centering.** Confirm centered text still respects the 45–75ch measure from Pass 2; centered blocks frequently stretch to full container width (90ch+) because no `max-width`/`measure` constraint is set. Flag centered copy with no measure cap.

Confirm centered-vs-left is **deliberate**: centering is legitimate only for short hero headlines, eyebrows/kickers, single-line CTAs, and isolated quotes/stats — never for long-form reading. **Fix direction:** left-align all multi-line and long-form body copy (`text-align: left`), and reserve `text-align: center` for short hero/eyebrow text under ~`40ch`; cap centered blocks with an explicit `max-width` token honoring the 45–75ch measure. Record each as a four-part annotation (this maps to the alignment defects in `references/defect-taxonomy.md`).

### Pass 4 — Color / contrast
- **Sample foreground/background pairs** for every text block and UI component. Estimate the contrast ratio `ρ = (L_lighter + 0.05) / (L_darker + 0.05)`. Compare against the AA/AAA thresholds in `references/design-system-reference.md`.
  - Contrast is **estimated** from a screenshot, not authoritative. State that a tool (`axe`, Lighthouse, or a DevTools sampler) must confirm borderline pairs — see `references/automated-tools.md`. Never assert a precise ratio as measured fact from a JPEG.
- **Accent overuse:** estimate the share of screen in the saturated brand accent. Flag heavy saturation across large surface area.
- **Gray-on-color**, semantic misuse (red/amber/green), and muddy temperature mixes — flag visually; defer the catalog to `references/defect-taxonomy.md`.

### Pass 5 — Alignment
- Zoom to **200–400%**. Check left/right/top/bottom edges of stacked and adjacent elements against shared vertical and horizontal axes.
- Flag 1–3px misalignments, off-grid elements, and broken edge axes.
- Distinguish **optical** from **mathematical** alignment: play triangles, text inside pills, and asymmetric glyphs may *look* off while being mathematically centered (and vice versa). Judge by eye, then confirm at zoom.

### Pass 6 — Component (pixel level)
At high zoom, inspect individual components:
- **Radii:** is there one coherent radius scale, or drift / a "blob" on a small element?
- **Shadows / elevation:** progressive and consistent, or identical depth on everything (or hairline-border + wide-diffuse combined)?
- **States visible in the shot:** is a focus ring present where focus is shown? hover/active/disabled rendered correctly?
- **Icons:** consistent stroke weight, optically matched to adjacent text, on a shared grid?

### Pass 7 — Compare regions (within the same screenshot)
- Header vs footer: do they align to the same horizontal axes and margins?
- Repeated cards / list rows: are padding, radius, shadow, and type identical instance-to-instance?
- Flag any drift between elements that should be identical.

---

## Estimating Values From Pixels

You are reading a raster image, so all measurements are **estimates**. Make them disciplined:
- **Anchor to a known dimension.** If the viewport width is known (e.g., a 1440px desktop capture), use it as a ruler to back-calculate paddings, gaps, and font sizes by proportion.
- **Round to the grid.** Report spacing as the nearest 4/8px step the value is *trying* to hit, and note the deviation (e.g., "padding ≈ 18px, off the 8px grid; nearest tokens are 16px or 24px").
- **Express ratios, not absolutes, where size is unknown.** When the viewport scale is unknown, report type hierarchy as a ratio ("heading ≈ 1.1× body — flat") rather than inventing px values.
- **Flag, then defer to a tool.** For contrast, exact font metrics, and computed box values, mark the finding as "estimated — confirm with DevTools/axe" rather than asserting precision the image can't support.

---

## Video Analysis Checklist

Step through video frame-by-frame where possible; scrub the same interaction repeatedly. Evaluate each dimension:

| Dimension | What to evaluate | Flag when |
|---|---|---|
| **Transitions** | Duration and easing personality of entrances/exits; presence of jank | Bounce/elastic easing on UI chrome; uniform 300ms on everything; visible jank |
| **Animation timing** | Frame rate (60fps target / 16.7ms per frame); whether layout properties are being animated | Dropped frames; stutter implying width/height/top/left animation instead of transform/opacity |
| **Scroll behavior** | Smoothness; scroll-jacking; momentum; sticky-element behavior | Janky/hijacked scroll; content that fights the user's scroll |
| **Interaction responsiveness** | Latency from input to first visual feedback | Feedback later than ~100ms after a tap/click |
| **State changes** | The loading→loaded sequence; skeletons; whether async results announce | Blank flash instead of skeleton; abrupt content pop-in; no progress for long ops |
| **Feedback latency** | Whether long operations (>300ms) show a loader and (>1s) a progress/skeleton | Long op with no indicator; spinner shown for an instant op |

Easing/duration targets and the GPU-only animation rule live in `references/design-system-reference.md`; specific motion defects and their severities live in `references/defect-taxonomy.md`.

Capacity caveat: not every environment plays video, and frame-stepping fidelity varies. If video cannot be decoded, say so and request key frames as stills. Per-platform media limits: `references/environment-adaptation.md`.

---

## Cross-Page / Cross-Region Comparison

When given multiple screens of the same product, audit for **consistency drift**. Place comparable captures side by side and verify these are identical across pages:

- **Header** alignment, height, and margins
- **Footer** structure and content rhythm
- **Sidebar / nav** width and collapsed/expanded behavior
- **Type scale** (same sizes for the same roles on every page)
- **Spacing tokens** (section and component padding)
- **Button styles** (fill, radius, height, state treatments)
- **Button placement & position** (repeated and floating buttons share size, corner, icon, and on-screen position across pages and breakpoints)
- **Color tokens** (same surface/border/accent values everywhere)

For **button placement & position**, audit beyond style into where the control lives: a primary CTA, a "Back"/"Next" pair, a floating action button, or a scroll-to-top control that is bottom-right on one page must not jump to bottom-left, top-right, or mid-column on another — and its size, corner radius, icon, and offset from the viewport edge must hold across both pages and every breakpoint. Flag a floating button that drifts position between screens, a repeated CTA whose label/icon order or alignment changes, and a fixed control whose edge offset (e.g., `24px` inset) is inconsistent. This maps to the button-placement check in `references/defect-taxonomy.md` (cross-region V6/V7 button-placement consistency and the U1 scroll-to-top control).

Report each inconsistency as a drift finding naming **both** instances and the property that differs (see annotation format). A value that is internally consistent on one page but differs on another is still a defect.

---

## Annotation Methodology

Describe **every** defect with the same four-part structure so it can be scored and turned into a fix prompt downstream:

1. **Location** — region plus an approximate selector / component path, e.g. `.pricing-card > .cta-button`, "global header", "row 3 of the settings list".
2. **Nature** — the CSS property (or design dimension) at fault, e.g. `padding`, `line-height`, `color` contrast, `border-radius`, missing `:focus-visible`.
3. **Current vs expected** — the observed value (estimated, flagged as such) and the target value or token, e.g. "padding ≈ 18px → `var(--space-6)` (24px)".
4. **Severity** — assign per the legend in `references/scoring-and-report.md`. Do not redefine severities here.

**Worked annotation example:**
> **Location:** `.feature-card` (3-up grid, all instances) · **Nature:** `padding` off-grid + `border-radius` drift · **Current:** padding ≈ 18px, radius ≈ 20px (estimated at 1440px capture) · **Expected:** padding `var(--space-6)` 24px, radius `var(--radius-md)` 12px, applied to all siblings · **Severity:** MAJOR.

The annotation captures *what and where*; the **paste-ready correction prompt** (component named, current value, exact target value/token, negative constraints) is assembled per the anatomy in `references/scoring-and-report.md`. Keep every prompt standalone — never write "the issue above" or "as noted".

---

## Evidence Limits & Honesty Rules

State these constraints in the report whenever they apply; they change what you may assert:

- **A screenshot is a single state.** You cannot see hover, focus, active, disabled, loading, empty, or error states unless they are captured. Do not claim a state is missing — claim it is **not evidenced** and recommend capturing it or driving the live app (TEST mode: `references/testing-protocol.md`).
- **Contrast, font metrics, and computed boxes are estimated** from pixels. Flag borderline values for tool confirmation (`references/automated-tools.md`); never report an estimate as a measured ratio.
- **No accessibility tree, no DOM, no keyboard.** From a static image you cannot verify tab order, ARIA, semantic HTML, or screen-reader behavior — only what is visually implied. Recommend the accessibility-tree inspection and manual AT pass that AUDIT cannot perform.
- **Responsive behavior needs multiple captures.** One viewport shows one layout. Do not infer reflow, breakpoints, or touch-target sizing at other widths from a single screenshot; request the missing viewports (matrix in `references/design-system-reference.md`).
- **Do not score a dimension you did not observe as a pass — report it NOT EVIDENCED.** Absence of evidence is not a passing grade. If the captures supplied never exercised a dimension (no mobile width, no footer/below-fold capture, no hover/focus/error state, no motion clip), that dimension is **NOT EVIDENCED**, not "OK". Leaving it unmentioned silently reads as a pass and inflates the score; name it explicitly as not evidenced and list the capture that would close the gap. This mirrors the **Evidence-gated scoring (no pass on an unobserved dimension)** rule and the **Viewport coverage** binary gate in `references/scoring-and-report.md`.
- **Responsive reflow ordering/grouping and footer/below-fold cannot be judged from a single desktop screenshot.** A desktop capture cannot show how a multi-column grid collapses to one column, what reading order the stacked items take, how groups regroup, or what sits below the fold (footer composition, scroll-to-top, late-loading sections). **Never certify a responsive-grid section, a single-column reflow order, or footer/below-fold composition from a desktop screenshot alone.** Mark these NOT EVIDENCED and either request the small-mobile captures (320 / 360 widths — Small-mobile class in `references/design-system-reference.md`) plus a full-height/footer capture, or drive the live app (TEST mode: `references/testing-protocol.md`, single-column reading-order check `TEST-MOBILE-REFLOW`).
