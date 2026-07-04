# Visual QA Checklist

This is the operational core of the ship-polished-ui skill. Run through it after every UI change you intend to declare "done." The checklist is structured so you can move quickly through the items that don't apply and slow down on the ones that do.

The checklist has **thirteen sections**. Sections marked `★` are non-negotiable for any UI change — skipping them is what caused the bugs that motivated this skill. (Section 13 — Motion QA — is non-negotiable only for surfaces that actually carry motion; for a fully static change it is a fast N/A.)

---

## ★ Section 1 — Build the scope matrix and post it *before* the first screenshot

The output of the whole verify phase is one artifact — the **Verification Ledger**, an accountable table posted in the chat. This section builds its skeleton: the scope matrix. **The matrix must be posted as a table in the chat before you take the first screenshot.** A matrix "in your head" does not exist; a run that screenshots first and reconstructs scope afterward is exactly the self-attestation this skill exists to kill.

### 1a — Enumerate the surfaces

- **Edit / retouche mode** — start from the change: which CSS properties (`overflow`, `padding`, `background`, `z-index`, …), which selectors (`.card`, `.surface::before`, …), what each change visually affects (spell out the chain: "padding 16→24px makes the bar taller, so the brand-rail clip area extends further"), and what adjacent elements/states could regress (anything inside the changed container, anything stacking against it, anything inheriting its sizing/stacking context). List them all.
- **Full-site build mode** — there is no "changed CSS" scope on greenfield. The matrix is the **inventory: pages × sections × viewports**. Enumerate every page, every major section within it.

### 1b — Make it a grid: surfaces × viewports × states

Verification is a grid, not a list. Every surface × every viewport that matters × light/dark if the app themes:

- Viewports: **320/360 (small-mobile)**, ~375px mobile, ~768px tablet, desktop. **A device class that was never actually rendered makes the entire verdict `INVALID`** — this is a binary gate carried from design-forge v1.1, not a soft preference.
- Mark which surfaces are **interaction-reached** — modals, drawers, detail views, popovers, expanded rows, anything behind a click or a route. Those get reached late and end up verified at one viewport only; listing them here is what makes the Section 8 responsive sweep actually cover them.

### 1c — Two families of ledger rows

The ledger carries two kinds of rows, and the honesty rule (below) applies to **both**:

- **Per-cell rows** — one row per `surface × viewport × state` (e.g. `hero · 320 · menu-open`).
- **Transverse rows** — one row per property that is not tied to a single cell: palette contrast, reduced-motion, performance (LCP/CLS/INP), Design-Spec conformance. Their Viewport/State columns read `—`.

### 1d — The honesty rule (governs every cell)

- **A cell that was not actually rendered is `not-evidenced`, never PASS.** Silence is not a pass.
- **A PASS requires a real proof:** a screenshot ID that resolves to a real file, plus the measured value where applicable (`scrollWidth/clientWidth`, contrast ratio, touch-target px).
- **Settle before every capture:** scroll to rest and wait for in-flight transitions/animations to finish before the screenshot — mid-animation frames are a confirmed source of false positives. A capture taken before the surface settles does not evidence a cell.

### 1e — The ledger format

The completed ledger is posted in Section 12 under a heading containing the exact string `VERIFICATION LEDGER`. Use this table shape (one row per cell actually executed):

```
| Surface        | Viewport | État          | Verdict        | Preuve                        |
|----------------|----------|---------------|----------------|-------------------------------|
| hero           | 320      | initial       | PASS           | shot_a3f2 · scrollW 320=320   |
| hero           | 320      | menu ouvert   | PASS           | shot_b81c                     |
| pricing modal  | 768      | ouvert        | FAIL→fix→PASS  | shot_c4d9 → shot_e2a1         |
| footer         | 1440     | —             | not-evidenced  | (viewport non re-rendu après fix — à couvrir) |
| contraste corps| —        | palette       | PASS 7.2:1     | contrast-check.mjs            |
| focus clavier  | —        | tab sweep     | PASS           | shot_d5e6 (ring visible, no trap)|
| reduced-motion | —        | OS activé     | PASS           | shot_f7b3 (fades, site complet)|
| LCP mobile     | —        | load          | PASS 1.9s      | lighthouse mobile / web-vitals |
| CLS            | —        | load          | PASS 0.02      | idem                          |
| INP            | —        | interactions  | not-evidenced  | (outil indisponible ce run)   |
| WebKit hero    | —        | livraison     | PASS           | shot_g8h9 (playwright webkit) |
| Design Spec §1 | —        | typo nommée   | PASS           | @font-face chargé, grep       |
```

