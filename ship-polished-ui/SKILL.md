---
name: ship-polished-ui
description: Use anytime the user wants to CREATE or improve premium, production-grade web UI — a site, landing page, app screen, or component — not just tweak CSS. Triggers on creation ("crée un site", "fais-moi un site vitrine", "nouveau site client", "build a landing page", "code this design") AND improvement ("rends ceci premium", "make this premium", "améliore l'UI", "polish the page", "make it production-ready", "ce bouton est laid", "the design looks generic"), on UI bug reports ("dropdown behind the cards", "the bottom is white"), and on verify requests ("vérifie que ça marche", "test this page"). Non-negotiable rule: always runs a real browser visual QA loop and posts a Verification Ledger before declaring done — even when the user never asks for testing. Entry point for all client websites and app UIs; for documentary artifacts (plans, reports, slides) use design-elevation.
---

# ship-polished-ui — Premium frontend craft, browser-verified

Pair the in-house design doctrine (**[references/design-direction.md](references/design-direction.md)** — authored in Phase D; until then, this SKILL.md and the session-lessons references carry the taste) with a disciplined visual QA loop. The doctrine handles taste — bold typography, distinctive aesthetics, motion, atmosphere. This skill handles craft — actually verifying in a real browser that the change shipped without regressions, hidden bugs, or the half-finished feeling of "looks fine on the bit I happened to screenshot."

## Why this skill exists

Without this discipline, a typical UI edit looks like:

> "I changed the CSS, took a screenshot of the top of the page, it looks great, done."

That phrase has shipped real bugs. Every one of them was preventable:

- A search dropdown rendered behind the card grid because a parent had `isolation: isolate` — caught only when the user clicked it.
- A premium card surface had a beautiful brand stripe at the top, but it overflowed past the rounded corners — caught only when the user zoomed into a corner.
- A page background had an atmospheric gradient mesh that covered the first viewport beautifully, then dropped off to flat white from card row 4 onward — caught only when the user scrolled to the bottom.
- A "Période configurée / 19 avril — 26 avril" label/value pair was rendering only the label; the value got clipped by `overflow: hidden` on a parent — caught only when the user squinted at it.
- A plan progress bar rendered perfectly and read fine — but it was a flat fill hugging the card's raw edges, with status dots crammed against the text baseline, and it scrolled out of view on a long document. Every pixel was *correct*; it just looked unfinished and didn't behave like a thing you consult while you work. Caught only when the user said *"c'est trop simpliste, ça aurait dû être sticky."*

In every case, Claude had the browser, had the screenshot tool, and had the technical capability to catch the bug. What was missing was the **discipline** to not declare "done" until the change had been seen, scrolled, zoomed, exercised, *and judged for craft* the way a human reviewer actually inspects a page. The first four bugs are *correctness* misses; the last is a *premium-craft* miss — a separate axis the verify loop now covers explicitly (checklist §11).

This skill is that discipline, written down.

## Step 0 — Route before you build

Before Phase 1, decide which lane you are in:

- **New site / greenfield, no `design-intent.md` present** → the taste-and-direction contract is missing. Offer to run **design-forge BRIEF** first (it turns the brief + brand-package into a `design-intent.md` with art direction, testable criteria, and a motion stance). If the user wants to proceed without it, you own the direction yourself via the Design Spec (Phase 1) — but say so explicitly.
- **Retouche / improving an existing UI** → skip the brief, go straight into the two-phase loop below.
- **Purely documentary request** (a plan HTML, a report, a slide deck, a dashboard read but not shipped) → this is **not** a ship-polished-ui job. Hand off to **design-elevation**, which owns documentary artifacts.

This routing keeps ship-polished-ui the single entry point for client websites and app UIs, while documentary work and up-front art direction live in their own skills.

## The two-phase loop

For any request that triggers this skill, run the loop:

```
┌──────────────────────────────────┐
│  Phase 1 — Design                │
│  In-house doctrine (design-      │
│  direction.md) for direction     │
└──────────────┬───────────────────┘
               │ apply edits
               ▼
┌──────────────────────────────────┐
│  Phase 2 — Verify                │
│  Browser-based visual QA loop    │
│  (see references/visual-qa-      │
│  checklist.md)                   │
└──────────────┬───────────────────┘
               │ found a bug?
       ┌───────┴───────┐
       │ yes           │ no
       ▼               ▼
   loop back       declare done
```

Repeat until **every cell of the Verification Ledger is PASS with evidence** (see Phase 2). The exit condition is objective, not a feeling: not "zero issues at the scope the user cares about," but a posted ledger in which no cell is left `not-evidenced` and any scope reduction was explicitly approved by the user and recorded. **Do not declare a UI change "done" without posting a completed Verification Ledger** — the ledger *is* the definition of done.

