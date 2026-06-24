---
name: ship-polished-ui
description: Use this skill anytime the user wants UI work that feels finished, premium, or production-grade — not just CSS edits. Triggers aggressively on phrases like "rends ceci premium", "make this premium", "améliore l'UI", "improve the UI", "polish the page", "make this look better", "make it more refined", "fix this visual bug", "the design looks generic", "premium design", "make it production-ready", "ce bouton est laid", "ça ne rend pas bien", or simply when the user pastes a screenshot and asks to make it nicer. Also triggers on UI bug reports ("the dropdown is behind the cards", "the bottom of the page is white", "this overflows weirdly"), and on requests to verify/test a UI feature ("vérifie que ça marche bien", "test this page", "make sure it looks good"). The skill enforces a two-phase loop — design via the frontend-design skill, then a NON-NEGOTIABLE browser-based visual QA loop that scrolls to extremes, zooms into every touched element, exercises interactive states (hover, click, focus, dropdown), and stress-tests edge cases. The verify phase exists because the user has been burned over and over by Claude declaring "looks great" after a single default screenshot, while real bugs hide in places casual review misses (rounded-corner overflow, stacking-context bugs hiding popups behind siblings, backgrounds that fade out on long scroll, label/value pairs where the value silently disappears). Use this skill INSTEAD of just editing CSS and hoping; the testing is part of the deal even if the user doesn't explicitly ask to test.
---

# ship-polished-ui — Premium frontend craft, browser-verified

Pair the [frontend-design](../frontend-design/SKILL.md) skill (or its plugin equivalent) with a disciplined visual QA loop. The frontend-design skill handles taste — bold typography, distinctive aesthetics, motion, atmosphere. This skill handles craft — actually verifying in a real browser that the change shipped without regressions, hidden bugs, or the half-finished feeling of "looks fine on the bit I happened to screenshot."

## Why this skill exists

Without this discipline, a typical UI edit looks like:

> "I changed the CSS, took a screenshot of the top of the page, it looks great, done."

That phrase has shipped real bugs. Every one of them was preventable:

- A search dropdown rendered behind the card grid because a parent had `isolation: isolate` — caught only when the user clicked it.
- A premium card surface had a beautiful brand stripe at the top, but it overflowed past the rounded corners — caught only when the user zoomed into a corner.
- A page background had an atmospheric gradient mesh that covered the first viewport beautifully, then dropped off to flat white from card row 4 onward — caught only when the user scrolled to the bottom.
- A "Période configurée / 19 avril — 26 avril" label/value pair was rendering only the label; the value got clipped by `overflow: hidden` on a parent — caught only when the user squinted at it.
- A plan progress bar rendered perfectly and read fine — but it was a flat fill hugging the card's raw edges, with status dots crammed against the text baseline, and it scrolled out of view on a long document. Every pixel was *correct*; it just looked unfinished and didn't behave like a thing you consult while you work. Caught only when the user said *"c'est trop simpliste, ça aurait dû être sticky."*

In every case, Claude had the browser, had the screenshot tool, and had the technical capability to catch the bug. What was missing was the **discipline** to not declare "done" until the change had been seen, scrolled, zoomed, exercised, *and judged for craft* the way a human reviewer actually inspects a page. The first four bugs are *correctness* misses; the last is a *premium-craft* miss — a separate axis the verify loop now covers explicitly (Section 11).

This skill is that discipline, written down.

## The two-phase loop

For any request that triggers this skill, run the loop:

```
┌──────────────────────────────────┐
│  Phase 1 — Design                │
│  Use frontend-design for the     │
│  visual direction & code         │
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

Repeat until the verify phase finds zero issues at the scope level the user cares about. **Do not declare a UI change "done" without completing the verify phase at least once.**

## Phase 1 — Design

Always invoke the frontend-design skill (it lives at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md` on this machine, or wherever the user has installed it). That skill handles:

- Bold aesthetic direction (refined minimalism, editorial maximalism, brutalist, etc.)
- Typography choices that aren't generic Inter/Roboto/Arial
- Color and motion that fit context, not a SaaS template
- Layered visual treatments — atmosphere, depth, spatial composition

Apply the design via direct edits to CSS modules, component files, design tokens, etc. Respect any project-level rules about design tokens (`tokens.css`), pre-commit hooks that ban raw hex/z-index literals, file-size budgets, and CSS Modules conventions. If you introduce a new color/shadow/z-index value, define it as a token first, then reference it.

When phase 1 is "complete enough to look at," move immediately to phase 2 — do not batch up many changes before verifying. Smaller verify cycles catch bugs closer to the change that caused them.

## Phase 2 — Verify (the non-negotiable loop)

Read **[references/visual-qa-checklist.md](references/visual-qa-checklist.md)** — that file is the operational core of this skill. The headlines:

1. **Identify what's in scope — as a matrix, not a list.** List every visual surface the change could plausibly affect, not just the one you intended to fix (removing `overflow: hidden` changes clipping for descendants; `isolation: isolate` can hide popups; a parent background can leak through a now-transparent child). Then make it two-dimensional: verification runs over **surfaces × viewports** (mobile ~375px, tablet ~768px, desktop) — and × theme if the app has light/dark. A surface seen at one viewport is not verified. Critically, mark which surfaces are **interaction-reached** — modals, drawers, detail views, popovers, expanded rows, anything behind a click or a route change. Resizing the browser does not re-open those, so they are the cells most often left untested. Write the matrix down before opening the browser.

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