Deux familles de lignes : PAR CELLULE (surface×viewport×état) et TRANSVERSES (palette/a11y/perf/spec, Viewport = « — ») — not-evidenced s'applique aux deux.
Règles : cellule sans preuve = not-evidenced ≠ PASS · classe d'appareil manquante = verdict global INVALIDE · réduction de scope = approbation utilisateur consignée ici.

If you can't build this matrix, you don't yet understand your own change well enough to verify it.

---

## ★ Section 2 — Open the running app, do not trust HMR

1. **Find the dev URL.** `npm run dev`, `bun dev`, Vite local-play URL, Next dev server, whatever.
2. **Connect via the right browser tool.** Chrome MCP for typical web apps, computer-use for native, whatever the user's setup uses. If a server is already running, **do not restart it** — that often kills sessions / state.
3. **Navigate to the affected page.**
4. **If the app is in an iframe** (Power Apps Code App, Salesforce embed, embedded SaaS), read `references/iframe-and-host-shells.md` before doing anything else — your screenshots and CSS-served-by-Vite need iframe-aware interpretation.
5. **Take an "before applying my mental model" screenshot.** Look at it carefully. Sometimes you find that the page already looks different from what you expected — for instance, HMR didn't reload, or the user's data doesn't include the field your design assumed. Catch that gap now.
6. **Beware the HTTP cache, not just HMR.** "Don't trust HMR" has a quieter twin: the browser's HTTP cache. A plain static dev server (`python -m http.server`, many `serve`/`http-server` setups) sends `Last-Modified` and no `Cache-Control`, so the browser *heuristically* caches your CSS/JS and serves the **stale** copy on reload — even in a new tab, even after you saved the file. You then verify against code that isn't running and chase ghosts (this cost real cycles in a docs-restyle session: every edit looked like it did nothing). Defenses, cheapest first: (a) serve with `Cache-Control: no-store`; (b) if you can't change the server, hard-reload or cache-bust the asset URL (`href + '?v=' + Date.now()`); (c) if the cache is already poisoned, load from a **fresh origin** — a different port has an empty cache. Whatever you do, **confirm the served asset actually changed** before trusting any screenshot: `fetch(url, {cache:'no-store'})` and grep for your edit, or inject a temporary marker (`window.__build='x'`) and read it back. A green screenshot of stale code is worse than no screenshot.

---

## ★ Section 3 — Multi-position screenshots

A single default-scroll screenshot is **not enough** for any change that affects layout, background, scroll regions, or anything below the fold.

1. **Top of page** — scroll all the way to top. Screenshot.
2. **Mid-scroll** — scroll about halfway. Screenshot.
3. **Bottom of page** — scroll all the way to the bottom. Screenshot. **This is the one Claude usually skips and the user usually catches.**
4. **During scroll** — if the change affects sticky elements, scroll-aware backgrounds, parallax, or stretched canvases, capture during scroll (mid-motion).

For each screenshot:

- Does the **canvas / background** still cover the visible area? (No flat-white falloff anywhere.)
- Are **sticky elements** behaving as designed?
- Are **scroll-position-dependent elements** (counters, breadcrumbs, "back to top" buttons) correct?

---

## ★ Section 4 — Element-level zoom on every touched element

Full-page screenshots are too zoomed-out to reveal hairline issues. For each piece of CSS you changed:

1. **Identify the element on screen.** Coordinates of its bounding rect, roughly.
2. **Zoom into a region of ~50–200 px around it** using the browser MCP's zoom tool (or browser dev tools magnification, whatever your harness offers).
3. **Look at every edge.**
   - Are rounded corners actually rounded? (No square overflow at the corner.)
   - Are borders pixel-clean? (No subpixel doubling, no aliasing artifacts.)
   - Does any pseudo-element (`::before`, `::after`) extend past the parent's clip area?
   - Are absolutely positioned overlays where you expect, with the right offset?
   - Are decorative elements (accent bars, dots, glows) at the right scale?

This step catches the "brand rail overflows past rounded corners" class of bug. It is **the single highest-value step in the checklist** when you've recently changed `overflow`, `clip-path`, `border-radius`, `position`, or any pseudo-element styling.

---

## ★ Section 5 — Exercise interactive states

For every component changed (and every component nested inside a changed container), exercise:

