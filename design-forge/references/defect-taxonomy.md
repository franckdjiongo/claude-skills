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

**Fix directions:**
- Off-grid → `"Padding in [selector] is 13px and 27px. Snap all spacing to a 4px/8px scale: use 12px or 16px (not 13px) and 24px or 32px (not 27px). Apply the same scale to margins and gaps."`
- Inconsistent padding → `"The cards in [section] use 16px, 20px, and 24px padding. Set all sibling cards to a single value: padding: var(--space-6) (24px). Match across the whole section."`
- Cramped section → `"The [section] feels cramped and untrustworthy. Set section padding to 96px desktop / 48px mobile, 32px gap between cards, body copy max-width 65ch. Goal: a calm, premium, Stripe-like density. Do not reduce below 8px-grid values."`
- Nested cards → `"[Component] nests cards three levels deep. Flatten to a single card; separate inner groups with 24px spacing and a hairline divider (1px, var(--border)) or a heading instead of another bordered container."`

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

Contrast ratio formula: `ρ = (L_lighter + 0.05) / (L_darker + 0.05)`, where `L` is relative luminance. Estimate from sampled foreground/background pairs; confirm with a tool (`references/automated-tools.md` for axe/pa11y).

**Fix directions:**
- Body contrast → `"In [selector], helper text is #9CA3AF on #FFFFFF (2.8:1, fails AA). Darken to #4B5563 (~7:1 on white). Keep the same hue family; do not lighten the background to compensate."`
- Color-only state → `"The error state in [field] is signaled only by a red border. Add an inline error message and a warning icon adjacent to the field. Do not rely on color alone (WCAG 1.4.1)."`
- Accent overuse → `"The brand accent (var(--primary)) fills >40% of [view] (multiple buttons, badges, links). Limit saturated accent to ~10% of the screen — reserve it for the single primary action. Use neutral surfaces and a neutral border for the rest."`

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

Per-viewport expected columns / padding / type / nav targets are owned by the responsive matrix in `references/design-system-reference.md`. Drive these viewports live per `references/testing-protocol.md`.

**Fix directions:**
- Touch target → `"The .icon-button is 16×16px. Set min-width: 44px; min-height: 44px with the icon centered. Ensure ≥8px gap from neighboring targets. Do not shrink the icon glyph — pad the hit area."`
- Horizontal scroll → `"At 375px, [section] forces horizontal scroll because [element] has a fixed width: 480px. Replace with max-width: 100% and fluid units; allow the row to wrap. Verify no horizontal scrollbar at 375px."`

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

**Fix directions:**
- Button states → `"Apply across all buttons: default; :hover (lighten fill 4%); :focus-visible (2px ring, ≥3:1 contrast vs background); :active (transform: scale(0.98)); :disabled (40% opacity, pointer-events: none); and a loading state with a spinner and aria-busy. Use 150ms ease-out transitions. Never remove the outline without a visible replacement."`
- Radius drift → `"Border-radius is inconsistent across [components]. Differentiate by role: cards 12–16px, inputs 6–8px, pills/tags 9999px. Do not apply one uniform radius, and do not exceed 16px on small cards."`
- Empty state → `"The deployments list shows a blank panel when empty. Add an empty state: a short heading, one line of guidance, and a primary CTA — e.g. 'No deployments yet. Push to your Git repository to create one.' Do not leave the container blank."`
- Flat shadows → `"Every card uses the same box-shadow. Build a progressive elevation scale (--elevation-1…3) where raised surfaces get more diffuse, larger-offset shadows. Do not combine a 1px border with a wide diffuse shadow on the same element."`

Uniform border-radius everywhere, glassmorphism, colored glow shadows on dark, and side-tab accent borders are AI-slop tells — see `references/anti-slop-rules.md`.

---

## V7. Visual Hierarchy

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Broken stacking / elevation logic | Overlays sit below content, or stacking context is inconsistent so elements layer wrongly | Modals/dropdowns hidden behind content; broken interactions | MAJOR |
| Competing focal points | Two (or more) filled, equal-weight primary CTAs in one view; no single clear primary action | Splits attention; user doesn't know the intended next step | MAJOR |
| Ignored scan pattern | Key info not placed for the natural scan path — F-pattern for text-dense screens, Z-pattern for landing pages (lead top-left / leading edge) | Important content lands where eyes don't go first | MINOR |

Deep z-index conflicts, stacking-context bugs, and sticky-overlay collisions are implementation defects — see `references/edge-cases.md`.

