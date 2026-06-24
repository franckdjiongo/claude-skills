# Testing Protocol — Hands-On QA Execution Playbook

The literal step-by-step sequence an agent follows when it drives a **real browser** to QA a running web app. This file is *what you click, type, resize, observe, and capture, and in what order* — it does not redefine defects, scoring, environments, or CLI tools (see cross-references).

> **Sibling files — do not duplicate:**
> - Per-platform capability differences (which phases each tool can run) → `references/environment-adaptation.md`.
> - Copy-paste CLI commands (Lighthouse, axe/pa11y, Wallace, odiff, etc.) → `references/automated-tools.md`.
> - Defect definitions → `references/defect-taxonomy.md` (visual/UX) and `references/edge-cases.md` (implementation/content).
> - Severity legend, scoring, report structure, correction-prompt anatomy → `references/scoring-and-report.md`.

---

## Table of Contents

1. [Master Test Protocol — 10-Phase Sequence](#1-master-test-protocol--10-phase-sequence)
2. [Viewport Sweep Protocol](#2-viewport-sweep-protocol)
3. [Interactive State Protocol](#3-interactive-state-protocol)
4. [Keyboard & Accessibility Protocol](#4-keyboard--accessibility-protocol)
5. [Content Stress Protocol](#5-content-stress-protocol)
6. [User Flow Protocol](#6-user-flow-protocol)
7. [Scroll & Animation Protocol](#7-scroll--animation-protocol)
8. [DevTools Inspection Protocol](#8-devtools-inspection-protocol)
9. [Prioritization & Time-Boxing](#9-prioritization--time-boxing)

---

## 1. Master Test Protocol — 10-Phase Sequence

Run phases **in order** — each builds context for the next. Times assume a typical 10-page app and a single agent. Full comprehensive run ≈ **115–130 min (~2 hr)**; critical-path quick audit ≈ **30 min** (see [§9](#9-prioritization--time-boxing)). Timing figures are **planning estimates only** — computer-use loops (screenshot → reason → act per step) scale with app complexity and reasoning-effort, so real wall-clock time varies.

**Time-boxed priority order:** Phase 1 → 6 (critical path) → 2 → 3 → 4 → 8 → 5 → 7 → 9.

### Phase 1 — Reconnaissance (~8 min)

**Actions:**
1. Navigate to the app root URL.
2. Wait for network idle (~2 s after last request).
3. Capture a full-page screenshot at default viewport (`1280px` or `1440px`).
4. Open DevTools → Console; record all errors/warnings on load.
5. Detect tech stack via DOM/console fingerprints:

| Framework | Fingerprint |
|---|---|
| Next.js | `<script id="__NEXT_DATA__">`, `/_next/static/` URLs |
| React | `data-reactroot`, `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` |
| Vue / Nuxt | `window.__VUE__`, `window.__NUXT__` |
| Angular | `ng-version` attribute |
| (any) | `X-Powered-By` response header |

6. Map navigation: enumerate every link in primary nav + footer; build a route list; count pages.

**Observe:** console errors, framework fingerprints, route count, presence of a design-token CSS custom-property layer (`--color-*`, `--space-*`).

**Capture:** 1 full-page home at default width.

**Pass:** app loads with no uncaught console errors; navigation map complete.
**Fail:** white screen, hydration error, 4xx/5xx on root, or uncaught JS error on load → maps to performance-visible defects in `references/edge-cases.md`.

*Timing:* navigation 30 s; stack ID 90 s; nav mapping ~5 min.

### Phase 2 — Viewport Sweep (~12 min)

Resize + screenshot at `375, 390, 414, 768, 834, 1024, 1280, 1440, 1920px` (mobile-first ascending). At each width capture above-the-fold + one full-page. Note layout breaks. Full protocol in [§2](#2-viewport-sweep-protocol). Maps to *responsive* (`references/defect-taxonomy.md`) + *overflow/clipping* (`references/edge-cases.md`). ~75 s/breakpoint.

### Phase 3 — Component-Level Audit (~15 min)

On the page where each first appears, systematically inspect: headers, cards, buttons, forms, tables, nav, footers, modals. Screenshot each and check spacing rhythm, alignment, type scale (`references/defect-taxonomy.md`) and semantic-HTML depth + CSS anti-patterns (`references/edge-cases.md`). ~1.5 min/component type.

### Phase 4 — Interaction Testing (~18 min)

Hover, focus, click/tap, and type into every interactive element. Full protocol in [§3](#3-interactive-state-protocol). Maps to *cursor/interaction states* (`references/edge-cases.md`) + motion standards (`references/design-system-reference.md`). ~2 min/page.

### Phase 5 — State Testing (~12 min)

Trigger loading, error, empty, success, disabled, expanded, collapsed states. Protocols in [§3](#3-interactive-state-protocol) (component states) and [§5](#5-content-stress-protocol) (data-driven empty states). Maps to *content resilience & edge cases* in `references/edge-cases.md`.

### Phase 6 — Flow Testing (~20 min)

Walk signup, login, core CRUD, checkout, settings journeys. Full protocol in [§6](#6-user-flow-protocol). Maps to UX taxonomy (`references/defect-taxonomy.md`) + i18n/content resilience (`references/edge-cases.md`).

### Phase 7 — Stress Testing (~10 min)

Inject edge-case data, extreme content lengths, rapid interactions. Full protocol in [§5](#5-content-stress-protocol). Maps to *content resilience, overflow/clipping, CLS* in `references/edge-cases.md`.

### Phase 8 — Accessibility Pass (~12 min)

Keyboard-only nav, focus order, ARIA/accessibility-tree inspection, contrast. Full protocol in [§4](#4-keyboard--accessibility-protocol). Maps to contrast/vocabulary (`references/defect-taxonomy.md`) + semantic HTML (`references/edge-cases.md`).

### Phase 9 — Performance Observation (~8 min)

Scroll smoothness, animation frame rate, interaction latency, loading sequence. Protocols in [§7](#7-scroll--animation-protocol) + DevTools performance profile [§8](#8-devtools-inspection-protocol). Maps to *CLS/visual stability, performance-visible defects* (`references/edge-cases.md`) + motion (`references/design-system-reference.md`).

### Phase 10 — Report Compilation (~10 min)

Aggregate findings, score, generate correction prompts, output a unified report. Score and format per `references/scoring-and-report.md`. Fill `assets/audit-report-template.md`.

---

## 2. Viewport Sweep Protocol

### Resize Sequence & Order

Use **mobile-first ascending**: `375 → 390 → 414 → 768 → 834 → 1024 → 1280 → 1440 → 1920px`.

Rationale: ascending matches the cascade order of `min-width` media queries (the dominant modern convention), so you observe the same progressive-enhancement path the CSS author designed; it also surfaces mobile overflow first — the highest-traffic failure class. Use **descending** (`1920 → 375`) only when the app is a desktop-first internal tool built on `max-width` queries.

### Per-Breakpoint Actions

1. Resize.
2. Wait `500 ms` for reflow.
3. Screenshot above-the-fold.
4. Scroll to bottom.
5. Full-page screenshot.
6. Check horizontal scrollbar presence: `document.documentElement.scrollWidth > clientWidth`.

### Per-Breakpoint Checklist

- Does nav adapt (hamburger appears `≤768px`)?
- Do grid columns reflow?
- Does type scale?
- Are touch targets `≥24×24 CSS px` (WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA)?
- Any horizontal scroll?
- Any element wider than the viewport?

### Breakpoint-Transition Testing (binary search)

Slowly drag width across each boundary (e.g. `760→780px`, `1020→1030px`) watching for awkward intermediate states — squished nav, overlapping cards, orphaned grid items. **When a break is found, binary-search the exact pixel where it appears** and screenshot at that precise width plus `±2px`.

### Orientation

At `375` and `834`, test landscape (`667×375`, `1194×834`). Check that fixed headers don't consume the whole viewport and modals remain scrollable.

### Container Queries

If `@container` is used, resize the **component's parent** (e.g. collapse a sidebar), not just the window — container-query components respond to their container, not the viewport. If the app makes heavy use of `@container`, shift Phase 2 emphasis from window resize to container resize.

### Failures to Actively Probe

Maps to *overflow/clipping* (`references/edge-cases.md`) + *responsive* (`references/defect-taxonomy.md`):

- Fixed-width elements (`width: 1200px`) causing horizontal overflow.
- `position: absolute` elements escaping their containers.
- Images without `max-width: 100%`.
- Nav menus that neither collapse nor wrap.
- Modals taller than the mobile viewport with no internal scroll.

### Pass / Fail

**Pass:** no horizontal scroll at any width; nav adapts; no overlap; touch targets adequate.
**Fail:** any horizontal scroll, clipped content, or unusable mobile modal.

> Viewport resize is not natively reliable in every environment (the Codex in-app browser cannot resize to arbitrary pixel widths — defer to DevTools device emulation). Capability matrix: `references/environment-adaptation.md`.

#### Self-contained fix prompt — horizontal overflow

> In the `.product-grid` container, a child `.feature-card` has `width: 1200px` (fixed), which forces horizontal scroll below `1200px` viewport width. Change `.feature-card` to `width: 100%; max-width: 1200px;` so it shrinks fluidly. Ensure `document.documentElement.scrollWidth` never exceeds `clientWidth` at any width from `375px` to `1920px`. Do not introduce a horizontal scrollbar, do not set `overflow-x: hidden` on `body` to mask it, and do not use fixed pixel widths on any grid child.

---

## 3. Interactive State Protocol

Test every interactive element. Document each: **action → expected → actual → screenshot**.

### Hover (~10 s/element)

Move cursor over every button/link/card/icon/table row; screenshot the hover state.
**Pass:** visible, consistent feedback (color/elevation/cursor change) within `~100 ms`; cursor becomes `pointer` on clickables.
**Fail:** no feedback, or a hover style that shifts layout → maps to *cursor/interaction states* + *CLS* (`references/edge-cases.md`).

### Focus (~3 min/page — Tab through page)

Press Tab repeatedly; screenshot at each stop.
**Pass:** every interactive element shows a visible focus ring (`≥3:1` contrast against background); focus order follows visual/reading order; modals trap focus; a skip-to-content link appears on first Tab.
**Fail:** invisible focus (`outline: none` with no replacement), illogical jumps, focus escaping a modal → contrast (`references/defect-taxonomy.md`) + overlay patterns (`references/edge-cases.md`).

### Click / Tap (per element)

Click every interactive element; observe feedback animation, state change, navigation result.
**Pass:** immediate visual acknowledgment (`≤100 ms`) and correct result.
**Fail:** dead click, double-navigation, or silent failure.

### Form Interaction (~4 min/form)

Sequence:
1. Focus each input — check label association + focus style.
2. Type valid data.
3. Type invalid data — observe inline-validation timing (should validate **on blur or after a debounce**, not on every keystroke) and message clarity.
4. Submit empty required fields → expect inline errors naming each field.
5. Submit valid data → expect success feedback.
6. Password fields: test show/hide toggle and strength meter.
7. Search: test autocomplete, clear button, loading indicator.
8. Date pickers, dropdowns, multi-selects, file uploads.

Maps to UX taxonomy (`references/defect-taxonomy.md`) + content resilience (`references/edge-cases.md`).

### Disabled State

Attempt to click/type a disabled control.
**Pass:** truly non-interactive; visually distinct (reduced opacity/muted); `cursor: not-allowed`; `aria-disabled` or `disabled` present.
**Fail:** looks disabled but still fires, or vice versa.

### Loading State

Trigger fetches (submit, navigate, filter).
**Pass:** skeleton/spinner/progress appears within `~100 ms`; no layout shift when content arrives (space reserved).
**Fail:** blank gap, spinner that never resolves, content jump → *CLS* (`references/edge-cases.md`).

### Error-State Recovery

Force an error (bad input, offline).
**Pass:** clear recovery path — retry button, dismiss/clear, or navigate away — and the message is human-readable.
**Fail:** dead-end error, raw stack trace, or no recovery.

#### Self-contained fix prompt — invisible focus ring

> The `.btn-primary` and `.nav-link` elements set `outline: none` on `:focus` with no replacement, leaving keyboard users no visible focus indicator. Add a visible focus style on `:focus-visible`: `outline: 2px solid var(--color-focus, #2563eb); outline-offset: 2px;` achieving at least `3:1` contrast against both the button fill and the page background. Apply to all interactive elements (`a, button, input, select, [tabindex]`). Do not remove the outline without a replacement, do not rely on color change alone, and do not suppress focus on mouse-only `:focus` if it also kills `:focus-visible`.

---

## 4. Keyboard & Accessibility Protocol

Hands-on, keyboard + DOM-inspection based.

> **No environment has a real screen reader.** All assistive-technology output (VoiceOver/NVDA/JAWS) is invisible to the agent. Verify screen-reader semantics by inspecting the **accessibility tree** and ARIA attributes — **never claim "the screen reader announces X."** Always label this as *accessibility-tree inspection, not real AT testing*, and recommend manual VoiceOver/NVDA verification in the report.

### Audit Items

- **Tab-order audit:** Tab through the whole page; record the focus sequence; flag any jump that doesn't match reading order → *semantic HTML depth* (`references/edge-cases.md`).
- **Enter/Space activation:** activate buttons + links with Enter; toggle checkboxes/switches with Space. **Pass:** native semantics work. **Fail:** `<div onclick>` that ignores the keyboard.
- **Escape:** every overlay (modal, dropdown, drawer, tooltip) must dismiss on Esc **and return focus to its trigger** → overlay patterns (`references/edge-cases.md`).
- **Arrow-key navigation:** tabs, menus, radio groups, listboxes, date pickers should support arrow keys per the ARIA Authoring Practices roving-`tabindex` pattern.
- **Focus management on dynamic content:** opening a modal moves focus inside; closing returns focus to the trigger; newly inserted content is announced via `aria-live`.
- **Skip navigation:** first Tab reveals a "Skip to main content" link.
- **ARIA DOM inspection** — for each component verify appropriate:

| Attribute | Use |
|---|---|
| `role` | element semantics |
| `aria-label` / `aria-labelledby` | accessible name |
| `aria-describedby` | supplementary description |
| `aria-expanded` | disclosure / accordion triggers |
| `aria-hidden` | decorative / duplicate content |
| `aria-live` | status regions |

### Color-Contrast Verification

Read computed `color` + `background-color` via DevTools; compute the ratio.

| Conformance | Normal text | Large text (`≥24px`, or `≥18.7px` bold) |
|---|---|---|
| WCAG AA | `4.5:1` | `3:1` |
| WCAG AAA | `7:1` | `4.5:1` |

Cross-check the automated axe/pa11y contrast results (see `references/automated-tools.md`).

### Touch-Target Sizing

- **`24×24 CSS px`** = WCAG 2.2 SC 2.5.8 Target Size (Minimum), **Level AA**.
- **`44×44 CSS px`** = the *separate* **Level AAA** criterion SC 2.5.5 Target Size (Enhanced) — not merely a recommendation. Cite the correct criterion for the conformance level being claimed.

### Pass/Fail

Pass/Fail per item; aggregate into the accessibility sub-score per `references/scoring-and-report.md`.

#### Self-contained fix prompt — non-keyboard-operable control

> The "Add to cart" control is a `<div class="add-btn" onclick="addToCart()">` with no keyboard support — it cannot be reached by Tab or activated by Enter/Space, and exposes no role to the accessibility tree. Replace it with a native `<button type="button" class="add-btn" onclick="addToCart()">Add to cart</button>` so it is focusable, keyboard-activatable, and announced as a button. Do not add `tabindex` + key handlers to the `<div>` as a substitute, and do not use `role="button"` on a non-focusable element.

---

## 5. Content Stress Protocol

Edge-case **injection matrix**. Document each: **input → expected → actual → screenshot**. All map to *content resilience & edge cases*, *overflow/clipping*, *i18n resilience* in `references/edge-cases.md`.

| Stress case | Input | Expected |
|---|---|---|
| **Long text** | Paste a 200+ char string with no spaces (`Loremipsum…` repeated) into names, titles, search, form fields. | Truncation with ellipsis or graceful wrap/break (`overflow-wrap: anywhere`); never horizontal overflow or container escape. |
| **Short text** | Single character where multi-word expected (name `"A"`). | Layout holds; no awkward centering/collapse. |
| **Empty states** | Clear lists, empty the cart, remove all notifications. | A *designed* empty state (illustration/message/CTA), not a blank box or `"undefined"`. |
| **Numeric extremes** | Enter `0`, negatives, very large numbers (`999999999`), many decimals. | Formatting holds (thousands separators, currency); no overflow; no `NaN`. |
| **Special characters** | Inject emoji ZWJ sequences (`👨‍👩‍👧‍👦`), zalgo text, RTL marks, CJK, HTML entities (`<script>`, `&amp;`, `"`). | Correct rendering **and escaping** (no raw HTML injection — also a security smell); no line-height blowout from zalgo. |
| **Rapid repeated actions** | Click Submit `10×` in `<1 s`. | Duplicate-submission prevention (button disables, request debounced); no 10 duplicate records. |
| **Image failure** | Break an image `src` (or set DevTools network to Offline). | `alt` text shows; layout preserves reserved space (no collapse/jump); a fallback/placeholder renders. |

#### Self-contained fix prompt — unbroken long string overflows container

> Pasting a 200-character string with no spaces into the `.user-name` field causes the text to overflow `.profile-card` horizontally and trigger page-level horizontal scroll. Apply `overflow-wrap: anywhere; word-break: break-word;` to `.user-name`, or truncate with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` if a single-line display is intended. The card width must stay within its grid cell at all viewports `375px–1920px`. Do not set `overflow-x: hidden` on `body`, and do not widen the card to fit the string.

---

## 6. User Flow Protocol

- **Flow mapping:** enumerate primary journeys — onboarding, auth, core CRUD, settings, profile.
- **Happy path:** complete each with valid data; evaluate every transition and confirm feedback at each step → UX taxonomy (`references/defect-taxonomy.md`).
- **Error path:** wrong password, invalid email format, simulated network error. Evaluate messaging clarity and recovery.
- **Back-button behavior:** after submitting/navigating, press browser Back. **Pass:** state preserved, no data loss, no duplicate submission.
- **Deep-link testing:** navigate directly to an interior URL (e.g. `/settings/billing`). **Pass:** page loads in correct state; if auth-gated, redirects to login then returns post-login.
- **Breadcrumb accuracy:** verify breadcrumbs reflect the true path and each crumb links correctly.
- **Multi-step wizards:** check progress indication, forward/back nav, data persistence between steps, and per-step validation; **go back a step and confirm prior data is retained.**
- **Session edge cases:** let the session expire mid-flow (or clear the auth cookie). **Pass:** graceful redirect to login with a message and, ideally, draft preservation. **Fail:** silent data loss or a broken half-state.

Per flow, screenshot each transition; map failures to content/i18n (`references/edge-cases.md`) and UX (`references/defect-taxonomy.md`) categories.

#### Self-contained fix prompt — back button loses form data

> After submitting the multi-step checkout wizard's "Shipping" step and advancing to "Payment", pressing the browser Back button returns to "Shipping" with all fields blank — entered data is lost. Persist each step's form state (e.g. to component state lifted above the wizard, URL query params, or `sessionStorage` keyed per step) and rehydrate inputs on Back so previously entered values reappear. Going Back then Forward must show the same data. Do not block the browser Back button, and do not re-submit the form on Back navigation.

---

## 7. Scroll & Animation Protocol

Observe motion quality during **active interaction**. Maps to *motion/animation standards* (`references/design-system-reference.md`) + *CLS* (`references/edge-cases.md`).

- **Scroll smoothness:** scroll slowly then fast; watch for jank, flicker, or frame drops. *(Capture method differs per environment — WebP video vs screenshot burst — see `references/environment-adaptation.md`.)*
- **Scroll-linked animations:** parallax, reveal-on-scroll, progress bars — verify they fire at the right thresholds and don't re-trigger jarringly on scroll-up.
- **Sticky elements:** confirm headers/sidebars stick at the right point, don't overlap content, and carry proper elevation shadow.
- **Infinite scroll / pagination:** verify new content loads, a loading indicator shows, and scroll position is preserved on back-navigation.
- **Pull-to-refresh:** at mobile viewport, test the gesture if implemented.
- **Scroll snap:** carousels and full-page sections — verify snap points engage, momentum feels natural, and keyboard arrows move between slides.
- **Animation interruption:** start an animation (e.g. open a drawer) then immediately click elsewhere; expect graceful completion/cancellation, not a glitch or stuck half-state.

### Reduced Motion (DevTools toggle)

1. Open DevTools → **Rendering** panel.
2. Set **"Emulate CSS media feature `prefers-reduced-motion`"** → `reduce` (or open the Command Menu and type `"reduced"`).
3. Reload the page.
4. Re-test.

**Pass:** non-essential animation is suppressed or simplified (opacity instead of movement); nothing breaks.
**Fail:** animations still run, or content that depends on an animation to appear becomes invisible.

> If an environment cannot reach the DevTools Rendering panel, flag this as a gap and recommend manual verification.

#### Self-contained fix prompt — reduced-motion not honored

> With `prefers-reduced-motion: reduce` emulated in DevTools, the homepage hero still runs its full parallax + slide-in entrance animations, and the "reveal-on-scroll" cards remain `opacity: 0` until a scroll-triggered transform fires — so reduced-motion users see blank cards. Wrap all non-essential motion in `@media (prefers-reduced-motion: reduce) { ... }` that disables transforms/translations (set `animation: none; transition: none;` or swap to a plain `opacity` fade), and ensure scroll-revealed content is visible by default (`opacity: 1`) when reduced motion is requested. Do not leave any content permanently hidden behind a suppressed animation, and do not remove the animations for all users.

---

## 8. DevTools Inspection Protocol

What to check via DevTools / DOM inspection. *(DevTools access method differs per environment — visual vs full CDP vs native DOM — see `references/environment-adaptation.md`.)*

- **Console:** record JS errors, warnings, deprecations — these often flag UI bugs (failed component mounts, prop-type errors). Maps to *performance-visible defects* (`references/edge-cases.md`).
- **Computed styles:** inspect `padding`, `margin`, `font-size`, `line-height`, `color`, `background` of key components; compare against design tokens / `references/design-system-reference.md`.
- **Box-model visualization:** verify spacing snaps to a `4px`/`8px` system (spacing rhythm — `references/defect-taxonomy.md`).
- **Layout debugging:** enable flexbox/grid overlays; look for items not aligning, uneven distribution, or `flex-shrink` collapse.
- **Network tab:** find failed loads — `404` images, blocked/failed fonts (FOIT/FOUT — *font loading* in `references/edge-cases.md`), failed API calls that cause visual defects.
- **Performance profiling:** record a profile while scrolling/interacting; look for long tasks, layout thrashing, excessive repaints (*CLS/performance-visible* — `references/edge-cases.md`).
- **Accessibility tree:** read the computed name/role/state each element exposes (DevTools → Accessibility pane), per [§4](#4-keyboard--accessibility-protocol). Label as accessibility-tree inspection, not AT testing.
- **CSS custom-properties audit:** check whether colors/spacing/type come from `--color-*` / `--space-*` / `--font-*` tokens vs hardcoded values (a key design-system-adherence signal). Corroborate with the Project Wallace CLI in `references/automated-tools.md`.

---

## 9. Prioritization & Time-Boxing

### Priority Rules

- **Critical path first:** test the primary user journey (e.g. land → sign up → core action → checkout) end-to-end *before* exhaustive coverage, so the highest-value defects surface early.
- **Above-the-fold first:** at each breakpoint, audit the initial viewport before scrolling — it's what every user sees first.
- **High-traffic pages first:** homepage, dashboard, primary product page, checkout — in that order when known.
- **Component-frequency priority:** test the most-reused components first (buttons, inputs, cards, nav) — a defect in a shared component multiplies across every page; fixing it once clears many instances.
- **Defect clustering:** when several defects appear in one area, investigate adjacent components more thoroughly — clusters indicate a systemic cause (a broken shared style, a bad token).

### Time-Boxing

| Audit | Sequence (minutes) |
|---|---|
| **30-min quick** | Phase 1 (5) + critical-path flow (10) + Phase 2 at `375/768/1440` only (8) + shared-component spot check (5) + report (2) |
| **2-hr comprehensive** | Full 10-phase sequence as timed in [§1](#1-master-test-protocol--10-phase-sequence) |

### Skip Conditions

- **Skip** exhaustive testing of third-party embedded widgets the developer cannot modify (Stripe/Calendly iframes, embedded maps) — note them as **"third-party, out of scope."**
- **Skip** polish-level scrutiny on deliberately minimal internal tools where the team has explicitly deprioritized UI.
- **Never skip** the critical path or accessibility basics.