## Phase 1 — Design

### 1.0 — Load the contracts (mandatory before any code)

Before writing a line of CSS, `Glob` the project for the pipeline's contract artifacts and read whatever exists:

```
Glob: **/design-intent.md
Glob: docs/branding/brand-package.md
Glob: docs/branding/brand-tokens.css
Glob: **/tokens.css
```

- **If `docs/branding/brand-package.md` (or `brand-tokens.css`) exists → palette and typography are `brand-fixed`.** Treat them as contractual, at the same authority as `tokens.css`. You do not re-pick colors or fonts, and you never retype a hex by hand — the build **imports or copies** the custom properties from `brand-tokens.css`. Any deviation from a brand-fixed value must be written down and justified.
- **If `design-intent.md` exists → its constraints (art direction, motion stance) bind Phase 1**, and its **TESTABLE CRITERIA** become extra rows of the Verification Ledger in Phase 2 (see the consumption rule at the top of Phase 2).
- **If none exist on a new (greenfield) site → declare it, and offer design-forge BRIEF first** (Step 0). If the user proceeds anyway, you own the direction via the Design Spec below.
- **On a new project with no `tokens.css` → ship-polished-ui bootstraps it.** Derive `tokens.css` from the brand-package / design-intent (or, absent those, from the Design Spec you post). This skill is the canonical producer of `tokens.css` for the build — downstream files reference these tokens, never raw literals.

### 1.1 — Set the visual direction

Read **[references/design-direction.md](references/design-direction.md)** for the in-house design doctrine (award-level rules, references-first, media strategy). *This file is authored in Phase D of the ecosystem plan; until it lands, apply the principles in this SKILL.md and the session-lessons references directly.* The direction owns:

- Bold aesthetic direction (refined minimalism, editorial maximalism, brutalist, etc.)
- Typography choices that aren't generic Inter/Roboto/Arial
- Color and motion that fit context, not a SaaS template
- Layered visual treatments — atmosphere, depth, spatial composition

The Anthropic `frontend-design` skill is **not required** and is being retired from this pipeline; if it happens to be installed it may *complement* the in-house doctrine, but never depend on it and never invoke it as a precondition.

Apply the design via direct edits to CSS modules, component files, design tokens, etc. Respect any project-level rules about design tokens (`tokens.css`), pre-commit hooks that ban raw hex/z-index literals, file-size budgets, and CSS Modules conventions. If you introduce a new color/shadow/z-index value, define it as a token first, then reference it.

When phase 1 is "complete enough to look at," move immediately to phase 2 — do not batch up many changes before verifying. Smaller verify cycles catch bugs closer to the change that caused them.

## Phase 2 — Verify (the non-negotiable loop)

The output of this phase is one artifact: the **Verification Ledger** — an accountable table posted in the chat, not a prose "looks good." It replaces self-attestation. The full format, the two families of rows, the honesty rule, and the objective exit condition live in **[references/visual-qa-checklist.md](references/visual-qa-checklist.md)** Sections 1 (build the matrix → ledger) and 12 (post the completed ledger). The essentials:

- **Post the scope matrix as a table in the chat *before* the first screenshot.** A matrix "in your head" does not exist. On a **full-site build**, the matrix is the inventory pages × sections × viewports (there is no "changed CSS" scope on greenfield).
- **Viewports include 320/360 (small-mobile).** The verdict is **invalid** if a device class was never actually rendered — a binary gate, not a nicety.
- **A cell that was not rendered is `not-evidenced`, never PASS.** A PASS requires a real proof: a screenshot ID plus the measured value where applicable (`scrollWidth/clientWidth`, contrast ratio, touch-target px).
- **Objective exit condition:** every ledger cell is PASS with evidence; any scope reduction is explicitly approved by the user and recorded in the ledger. There is no subjective "scope the user cares about."

### The VERIFICATION LEDGER marker (mandatory, machine-checkable)

Post the ledger under a heading that contains the **exact** string `VERIFICATION LEDGER` (e.g. `## VERIFICATION LEDGER — {project} — {date}`). This exact marker is how tooling (and the user) locate the ledger; do not paraphrase it ("verification table", "QA ledger", etc. do not count).

**Auditable escape hatch — never silent.** If a turn that runs after this skill was invoked is legitimately **not** a UI turn (e.g. the user pivoted to an unrelated question, or the work was a pure non-visual refactor with nothing to render), you may skip the ledger — but only by writing, in that turn, the exact line `LEDGER-EXEMPT: <reason>` stating why no ledger applies. This is an explicit, logged exception, never an implicit omission: either a `VERIFICATION LEDGER` heading or a `LEDGER-EXEMPT:` line must appear on any turn that would otherwise declare UI work done.

