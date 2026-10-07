# Why this skill exists, delegation, anti-patterns, tone

Moved out of SKILL.md.

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

## Before client delivery — hand off to design-forge for an independent audit

The two-phase loop above is the **incremental** QA that runs *during* the build — it is ship-polished-ui's job. It is **not** the final gate. Before anything ships to a client:

- Run **design-forge AUDIT** (or **design-forge TEST** if computer-use / a live-driving tool is available) against the `design-intent.md`. Its verdict is an *independent* review of the finished work, scored against the intent's criteria — a different pair of eyes than the builder.

**QA responsibility split, written down:** *ship-polished-ui runs the incremental visual-QA loop during the build (Verification Ledger per change); design-forge runs the full pre-delivery audit against the design-intent.* Neither replaces the other — the ledger proves the build was verified as it went, the audit proves it holds up as a whole.

## When to delegate to the visual-qa-inspector agent

The skill ships with a paired sub-agent — the `visual-qa-inspector` agent (embedded in this plugin under `agents/` when installed as the `design-studio` plugin, or at `~/.claude/agents/visual-qa-inspector.md` when the skill runs standalone). **The agent file MUST live in `.claude/agents/`, not inside this skill folder** — Claude Code only auto-discovers sub-agents at that path (or in plugin `agents/` folders). Skills and sub-agents are separate primitives by design: a skill teaches the current context how to do something, a sub-agent delegates the task to an isolated context that returns only a final report. See **[references/agent-dispatch.md](references/agent-dispatch.md)** for the full briefing template and **[references/packaging-as-plugin.md](references/packaging-as-plugin.md)** if you want to ship the skill + agent as one distributable unit.

Dispatch the agent via the Agent tool with `subagent_type: visual-qa-inspector`. Its **output is the Verification Ledger itself** (see agent-dispatch.md) — not a 300-word summary. Use it when:

- **The change touches more than 3 components — dispatch is blocking, not optional** (above that count, verifying inline in a context already loaded with design decisions is exactly where cells get rubber-stamped).
- You're under heavy context pressure (long session, many open threads).
- You catch yourself thinking *"the design probably works, I'll just take one screenshot to confirm"* — that exact thought is the cue to delegate. The agent runs Sonnet in a fresh context, which makes it cheaper and more disciplined than the parent that's been juggling design decisions for an hour.

Skip the agent for trivial changes (one CSS file, ~10 lines) — verify those yourself.

**If the `visual-qa-inspector` agent is absent** (not installed on this machine, or unavailable in the current runtime): run the full checklist inline yourself, at **no reduced coverage** — every surface × viewport × state still gets its ledger cell. Note in the ledger that the agent was unavailable and the checklist ran inline, so the fallback is visible rather than silent.

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