| State | What to verify |
|---|---|
| Hover | Does the hover treatment reveal correctly? Motion smooth? Cursor right? Hover state doesn't shift layout (no jitter)? |
| Focus | Visible focus ring? Reachable via Tab? Focus ring doesn't get clipped by `overflow: hidden`? |
| Click | Handler still fires? Popups/dropdowns/menus appear in front of siblings, not behind? Click hit-area covers the whole intended target? |
| Active / pressed | Brief feedback animation? Doesn't stick? |
| Disabled | Visually muted? Cursor `not-allowed`? Pointer events blocked? |
| Selected / checked | Distinguishable from unselected? Doesn't look identical to hover? |
| Empty / loading | Skeleton / spinner / empty state renders gracefully? |
| Error | Error styling visible? Doesn't break the layout around it? |

The dropdown-behind-cards bug from this session is a Section-5 bug. **Skipping interactive states is how it got missed.**

One carry-forward: every view you had to *click or navigate* to reach — a detail page, an opened modal, an expanded drawer — now goes on the list for the Section 8 responsive sweep. Resizing the browser later will not re-open it; if you don't note it, it stays verified at this one viewport only.

---

## ★ Section 6 — Cross-check adjacent elements

When you change a structural CSS property, **assume something else broke** and verify nearby. The most dangerous properties (with what they typically break):

| Property changed | Common regressions to verify |
|---|---|
| `overflow` (added or removed) | Pseudo-elements at the edge (the brand rail bug); descendant popups/tooltips clipped; scrollbars appearing/disappearing |
| `position: relative/absolute/fixed` | Stacking order with siblings; reference frame for descendants `position: absolute` |
| `z-index` | Stacking order vs siblings AND vs popups/dropdowns from descendants |
| `isolation: isolate` | New stacking context — descendant `z-index` is now scoped, popups may now render BEHIND siblings of the parent |
| `transform` | New stacking context (same risk as `isolation`); also breaks `position: fixed` for descendants |
| `filter`, `backdrop-filter`, `will-change` | Same stacking context risk; also can hide overflow that wasn't hidden before |
| `clip-path` | Clips children visually like `overflow: hidden` would, including popups and tooltips |
| `display` (changing flex/grid/block) | Child sizing, wrapping behavior, scroll containment |
| `gap` / `padding` / `margin` on flex/grid containers | Total height / overflow; potentially triggers a `@media` breakpoint to fire |
| `width` / `max-width` | Content overflow; truncation; whether responsive `@media` queries kick in |
| `background` / `background-image` / `background-size` / `background-attachment` | Whether the bg covers the full scrollable height; whether it interacts with ancestor `overflow: scroll` |

For each entry that applies, explicitly re-verify the dependent siblings/descendants — don't assume.

---

## ★ Section 7 — Read every label / value pair and counter

After any layout-affecting change near text:

1. **Walk through every label** in the affected area. For each:
   - Is its corresponding value visible?
   - Is the value's content correct?
   - Is the value styled distinctly from the label (so the eye can tell them apart)?
2. **Walk through every counter / badge / chip.**
   - Is the number rendering?
   - Is it the right number?
   - Does it disappear when zero, or render "0" — and is that the intended behavior?

The "PÉRIODE CONFIGURÉE / 19 avril — 26 avril" bug from the session was a Section-7 bug — the value silently got clipped, but the label rendered fine. **Visually confirming pairs is the only way to catch this.**

---

## ★ Section 8 — Responsive sweep: re-walk the matrix at every viewport

A viewport pass is **not** "resize the browser and glance at whatever page is open." Resizing does not re-open a modal, a drawer, or a detail view — those are reached by an interaction, and the interaction has to be redone by hand. If you only resize on the pages you can reach by URL, every interaction-reached view stays verified at the one viewport where you happened to exercise it back in Section 5 — almost always desktop. Horizontal-overflow and control-collision bugs live in exactly that gap.

So treat this as a sweep. For each viewport that matters —

- **Small-mobile** (320 / 360 px) — the narrowest real devices; overflow and cramped controls surface here first. **A device class that was never rendered makes the whole verdict `INVALID`** (Section 1 binary gate), so this class is not optional.
- **Mobile** (~375 px) — catches the most. Always do this one.
- **Tablet** (~768 px) — catches the awkward mid-range where a two-column grid is too tight.
- **Desktop** — your baseline.

— walk the **full surface list from Section 1**, and for every surface you marked *interaction-reached*, **redo the click / route that opens it at this viewport**. Don't reason "the page was fine, so the modal is fine" — the modal has its own layout.

For each surface at each viewport, check:

- **No horizontal overflow.** `document.documentElement.scrollWidth` should equal `clientWidth`. A page wider than its viewport is the signature bug — it spills images, buttons, and text off the right edge, and it is invisible until you actually load that surface at that width.
- Layout adapts — columns stack, nothing overlaps, text wraps instead of clipping.
- Touch targets: **gate (blocking) = ≥ 24×24 px** (WCAG 2.5.8 AA); **premium target = ≥ 44×44 px** (WCAG 2.5.5 AAA / Apple HIG). Below 24 px fails; between 24 and 44 px passes the gate but is flagged as sub-premium.
- Text over imagery stays legible — an overlay tuned for a desktop crop can wash out at a narrower one.

A frequent root cause for the overflow bug: a CSS grid given columns only at a breakpoint (`lg:grid-cols-2` with no base `grid-cols-1`) falls back, below that breakpoint, to an implicit `auto` track. An `auto` track sizes to its content's *max-content* — an image injects its full intrinsic width and blows the layout past the viewport. The fix is an explicit base column that is allowed to shrink: `grid-cols-1` (i.e. `minmax(0, 1fr)`).

---

## ★ Section 9 — Stress-test data edge cases

Even if the user's current data only shows one state, don't ship UI that breaks for plausible adjacent states.

- **Empty state.** What happens if the list is empty? Does the canvas collapse? Does the empty-state element render gracefully?
- **Single item.** Different layout from "many items"?
- **Many items / very long scroll.** Scroll well past one viewport. Does the background still cover everywhere? Do sticky bars stay sticky? Does any cached state leak between rows?
- **Long-string state.** A site name with 80 characters, an address that wraps. Does the card still align? Does it ellipsize gracefully?

You don't need to test every data state for every change — use judgment proportional to the change's scope. But for a change that affects a list, scroll, or layout container, test the empty and many-items states.

---

## ★ Section 10 — Reading & interaction ergonomics

Sections 1–9 ask *"is it correct?"* — does it render, clip, overflow, regress, hold across viewports and data. This section asks a different question: *"is it comfortable to actually live in?"* A surface can pass every correctness check and still be tiring — lines too long to track, navigation chrome crowding the content, a table that forces you to pan left-right for every single row, controls that work but sit in awkward spots. None of these throw an error or fail a `scrollWidth` check; they just make the user fight the layout. **You miss them because you screenshot once and move on; the user catches them in seconds because they're the one reading it for ten minutes.** The two bugs that motivated this section (see `session-lessons-2026-05-31.md`) were both ergonomic, not bugs: a sidebar that ate a third of the width while the reading column stayed cramped, and a reference table wide enough that every row needed horizontal scrolling.

Run this pass for any surface a user **reads or scans** — docs, articles, tables, dashboards, forms, long lists. (Skip it for a pure control tweak like a button color.) Measure, don't eyeball:

1. **Reading measure (line length).** For body prose, comfortable is ~50–90 characters per line; below ~45 reads choppy, above ~90 tires the eye and loses the line on the return sweep. Compute it, don't guess: `lineWidthPx / (0.5 × fontSizePx)` ≈ characters, or just count one full line. Outside the band → adjust the column width / measure.
2. **Chrome-to-content ratio.** Sidebars, TOCs, rails, gutters, oversized margins are *navigation chrome*; the reading/work column is the *payload*. Ask: what fraction of the horizontal space is the user actually reading in? A 280px sidebar + 64px gutter beside a 660px reading column means a third of the width is chrome while the payload is cramped — rebalance (narrow the chrome, tighten the gap, widen the content). On wide screens, confirm the payload actually *uses* the gained width instead of leaving a lake of empty margin.
3. **Scroll cost of dense content.** For every element wider than the reading column — tables, code blocks, wide diagrams — ask *how far* the user must scroll horizontally to read one row/line and *how often* they repeat it. Panning back and forth for every row of a reference table is a real, repeated tax. Options, roughly in order: fit-to-width (let cells wrap), freeze the key/identifier column so the row stays anchored while the rest scrolls, or add an expand/fullscreen affordance. "It scrolls horizontally, that's standard" is a *correctness* answer to an *ergonomics* problem — only accept it when the scroll is occasional, not per-row.
4. **Control comfort, not just reachability.** Section 5 verified controls *work*; this asks whether they're *pleasant*: hit targets meeting the premium 44×44 px target (24×24 px is the hard gate — see Section 8), not crammed shoulder-to-shoulder, frequent/primary actions not buried below the fold or needing a scroll-back, related controls grouped.
5. **Density.** Too cramped (lines kissing, nothing breathing, everything competing) and too sparse (content marooned in whitespace, the eye has to travel) are both failures. Aim for deliberate rhythm.

**The verdict — and the trap.** Picture using this surface for ten real minutes for its actual purpose: reading the spec, scanning the matrix, filling the form. Comfortable, or fighting it — squinting at a 110-character line, panning a table, hunting for the action? If you'd be fighting it, it fails this section even though it passed correctness.