8. **Run the responsive sweep, then stress-test data states.** A viewport pass is not "resize the browser and glance at the current page." Resizing does not re-open a modal, a drawer, or a detail view — the interaction that opened it has to be redone. So for each viewport (~375px mobile, ~768px tablet, desktop), re-walk the full surface list from step 1, and **re-trigger every interaction-reached view at that viewport**. Check each surface for horizontal overflow (`scrollWidth` should equal `clientWidth` — a page wider than the viewport spills images, buttons and text off the right edge), adapting layout, non-overlapping controls, and ≥44px touch targets. Then stress-test data states: empty (layout shouldn't collapse), single item, many items (scroll past a viewport — background still covers? state leaking between rows?), and long strings (ellipsize gracefully, or break the layout?).

9. **Run the reading-ergonomics pass.** Correctness (no overflow, no clip, no regression) is table stakes, not the finish line. For any surface a user *reads or scans* — docs, tables, dashboards, forms — ask whether it's comfortable to live in for ten minutes: reading measure (~50–90 chars/line), chrome-to-content ratio (is a fat sidebar crowding a cramped reading column?), and scroll-cost of dense content (does a wide table force panning for *every* row?). These pass every correctness check and still get bounced back. Crucially: **if you measure a deficiency, apply the fix this pass or surface it — never ship a flaw you already diagnosed.**

10. **Run the premium-craft + component-intent pass.** This is the third quality axis — separate from "is it correct?" (1–8) and "is it comfortable to read?" (9) — and it's the one behind the most common bounce-back: *"c'est trop simpliste / ça ne fait pas premium."* For any component you **designed or restyled**: (a) **Craft** — zoom in and judge it like a designer *against the page's nicest existing element*: depth/elevation (does it have the same shadow as sibling cards, or sit flat?), containment (does it breathe inside the layout padding, or hug the raw edges?), detail placement (are dots/badges/icons placed in their own space, or crammed against a line?), and one considered accent (rail/gradient/tint) vs. monochrome filler. The litmus test: screenshot your component beside the best element on the page — if yours looks like the poor cousin, it fails. (b) **Intent** — ask *what is this component for* over a realistic long/populated surface: a progress/status indicator exists to be consulted while you work → it should stay visible (`sticky`), not scroll away; a nav/filter should stay reachable; a primary action should be findable without a scroll-back. Sticky-ness and persistence are decisions you **owe** the component, not enhancements to await. This pass is doubly required when the component arrived from a generator/workflow and never went through frontend-design's taste pass — then the verify phase is the *only* craft gate, so don't rubber-stamp your own un-reviewed work as "correct → done." See Section 11 of the checklist.

11. **Loop until clean.** Each verify pass that finds something feeds a phase-1 fix. Re-verify after every fix.

## When to delegate to the visual-qa-inspector agent

The skill ships with a paired sub-agent — `visual-qa-inspector` — defined at `~/.claude/agents/visual-qa-inspector.md`. **The agent file MUST live in `.claude/agents/`, not inside this skill folder** — Claude Code only auto-discovers sub-agents at that path (or in plugin `agents/` folders). Skills and sub-agents are separate primitives by design: a skill teaches the current context how to do something, a sub-agent delegates the task to an isolated context that returns only a final report. See **[references/agent-dispatch.md](references/agent-dispatch.md)** for the full briefing template and **[references/packaging-as-plugin.md](references/packaging-as-plugin.md)** if you want to ship the skill + agent as one distributable unit.

Dispatch the agent via the Agent tool with `subagent_type: visual-qa-inspector`. Use it when:

- The change touches more than ~3 components.
- You're under heavy context pressure (long session, many open threads).
- You catch yourself thinking *"the design probably works, I'll just take one screenshot to confirm"* — that exact thought is the cue to delegate. The agent runs Sonnet in a fresh context, which makes it cheaper and more disciplined than the parent that's been juggling design decisions for an hour.

Skip the agent for trivial changes (one CSS file, ~10 lines) — verify those yourself.

## Read these references when relevant

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
| "It renders correctly, so it's done" | Correct ≠ comfortable. Run the ergonomics pass (Section 10): reading measure, chrome/content ratio, per-row scroll cost. The bugs the user bounces back are usually ergonomic, not broken pixels |
| "It renders and reads fine, so it's premium" | Correct + comfortable ≠ premium. Run the craft pass (Section 11): put it beside the page's nicest element — flat vs. elevated, edge-hugging vs. inset, crammed vs. placed. "Trop simpliste" is this axis failing |
| Ship a progress/nav/status component that scrolls away on a long page | Ask what it's *for*: an indicator you consult while working should be `sticky`/persistent. Behavior is part of design — don't wait for the user to ask for sticky |
| Rubber-stamp a component a workflow/generator produced as "correct → done" | Generated work never got frontend-design's taste pass, so verify is the ONLY craft gate. Judge its craft harder, not softer, than your own |
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