**Fix direction:**
- Competing CTAs → `"This view has two filled primary buttons of equal weight ('Save' and 'Publish'). Keep one filled primary (the single most important action) and demote the other to a secondary/outline style. Do not use two competing filled CTAs in one view."`

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

**Fix direction:**
- Missing active state → `"The primary nav gives no active indication for the current page. Add an active state (e.g. accent text color + 2px bottom indicator) to the link matching the current route. Maintain the active state across all breakpoints."`

---

## U2. Interaction Design

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Weak affordance | Clickable elements don't look clickable (no shadow/color/cursor cue); non-clickable elements look interactive | Users miss actions or click dead pixels | MAJOR |
| Slow / missing feedback | No visual feedback within ~100ms of an action; no loader when an op exceeds ~300ms; no skeleton/progress past ~1s | Actions feel broken; users repeat clicks | MAJOR |
| Missing confirm / undo on destructive action | Delete/destroy actions fire with no confirmation or undo | Irreversible data loss from a mis-tap | MAJOR |

**Fix directions:**
- Feedback latency → `"The 'Save' button in [selector] gives no feedback on click; the save takes ~800ms. Add an immediate pressed state (<100ms), then a loading spinner with aria-busy='true' for the duration, then a success confirmation. Do not leave the button static during the request."`
- Destructive action → `"The delete button in [selector] removes the record immediately. Add a confirmation step or an undo affordance (e.g. a toast with 'Undo' for ~5s). Do not perform irreversible deletes without confirm or undo."`

---

## U3. Form UX

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Placeholder-as-label | Field uses placeholder text in place of a persistent label; labels not top-aligned | Label vanishes on input; top-aligned labels complete fastest | MAJOR |
| Wrong validation timing | Errors fire on every keystroke instead of on blur (debounce mechanical rules ~300–500ms) | Errors flashing while typing is hostile and distracting | MAJOR |
| Poor error message / position | Error not adjacent to its field, not explicit/polite/constructive, color-only (no icon), or disappears before the user fixes it | Users can't locate or understand the error; high working-memory load | MAJOR |
| Field hygiene gaps | No required-field indication; `autocomplete` not supported; paste blocked; masks that reject valid input | Slows completion; blocks password managers and valid entries | MINOR |

**Fix directions:**
- Placeholder label → `"In [form], fields use placeholder text as the only label. Add a persistent top-aligned <label> for each field; keep placeholders for example/format hints only. Do not use placeholder-as-label."`
- Validation timing → `"[Form] validates on every keystroke, flashing errors mid-typing. Validate on blur (when the field loses focus), and debounce mechanical rules ~300–500ms. Keep the error message visible beside the field until the user fixes it."`
- Error message → `"The email field shows a generic red border with no text. Add an inline message adjacent to the field with a warning icon, e.g. 'Enter a valid email address, like name@example.com.' Keep it visible while the user edits. Do not signal the error with color alone."`

---

## U4. Content UX

| Defect | Detect when | Why it matters | Severity |
|---|---|---|---|
| Poor readability | Copy is dense/jargon-heavy; above ~8th-grade reading level for general UI | Users skim and bounce; comprehension drops | MINOR / MAJOR |
| Poor scannability | No headings, bullets, or structure in long content | Walls of text don't get read | MINOR / MAJOR |
| Weak CTA copy | CTA is vague (not verb-led, not specific) | Users don't know what the button does | MAJOR |
| Marketing-fluff microcopy | Banned hype words present: "amazing", "unleash", "incredible" | Empty hype erodes trust and clarity | MINOR / MAJOR |

**Fix direction:**
- Weak CTA → `"The CTA in [selector] reads 'Submit'. Replace with verb-led, specific copy describing the outcome, e.g. 'Create account' or 'Start free trial'. Remove hype words ('amazing', 'unleash', 'incredible') from surrounding copy."`

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

A slow left-to-right shimmer wave tests best for perceived duration on skeletons. Show loaders only when an operation exceeds ~300ms (a flash of loader on a fast op looks worse than none).

**Fix direction:**
- Missing skeleton → `"The dashboard renders a blank panel for ~1.2s while data loads. Add neutral skeleton placeholders matching the final layout, with a subtle left-to-right shimmer. Show the skeleton only when load exceeds ~300ms; use optimistic UI for instant-feeling writes."`

---

After detecting defects, score and format the report per `references/scoring-and-report.md`, and attach a standalone correction prompt to each finding (anatomy of a correction prompt is defined there).