And here is the discipline that turns this from a checklist item into a habit: **if you measure a deficiency, the fix you name in your own head must either get applied this pass or get surfaced to the user explicitly — never silently shipped.** The most common way this section fails in practice is *not* missing the problem; it's *noticing* it ("the reading column is only 660px here…"), naming the fix ("I could narrow the TOC"), and then shipping anyway because it felt out of scope. A diagnosed-but-unaddressed ergonomic flaw is the exact thing the user bounces back five minutes later. Close the loop: fix it, or say "I noticed X — want me to also do Y?"

---

## ★ Section 11 — Premium craft & component intent

Sections 1–9 ask *"is it correct?"*. Section 10 asks *"is it comfortable to read?"*. This section asks the question the user actually opened the skill for: *"does this feel premium — designed, not just functional?"* It is a **separate axis** from the first two, and it is the one most often skipped, because a component can render perfectly, read comfortably, and still look like a default `<progress>` element somebody dropped in. Correctness and reading-comfort are necessary; they are not sufficient. The user reaches for words like *"trop simpliste", "ça ne fait pas premium", "il manque la shadow / la profondeur / les bleus"* — that is this section failing, not Sections 1–10.

The motivating miss (2026-05-31, Bug 8 in `session-lessons-2026-05-31.md`): a plan progress bar passed correctness (no overflow, all viewports, light/dark) **and** ergonomics (readable, didn't crowd) — and was bounced anyway. It was a flat-filled bar, hugging the card's edges, with TOC status dots crammed against the text baseline, and it scrolled away on a long document instead of staying visible. Every one of those is a craft/intent gap a screenshot *shows* but a correctness check never flags.

Run this pass on any component you **designed or restyled** (not on untouched surfaces). Two parts:

### 11a — Visual craft (zoom in and judge it like a designer)

For each touched component, zoom to ~150–300px and ask — **comparing against the design system's existing premium surfaces, not against "it works"**:

1. **Depth & elevation.** Does it have the same shadow / layering / surface treatment as sibling premium elements (cards, modals, the header)? A flat fill sitting next to elevated cards reads as unfinished. Reuse the project's `--shadow-*` / surface tokens — don't leave a component at `background: flat` when everything around it has depth.
2. **Containment & breathing room.** Does it sit *inside* the layout's padding, or hug the raw edges? An element bleeding to the card border (because it was inserted outside the content's padding wrapper) looks broken even when it's technically aligned. Give it the same horizontal inset as the prose around it.
3. **Detail placement.** Zoom into every small element — dots, badges, icons, accents. Are they *placed* (centered in a gutter, in their own space) or *crammed* (kissing a text baseline, overlapping a border)? A status dot jammed against the line at `left: 0` is the tell. Move it into breathing space; add a halo / ring / offset so it reads as deliberate.
4. **Accent & finish.** Does it carry the design language — an accent rail, a gradient, a tint that ties it to the type/brand system — or is it monochrome filler? Premium surfaces almost always have *one* considered accent. Flat gray is the absence of a decision.
5. **State richness.** A "done" segment that's just a solid color vs. one with a subtle gradient + glow; a hover that does nothing vs. a 1px lift. The difference between "functional" and "premium" is usually 2–3 of these small finishes stacked.

