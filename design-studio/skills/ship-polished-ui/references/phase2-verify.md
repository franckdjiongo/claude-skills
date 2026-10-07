# Phase 2 — Verify (full procedure)

Moved out of SKILL.md. The non-negotiable core (matrix before screenshots, `not-evidenced` rule, `VERIFICATION LEDGER` marker, `check-ledger.mjs` gate) stays in SKILL.md and is repeated verbatim here for the tooling table and the eleven headline checks.

The output of this phase is one artifact: the **Verification Ledger** — an accountable table posted in the chat, not a prose "looks good." It replaces self-attestation. The full format, the two families of rows, the honesty rule, and the objective exit condition live in **[references/visual-qa-checklist.md](references/visual-qa-checklist.md)** Sections 1 (build the matrix → ledger) and 12 (post the completed ledger). The essentials:

- **Post the scope matrix as a table in the chat *before* the first screenshot.** A matrix "in your head" does not exist. On a **full-site build**, the matrix is the inventory pages × sections × viewports (there is no "changed CSS" scope on greenfield).
- **Seed the matrix deterministically when the codebase is accessible.** Run `node scripts/scan-surfaces.mjs <project-root>` (in `scripts/` next to this SKILL.md; installed as a plugin: `${CLAUDE_PLUGIN_ROOT}/skills/ship-polished-ui/scripts/`) and save its JSON manifest — **the manifest is the surfaces axis of the matrix**. You may add surfaces beyond it; any manifest surface you drop must be declared out of scope in the ledger, never silently omitted. If the script cannot run in this environment, write that as a declared gap in the ledger — a failed script is a gap, not a permission to skip.
- **Viewports include 320/360 (small-mobile).** The verdict is **invalid** if a device class was never actually rendered — a binary gate, not a nicety.
- **A cell that was not rendered is `not-evidenced`, never PASS.** A PASS requires a real proof: every check row names a screenshot file path (`qa-shots/<name>.png`) that exists on disk, plus the measured value where applicable (`scrollWidth/clientWidth`, contrast ratio, touch-target px).
- **Objective exit condition:** every ledger cell is PASS with evidence; any scope reduction is explicitly approved by the user and recorded in the ledger. There is no subjective "scope the user cares about." **Machine gate:** before declaring done, save the ledger turn to a file and run `node scripts/check-ledger.mjs <ledger-file> [manifest.json]` — it must exit `0`. Each `MANQUE :` line on stderr is a correction to make; loop until clean.

### The VERIFICATION LEDGER marker (mandatory, machine-checkable)

Post the ledger under a heading that contains the **exact** string `VERIFICATION LEDGER` (e.g. `## VERIFICATION LEDGER — {project} — {date}`). This exact marker is how tooling (and the user) locate the ledger; do not paraphrase it ("verification table", "QA ledger", etc. do not count). `scripts/check-ledger.mjs` enforces exactly this contract: marker present (or a motivated `LEDGER-EXEMPT:` line), no `not-evidenced` cell counted PASS, mandatory viewports (320/360/375/768/desktop) present, and — when given the scan-surfaces manifest — every scanned surface covered or declared out of scope.

**Auditable escape hatch — never silent.** If a turn that runs after this skill was invoked is legitimately **not** a UI turn (e.g. the user pivoted to an unrelated question, or the work was a pure non-visual refactor with nothing to render), you may skip the ledger — but only by writing, in that turn, the exact line `LEDGER-EXEMPT: <reason>` stating why no ledger applies. This is an explicit, logged exception, never an implicit omission: either a `VERIFICATION LEDGER` heading or a `LEDGER-EXEMPT:` line must appear on any turn that would otherwise declare UI work done.

**Consume the design-intent contract.** If Phase 1 loaded a `design-intent.md`, its **TESTABLE CRITERIA become additional lines of the Verification Ledger** — one ledger row per criterion, each demanding a real measured proof, never a declarative PASS. The design-intent's motion stance and art direction are checked here the same way.

**Verify the Design Spec, decision by decision.** The Design Spec posted in Phase 1 (§1.3) is a contract with Phase 2: the ledger carries **one `conformité Design Spec` transverse row per Spec decision**, each backed by a real proof, never a declarative PASS. Concretely — the **named typography** is actually loaded (`@font-face`/grep on the served CSS), the **named palette** is present as tokens (not a stray hex), the **layout primitive** repeats where the Spec said, the **signature moment** exists and works (see Motion QA), and the **media** respects the perf rules of motion-craft §⑨. A Spec decision with no matching ledger row was declared, not verified.

**Tooling correspondence — measure, don't guess from a screenshot:**

| Need | Preferred tool | Notes |
|---|---|---|
| Computed styles, box metrics, colors | Claude Preview `preview_inspect` | Read the value; do not eyeball it from a screenshot |
| Viewports + dark mode | Claude Preview `preview_resize` | Presets mobile/tablet/desktop + `colorScheme` |
| Full web-app driving, console, network | Chrome MCP | When Preview isn't enough / real app under test |
| Native desktop apps | computer-use | Non-browser targets |
| Fallback automation | Playwright | Last resort |

Every fallback actually used is recorded in the ledger (which tool produced which proof), so a reviewer can see how each cell was evidenced.

Read **[references/visual-qa-checklist.md](references/visual-qa-checklist.md)** — that file is the operational core of this skill. The headlines:

1. **Identify what's in scope — as a matrix posted in the chat, not a list in your head.** When the codebase is accessible, start from the `scan-surfaces.mjs` manifest (see the essentials above) so the surface list is counted by a script, not recalled from memory. List every visual surface the change could plausibly affect, not just the one you intended to fix (removing `overflow: hidden` changes clipping for descendants; `isolation: isolate` can hide popups; a parent background can leak through a now-transparent child). Then make it two-dimensional: verification runs over **surfaces × viewports** (**320/360 small-mobile**, 375px mobile, ~768px tablet, desktop) — and × theme if the app has light/dark. On a **full-site build** the matrix is the inventory pages × sections × viewports. A surface seen at one viewport is not verified; a device class never rendered makes the whole verdict **invalid** (binary gate). Mark which surfaces are **interaction-reached** — modals, drawers, detail views, popovers, expanded rows, anything behind a click or a route change. Resizing the browser does not re-open those, so they are the cells most often left untested. **Post this matrix as a table in the chat *before* the first screenshot** — the ledger grows from it (checklist §1).

2. **Open the running app — never trust HMR alone.** Connect via the appropriate browser MCP (Chrome MCP for web apps, computer-use for native apps, whatever the user's setup uses). If a dev server is already running, use it. If the app is in an iframe (Power Apps, Salesforce embeds, etc.), read **[references/iframe-and-host-shells.md](references/iframe-and-host-shells.md)** before debugging — iframe context flips a lot of normal CSS behavior.

3. **Multi-position screenshots.** Default-scroll screenshots hide entire classes of bugs. For any change that affects layout, background, or scrollable regions:
   - Scroll all the way to the top — screenshot.
   - Scroll all the way to the bottom — screenshot.
   - Mid-scroll — screenshot.
   - If the change affects scroll behavior, capture during scroll.

4. **Element-level zoom on every touched piece.** For each piece of CSS you changed and each element it affects, use the browser's zoom tool on a region of `~50–200px` around that element. Casual full-page screenshots are too zoomed-out to reveal hairline issues like rounded-corner overflow, 1-pixel misalignments, or text rendering at the wrong weight.

5. **Exercise interactive states.** For every changed component, exercise:
   - Hover (does the hover state reveal correctly? does motion feel right?)
   - Click (does the click handler still fire? does any popup/dropdown render in front of siblings?)
   - Focus (visible focus ring? keyboard navigation OK?)
   - Type / paste (form fields)
   - Disabled states if any
   - Active / pressed states

6. **Cross-check adjacent elements.** Whenever you remove or add a structural CSS property (`overflow`, `position`, `isolation`, `z-index`, `transform`, `filter`, `clip-path`), assume something else broke and explicitly verify nearby. **[references/css-side-effects.md](references/css-side-effects.md)** lists the dangerous patterns and their typical regressions.

7. **Read every label/value pair and counter.** Silent text disappearance is one of the most embarrassing failure modes. After any layout change near text content, visually confirm that every label has its value, every counter has its number, every chip has its content.

8. **Run the responsive sweep, then stress-test data states.** A viewport pass is not "resize the browser and glance at the current page." Resizing does not re-open a modal, a drawer, or a detail view — the interaction that opened it has to be redone. So for each viewport (**320/360 small-mobile**, ~375px mobile, ~768px tablet, desktop), re-walk the full surface list from step 1, and **re-trigger every interaction-reached view at that viewport**. Check each surface for horizontal overflow (`scrollWidth` should equal `clientWidth` — a page wider than the viewport spills images, buttons and text off the right edge), adapting layout, non-overlapping controls, and touch targets (**gate: ≥ 24×24 px, WCAG 2.5.8 AA**; **premium target: ≥ 44×44 px, WCAG 2.5.5 AAA / Apple HIG**). Then stress-test data states: empty (layout shouldn't collapse), single item, many items (scroll past a viewport — background still covers? state leaking between rows?), and long strings (ellipsize gracefully, or break the layout?).

9. **Run the reading-ergonomics pass.** Correctness (no overflow, no clip, no regression) is table stakes, not the finish line. For any surface a user *reads or scans* — docs, tables, dashboards, forms — ask whether it's comfortable to live in for ten minutes: reading measure (~50–90 chars/line), chrome-to-content ratio (is a fat sidebar crowding a cramped reading column?), and scroll-cost of dense content (does a wide table force panning for *every* row?). These pass every correctness check and still get bounced back. Crucially: **if you measure a deficiency, apply the fix this pass or surface it — never ship a flaw you already diagnosed.**

10. **Run the premium-craft + component-intent pass.** This is the third quality axis — separate from "is it correct?" (1–8) and "is it comfortable to read?" (9) — and it's the one behind the most common bounce-back: *"c'est trop simpliste / ça ne fait pas premium."* For any component you **designed or restyled**: (a) **Craft** — zoom in and judge it like a designer *against the page's nicest existing element*: depth/elevation (does it have the same shadow as sibling cards, or sit flat?), containment (does it breathe inside the layout padding, or hug the raw edges?), detail placement (are dots/badges/icons placed in their own space, or crammed against a line?), and one considered accent (rail/gradient/tint) vs. monochrome filler. The litmus test: screenshot your component beside the best element on the page — if yours looks like the poor cousin, it fails. (b) **Intent** — ask *what is this component for* over a realistic long/populated surface: a progress/status indicator exists to be consulted while you work → it should stay visible (`sticky`), not scroll away; a nav/filter should stay reachable; a primary action should be findable without a scroll-back. Sticky-ness and persistence are decisions you **owe** the component, not enhancements to await. This pass is doubly required when the component arrived from a generator/workflow and never went through a dedicated taste pass — then the verify phase is the *only* craft gate, so don't rubber-stamp your own un-reviewed work as "correct → done." See checklist §11.

11. **Loop until clean.** Each verify pass that finds something feeds a phase-1 fix. Re-verify after every fix.