**Consume the design-intent contract.** If Phase 1 loaded a `design-intent.md`, its **TESTABLE CRITERIA become additional lines of the Verification Ledger** — one ledger row per criterion, each demanding a real measured proof, never a declarative PASS. The design-intent's motion stance and art direction are checked here the same way.

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

1. **Identify what's in scope — as a matrix posted in the chat, not a list in your head.** List every visual surface the change could plausibly affect, not just the one you intended to fix (removing `overflow: hidden` changes clipping for descendants; `isolation: isolate` can hide popups; a parent background can leak through a now-transparent child). Then make it two-dimensional: verification runs over **surfaces × viewports** (**320/360 small-mobile**, 375px mobile, ~768px tablet, desktop) — and × theme if the app has light/dark. On a **full-site build** the matrix is the inventory pages × sections × viewports. A surface seen at one viewport is not verified; a device class never rendered makes the whole verdict **invalid** (binary gate). Mark which surfaces are **interaction-reached** — modals, drawers, detail views, popovers, expanded rows, anything behind a click or a route change. Resizing the browser does not re-open those, so they are the cells most often left untested. **Post this matrix as a table in the chat *before* the first screenshot** — the ledger grows from it (checklist §1).

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

## Before client delivery — hand off to design-forge for an independent audit

The two-phase loop above is the **incremental** QA that runs *during* the build — it is ship-polished-ui's job. It is **not** the final gate. Before anything ships to a client:

- Run **design-forge AUDIT** (or **design-forge TEST** if computer-use / a live-driving tool is available) against the `design-intent.md`. Its verdict is an *independent* review of the finished work, scored against the intent's criteria — a different pair of eyes than the builder.

**QA responsibility split, written down:** *ship-polished-ui runs the incremental visual-QA loop during the build (Verification Ledger per change); design-forge runs the full pre-delivery audit against the design-intent.* Neither replaces the other — the ledger proves the build was verified as it went, the audit proves it holds up as a whole.

## When to delegate to the visual-qa-inspector agent

The skill ships with a paired sub-agent — `visual-qa-inspector` — defined at `~/.claude/agents/visual-qa-inspector.md`. **The agent file MUST live in `.claude/agents/`, not inside this skill folder** — Claude Code only auto-discovers sub-agents at that path (or in plugin `agents/` folders). Skills and sub-agents are separate primitives by design: a skill teaches the current context how to do something, a sub-agent delegates the task to an isolated context that returns only a final report. See **[references/agent-dispatch.md](references/agent-dispatch.md)** for the full briefing template and **[references/packaging-as-plugin.md](references/packaging-as-plugin.md)** if you want to ship the skill + agent as one distributable unit.

Dispatch the agent via the Agent tool with `subagent_type: visual-qa-inspector`. Its **output is the Verification Ledger itself** (see agent-dispatch.md) — not a 300-word summary. Use it when:

- **The change touches more than 3 components — dispatch is blocking, not optional** (above that count, verifying inline in a context already loaded with design decisions is exactly where cells get rubber-stamped).
- You're under heavy context pressure (long session, many open threads).
- You catch yourself thinking *"the design probably works, I'll just take one screenshot to confirm"* — that exact thought is the cue to delegate. The agent runs Sonnet in a fresh context, which makes it cheaper and more disciplined than the parent that's been juggling design decisions for an hour.

Skip the agent for trivial changes (one CSS file, ~10 lines) — verify those yourself.

**If the `visual-qa-inspector` agent is absent** (not installed on this machine, or unavailable in the current runtime): run the full checklist inline yourself, at **no reduced coverage** — every surface × viewport × state still gets its ledger cell. Note in the ledger that the agent was unavailable and the checklist ran inline, so the fallback is visible rather than silent.

## Read these references when relevant

