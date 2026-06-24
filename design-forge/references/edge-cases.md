# Edge Cases & Implementation-Level Defects

Implementation- and edge-case defect dimensions for AUDIT and TEST modes. Each section gives detection criteria, a concrete failure example, professional terminology, a paste-ready fix prompt, and severity.

For severity definitions, scoring, and report/JSON format see `references/scoring-and-report.md`. For the baseline visual + UX defect checklist see `references/defect-taxonomy.md`. For active-testing procedures referenced here see `references/testing-protocol.md`.

## Table of Contents

1. [Content Resilience & Data Edge Cases](#1-content-resilience--data-edge-cases)
2. [Font Loading & Web Font Behavior](#2-font-loading--web-font-behavior)
3. [Cumulative Layout Shift & Visual Stability](#3-cumulative-layout-shift--visual-stability)
4. [Cross-Browser & Cross-OS Rendering](#4-cross-browser--cross-os-rendering)
5. [Pixel Density / HiDPI Asset Quality](#5-pixel-density--hidpi-asset-quality)
6. [Overflow & Clipping Behavior](#6-overflow--clipping-behavior)
7. [Z-Index & Stacking Context](#7-z-index--stacking-context)
8. [Modal, Dialog, Toast & Overlay Patterns](#8-modal-dialog-toast--overlay-patterns)
9. [Cursor, Pointer & Interaction Affordance](#9-cursor-pointer--interaction-affordance)
10. [Internationalization (i18n) Visual Resilience](#10-internationalization-i18n-visual-resilience)
11. [CSS Anti-Patterns LLMs Produce](#11-css-anti-patterns-llms-produce)
12. [Semantic HTML & Accessibility Implementation](#12-semantic-html--accessibility-implementation)
13. [Performance-Visible Quality Indicators](#13-performance-visible-quality-indicators)
14. [Sourcing Caveats](#sourcing-caveats)

---

## 1. Content Resilience & Data Edge Cases

**Detect:** Inspect every text container, numeric field, list, and media slot under three stress conditions — extreme content, empty content, malformed content. Flag:
- Long unbroken strings (URLs, emails, hashes, tokens) escaping their container.
- Single-character or empty values that collapse layout.
- Large numbers without thousands separators (`1000000` vs `1,000,000`).
- Lists rendered with 0, 1, and 1000+ items.
- Emoji / RTL / mixed-script user content.
- Null avatars and broken image URLs (browser default broken-image glyph).
- Multi-paragraph content pasted into single-line fields.
- Flex rows of tags that refuse to shrink below the longest word (flexbox `min-content` default → horizontal overflow).

Best confirmed by active content-stress testing — see `references/testing-protocol.md`.

**Failure example:** A profile card with `white-space: nowrap` shows a 90-character email overflowing past the rounded card edge; a "0 results" state renders as a blank white panel; a balance reads `1000000`; a Tailwind `flex` tag row overflows horizontally because children default to `min-width: min-content`.

**Terminology:** content overflow / unhandled long-string wrapping; missing empty state (zero-data state); unlocalized number formatting; missing fallback for null media; flex min-content overflow; content jank under data extremes.

**Fix prompt:**
> "Harden the `ProfileCard` and `ResultsList` components against content edge cases. (1) On text containers holding user-generated strings (email, username, URL), the current `white-space: nowrap` causes a 90-character email to overflow the card; replace with `overflow-wrap: anywhere` so long strings wrap inside the container. (2) The list currently renders a blank panel when its collection length is 0; add an explicit empty state with a centered icon, headline, and CTA — never a blank panel. (3) The balance field renders raw `1000000`; format all numbers with `Intl.NumberFormat` for the active locale. (4) Avatars currently show the browser broken-image glyph on a failed URL; add an `onError` fallback that swaps to user initials or a placeholder SVG. (5) Flex children holding long content do not shrink; add `min-width: 0` to them. Verify at 0, 1, and 1000 items and with a 100-character unbroken string. Do not use `text-overflow: ellipsis` here — wrapping, not truncation, is required for these fields."

**Severity:** Major. Critical when overflow breaks primary layout or hides actionable controls; Minor for cosmetic empty states.

---

## 2. Font Loading & Web Font Behavior

**Detect (video):** Watch the first 0–3 s of load. FOIT = invisible text, then text appears. FOUT = fallback font visible, then a visible reflow/restyle when the web font swaps. Measure reflow magnitude at swap (line breaks shift, headings re-wrap). Check the `@font-face` `font-display` value, number of weights/styles loaded, and whether a metric-matched fallback exists.

**Failure example:** A hero headline is blank ~1.5 s on a throttled connection (`font-display: block` → FOIT). On swap, body text re-wraps and pushes content down (no `size-adjust`). An LLM-generated project loads 9 weights of Inter (100–900) including italics when only 400/500/600 are used — render-blocking over-inclusion.

**Terminology:** FOIT (Flash of Invisible Text); FOUT (Flash of Unstyled Text); font-swap reflow / layout shift from web font; missing metric-matched fallback; font weight over-inclusion; render-blocking font load.

### `font-display` reference

| Value | Block period | Swap period | Result | Use when |
|---|---|---|---|---|
| `block` | short (~3 s) | infinite | FOIT | Text is meaningless without the brand font (icon fonts) only |
| `swap` | 0 s | infinite | always FOUT | Body text where reading-ASAP matters |
| `fallback` | ~100 ms | ~3 s | compromise | Body text, balance of speed and brand fidelity |
| `optional` | ~100 ms | 0 s | **only value guaranteeing no swap-driven layout shift** | Layout stability critical; commits to fallback for the session if the font isn't cached/ready |

### Metric-matching

The fallback `@font-face` uses `size-adjust`, `ascent-override`, and `descent-override` (percentages of used font size) so fallback and web font occupy identical space, eliminating swap reflow. Example:

```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}
```

Treat these override percentages as illustrative of the metric-matching principle, not as canonical values for every font — generate exact values per font with Fontaine or Capsize.

**Fix prompt:**
> "Optimize web font loading for this project, which currently sets `font-display: block` on the hero font (causing ~1.5 s FOIT) and loads all 9 Inter weights (100–900) plus italics. (1) Set `font-display: swap` for body text and `font-display: optional` for the hero where layout stability is critical and a fallback is acceptable. (2) Add a metric-matched fallback `@font-face` using `size-adjust`, `ascent-override`, and `descent-override` generated with Fontaine or Capsize so the swap produces near-zero CLS. (3) Preload the above-the-fold font with `<link rel='preload' as='font' type='font/woff2' crossorigin>`. (4) Subset to only the weights actually used — 400/500/600 — and only the needed `unicode-range`; remove all unused weights and italics. Do not keep `font-display: block` on any text font."

**Severity:** Major (FOIT on primary content, large swap reflow); Minor (small swap, weight over-inclusion as performance hygiene).

---

## 3. Cumulative Layout Shift & Visual Stability

**Detect (video):** Frame-by-frame, flag any element that changes start position between frames without user interaction (image load pushing text, late banner/cookie notice, font swap). **From screenshots** rely on indirect signals: elements mispositioned relative to containers, skeleton geometry not matching the loaded layout. Quantify shift location and magnitude.

**Thresholds (Core Web Vitals, web.dev):** CLS **Good ≤ 0.1**, **Needs improvement 0.1–0.25**, **Poor > 0.25**, evaluated at the **75th percentile** of real users. CLS is the Layout Instability API sum of impact × distance fractions per session. Screenshots cannot produce a true CLS number — report observed shift qualitatively and recommend field measurement.

**Failure example:** An above-the-fold hero image has no `width`/`height` → text reflows down ~120 px on load. A cookie banner injected after first paint pushes the whole page. A skeleton card is 200 px tall but the loaded card is 260 px → 60 px jump.

**Terminology:** Cumulative Layout Shift; unsized media reflow; late content injection above the fold; skeleton geometry mismatch; layout instability.

**Fix prompt:**
> "Eliminate layout shift on the home route, which currently reflows ~120 px when the hero image loads, jumps when the cookie banner injects, and jumps 60 px when the card skeleton (200 px) is replaced by the loaded card (260 px). (1) Add explicit `width` and `height` attributes (or `aspect-ratio`) to every `img`, `video`, `iframe`, and ad/embed slot so the browser reserves space before load. (2) Reserve fixed space for late-injected UI (cookie banner, announcement bar) or render it in a non-shifting fixed overlay. (3) Make the card skeleton exactly 260 px to match the loaded card. (4) Animate only `transform`/`opacity`, never `top`/`left`/`width`/`height`. Target CLS ≤ 0.1 at p75."

**Severity:** Critical (shift moves an actionable control as the user reaches for it — the classic mis-click on "Confirm order"); Major (above-the-fold reflow); Minor (small below-fold shift).

---

## 4. Cross-Browser & Cross-OS Rendering

**Detect:** Compare the same view across macOS (Safari/Chrome), Windows (Chrome/Edge/Firefox), and Linux. Note font weight/thickness differences (subpixel AA vs ClearType vs FreeType), scrollbar space consumption, Safari feature gaps, native form-control styling, sub-pixel border rendering. No single environment shows all platforms — flag platform-specific risk and recommend cross-browser verification where the rendering path is platform-dependent.

**Failure example:** Text crisp/medium on macOS appears heavier/blurrier on Windows ClearType. A layout perfect on Mac (overlay scrollbars) "twitches" ~15–17 px on Windows when a modal sets `overflow: hidden` on `<body>` and the classic scrollbar disappears. A flex layout with `gap` collapses to zero-gutter on iOS Safari ≤ 14.4 (silent failure; gap-on-flex shipped only in Safari 14.1 desktop / iOS Safari 14.5). A custom `<select>` looks native-ugly only in Firefox.

**Terminology:** subpixel antialiasing vs ClearType vs FreeType discrepancy; scrollbar-induced layout shift; Safari flex-gap silent failure; native form-control rendering inconsistency; sub-pixel/hairline border rounding; `-webkit-font-smoothing` over-thinning.

**Fix prompt:**
> "Normalize cross-environment rendering for this layout, which twitches ~15–17 px on Windows/Linux when a modal locks body scroll and may collapse flex `gap` to zero on iOS Safari ≤ 14.4. (1) Add `scrollbar-gutter: stable` to `:root` so classic-scrollbar platforms don't shift when scrollbars appear/disappear or when modals lock body scroll. (2) For any flex `gap` that must support old Safari, add an `@supports`-guarded margin fallback or confirm support on iOS ≤ 14.4. (3) Remove any global `-webkit-font-smoothing: antialiased`, which over-thins text on non-retina Windows. (4) For visual parity on form controls, replace native checkboxes/radios/selects with accessible custom components, or explicitly accept native styling. (5) For hairlines, use `box-shadow` or transform-scale techniques instead of relying on fractional-pixel borders. Do not assume macOS overlay-scrollbar behavior on Windows/Linux."

**Severity:** Major (functional layout twitch, flex-gap collapse hiding content); Minor (font-rendering nuance, scrollbar styling).

---

## 5. Pixel Density / HiDPI Asset Quality

**Detect:** On a 2x/3x display, look for soft/blurry raster images, icons, and logos served at 1x. Inspect `<img>` for `srcset`/`sizes`; CSS backgrounds for `image-set()`; charts/canvas for `devicePixelRatio` scaling; favicon/touch-icon set completeness.

**Failure example:** A 200×200 logo PNG served as `src` only looks fuzzy on a Retina MacBook. A Chart.js canvas renders blurry because it's drawn at CSS pixels not device pixels. A missing 180×180 Apple touch icon → blurry home-screen icon. A raster "gear" icon pixelates next to crisp SVG icons.

**Terminology:** HiDPI/Retina under-resolution; missing `srcset` density descriptors; raster icon where vector is required; canvas not scaled by `devicePixelRatio`; incomplete favicon/touch-icon set.

**Fix prompt:**
> "Fix HiDPI sharpness across the app. The 200×200 logo, the gear icon, and the Chart.js canvas all render blurry on 2x/3x displays. (1) For raster images that must stay raster, provide `srcset` with density descriptors, e.g. `srcset='img.png 1x, img@2x.png 2x, img@3x.png 3x'`, plus `width`/`height` to avoid CLS; when using `x` descriptors do not also set `sizes`. (2) For CSS background images use `image-set()`. (3) Replace the gear icon and the logo with inline SVG so they stay crisp at any density. (4) For the Chart.js canvas, scale the backing store by `window.devicePixelRatio` and set the CSS size separately. (5) Add a complete icon set: multi-resolution favicon, a 180×180 `apple-touch-icon`, and 192×192 + 512×512 Android icons in the web manifest."

**Severity:** Major (blurry hero/logo on a premium target); Minor (single small below-fold image).

---

## 6. Overflow & Clipping Behavior

**Detect:** On mobile widths, drag horizontally — any unintended horizontal scroll is a defect (best confirmed by active scroll testing, see `references/testing-protocol.md`). Check for `width: 100vw` (includes scrollbar width → overflow), fixed-width children, long unbroken words, flex min-content overflow. Inspect truncation correctness. Check dropdowns/tooltips/popovers clipped by `overflow: hidden` ancestors. Check wide tables and code blocks.

**Truncation rules:**
- Single-line ellipsis requires all three: `overflow: hidden` + `white-space: nowrap` + `text-overflow: ellipsis`. (`text-overflow: ellipsis` alone does nothing without `white-space: nowrap`.)
- Multi-line requires `display: -webkit-box` + `-webkit-box-orient: vertical` + `-webkit-line-clamp: N` + `overflow: hidden`.
- Always expose the full text via `title` or a tooltip when truncating.

**The 100vw scrollbar bug:** A full-bleed header using `width: 100vw` scrolls the page horizontally by ~15–17 px on classic-scrollbar platforms because `vw` units historically ignore the scrollbar (only fixed in Chrome 145+ under specific conditions — do not assume the fix is present). Use `width: 100%` (or `100dvw` + `scrollbar-gutter: stable`).

**Failure example:** A `width: 100vw` header causes ~15–17 px horizontal scroll on Windows; a tooltip is cut off by a card with `overflow: hidden`; a wide data table forces the whole mobile page to scroll sideways; a `text-overflow: ellipsis` rule does nothing because `white-space: nowrap` is missing.

**Terminology:** unintended horizontal overflow; `100vw` scrollbar overflow; overflow clipping of floating UI; single-line vs multi-line truncation; responsive table strategy; scroll chaining / overscroll.

**Fix prompt:**
> "Resolve overflow defects. The full-bleed header uses `width: 100vw` and scrolls ~15–17 px horizontally on Windows; a tooltip is clipped by a `overflow: hidden` card; a `text-overflow: ellipsis` label fails because `white-space: nowrap` is missing; a wide table forces sideways page scroll on mobile. (1) Replace `width: 100vw` with `width: 100%` (or `100dvw` + `scrollbar-gutter: stable` on `:root`); add `min-width: 0` on flex children. (2) For the broken single-line truncation use `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`; for multi-line use `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N; overflow: hidden`, and expose full text via `title`. (3) Portal the tooltip to `body` (or use the Popover API / top layer) so the `overflow: hidden` card no longer clips it. (4) Wrap the wide table in an `overflow-x: auto` container with a visible scroll affordance, or transform it to cards at mobile breakpoints. (5) Add `overscroll-behavior: contain` to nested scroll containers."

**Severity:** Critical (horizontal scroll on mobile is the #1 mobile layout bug; a clipped menu hides actions); Major/Minor for truncation polish.

---

## 7. Z-Index & Stacking Context

**Detect:** Look for dropdowns behind modals, clipped tooltips, sticky headers overlapping floating elements, popovers behind siblings. When `z-index: 9999` "doesn't work," trace ancestors for stacking-context creators — raising the integer further will not help.

**Stacking-context creators (MDN):**
- `position: fixed` or `sticky` (always)
- `position: absolute`/`relative` + `z-index ≠ auto`
- flex/grid child + `z-index ≠ auto`
- `opacity < 1`
- `transform` / `scale` / `rotate` / `translate ≠ none`
- `filter` / `backdrop-filter ≠ none`
- `mix-blend-mode ≠ normal`
- `isolation: isolate`
- `will-change` of a context-creating property
- `contain: layout` or `paint`
- `container-type: size` or `inline-size`
- top-layer (dialog/popover) + `::backdrop`

**Recommended z-index token scale:**

```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-overlay: 300;
--z-modal: 400;
--z-toast: 500;
--z-tooltip: 600;
```

**Failure example:** A modal with `z-index: 9999` renders *behind* a navbar because the modal's parent card has `transform: translateY(0)` creating a trapping context. A tooltip with a high z-index sits behind a sibling because both live in different contexts.

**Terminology:** stacking-context trap; z-index ineffective due to ancestor context; implicit stacking context from `opacity`/`transform`; missing z-index token scale.

**Fix prompt:**
> "Fix the modal that renders behind the navbar despite `z-index: 9999`. The cause is a stacking-context trap: the modal's parent card sets `transform: translateY(0)`, which creates a stacking context that confines the modal. (1) Do not raise z-index further. Either remove the `transform` from the trapping ancestor, move it to an inner wrapper that doesn't contain the modal, or render the modal in a portal / native top layer outside the trap. (2) Replace all arbitrary z-index integers with a documented token scale: `--z-base: 0`, `--z-dropdown: 100`, `--z-sticky: 200`, `--z-overlay: 300`, `--z-modal: 400`, `--z-toast: 500`, `--z-tooltip: 600`. (3) Use `isolation: isolate` to create intentional stacking contexts with no visual side effects. (4) Prefer the native `<dialog>` top layer / Popover API for overlays so they escape ancestor contexts entirely."

**Severity:** Critical (modal/dropdown unreachable); Major (tooltip/popover mis-layered).

---

## 8. Modal, Dialog, Toast & Overlay Patterns

**Detect — modals:** focus moves in on open; focus trap (Tab / Shift+Tab cycle inside); Escape dismiss; backdrop-click dismiss; body scroll lock; focus returns to trigger on close; `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; background `inert` / `aria-hidden`. **Toasts:** stacking/position consistency; auto-dismiss timing; manual dismiss; max visible count; `role="status"` / `role="alert"`. **Popovers:** viewport-edge flip; alignment; outside-click dismiss. Keyboard/focus behavior is best confirmed by active testing — see `references/testing-protocol.md`. No environment has a real screen reader; inspect the accessibility tree and recommend manual AT testing for announcement behavior.

**Failure example (LLM-typical):** A React modal opens but focus stays on the trigger; Tab moves into background content; no Escape handler; closing doesn't restore focus. Toasts stack infinitely down the screen and auto-dismiss in 2 s (too fast to read). A popover overflows the right viewport edge instead of flipping.

**Terminology:** missing focus trap; no focus restoration; absent scroll lock; missing `aria-modal`/`role=dialog`; infinite toast stacking; toast timing too short; popover viewport collision / no flip.

**Quantitative / accessibility standards:**
- Toast auto-dismiss commonly **3–8 s**.
- WCAG **2.2.1 Timing Adjustable (Level A)**: where a time limit exists, warn the user before it expires and give **at least 20 seconds** to extend it with a simple action, allowing extension **at least ten times** — practically, support pause-on-hover and/or a notification history.
- `role="status"` (polite; default `aria-live="polite"`) for success/info; `role="alert"` (assertive) for errors.
- Confirm-button order: confirm on the right on web; platform-native on mobile.

**Fix prompt:**
> "Make `Modal/Confirm.tsx` production-grade and accessible. It currently opens with focus left on the trigger, lets Tab escape into background content, has no Escape handler, and does not restore focus on close. Add `role='dialog'` + `aria-modal='true'` + `aria-labelledby` referencing the title; on open, move focus to the first focusable element and trap Tab / Shift+Tab within the dialog; close on Escape and on backdrop click; lock body scroll and add `scrollbar-gutter: stable` to prevent a shift; mark background content `inert`; on close, restore focus to the trigger. Prefer the native `<dialog>` element with `showModal()`. Separately, the toast system stacks infinitely and auto-dismisses in 2 s: cap visible toasts at 3, stack newest-on-top, auto-dismiss after 5–6 s with pause-on-hover and a manual close button, use `role='status'` for info and `role='alert'` for errors, and keep position consistent. For popovers, add edge-collision flip and outside-click / scroll dismissal. Do not auto-dismiss faster than 5 s."

**Severity:** Critical (keyboard/screen-reader users trapped or locked out); Major (toast UX); Minor (confirm-button ordering).

---

## 9. Cursor, Pointer & Interaction Affordance

**Detect:** Verify `cursor: pointer` on clickable non-link controls — and *not* on plain text or non-interactive elements (per CSS spec the hand cursor signifies links; broaden only for low-affordance buttons). Check every interactive element for a visible hover state, a keyboard `:focus-visible` ring, an active/pressed state, and a clear disabled state. Draggable elements use `grab`/`grabbing`; disabled use `not-allowed`; resizable boundaries use `col-resize`/`row-resize`. Hover/active/focus states are best confirmed by active testing — see `references/testing-protocol.md`.

**Failure example:** A `<div>` acting as a button shows the default arrow cursor (no `cursor: pointer`, not keyboard focusable). A disabled button uses `pointer-events: none`, so it shows the default cursor instead of `not-allowed`. A global `outline: none` kills the keyboard focus ring. Cards have no hover state. Drag handles look identical at rest and while dragging.

**Terminology:** missing interaction affordance; absent hover/active state; suppressed focus indicator; misleading cursor (pointer on non-clickable); disabled-state ambiguity; drag affordance missing.

**Quantitative standards:**
- Disabled opacity typically **~0.5**.
- Focus indicator must meet WCAG **1.4.11 Non-text Contrast ≥ 3:1**; WCAG **2.4.7 Focus Visible (AA)**.
- Use `:focus-visible` so the ring shows for keyboard but not mouse clicks: `button:focus-visible { outline: 2px solid … }`, paired with `button:focus:not(:focus-visible) { outline: none }` as a fallback for older browsers.

**Fix prompt:**
> "Add complete interaction states across interactive elements. Currently a `<div>` button shows the default arrow cursor, a disabled button uses `pointer-events: none` (wrong cursor), cards have no hover state, and a global `outline: none` removes the keyboard focus ring. For every interactive element provide: `cursor: pointer` on buttons/clickable controls only (not on plain text), a visible `:hover` state, a `:focus-visible` ring at ≥ 3:1 contrast (never `outline: none` without a replacement ring), and an `:active`/pressed state. For disabled controls use the `disabled` attribute plus reduced opacity (~0.5) plus `cursor: not-allowed` — do not use `pointer-events: none`, which suppresses the cursor. For draggable elements use `cursor: grab` at rest and `grabbing` while dragging, with a visible drag handle and a drop-zone indicator. Pair all cursor cues with ARIA (`aria-disabled`) for non-visual users."

**Severity:** Major (missing focus ring = accessibility fail; missing hover = perceived-quality drop); Minor (cursor nuance).

---

## 10. Internationalization (i18n) Visual Resilience

**Detect:** Test each screen with expanded text (pseudo-localization, ~130–200% length), contracted text (CJK), and an RTL locale. Flag truncated/clipped translated labels, fixed-width buttons that can't grow, layouts that look empty under CJK, un-mirrored RTL layouts, wrong icon directionality, hardcoded date/number formats, and use of physical (`left`/`right`) instead of logical properties.

**Failure example:** "Submit" (6 chars) becomes German "Absenden" (8) and overflows a fixed-width button. A Finnish compound word overflows a card. An Arabic locale keeps the LTR layout with a left-aligned nav and a left-pointing "next" arrow. A date shows `06/24/2026` to a German user expecting `24.06.2026`.

**Text-expansion ratios (W3C "Text size in translation," citing IBM):** expansion is inversely tied to source-string length.

| English source length | Expect expansion |
|---|---|
| up to 10 characters | 200–300% |
| 11–20 chars | 180–200% |
| 21–30 chars | 160–180% |
| 31–50 chars | 140–160% |
| over 70 chars | ~130% |

W3C's worked example: Flickr's "views" → Italian "visualizzazioni," a 3.0× / 300% ratio. For CJK, expect **contraction** in character count, roughly **-10% to -55%** (varies widely). Practical rule of thumb: design short labels to absorb up to ~2× the English length.

**Terminology:** text-expansion overflow; fixed-width label truncation; missing RTL mirroring / `dir` support; icon directionality not mirrored; hardcoded locale formatting; physical vs logical properties.

**Fix prompt:**
> "Make this layout locale-resilient. The fixed-width submit button overflows when 'Submit' becomes German 'Absenden', and the Arabic locale keeps an LTR layout with a left-pointing 'next' arrow and `06/24/2026` date format. (1) Replace fixed widths on text containers with min/max plus intrinsic sizing so short labels can grow 2–3×; verify with pseudo-localization at 200%. Remove `white-space: nowrap` and `overflow: hidden` from translatable text. (2) Replace all physical `left`/`right`/`margin-left`/`padding-right`/`text-align: left` with logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline`, `text-align: start`) so RTL mirrors automatically; ensure the root sets `dir`. (3) Mirror directional icons (arrows, progress, chevrons) in RTL. (4) Format dates/numbers/currency with `Intl.DateTimeFormat` / `Intl.NumberFormat` per locale — never hardcode separators or symbol position. (5) Provide a `title`/tooltip fallback for any unavoidable truncation."

**Severity:** Major (truncated/overflowing labels in shipped locales); Critical (broken RTL making the UI unusable for those locales).

---

## 11. CSS Anti-Patterns LLMs Produce

**Detect:** Scan generated CSS/JSX for:
- `!important` overuse.
- Inline `style=` instead of classes/tokens.
- Magic-number px (`padding: 13px`) instead of spacing tokens.
- Hardcoded hex colors instead of CSS custom properties.
- `px` for font sizes where `rem` is needed (ignores user font-size prefs).
- `<div>` soup instead of semantic elements.
- Over-nested flex/grid.
- Physical `left`/`right` instead of logical properties.
- Redundant/conflicting properties (`width` + `flex-basis`).
- Absence of any token layer.

**Failure example:** `.btn { background: #3b82f6 !important; padding: 13px 17px; font-size: 14px; margin-left: 8px; }` — hardcoded color, magic numbers, px font, physical margin, `!important`. A 6-level nested flex tree where a single grid would suffice.

**Terminology:** `!important` specificity escalation; inline-style anti-pattern; magic numbers / untokenized spacing; hardcoded color literals; px-based typography (rem violation); div soup / non-semantic markup; physical-property RTL hazard; missing design-token architecture.

**Fix prompt:**
> "Refactor `.btn` and its surrounding CSS to design-system standards. The current rule is `.btn { background: #3b82f6 !important; padding: 13px 17px; font-size: 14px; margin-left: 8px; }` and lives inside a 6-level nested flex tree. (1) Remove `!important`; resolve specificity through class structure instead. (2) Replace the hardcoded `#3b82f6` with a CSS custom property / design token (`var(--color-primary)`). (3) Replace the magic-number padding `13px 17px` and `margin-left: 8px` with spacing tokens on a consistent 4px-base scale (e.g. `var(--space-2)` = 8px). (4) Change `font-size: 14px` to `rem` so user zoom/preferences apply; keep `px` only for borders/hairlines. (5) Replace `margin-left` with the logical `margin-inline-start`. (6) Flatten the redundant nesting (use a single grid where appropriate) and remove any conflicting `width` + `flex-basis` declarations. (7) Move inline styles into classes and establish a `:root` token layer if none exists. Do not introduce any new `!important` or hardcoded hex."

**Severity:** Major (no token layer / px typography harms theming + accessibility); Minor (individual magic numbers).

---

## 12. Semantic HTML & Accessibility Implementation

**Detect:** Verify landmark structure (`main`/`nav`/`header`/`footer`/`aside`/`section` with `aria-label` where repeated); single `<h1>` and no skipped heading levels (no h1→h3 jump); links vs buttons used correctly; real `<ul>`/`<ol>` for lists; `<table>` with `thead`/`tbody`/`th scope` + `caption`; meaningful vs decorative (`alt=""`) image alt text; form `<label for>`/`id` association, `fieldset`/`legend`, `aria-describedby` for help; `aria-live` regions for dynamic content; skip-to-content link. No environment has a real screen reader — inspect the accessibility tree and recommend manual AT testing for announcement behavior.

**Link vs button rule of thumb:** if clicking it changes the URL or navigates, it's a link; if it acts on the current page, it's a button.

**Failure example (LLM-typical):** `<a href="#" onClick={submit}>Save</a>` used to trigger an action (should be `<button>`) — a screen reader announces "link" and Space doesn't activate it. A `<div className="list">` with bullet glyphs instead of `<ul>`. Headings jump h1→h4 for styling. Toast messages and form errors are not in a live region, so screen readers never announce them.

**Terminology:** link/button semantic mismatch (WCAG 4.1.2 Name, Role, Value; 2.1.1 Keyboard); heading-hierarchy skip; non-semantic list/table; missing landmark roles; unassociated form labels; missing live region (WCAG 4.1.3 Status Messages); decorative-image alt misuse; missing skip link.

**Fix prompt:**
> "Correct semantics and accessibility. The code uses `<a href='#' onClick={submit}>Save</a>` for an action (screen readers announce 'link' and Space won't activate it), a `<div className='list'>` with bullet glyphs instead of a real list, headings that jump h1→h4 for styling, and toasts/form errors that are not in a live region. (1) Replace the `<a href='#'>` action with `<button type='button'>`; reserve `<a href>` for navigation only. (2) Enforce one `<h1>` and sequential heading levels; control size with CSS, not heading rank. (3) Replace the `<div>` list with `<ul>/<ol>/<li>`, and use `<table>` with `<thead>/<tbody>/<th scope>` + `<caption>` for tabular data. (4) Wrap regions in `<main>/<nav>/<header>/<footer>/<aside>` with `aria-label` on repeated landmarks; add a skip-to-content link. (5) Associate every input with `<label for>`, group related fields with `fieldset`/`legend`, and link help text via `aria-describedby`. (6) Give meaningful images descriptive `alt` (no 'image of' prefix) and decorative images `alt=''`. (7) Put toasts/errors/chat updates in an `aria-live` region — `role='status'` (polite) for info, `role='alert'` (assertive) for errors — and prime the empty region in the initial markup so later changes are announced."

**Severity:** Critical (link/button mismatch and missing labels block keyboard/AT users); Major (heading/landmark structure); Minor (decorative alt).

---

## 13. Performance-Visible Quality Indicators

**Detect (video/screenshots):** Watch for scroll/animation jank (dropped frames, stutter), paint flicker, image pop-in (no blur-up/placeholder), blank text during font load, hydration flash / content invisible until JS, and visible interaction delay between action and UI response. Note animations of layout-triggering properties. Field metrics (INP, LCP) cannot be read from a static screenshot — observe qualitatively and recommend Lighthouse / field measurement (see `references/automated-tools.md`).

**Thresholds (web.dev / Google):**

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| **INP** (Interaction to Next Paint) | ≤ 200 ms | 200–500 ms | > 500 ms |
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | — | — |
| **CLS** | ≤ 0.1 | 0.1–0.25 | > 0.25 (see §3) |

All evaluated at the **75th percentile** of field page loads.

**Perceptual context (Nielsen Norman Group, *Response Time Limits*):** ~**0.1 second (100 ms)** is the limit for the user to feel the system reacts instantaneously; web.dev concurs that delays up to ~100 ms read as instantaneous. Delays approaching 300 ms+ read as sluggish. Smooth animation target = **60 fps (~16.7 ms/frame)**; JS tasks **> 50 ms** block the main thread (long tasks).

**Failure example:** Scrolling a long list stutters because each row animates `box-shadow`/`top`. A card grid pops in abruptly with no blur-up placeholder. After SSR, the page flashes unstyled/unhydrated then jumps when JS loads. A button click shows no response for ~400 ms (long task on main thread) → INP "poor." An animation tweens `width`/`left`, causing layout thrash.

**Terminology:** jank / dropped frames; non-composited animation (layout-triggering); image pop-in / missing blur-up; render-blocking font (blank text); hydration flash / CSR-SSR mismatch; interaction latency (INP); long task main-thread block; bundle-induced slow first paint.

**Fix prompt:**
> "Fix performance-visible defects. The list scroll stutters because rows animate `box-shadow`/`top`, the card grid pops in with no placeholder, the page flashes unhydrated after SSR, and a button click shows no response for ~400 ms (INP 'poor'). (1) Animate only compositor-friendly `transform`/`opacity` in scroll/animation paths; never `top`/`left`/`width`/`height`/`box-shadow`. (2) Add `loading='lazy'` to below-the-fold images and `fetchpriority='high'` (eager) to the LCP image; add a blur-up/LQIP placeholder to the card grid. (3) Preload critical fonts and use `font-display: swap`/`optional` so text never goes blank. (4) Reduce the hydration flash: stream SSR, avoid layout-dependent client-only rendering above the fold, and reserve space for client-rendered components. (5) Break long tasks (> 50 ms) and defer non-critical JS so interactions paint within 200 ms. (6) Code-split heavy routes to shorten first paint. Target INP ≤ 200 ms, LCP ≤ 2.5 s, CLS ≤ 0.1 at p75."

**Severity:** Critical (INP > 500 ms / unresponsive UI); Major (jank, hydration flash); Minor (below-fold pop-in).

---

## Sourcing Caveats

Operational caveats that change what the agent should assert:

- **Core Web Vitals are field metrics at p75.** Never report a CLS/INP/LCP number from a static screenshot as if measured — describe observed behavior and recommend Lighthouse or field measurement. CLS ≤0.1 / 0.1–0.25 / >0.25; INP ≤200 / 200–500 / >500 ms; LCP ≤2.5 s — all from web.dev/Google.
- **`font-display` metric-matching override values are illustrative.** Reverse-engineered/example `size-adjust`/`ascent-override`/`descent-override` percentages drift per font — treat the example as illustrative of the principle and generate exact values with Fontaine/Capsize.
- **No environment has a real screen reader.** For modal announcements, live regions, and AT behavior, inspect the accessibility tree and recommend manual AT testing — do not claim verified screen-reader behavior.
- **`100vw` scrollbar fix is not universal.** Only fixed in Chrome 145+ under specific conditions; do not assume the fix is present — recommend `100%` / `100dvw` + `scrollbar-gutter: stable`.
- **Flex `gap` is unsupported on iOS Safari ≤ 14.4.** Treat gap-on-flex as a cross-browser risk for old Safari, not a guaranteed-safe primitive.
- **The Linear/Stripe/Vercel "premium" bar is descriptive, not a public numeric score.** Use it as a qualitative target.

Quantitative standards trace to first-party authorities: web.dev/Google (Core Web Vitals), MDN (`font-display`, `size-adjust`/`ascent-override`/`descent-override`, stacking context, `-webkit-line-clamp`, `srcset`/`image-set()`, `scrollbar-gutter`, `:focus-visible`, `cursor`, `aria-live`, `aria-modal`), W3C/WAI (WCAG 2.4.7, 1.4.11, 4.1.2, 4.1.3, 2.2.1, ARIA Dialog pattern, "Text size in translation"), Nielsen Norman Group (response-time limits), Argo Translation (CJK contraction).