The test: **put your component next to the nicest existing element on the page and screenshot both in one frame.** If yours visibly looks like the poor cousin — flatter, blockier, less considered — it fails this section. Name the gap and close it (reuse the richer element's tokens), or surface it.

### 11b — Component intent (does the behavior match what this thing is *for*?)

Correctness verifies a component does what its code says. This asks whether the code does what the component is *for*. Think about the component's job over the *whole* surface, not just the static first screen:

- **A progress / status / summary indicator** exists to be *consulted while you work*. On a long page that means it should stay visible — `position: sticky` — not scroll away after the first screen. If you built a progress bar that you can only see at the top, you built a header decoration, not a progress indicator.
- **A nav / TOC / filter** exists to be *used repeatedly* — it should stay reachable (sticky, or quick to return to), and its active/done/current state should be legible at a glance.
- **A primary action** exists to be *found and pressed* — it shouldn't require a scroll-back or sit below the fold.

Ask: *what is this component for, and would its behavior over a realistic (long, scrolled, populated) surface actually serve that?* If a progress bar's whole point is "see how far along I am" and it disappears on scroll, that's an intent failure even though every pixel is correct. Sticky-ness, persistence, and reachability are **design decisions you owe the component**, not enhancements to wait for the user to request.

When you add persistence (sticky), immediately re-check Section 6 (does it now trap or collide with another sticky/`overflow` ancestor?) and Section 8 (does it collide with a mobile sticky header?). Persistence interacts with stacking and layout — the 2026-05-31 sticky fix introduced a mobile collision with the `Sommaire` toggle that had to be offset.

---

## ★ Section 12 — Post the Verification Ledger (the definition of done)

There is no prose "done." The build is done when — and only when — you **post the completed Verification Ledger** built in Section 1. Before you post it:

1. **Run the project's automated checks.** Quality gate, typecheck, tests. If the project has a `npm run validate` (or equivalent), run it. Add a transverse ledger row for the result.
2. **Re-read your scope from Section 1.** Did you actually render and evidence each cell — at each viewport (including 320/360 and the interaction-reached ones)? Any cell you cannot back with a real screenshot ID + measured value stays `not-evidenced`, never PASS.
3. **For any component you designed/restyled, confirm the craft + intent pass (Section 11) ran** and that it produced Design-Spec-conformance transverse rows. Did you put it next to the page's nicest element and judge depth/containment/detail/accent? Did you ask what the component is *for* over a long surface (sticky? persistent? reachable?)? If the ledger only carries overflow and viewport rows, you verified correctness, not premium — and that is the bounce-back the user keeps sending.

The three gates below (accessibility, performance, WebKit) are **transverse gates** — they are not tied to one surface×viewport cell. Run them here, before posting, and record each as a transverse ledger row (`Viewport = —`). Their thresholds live in this section; their *measured values* live in the ledger. A gate you could not measure this run is `not-evidenced`, never a declarative PASS.

### 12a — Accessibility, measured — contrast is CALCULATED, never estimated

"Stays legible" judged by eye is **not** a contrast check. For **every** text/background pair in the palette, compute the WCAG ratio and record the number.

- **Compute the ratio, don't eyeball it.** Two paths: (a) run `node scripts/contrast-check.mjs <fg> <bg> …` from the claude-skills repo — it takes hex pairs and prints ratio + AA verdict; or (b) inject the luminance formula in the running page via `preview_eval` / axe-core (`getComputedStyle` the real rendered colors, then apply the same `(L1+0.05)/(L2+0.05)` math). Prefer measuring the **rendered** colors when tokens resolve through CSS variables or alpha compositing — a token value in the source is not always the pixel a user sees.
- **Blocking thresholds (WCAG AA):** **≥ 4.5:1** for body text, **≥ 3:1** for large text (≥ 24px, or ≥ 19px bold). Below the applicable threshold **fails the gate** — it is not a soft preference. Record the calculated ratio in a transverse row (`contraste corps · PASS 7.2:1 · contrast-check.mjs`).
- **APCA is the complementary compass, not the gate.** For dark palettes and fine type, WCAG 2.x under-predicts real legibility; **APCA Lc ≥ 75 for body text** is the perceptual target worth aiming at. But **WCAG AA (the ratio above) remains the blocking gate** — APCA guides palette choices, it does not override the numeric gate.
- **Keyboard focus.** Tab through **every** interactive element on the surface: each must show a **visible focus ring** (not clipped by an `overflow:hidden` ancestor — see Section 5), and there must be **no keyboard trap** (Tab always escapes; focus order is sane). A control reachable only by mouse fails.
- **`prefers-reduced-motion` — test it once before delivery.** Enable the emulation (DevTools rendering panel, `preview_resize` colorScheme's motion sibling, or the OS setting) **one time before you ship** and reload. The site must stay **complete and usable**: parallax / scroll-zoom / auto-play replaced by plain fades or held stills — never content that vanishes or a layout that collapses. Screenshot it and record `reduced-motion · OS activé · PASS · shot_… (fades, site complet)`.

### 12b — Performance budget — Web Vitals thresholds are non-conditional

Any **new or animated** page carries a performance budget. These thresholds are **not conditional** on the project "feeling fast" — they are gates, and their measured values go in the transverse perf rows of the ledger.

- **Blocking floor (minimum gate — every animated/new page):**
  - **LCP < 2.5 s** on **mobile** (mobile is the floor, not desktop — a site that LCPs at 2 s on a laptop and 4 s on a phone fails).
  - **CLS < 0.1**.
  - **INP < 200 ms**.
  - **Compositor-only animation:** animate `transform` and `opacity` **only**. Verify in the DevTools performance trace that **no purple "Layout" bars** appear during scroll/interaction. **Interdits** (never animate continuously): `width`, `height`, `top`/`left`/`right`/`bottom`, `margin`, `padding` — they trigger layout every frame and are the usual cause of jank.
- **Award target (documented, distinct from the floor) — for an ambitious showcase:** **LCP < 1.5 s · CLS < 0.05 · INP < 100 ms**, with sustained **60 fps** on a mid-range mobile. This is the bar seen at award juries. It is a *target to aim at*, **not** the blocking gate — the floor above is what blocks; this is the ambition documented so the floor is never mistaken for the goal.
- **Method of measurement (in order, and be honest about which one you got):**
  1. **Lighthouse mobile** when the tooling allows it (Chrome MCP, or `npx lighthouse <url> --preset=perf --form-factor=mobile`).
  2. Else **read `web-vitals` in the console** (import the library or the runtime already exposes LCP/CLS/INP).
  3. Else **`not-evidenced`** in the ledger — **never** a declarative PASS. An un-measured vital is not a passing vital.
- **Static checks always possible (no runtime needed):** images carry `width`/`height` **or** `aspect-ratio` (prevents CLS); `font-display: swap` with a metric-compatible fallback (prevents FOIT/late LCP); explicit JS budget if Three.js / heavy bundles (record the bundle weight).
- **Watch the load, don't just trust the number.** Reload with the network throttled and **screenshot during the first render** to catch layout shift *visually* — a CLS number can pass while a hero visibly jumps; the eye catches what the metric averages out.

### 12c — WebKit / Safari pass before client delivery

Before **any client delivery**, run a WebKit pass on the **key surfaces** — because Safari is the majority browser on the iOS phones that visit showcase sites, and `backdrop-filter`, viewport units, and `position: sticky` diverge from Chrome there **regularly**.

- **Key surfaces to re-verify in WebKit:** the **hero**, the **sticky nav**, **forms**, and **any surface** using `backdrop-filter`, `position: sticky`, `100vh`/`100dvh`, or scroll-driven animations. These are exactly where Chrome-green does not imply Safari-green.
- **Method, in order of preference:**
  1. **Playwright WebKit headless** — `npx playwright screenshot --browser=webkit <url> shot.png` (or a short Playwright script driving `webkit` for interaction states).
  2. **Safari via computer-use** if Playwright's WebKit is unavailable.
  3. Else **`not-evidenced`** consigned in the ledger — never a declarative "works in Safari."
- Record a transverse row per key surface checked (`hero · WebKit · PASS · shot_…` or `not-evidenced`).

### Post the ledger under the exact `VERIFICATION LEDGER` marker

Post it under a heading that contains the **exact** string `VERIFICATION LEDGER` — e.g. `## VERIFICATION LEDGER — {project} — {date}`. This exact marker is how the user and tooling locate the ledger; paraphrases ("verification table", "QA ledger") do not count. Use the table shape from Section 1e: per-cell rows + transverse rows, one row per cell actually executed, a real proof in every PASS cell, `not-evidenced` on every cell you could not render.

### The objective exit condition

The ledger is a valid "done" only when **every cell is PASS with evidence**. Specifically:

- No cell is left `not-evidenced` (each is either PASS-with-proof, or an explicitly recorded, user-approved scope reduction).
- No device class (320/360/375/768/desktop) was skipped — a missing class makes the whole verdict `INVALID`, not merely incomplete.
- Any reduction of scope is written into the ledger with the user's approval noted — you do not silently narrow what "done" means.

This replaces the old subjective "zero issues at the scope level the user cares about." The ledger, not a feeling, is the exit gate.

### Auditable escape hatch — `LEDGER-EXEMPT`, never silent

If a turn that runs after this skill was invoked is legitimately **not** a UI turn — the user pivoted to an unrelated question, or the work was a pure non-visual change with nothing to render — you may skip the ledger, but only by writing the exact line `LEDGER-EXEMPT: <reason>` on that turn, stating why no ledger applies. Every turn that would otherwise declare UI work done must carry **either** a `VERIFICATION LEDGER` heading **or** a `LEDGER-EXEMPT:` line. An omission with neither is a protocol violation, not a shortcut.

---

## ★ Section 13 — Motion QA (for any surface that carries motion)

Sections 1–12 verify a **static** page holds up. Motion adds a whole class of failures a still screenshot never shows: pins that drift after a resize, ScrollTrigger instances that leak on navigation, animation that double-fires under StrictMode, layout thrash that only appears in the performance trace, and scrub effects that trap a reduced-motion user. This section is the motion-specific gate. It is **required for any showcase site, landing page, or surface with scroll effects, animation, background media, or 3D**, and a fast N/A for a purely static change. Read **`references/motion-craft.md`** (§⑦ is the source of truth for the five regression tests below) before running it.

**Settle first (Section 1d carry-forward):** every capture in this section is taken *after* the animation settles at the position you're testing — mid-animation frames are a confirmed false-positive source. Scroll to the target position, let the scrub/reveal finish, then screenshot.

### 13a — Scroll-triggered animation at 3 positions

For each scroll-driven animation (reveals, scrub, pinned sequences), capture it at **three scroll positions** — entering, mid, and settled/exited — so you can see the animation actually progresses correctly and lands in its final state, not just that "something moved":

1. **Entry** — the trigger's start: does the reveal begin where it should (DOM order, not a frozen viewport dimension)?
2. **Mid** — mid-scrub: is the interpolation smooth, on `transform`/`opacity` only?
3. **Settled / exited** — the end state: does it land at the final visible state and hold (no flicker back, no orphaned pin)?

### 13b — The 5 motion non-regression tests (motion-craft §⑦)

Run all five. Each maps to a transverse ledger row.

1. **Resize after full scroll.** Scroll the page all the way down, *then* resize the window. **The pins hold** — no pinned element drifts, orphans, or mis-measures. (`ScrollTrigger.refresh()` must have run after async image/font/data loads, with function-based `end` values + `invalidateOnRefresh: true`.)
2. **Back-and-forth navigation.** Navigate away and back (or route-change and return). **`ScrollTrigger.getAll().length` is stable** across the round trip — read it before and after and confirm the count matches. A growing count is a leaked-trigger bug (the `useGSAP` scope / `lenis.destroy()` on unmount discipline failing).
3. **Reduced-motion OS enabled.** Turn on `prefers-reduced-motion: reduce` at the OS/DevTools level and reload. The site is **complete and usable** — parallax/scrub/auto-play replaced by fades or held stills, background video paused on its poster, no content vanished, no collapsed layout. (This overlaps the Section 12a reduced-motion gate; here you verify the *motion* surfaces specifically degrade, not just that the page loads.)
4. **StrictMode — no double animation.** In React dev/StrictMode, confirm animations do **not** fire twice and triggers are **not** duplicated (the bare-`gsap.to()`-in-`useEffect` bug — see motion-craft §③). If you see a reveal play twice or two identical triggers, `useGSAP({ scope })` / `matchMedia` is not wrapping it.
5. **Jank check — compositor-only.** Record a DevTools performance trace while scrolling the animated surface. **No purple "Layout" bars** may appear during the scroll — animation runs on `transform`/`opacity` only (motion-craft §⑥ whitelist). A purple bar means something continuous is animating `width`/`height`/`top`/`margin`/`box-shadow` and must move to a compositor property or FLIP. (Under a 4× CPU throttle, INP must still be < 200 ms.)

### 13c — Record motion lines in the ledger (transverse family)

Motion verdicts are **transverse rows** (Section 1c — `Viewport = —`), because they span the surface rather than sitting in one `surface × viewport × state` cell. Add these rows, each with a real proof or `not-evidenced` (never a declarative PASS):

```
| scroll reveal §hero | — | 3 positions | PASS           | shot_a1 · shot_a2 · shot_a3    |
| pins after resize   | — | resize@bottom| PASS          | shot_b4 (pins held)           |
| ScrollTrigger leak  | — | nav aller-retour | PASS 12=12 | getAll().length before/after  |
| reduced-motion      | — | OS activé    | PASS           | shot_c7 (fades, video pausée) |
| StrictMode double   | — | dev mount    | PASS           | (no duplicate trigger/reveal) |
| jank / compositor   | — | scroll trace | PASS           | trace_d2 (no purple Layout)   |
```

A motion surface whose ledger carries no motion rows was verified for static correctness only — that is not a passing motion verify.

---

## Triage when you find a bug mid-checklist

If you find a bug while running the checklist:

1. **Stop the checklist** (no point validating other things on a broken state).
2. **Diagnose the specific cause** — don't guess. Inspect the element, read the served CSS, check for `@media` queries, check stacking context. Don't apply a "probably this" fix; understand it first.
3. **Fix it** with the smallest possible change that addresses the root cause. (If you find yourself changing 4 unrelated things to "fix" something, stop — you're guessing.)
4. **Restart the checklist from Section 2** (open browser, multi-position screenshots, etc.) — don't try to resume from where you were. The fix may have introduced its own regressions.

---

## When in doubt, delegate

If you're tired, the change is large, or you catch yourself rationalizing skipped steps ("the bottom probably looks the same as the middle"), spawn the visual-qa-inspector agent. See `references/agent-dispatch.md` for the briefing template. The agent doesn't have your context fatigue — it'll just run the checklist.
