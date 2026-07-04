# Visual QA Checklist

This is the operational core of the ship-polished-ui skill. Run through it after every UI change you intend to declare "done." The checklist is structured so you can move quickly through the items that don't apply and slow down on the ones that do.

The checklist has **twelve sections**. Sections marked `★` are non-negotiable for any UI change — skipping them is what caused the bugs that motivated this skill.

---

## ★ Section 1 — Define the scope before opening the browser

Before any screenshots, write down (in your own working notes / TODO / chat reply, doesn't have to be a file):

1. **Which CSS properties did you change?** Name them. `overflow`, `padding`, `background`, `z-index`, etc.
2. **Which selectors / class names?** `.card`, `.surface::before`, `.container`, etc.
3. **What does each change visually affect?** Be specific: "this changes the bar's vertical padding from 16px to 24px, which makes the bar taller, which means the clip area for the brand rail extends further" — that chain of reasoning is what lets you predict regressions.
4. **What adjacent elements / states could regress?** Anything inside the changed container, anything stacking against it, anything that inherits its sizing or stacking context. **List them.**
5. **Which surfaces × which viewports?** Verification is a grid, not a list: every surface above × every viewport that matters (mobile ~375px, tablet ~768px, desktop) × light/dark if the app themes. Run the checklist top-to-bottom once and you test each surface at whatever viewport you happened to be in when you reached it. So mark which surfaces are **interaction-reached** — modals, drawers, detail views, popovers, expanded rows, anything behind a click or a route. Those get reached late and end up verified at one viewport only. Listing them here is what makes the Section 8 responsive sweep actually cover them.

If you can't write this down, you don't yet understand your own change well enough to verify it.

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

## ★ Section 12 — Final declaration

Before declaring "done":

1. **Run the project's automated checks.** Quality gate, typecheck, tests. If the project has a `npm run validate` (or equivalent), run it.
2. **Re-read your scope from Section 1.** Did you actually verify each surface — at each viewport, including the interaction-reached ones? If not, go back.
3. **For any component you designed/restyled, confirm the craft + intent pass (Section 11) ran.** Did you put it next to the page's nicest element and judge depth/containment/detail/accent? Did you ask what the component is *for* over a long surface (sticky? persistent? reachable?)? If your log only mentions overflow and viewports, you verified correctness, not premium — and that is the bounce-back the user keeps sending.
4. **Write a short verification log** to the user — not just "looks good" but the actual checklist items you ran, *including the craft judgment*. Example:

   > Scrolled top → bottom (no canvas falloff). Zoomed each card edge (rounded corners clean, no rail overflow). Exercised dropdown (now in front of cards), hover state (lift + accent reveal works). Re-walked every surface at 375 px including re-opening the product detail — no horizontal overflow. Re-read all label/value pairs in the period bar — value renders. **Craft:** put the progress bar beside a premium card — added matching shadow + accent rail + inset so it stops looking flat; made it sticky since a plan is long and progress should stay visible; re-checked it doesn't collide with the mobile header. Tests still 46/46. Quality gate clean.

That report is honest. The user can immediately tell if you missed something — for instance, if your log never mentions a viewport, they know you only checked desktop; if it never mentions craft, they know you only checked correctness.

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
