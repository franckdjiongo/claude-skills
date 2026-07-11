# Defect Taxonomy — What to Detect

The detection checklist for AUDIT and TEST modes. Each defect gives: **detection criteria**, **why it matters**, a **severity tag**, and a **short fix direction**. Walk these groups against every screenshot, frame, or live screen.

Severity tags (`CRITICAL` / `MAJOR` / `MINOR` / `ENHANCEMENT`) are defined — with their scoring weights and the report/finding format — in `references/scoring-and-report.md`. Do not redefine them here.

This file is the **defect catalog only**. For related concepts, link out:
- Generic AI-default aesthetic ("slop") tells → `references/anti-slop-rules.md`.
- Exact brand/design-system reference values (Apple HIG type table, Material 3 tokens, Vercel/Stripe/Linear/Tailwind) → `references/design-system-reference.md`.
- Implementation / edge-case defects (CLS, font-loading FOUT/FOIT, z-index wars, overlays, i18n, overflow, cross-browser, HiDPI, CSS anti-patterns, semantic-HTML) → `references/edge-cases.md`.
- Severity definitions, scoring, finding format, JSON schema → `references/scoring-and-report.md`.

---

## Table of Contents

**Visual defects**
- [V0. Hero & First Viewport](#v0-hero--first-viewport)
- [V1. Typography](#v1-typography)
- [V2. Spacing & Layout](#v2-spacing--layout)
- [V3. Color](#v3-color)
- [V4. Grid & Alignment](#v4-grid--alignment)
- [V5. Responsive](#v5-responsive)
- [V6. Component Quality](#v6-component-quality)
- [V7. Visual Hierarchy](#v7-visual-hierarchy)
- [V8. Imagery & Icons](#v8-imagery--icons)

**UX defects**
- [U1. Navigation](#u1-navigation)
- [U2. Interaction Design](#u2-interaction-design)
- [U3. Form UX](#u3-form-ux)
- [U4. Content UX](#u4-content-ux)
- [U5. Accessibility](#u5-accessibility)
- [U6. Performance Perception](#u6-performance-perception)

---

# VISUAL DEFECTS

## V0. Hero & First Viewport

The first viewport (the hero / above-the-fold landing region) is the highest-weight first impression. Measure the rendered hero block height against the viewport height **per device class** (small-mobile 320/360, mobile, tablet, desktop — the matrix in `references/design-system-reference.md`). Capture only after entrance animations have settled (see `references/testing-protocol.md`, *settle-animations-before-capture*).

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| V0-01 Hero does not fill the viewport | Rendered hero block height is materially less than the viewport (≤ ~80% of viewport block-size) — or overflows it, clipping the headline/CTA — at a given device width; measure hero height vs viewport height per device class | A short hero wastes the strongest first impression and reads as a fragment; an overflowing hero hides the headline or CTA below the fold | MAJOR |
| V0-02 Missing scroll-down cue | A full-viewport landing hero with no affordance signalling that content continues below (no chevron, arrow, "scroll", or peeking next-section edge) | A 100vh hero with no cue reads as a dead end; users don't know to scroll | MAJOR |
| V0-03 Weak hero engagement | Flat/static hero — no background imagery, no depth (gradient/layering/parallax), no entrance motion, OR a focal subject obstructed by overlaid text/controls | The hero carries the brand's first emotional beat; a bare centered headline on a flat fill reads as a generic template, not a product | MAJOR / ENHANCEMENT |

**Fix directions:**
- V0-01 hero height → `"The hero in [.hero] renders ~620px tall inside a 900px viewport, leaving the fold half-empty. Set min-block-size: 100svh (use the small/dynamic viewport unit svh or dvh, never bare vh — vh ignores mobile browser chrome and over/undershoots). Vertically center the hero content (display: grid; place-content: center) and keep a visible scroll cue anchored to the bottom. Do not exceed 100svh or let the headline/CTA overflow below the fold. Tokens: --space-* scale for internal padding."`
- V0-02 scroll cue → `"The full-viewport hero in [.hero] gives no signal that content continues below. Add a scroll-down indicator (a chevron/arrow or 'Scroll' label) anchored to the hero's bottom (position: absolute; inset-block-end: var(--space-6); inset-inline: 0; margin-inline: auto), with a restrained 2s ease-in-out bob wrapped in @media (prefers-reduced-motion: no-preference). Give it an aria-label='Scroll to content' and ≥3:1 contrast against the hero. Do not animate it under reduced-motion; do not let it cover the CTA."`
- V0-03 hero engagement → `"The hero in [.hero] is a centered headline on a flat #0B0B0F fill — no imagery, depth, or motion. Add an on-brand background (a real product/scene image with object-fit: cover, or a layered depth treatment) plus a restrained entrance: opacity 0→1 + 12px translateY over 500ms ease-out, staggered headline→sub→CTA, wrapped in @media (prefers-reduced-motion: no-preference). Keep the focal subject unobstructed (text on a scrim, not on the subject's face). 'Engaging' must NOT mean AI slop — no purple→blue gradient mesh, no glassmorphism, no generic abstract blobs (see references/anti-slop-rules.md). Tokens: --color-bg, --color-accent, --space-* for stagger offsets."`

---

## V1. Typography

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Flat type hierarchy | Adjacent type steps use a ratio under `1.25` (e.g. 16px body next to an 18px heading) | No perceptible hierarchy; everything reads at the same level | MAJOR |
| Body line-height too tight | Body `line-height` < `1.4` (browser default `1.2` is too tight); headings outside `1.1`–`1.3` | Cramped, hard-to-scan blocks; tight leading on body kills readability | MAJOR if body < `1.3` |
| Light-weight UI text | Body/UI text at weight `300` (or any weight < `400` at small sizes) | Sub-400 weights are too hard to read at UI sizes; de-emphasis belongs to color/size, not weight | MINOR |
| Mismatched tracking | Large headings (32px+) at default/positive tracking; small caps/labels with no positive tracking; glyphs crushed together | Display type wants slightly negative tracking (`−0.5` to `−2px`); labels/all-caps want positive; crushed letter-spacing loses glyph shape | MINOR |
| Long measure | Line length outside 45–75 characters per line (~20–35em); flag lines > 80ch | Too-wide lines lose the return sweep; too-narrow fragments reading rhythm | MAJOR (readability) |
| Paragraph spacing too tight | Space below a paragraph ≤ its `line-height` (should be ≈ body font size, e.g. 16px body → ~16px gap) | If paragraph gap doesn't exceed line-height, blocks don't read as separate | MINOR |
| Orphans / widows | Single word stranded on a last line, or a single line stranded from its block | Ragged, unpolished text edges | MINOR |
| Text truncation / clipping | Text clipped with no ellipsis, or content overflowing its container and forcing horizontal scroll | Lost information; broken-looking layout | MAJOR |
| Off-baseline rhythm | Line-heights not multiples of 4px (won't align to a 4px baseline grid) | Vertical rhythm drifts across stacked text blocks | MINOR |
| All-caps body text | Long passages set in uppercase | Word-shape recognition is lost; uppercase is for short labels only | MAJOR |
| Blurry / mis-smoothed text | Blurry text from sub-pixel positioning or transform scaling; missing `-webkit-font-smoothing: antialiased` on dark backgrounds | Fuzzy text reads as low quality | MINOR |

**Font-family choice** (Inter/Roboto/Open Sans/Geist/`system-ui` as the sole face, single-font flat hierarchy, oversized italic-serif hero) is an AI-slop tell, not a generic typography defect — detect and prompt it per `references/anti-slop-rules.md`.

**Fix directions:**
- Flat hierarchy → `"The h1, h2, and body in [component] are all ~16px. Apply a Major Third (1.25) type scale: h1 39px / h2 31px / h3 25px / body 16px. Set headings to weight 700 and body to 400. Do not differentiate hierarchy by color alone."`
- Tight body leading → `"Body copy in [selector] has line-height 1.2. Set line-height: 1.5 for body text and 1.2 for headings (32px+). Do not exceed 1.6 on body."`
- Long measure → `"Paragraph text in [selector] spans the full container width (~110ch). Constrain it with max-width: 65ch so line length stays 45–75 characters. Do not center long body paragraphs."`
- All-caps body → `"The paragraph in [selector] is set in all-caps (text-transform: uppercase). Set it in sentence case. Reserve uppercase for short labels/eyebrows under ~3 words only."`

### Modular scale ratios (reference)

| Name | Ratio |
|---|---|
| Minor Third | 1.200 |
| Major Third | 1.250 |
| Perfect Fourth | 1.333 |
| Augmented Fourth | 1.414 |
| Perfect Fifth | 1.500 |
| Golden | 1.618 |

A scale ratio **≥ 1.25** is the floor for a perceptible hierarchy. Example Major Third ramp from a 16px base: `16 / 20 / 25 / 31 / 39px`.

---

## V2. Spacing & Layout

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Off-grid spacing | Padding/margin/gap not a multiple of 4 (icons/tight gaps) or 8 (general) — arbitrary values like 13px, 27px | Breaks the 4pt/8pt spacing system; reads as careless | MAJOR |
| Inconsistent component padding | Same component type uses different padding on one page (cards at 16 vs 20 vs 24px) | Visual inconsistency erodes the sense of a system | MAJOR |
| Monotonous spacing | The same spacing value used everywhere — no tight grouping of related items, no generous separation between sections | No rhythm; Gestalt proximity can't group related content | MAJOR |
| Cramped or over-sparse density | UI feels cramped, or so sparse it reads as empty; premium products use 64–120px section padding | Density signals craft and trust; wrong density degrades perceived quality | MAJOR |
| Nested cards | Cards inside cards inside cards | Boxes-in-boxes is visual noise; depth should come from spacing/typography | MAJOR |
| Unexpected margin collapse | Vertical margins collapsing between blocks, producing gaps smaller than authored | Spacing reads as broken/inconsistent | MINOR |
| V2-07 Desktop-only spacing leaking into the mobile stack | Gaps/margins set with **no** responsive override (`mt-5`, `gap-6`, `gap-8` with no `lg:` variant) inside a container that collapses to one column, inserting a ≥ ~`1rem` gap between a group member (icon/index/label) and the heading it modifies | Spacing tuned for a horizontal desktop layout is wrong once the container stacks: the large gap breaks Gestalt proximity, so the icon/number no longer reads as grouped with its heading. Pairs with V5-06 on the same collapse; verify at 320/360 per *TEST-MOBILE-REFLOW* (`references/testing-protocol.md` §2) | MAJOR |
| V2-08 Inline pair crowding (text ↔ adjacent badge/stamp/count) | A text label and its inline companion (status badge, stamp, counter, chip) sit < ~6–8px apart — visually touching — anywhere a `text + badge` pair renders; in repeated lists, also check the pair reads consistently row after row (field lesson 2026-07: list of project names with a status stamp glued to each name passed a full audit) | Micro-spacing between an element and its qualifier is what the eye uses to parse "name, then status"; a glued pair reads as one garbled token and the whole list looks unfinished — this class hides in plain sight because each row passes contrast/size checks individually | MAJOR |

**Fix directions:**
- Off-grid → `"Padding in [selector] is 13px and 27px. Snap all spacing to a 4px/8px scale: use 12px or 16px (not 13px) and 24px or 32px (not 27px). Apply the same scale to margins and gaps."`
- Inconsistent padding → `"The cards in [section] use 16px, 20px, and 24px padding. Set all sibling cards to a single value: padding: var(--space-6) (24px). Match across the whole section."`
- Cramped section → `"The [section] feels cramped and untrustworthy. Set section padding to 96px desktop / 48px mobile, 32px gap between cards, body copy max-width 65ch. Goal: a calm, premium, Stripe-like density. Do not reduce below 8px-grid values."`
- Nested cards → `"[Component] nests cards three levels deep. Flatten to a single card; separate inner groups with 24px spacing and a hairline divider (1px, var(--border)) or a heading instead of another bordered container."`
- V2-07 desktop spacing leak → `"In [.feature-item], gap-8 (32px) and mt-5 (20px) have no responsive override, so when the row collapses to one column on mobile a 32px gap is inserted between the icon (.feature-icon) and its heading, breaking the grouping. Move the large gaps behind lg: (e.g. lg:gap-8) and set tighter mobile values so each {icon, number, label, heading} group reads within ~0.5rem: gap: var(--space-2) (8px) at mobile, escalating to var(--space-8) at lg. Verify at 320/360px that related members sit within ~0.5rem and section-level separation stays generous. Do not apply one gap value across both axes/breakpoints. Tokens: --space-2 (intra-group), --space-8 (desktop inter-column)."`
- V2-08 inline pair crowding → `"In [list selector], each item name renders with its status badge glued to the text (< 6px). Give every text↔badge pair a consistent breathing gap — e.g. display:flex; align-items:baseline; gap: var(--space-2) on the row, or column-align the badges to a common right edge if rows repeat (pick ONE strategy for the whole list). Verify with a zoomed screenshot that no name touches its badge and the pattern is identical on every row, including the longest name (wrap or truncate the name — never compress the gap)."`

---

## V3. Color

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Body-text contrast fail | Body text < `4.5:1` against its background (AA); AAA target `7:1` | Fails WCAG 1.4.3; legally referenced (DOJ/ADA; EAA in force since 28 June 2025) | CRITICAL (legal) |
| Large-text contrast fail | Large text (≥ 24px, or bold ≥ 18.66px) < `3:1`; AAA `4.5:1` | Fails WCAG 1.4.3 for large text | CRITICAL (legal) |
| UI-component contrast fail | Interactive components, borders, icons, focus indicators, and meaningful graphical objects < `3:1` against adjacent colors | Fails WCAG 1.4.11; controls/states become invisible to low-vision users | CRITICAL |
| Color-only information | State/meaning conveyed by color alone (error red with no icon/label; required field marked only by color) | Fails WCAG 1.4.1; invisible to color-blind users | CRITICAL |
| Gray-on-color | Gray text laid over a colored background | Looks washed out / muddy; use a darker shade of the bg hue, or near-white | MAJOR |
| Accent overuse | More than ~10% of the screen in the saturated brand accent | Dilutes the accent; it should mark the single most important action | MAJOR |
| Semantic color misuse | Red used for non-destructive, green for errors, etc. (expected: red=error/destructive, amber=warning, green/blue=success/links) | Miscommunicates state; users misread outcomes | MAJOR |
| Muddy neutrals / temperature drift | Grays mix warm and cool inconsistently; foreground/background separation feels muddy | Inconsistent temperature reads as unpolished | MINOR |
| V3-09 Translucent sticky/fixed-header bleed-through | A top-pinned `sticky`/`fixed` element has a translucent fill (rgba/hsla alpha < ~0.9, 8-digit hex last byte < ~`E6`, or Tailwind `bg-*/NN` with `NN < 90`) and/or `backdrop-filter: blur`, with **no** opaque `@supports` fallback and **no** opaque scrim; its own nav/logo text must hold ≥ `4.5:1` against the *worst* content that scrolls beneath it, not just the resting page background | Fails WCAG 1.4.3 once high-contrast content slides under the glass header: nav/logo text that passed at rest drops below `4.5:1`. Must be verified by scrolling high-contrast content under the header (`references/testing-protocol.md` §7 *TEST-SCROLL-HEADER*), never judged from the resting state alone | CRITICAL (WCAG 1.4.3) |

Contrast ratio formula: `ρ = (L_lighter + 0.05) / (L_darker + 0.05)`, where `L` is relative luminance. Estimate from sampled foreground/background pairs; confirm with a tool (`references/automated-tools.md` for axe/pa11y).

**Fix directions:**
- Body contrast → `"In [selector], helper text is #9CA3AF on #FFFFFF (2.8:1, fails AA). Darken to #4B5563 (~7:1 on white). Keep the same hue family; do not lighten the background to compensate."`
- Color-only state → `"The error state in [field] is signaled only by a red border. Add an inline error message and a warning icon adjacent to the field. Do not rely on color alone (WCAG 1.4.1)."`
- Accent overuse → `"The brand accent (var(--primary)) fills >40% of [view] (multiple buttons, badges, links). Limit saturated accent to ~10% of the screen — reserve it for the single primary action. Use neutral surfaces and a neutral border for the rest."`
- V3-09 translucent header bleed-through → `"The sticky header [header.site-header] uses background: rgba(255,255,255,0.6) + backdrop-filter: blur(12px) with no opaque fallback, so its nav text drops to ~2.9:1 when the dark hero image scrolls under it. Add a scrolled variant at ~0.92–0.94 alpha (background: rgba(255,255,255,0.93)) applied once the page scrolls past the hero, AND an @supports not (backdrop-filter: blur(1px)) { background: var(--color-surface); } opaque fallback (or an opaque scrim layer behind the content). Verify nav/logo text holds ≥4.5:1 against the worst content that passes beneath, not just the resting background. Do not raise the alpha on a .glass utility shared with modals/overlays — scope this to the header only. Never rely on backdrop-filter alone for legibility (WCAG 1.4.3). Tokens: --color-surface, --color-on-surface."`

Brand-specific palettes, OKLCH/HCT tokens, and exact hex values live in `references/design-system-reference.md`. Purple→blue / indigo→violet gradients and gradient text are AI-slop tells — see `references/anti-slop-rules.md`.

---

## V4. Grid & Alignment

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Off-grid elements | Elements don't snap to a 12-column grid's columns/gutters | Layout reads as ad hoc; breaks structural rhythm | MAJOR |
| Edge misalignment | Left/right edges of stacked elements don't share a vertical axis (1–3px drift) | Tiny misalignments are subconsciously read as sloppiness | MAJOR |
| Optical-centering miss | Asymmetric glyphs (play triangle, text in a pill) mathematically centered but visually off | Mathematical centering looks wrong for asymmetric shapes | MINOR |
| Unbalanced visual weight | Heavy elements cluster on one side; layout looks lopsided | Imbalance feels unintentional and unstable | MINOR |

**Fix directions:**
- Edge misalignment → `"In [section], the heading left edge sits 3px inside the card body's left edge. Align both to a single left axis (same container padding-inline). Remove the stray offset; do not add a margin to nudge."`
- Optical centering → `"The play icon in [.play-button] is mathematically centered but looks left-heavy. Nudge it ~2px right (e.g. translateX(1px)) so it appears optically centered inside the circle."`

---

## V5. Responsive

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Horizontal scroll on mobile | Fixed pixel widths or overflowing content cause horizontal scroll at mobile widths | Breaks the core mobile experience; content unreachable | CRITICAL |
| Broken breakpoint reflow | Layout doesn't reflow cleanly at 375/390/414 (mobile), 768/834/1024 (tablet), 1280/1440/1920 (desktop) | Content overlaps, clips, or stretches at real device widths | MAJOR |
| Touch target too small | Interactive target < `44×44` CSS px (Apple HIG / WCAG AAA 2.5.5); WCAG AA floor (2.5.8) is `24×24` px or `24px` spacing; Material recommends `48×48` dp | Below 44×44 is hard to tap; below the 24×24 AA floor fails law | CRITICAL (mobile) |
| Adjacent targets too close | Less than `8px` between adjacent tap targets | Mis-taps; fails spacing route of WCAG 2.5.8 | CRITICAL (mobile) |
| Reflow loss at zoom | Content doesn't reflow without loss at 400% zoom (WCAG 1.4.10) | Fails reflow requirement; low-vision users lose content | MAJOR |
| V5-06 Mobile single-column collapse: illogical reading order / orphaned affordance | A responsive grid/flex split (`md:`/`lg:`/`sm:grid-cols-*`, `lg:grid-cols-[…fr…]`, `sm:flex-row`) with **no** `order-*` or `grid-template-areas` scoping the mobile order, so it collapses to raw DOM source order; flag when a small icon or an index/step number becomes its own full-width row *above* the heading it labels | The leading icon/number and its heading are one Gestalt unit; when the column collapse strands the icon on its own row, the affordance reads as orphaned and the step sequence becomes ambiguous. Confirm via the single-column reading-order pass (`references/testing-protocol.md` §2 *TEST-MOBILE-REFLOW* at 320/360) | MAJOR |

Per-viewport expected columns / padding / type / nav targets are owned by the responsive matrix in `references/design-system-reference.md` (small-mobile 320/360 class included). Drive these viewports live per `references/testing-protocol.md`.

**Fix directions:**
- Touch target → `"The .icon-button is 16×16px. Set min-width: 44px; min-height: 44px with the icon centered. Ensure ≥8px gap from neighboring targets. Do not shrink the icon glyph — pad the hit area."`
- Horizontal scroll → `"At 375px, [section] forces horizontal scroll because [element] has a fixed width: 480px. Replace with max-width: 100% and fluid units; allow the row to wrap. Verify no horizontal scrollbar at 375px."`
- V5-06 orphaned affordance on collapse → `"In [.step-grid], the lg:grid-cols-[auto_1fr] layout collapses to one column at mobile, leaving the step number (.step-index) stranded as its own full-width row above its heading. Regroup the leading number/icon to share a row with its heading on mobile: wrap {number, heading} in a flex container (display: flex; align-items: center; gap: var(--space-2)) for small widths, OR render an inline lg:hidden number prefix beside the heading and keep the hidden lg:block number column for desktop. Verify at 320 and 360px that each {icon/number, heading} reads as one unit, top-down, in logical step order. Do not rely on raw DOM source order. Tokens: --space-2 for the icon-to-heading gap."`

---

## V6. Component Quality

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Inconsistent border-radius | No single radius scale; small card radius > 24px ("blob"); full-pill (9999px) used outside tags/buttons; cards above the ~12–16px ceiling | Mixed radii read as unsystematic; oversized radius reads as toy-like | MAJOR |
| Flat / inconsistent shadows | Identical shadow depth on every element, OR a hairline border combined with a wide diffuse shadow | No elevation hierarchy; the border+shadow combo is a quality tell | MAJOR |
| Icon sizing / alignment | Icons not optically matched to text (should be ~20–24px beside a 16px label), inconsistent stroke weight, off the icon grid, or oversized containers larger than their content | Mismatched icons read as amateur; "massive icon" boxes unbalance layout | MAJOR |
| Missing button states | Any of default / hover / `focus-visible` / active(pressed) / disabled / loading not defined | Missing focus ring fails accessibility; missing hover/active feels dead | CRITICAL (focus) / MAJOR (others) |
| Missing input states | Any of default / focus / filled / error / disabled missing; no visible focus ring | Users can't tell field status; no focus ring fails accessibility | MAJOR |
| Blank empty state | A list/container that can be empty shows a blank screen instead of guidance to the first action | Dead end; user doesn't know what to do next | MAJOR |
| Weak error state | Error not inline, not specific, or not actionable | User can't recover; generic errors erode trust | MAJOR |
| Missing skeleton loader | Container loads with no skeleton/placeholder (skeleton should be neutral with a subtle wave/pulse) | Perceived slowness; content pops in jarringly | MINOR / ENHANCEMENT |
| Inconsistent button placement / positioning | Repeated and floating buttons (CTAs, FABs, scroll-to-top, chat launcher) don't share size, corner radius, icon treatment AND screen position across pages and breakpoints — e.g. the FAB sits bottom-right on one page and bottom-left on another | Inconsistent placement breaks muscle memory and reads as assembled from parts; floating controls must land in the same place everywhere. Confirm with the cross-region comparison in `references/analysis-protocol.md` | MAJOR |

**Fix directions:**
- Button states → `"Apply across all buttons: default; :hover (lighten fill 4%); :focus-visible (2px ring, ≥3:1 contrast vs background); :active (transform: scale(0.98)); :disabled (40% opacity, pointer-events: none); and a loading state with a spinner and aria-busy. Use 150ms ease-out transitions. Never remove the outline without a visible replacement."`
- Radius drift → `"Border-radius is inconsistent across [components]. Differentiate by role: cards 12–16px, inputs 6–8px, pills/tags 9999px. Do not apply one uniform radius, and do not exceed 16px on small cards."`
- Empty state → `"The deployments list shows a blank panel when empty. Add an empty state: a short heading, one line of guidance, and a primary CTA — e.g. 'No deployments yet. Push to your Git repository to create one.' Do not leave the container blank."`
- Flat shadows → `"Every card uses the same box-shadow. Build a progressive elevation scale (--elevation-1…3) where raised surfaces get more diffuse, larger-offset shadows. Do not combine a 1px border with a wide diffuse shadow on the same element."`
- Inconsistent button placement → `"The floating controls — scroll-to-top (.to-top), chat launcher (.chat-fab), and the page CTA (.cta-fab) — vary in size, radius, and screen corner across routes (bottom-right on /home, bottom-left on /pricing). Standardise: pin all bottom-anchored floating buttons to the same corner (inset-block-end: var(--space-6); inset-inline-end: var(--space-6)), give them one shared size (≥44×44px) and radius, and a consistent icon treatment (same stroke weight/optical size). Stack multiples in a fixed order with a consistent gap. Keep the same placement at every breakpoint. Cross-check against the cross-region comparison in references/analysis-protocol.md so placement matches across pages. Tokens: --space-6 (inset), --radius-full, --shadow-2."`

Uniform border-radius everywhere, glassmorphism, colored glow shadows on dark, and side-tab accent borders are AI-slop tells — see `references/anti-slop-rules.md`.

---

## V7. Visual Hierarchy

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Broken stacking / elevation logic | Overlays sit below content, or stacking context is inconsistent so elements layer wrongly | Modals/dropdowns hidden behind content; broken interactions | MAJOR |
| Competing focal points | Two (or more) filled, equal-weight primary CTAs in one view; no single clear primary action | Splits attention; user doesn't know the intended next step | MAJOR |
| Ignored scan pattern | Key info not placed for the natural scan path — F-pattern for text-dense screens, Z-pattern for landing pages (lead top-left / leading edge) | Important content lands where eyes don't go first | MINOR |
| Header information overload / weak hierarchy (per breakpoint) | Evaluate the header at desktop, tablet AND mobile: too many competing primary items, no clear single emphasis, or secondary actions that should collapse into a menu at smaller widths still shown inline | A header crammed with equal-weight items has no scan anchor and overflows or crowds tap targets as the viewport narrows; check at every breakpoint, not just desktop (`references/testing-protocol.md`, Phase 2 *header-density*) | MAJOR / MINOR |
| Footer structure / composition | Footer is a flat link dumping-ground — no logical groups (nav / legal / social / contact), no group headings, uneven density | An unorganised footer buries wayfinding and legal links; grouped, headed columns with balanced density read as finished | MINOR / MAJOR |
| Per-item action inflation | Every item of a repeated list/card collection carries its own full-rank action buttons (full-width, bordered, stacked) — especially a destructive action rendered at equal visual rank on every card (field lesson 2026-07: a 2-item document list where each card stacked two full-width buttons incl. "request deletion") | Actions repeated N times compete with the content N times; a destructive control offered prominently per item invites mis-taps and makes the list read as a button wall — per-item actions belong at quiet rank (text link, kebab/overflow menu, or revealed on hover/focus), with ONE screen-level primary action | MAJOR |

Deep z-index conflicts, stacking-context bugs, and sticky-overlay collisions are implementation defects — see `references/edge-cases.md`.

**Fix directions:**
- Competing CTAs → `"This view has two filled primary buttons of equal weight ('Save' and 'Publish'). Keep one filled primary (the single most important action) and demote the other to a secondary/outline style. Do not use two competing filled CTAs in one view."`
- Header overload per breakpoint → `"The header [header.site-header] shows 7 equal-weight items (logo, 5 nav links, 2 filled buttons) with no hierarchy, and keeps them all inline down to mobile. Rank the items: one primary CTA stays filled, demote the secondary button to a text/outline style, and collapse the nav links + secondary actions into a disclosure menu (hamburger) below the tablet breakpoint. Verify density at desktop, tablet AND mobile so nothing overflows or crowds below 44×44px targets. Do not show every action inline at mobile. Tokens: --color-accent (single primary), --space-* for inter-item gaps."`
- Footer composition → `"The footer [footer.site-footer] is a single flat list of 14 links. Reorganise into logical columns with group headings — Product / Company / Legal / Social — each heading at a clear step above its links (e.g. label weight 600, links weight 400, ~3:1+ size or color separation). Balance column density (roughly even link counts), keep contact/social as their own group, and stack columns vertically on mobile. Do not dump all links into one undifferentiated row. Tokens: --space-8 (inter-column gap), --color-on-surface-muted (links), --color-on-surface (headings)."`
- Per-item action inflation → `"Each card in [list] stacks two full-width bordered buttons ('deposit a new edition', 'request deletion'), so a 10-item list renders 20 buttons and the destructive action is offered at full rank on every card. Demote per-item actions to quiet rank: inline text-links or a single overflow (⋯) menu per card, destructive entry styled var(--danger) INSIDE the menu with its confirm step. Keep exactly one screen-level primary action. Verify with a populated list (≥ 5 items) that content, not chrome, dominates each card."`

---

## V8. Imagery & Icons

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Low-resolution / upscaled images | Blurry or upscaled raster images; no `@2x`/`@3x` asset on HiDPI | Fuzzy imagery reads as low quality on retina screens | MAJOR |
| Distorted aspect ratio | Images stretched/squished; no `aspect-ratio` reserved (also a CLS source) | Distorted images look broken; missing ratio shifts layout | MAJOR |
| Inconsistent icon set | Mixed stroke weights, mixed grids (16/20/24), or filled-and-outline icons mixed in one set | Inconsistent icons read as assembled from many sources | MINOR |
| Crude hand-drawn SVG | Hand-coded mascots/scenes/illustrations that look sketchy | Reads as amateur; better to ship no illustration than a crude one | MAJOR |

CLS from images and the layout-shift mechanics are covered in `references/edge-cases.md`; `aspect-ratio` here is noted only as a detection cue.

**Fix directions:**
- Low-res → `"The hero image in [selector] is upscaled and blurry on HiDPI. Serve a 2x/3x asset via srcset/sizes (or an SVG/optimized source). Do not stretch a small raster to fill the container."`
- Distorted ratio → `"The thumbnail in [selector] is stretched. Set a fixed aspect-ratio (e.g. aspect-ratio: 16/9) with object-fit: cover so the image crops instead of distorting. This also prevents layout shift."`

---

# UX DEFECTS

## U1. Navigation

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Unclear IA / missing breadcrumbs | Information architecture is unclear; no breadcrumbs at depth > 2 | Users get lost; can't tell where they are or how to go back | MAJOR |
| Missing active state | The current section/page has no active indication in the nav | Users lose their place; navigation feels unresponsive | MAJOR |
| Dead ends / orphan pages | A page with no clear path back or onward; no safe back navigation | Users get stranded with no way forward | MAJOR |
| Overloaded tab bar | More than 5 tabs in a mobile tab/bottom bar | Cramped targets; exceeds the iPhone tab-bar guideline | MINOR |
| Missing scroll-to-top affordance | A page taller than ~2 viewports (content scroll height ≥ ~2× viewport) with no back-to-top control | After a long scroll, returning to the top means a long manual drag; a back-to-top control is the expected escape hatch on long pages | MAJOR |
| Unbounded list without retrieval affordances (the ×10 test) | A data-driven list/feed that grows with usage (items, logs, records) offers NO way to retrieve within it — no search, no filter, no grouping/view toggle, no pagination/"load more". Detect by PROJECTING the surface at 10× its current data volume (field lesson 2026-07: a dashboard rendering 100+ user memories as one raw scroll passed a full audit because the test data was small) | Scroll is not a retrieval strategy: at real data volume the only way to find anything becomes minutes of scrolling; the screen works in the demo and fails in life — audits that only judge current data miss the class entirely | MAJOR |
| Key section buried beneath unbounded content | A section the user regularly needs sits BELOW an unbounded list in the page flow (reachable only by scrolling through all of it); no anchors, tabs, collapse, or reorder rationale | Section order must follow access frequency, not construction order; burying a daily-use section under a feed makes its cost grow with the data | MAJOR |

**Fix direction:**
- Missing active state → `"The primary nav gives no active indication for the current page. Add an active state (e.g. accent text color + 2px bottom indicator) to the link matching the current route. Maintain the active state across all breakpoints."`
- Missing scroll-to-top → `"[main] scrolls ~4 viewports tall with no way back to the top. Add a back-to-top button (a fixed bottom-end <button> with an up-chevron) that reveals once the page has scrolled past ~1.5 viewports (toggle a .is-visible class via an IntersectionObserver/scroll listener, opacity+pointer-events transition) and on click smooth-scrolls to top. Give it an aria-label='Back to top', a ≥44×44px hit area, and keep it clear of any sticky footer/CTA. Respect prefers-reduced-motion by using an instant scroll under reduce. Tokens: --color-surface, --shadow-2, --space-6 for inset."`
- Unbounded list → `"[list/feed] renders every record in one raw scroll with no retrieval affordance; at 10× today's data the page becomes unusable. Add the affordances that fit the surface (at least one, usually two): a filter row (by status/type/date), a grouping or view toggle (grouped-by-X vs flat timeline), a search field wired to the existing backend search if one exists, and/or pagination or 'show more' beyond ~20 items. Keep the default view calm; persist the chosen view. Judge the result at simulated 10× volume, not demo volume."`
- Buried key section → `"[section] sits below an unbounded list and requires scrolling the entire feed to reach. Either move it above the feed, or make sections directly reachable (anchor sub-nav / tabs / collapsible feed with a 'show all' expansion). Order sections by access frequency and verify reachability at 10× data volume."`

---

## U2. Interaction Design

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Weak affordance | Clickable elements don't look clickable (no shadow/color/cursor cue); non-clickable elements look interactive | Users miss actions or click dead pixels | MAJOR |
| Slow / missing feedback | No visual feedback within ~100ms of an action; no loader when an op exceeds ~300ms; no skeleton/progress past ~1s | Actions feel broken; users repeat clicks | MAJOR |
| Missing confirm / undo on destructive action | Delete/destroy actions fire with no confirmation or undo | Irreversible data loss from a mis-tap | MAJOR |
| Async state that never settles | Any live indicator ("checking…", "loading…", spinner, skeleton) still in its transient state after ~10s of observation, with no timeout path to a resolved state (success / error / unsupported / empty). WATCH each async indicator through to settlement during the audit — do not screenshot-and-move-on (field lesson 2026-07: a notifications section stuck on "CHECKING…" forever — a hung promise chain with no fallback — passed because the auditor captured the state without waiting) | A state machine missing a terminal transition looks alive but is hung; the user cannot tell "slow" from "broken", and the defect is invisible to any audit that doesn't dwell on the state | MAJOR |

**Fix directions:**
- Feedback latency → `"The 'Save' button in [selector] gives no feedback on click; the save takes ~800ms. Add an immediate pressed state (<100ms), then a loading spinner with aria-busy='true' for the duration, then a success confirmation. Do not leave the button static during the request."`
- Destructive action → `"The delete button in [selector] removes the record immediately. Add a confirmation step or an undo affordance (e.g. a toast with 'Undo' for ~5s). Do not perform irreversible deletes without confirm or undo."`
- Stuck async state → `"[indicator] shows 'checking…' indefinitely: the promise chain in [hook/component] has a path that never resolves (e.g. an API that hangs, a readiness promise that never fires in this environment). Give every transient state a terminal transition: race the check against a ~8–10s timeout that falls back to an explicit resolved state ('unavailable' / 'error' with retry), and audit each await in the chain for environments where it never settles. A transient label must be a state the UI is guaranteed to leave."`

---

## U3. Form UX

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Placeholder-as-label | Field uses placeholder text in place of a persistent label; labels not top-aligned | Label vanishes on input; top-aligned labels complete fastest | MAJOR |
| Wrong validation timing | Errors fire on every keystroke instead of on blur (debounce mechanical rules ~300–500ms) | Errors flashing while typing is hostile and distracting | MAJOR |
| Poor error message / position | Error not adjacent to its field, not explicit/polite/constructive, color-only (no icon), or disappears before the user fixes it | Users can't locate or understand the error; high working-memory load | MAJOR |
| Field hygiene gaps | No required-field indication; `autocomplete` not supported; paste blocked; masks that reject valid input | Slows completion; blocks password managers and valid entries | MINOR |
| Fixed-height multiline input | A textarea/composer meant for real prose (chat message, note, description) is locked at 2–3 visible lines: no auto-grow with content, `resize` disabled or unavailable on mobile. TEST by actually typing/pasting 8–10 lines into every multiline field (field lesson 2026-07: a chat composer that kept long dictated messages in a 2-line peephole passed a full audit) | Writing more than the box shows means editing blind through a peephole — re-reading your own message requires scrolling inside a 2-line window; composition surfaces must grow with the content | MAJOR |

**Fix directions:**
- Placeholder label → `"In [form], fields use placeholder text as the only label. Add a persistent top-aligned <label> for each field; keep placeholders for example/format hints only. Do not use placeholder-as-label."`
- Validation timing → `"[Form] validates on every keystroke, flashing errors mid-typing. Validate on blur (when the field loses focus), and debounce mechanical rules ~300–500ms. Keep the error message visible beside the field until the user fixes it."`
- Error message → `"The email field shows a generic red border with no text. Add an inline message adjacent to the field with a warning icon, e.g. 'Enter a valid email address, like name@example.com.' Keep it visible while the user edits. Do not signal the error with color alone."`
- Fixed multiline input → `"The composer in [selector] stays at 2 visible lines while the user types long messages. Make it auto-grow with content up to a max (e.g. ~40vh, then scroll inside), collapsing back when cleared — via field-sizing: content where supported, with a measured scrollHeight fallback (rows recalculated on input). Keep the send button anchored and the page layout stable while it grows (no CLS), and verify by pasting 10 lines on mobile viewport."`

---

## U4. Content UX

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Poor readability | Copy is dense/jargon-heavy; above ~8th-grade reading level for general UI | Users skim and bounce; comprehension drops | MINOR / MAJOR |
| Poor scannability | No headings, bullets, or structure in long content | Walls of text don't get read | MINOR / MAJOR |
| Weak CTA copy | CTA is vague (not verb-led, not specific) | Users don't know what the button does | MAJOR |
| Marketing-fluff microcopy | Banned hype words present: "amazing", "unleash", "incredible" | Empty hype erodes trust and clarity | MINOR / MAJOR |
| Raw user-data walls of text | User-generated or data-driven long content (notes, memories, logs, descriptions) rendered in full inside list cards: no line-clamp + expand affordance, no measure cap (~65–75ch), paragraph-length entries flattening the list rhythm (field lesson 2026-07: a feed where one 15-line record card sat between 1-line neighbours, unjudged, because audits only checked the CHROME copy, not the DATA rendering) | The app doesn't control data length — the layout must: unclamped long records make the list unscannable and bury following items; readability of user CONTENT is a first-class audit surface, not just UI copy | MAJOR |

**Fix direction:**
- Weak CTA → `"The CTA in [selector] reads 'Submit'. Replace with verb-led, specific copy describing the outcome, e.g. 'Create account' or 'Start free trial'. Remove hype words ('amazing', 'unleash', 'incredible') from surrounding copy."`
- Raw data wall → `"Cards in [list] render the full record text, so one long record becomes a 15-line wall between 1-line neighbours. Clamp records to ~3–4 lines (-webkit-line-clamp or a measured max-height with a fade) with an explicit expand affordance ('show more' / navigating to the item), cap the reading measure at ~70ch, and keep row rhythm consistent. Verify with a real long record (10+ lines) in the list, on mobile."`

---

## U5. Accessibility

axe-core and similar automated scanners catch only ~40% of WCAG barriers and no environment here has a real screen reader — never claim full a11y coverage from a scan. Inspect the accessibility tree, verify keyboard operation by hand, and recommend manual assistive-technology testing. Run scanners per `references/automated-tools.md`.

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Keyboard inoperable | Any interactive element unreachable/unoperable by keyboard, or illogical tab order | Keyboard-only and AT users can't use the feature; fails WCAG 2.1.1 / 2.4.3 | CRITICAL |
| Missing / weak focus indicator | No `:focus-visible` indicator, or one smaller than the area of a 2px-thick perimeter, or < `3:1` contrast between focused and unfocused states; outline removed with no replacement | Keyboard users can't see where they are; fails WCAG 2.4.11/2.4.13 | CRITICAL |
| Focus obscured | Sticky header/footer fully hides the focused element on scroll/tab | Focused control invisible; fails WCAG 2.4.11 | MAJOR |
| Missing semantics / ARIA | Non-semantic HTML where native elements fit; icon-only buttons without `aria-label`; async updates with no live region (`aria-live`, WCAG 4.1.3) | Screen-reader users get unlabeled/unannounced UI | CRITICAL |
| No reduced-motion support | Non-essential motion not wrapped in `prefers-reduced-motion` | Vestibular triggers; fails WCAG 2.3.3 | MAJOR |
| Drag-only interaction | Sortable lists, carousels, comparison sliders with no non-drag alternative (buttons/arrow keys) | Fails WCAG 2.5.7; unusable for motor-impaired users | MAJOR |
| Inaccessible authentication | Login requires a cognitive-function test (puzzle/transcription CAPTCHA); blocks password managers or paste | Fails WCAG 3.3.8; locks out users | MAJOR |

**Fix directions:**
- Focus indicator → `"Buttons and links in [scope] have outline: none with no replacement. Add a :focus-visible indicator: a 2px solid ring at ≥3:1 contrast against the background, offset 2px. Never remove the outline without a visible replacement (WCAG 2.4.11)."`
- Icon-only button → `"The icon-only buttons in [selector] have no accessible name. Add an aria-label describing the action (e.g. aria-label='Close dialog'). Use a native <button>, not a clickable <div>."`
- Reduced motion → `"Scroll and entrance animations in [scope] always run. Wrap non-essential motion in @media (prefers-reduced-motion: no-preference) and replace movement with a simple opacity fade under reduce. Keep state-change feedback in both modes (WCAG 2.3.3)."`

---

## U6. Performance Perception

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| No perceived-performance treatment | Slow loads (op > ~300ms) with no skeleton/progress; no progressive/lazy loading; no optimistic UI where it would help | Waits feel longer than they are; app feels sluggish | ENHANCEMENT |
| Flat / lifeless page (no motion or imagery) | The page has no entrance/scroll motion, no background or supporting imagery, and no depth (everything is flat fills on a static layout) | A page with zero motion, imagery, or depth reads as a generic, lifeless template rather than a crafted product — especially damning above the fold. Escalate to MAJOR when it reads as a stock template; keep 'engaging' on the right side of slop (`references/anti-slop-rules.md`) | ENHANCEMENT (MAJOR when generic-template) |

A slow left-to-right shimmer wave tests best for perceived duration on skeletons. Show loaders only when an operation exceeds ~300ms (a flash of loader on a fast op looks worse than none).

**Fix directions:**
- Missing skeleton → `"The dashboard renders a blank panel for ~1.2s while data loads. Add neutral skeleton placeholders matching the final layout, with a subtle left-to-right shimmer. Show the skeleton only when load exceeds ~300ms; use optimistic UI for instant-feeling writes."`
- Flat / lifeless page → `"The [main] page is entirely static — flat fills, no imagery, no motion, no depth. Introduce restrained life: real on-brand imagery or a layered/depth treatment in key sections, plus subtle scroll-reveal entrances (opacity 0→1 + 8–12px translateY over ~400ms ease-out, staggered) wrapped in @media (prefers-reduced-motion: no-preference). Keep it tasteful and on-brand — NOT AI slop: no purple→blue gradient meshes, no glassmorphism, no generic abstract blobs or floating-orb backgrounds (see references/anti-slop-rules.md). Motion must be optional and degrade to a plain fade under reduced-motion. Tokens: --space-* for stagger offsets, --color-accent for any motion-revealed emphasis."`

---

After detecting defects, score and format the report per `references/scoring-and-report.md`, and attach a standalone correction prompt to each finding (anatomy of a correction prompt is defined there).