- **[references/design-direction.md](references/design-direction.md)** — The in-house design doctrine for Phase 1 (award-level rules, references-first, media strategy). *Authored in Phase D of the ecosystem plan; until it lands, apply this SKILL.md and the session-lessons directly.* Replaces any dependency on the Anthropic `frontend-design` skill, which is being retired from this pipeline.
- **[references/visual-qa-checklist.md](references/visual-qa-checklist.md)** — The operational checklist for phase 2. Read on every invocation.
- **[references/css-side-effects.md](references/css-side-effects.md)** — Dangerous CSS patterns and the regressions they cause. Read whenever your change touches `overflow`, `position`, `z-index`, `isolation`, `clip-path`, `filter`, `transform`, `backdrop-filter`, `background-attachment`, or container sizing.
- **[references/iframe-and-host-shells.md](references/iframe-and-host-shells.md)** — Behavior changes inside iframes (Power Apps, Salesforce, embedded SaaS, sandboxed previews). Read whenever the app is hosted inside another shell.
- **[references/session-lessons-2026-05-04.md](references/session-lessons-2026-05-04.md)** + **[references/session-lessons-2026-05-21.md](references/session-lessons-2026-05-21.md)** + **[references/session-lessons-2026-05-31.md](references/session-lessons-2026-05-31.md)** — Concrete bugs caught in real sessions, each with symptom → root cause → the diagnostic that should have run → the fix. They trace the failure axes: *looking harder* at one surface (05-04), the *viewport matrix* (05-21), and the three quality axes — *correct, comfortable, premium* (05-31: ergonomics Bugs 6–7, then craft/intent Bug 8). Read them to ground the abstract checklist in what "rigorous" actually looks like.
- **[references/agent-dispatch.md](references/agent-dispatch.md)** — How to brief the visual-qa-inspector sub-agent.
- **[references/packaging-as-plugin.md](references/packaging-as-plugin.md)** — Read only when you want to ship the skill + agent as one distributable plugin.

## Anti-patterns this skill exists to prevent

The following moves are **always wrong** for UI work that's supposed to feel finished. Catching yourself doing them is the cue to back up to phase 2.

| Anti-pattern | What to do instead |
|---|---|
| One default-scroll screenshot, declare done | Scroll to top AND bottom, zoom on every touched element |
| "HMR served the new CSS, so it's applied" | Verify visually — sometimes HMR is silent, sometimes a `@media` query you didn't expect kicked in |
| "I reloaded, so I'm seeing my latest CSS/JS" | A plain static server caches assets heuristically and serves stale copies — even in a new tab. Serve `no-store`, cache-bust the URL, or use a fresh origin (new port), and confirm the served asset actually changed before trusting the screenshot |
| "It renders correctly, so it's done" | Correct ≠ comfortable. Run the ergonomics pass (checklist §10): reading measure, chrome/content ratio, per-row scroll cost. The bugs the user bounces back are usually ergonomic, not broken pixels |
| "It renders and reads fine, so it's premium" | Correct + comfortable ≠ premium. Run the craft pass (checklist §11): put it beside the page's nicest element — flat vs. elevated, edge-hugging vs. inset, crammed vs. placed. "Trop simpliste" is this axis failing |
| Ship a progress/nav/status component that scrolls away on a long page | Ask what it's *for*: an indicator you consult while working should be `sticky`/persistent. Behavior is part of design — don't wait for the user to ask for sticky |
| Rubber-stamp a component a workflow/generator produced as "correct → done" | Generated work never got a dedicated taste pass, so verify is the ONLY craft gate. Judge its craft harder, not softer, than your own |
| Notice a flaw, name the fix, ship anyway because it feels out of scope | If you diagnosed it, you own it. Apply the fix this pass or surface it explicitly ("I noticed X — want me to also do Y?"). A shelved self-diagnosis is a guaranteed bounce-back |
| Ignore states you didn't directly edit | Removing `overflow: hidden` to fix one issue may break clipping for siblings — re-zoom on neighbors |
| Skip interactive states because the static screenshot looks right | Click the dropdown, hover the card, focus the input — the bug is usually in the state you didn't bother to trigger |
| Test an interaction-reached view (modal, drawer, detail page) at one viewport | Re-open it at mobile, tablet, and desktop — resizing the browser doesn't re-open it, so it silently stays a single-viewport check |
| "The user will tell me if it's broken" | The user already told you not to ship like this. The point of this skill is that you tell yourself |
| Guess at iframe behavior from regular browser intuition | Iframes change `background-attachment: fixed`, viewport reporting, cross-origin DOM access. Read the iframe reference. |
| Decide an issue is "fine" because the data didn't show it | Imagine empty/long/many-item states explicitly; reproduce them where you can |

## Style and tone of communication

When you find issues during verify, report them concisely and with exact location. "Brand rail at top of period bar overflows past the rounded corners — visible in the zoom of `(125, 340) → (1370, 415)`." That's specific enough to fix without re-investigation.

When you finish a verify pass clean, report briefly what you actually verified — not just "looks good." Something like: "Scrolled top→bottom, zoomed each card edge, exercised dropdown / hover / refresh states. Dropdown now stacks above cards. Brand rail clipped to corners. No regression on adjacent sticky bar." That's honest and tells the user exactly what was checked, so they can call out anything you missed before it ships.
