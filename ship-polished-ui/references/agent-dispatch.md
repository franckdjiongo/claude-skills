# Briefing the visual-qa-inspector sub-agent

The `visual-qa-inspector` agent lives at `~/.claude/agents/visual-qa-inspector.md` (user-scope) and runs on Sonnet for cost-effective verification. Dispatch it via the Agent tool with `subagent_type: visual-qa-inspector` (or `general-purpose` if the agent file isn't installed yet — pass the same prompt).

It's a fresh-context QA pass on UI changes you just made. Use it when:

- The change affects more than ~3 components
- You're deep into a session and feel context fatigue
- You catch yourself rationalizing skipped checklist items
- The user has previously caught visual bugs in this session — you want a second pair of eyes

## How to brief the agent

Briefing matters. The agent runs in a fresh context — it doesn't see your conversation, your screenshots, your design decisions. Give it everything it needs to act independently. A good prompt has these sections:

### 1. Goal (one paragraph)

What was the intended outcome of the UI change? Premium-feel home page? Fixed dropdown z-index? Added atmospheric background? State the goal in one paragraph so the agent knows what "good" looks like.

### 2. Files changed (paths + brief description per file)

List every file you touched with one line each:

```
- src/features/home/components/HomeScreen.module.css — moved background canvas to scroll parent
- src/features/home/components/SiteSelector.module.css — set background: transparent
- src/features/home/components/HomePeriodControls.module.css — replaced ::before brand rail with background-image; added z-index: var(--z-sticky)
- src/features/home/components/HomeSiteCard.module.css — added vertical accent stroke; added :empty rule for cardXref
```

This list defines the change scope. The agent uses it to derive what to verify.

### 3. The verify scope (what to test)

Be explicit about what to test. The agent will follow the checklist in `~/.claude/skills/ship-polished-ui/references/visual-qa-checklist.md`, but you should highlight anything specific:

```
Verify scope:
- The home screen at the dev URL: <URL>
- Multi-position screenshots (top, mid, bottom)
- Zoom on the period bar's rounded corners (top-left and top-right)
- Click the period dropdown and confirm it renders ABOVE the cards
- Hover a card and confirm the accent stroke reveals + the lift animation runs
- Scroll all the way to the bottom and confirm the canvas (gradient mesh + grid) covers the visible viewport
- Read the period bar's "PÉRIODE CONFIGURÉE / value" pair — both must be visible
```

### 4. Known constraints / context (only what's needed)

Anything the agent needs to know that's not obvious from the code:

```
Context:
- The app runs in a Power Apps iframe (host shell at apps.powerapps.com). Read references/iframe-and-host-shells.md before debugging.
- Don't reload the page (cmd+R kills SSO).
- The user is signed in; the home shows ~25 cards.
- Browser MCP is connected to "Claude Testing" Chrome instance.
```

### 5. What to do if you find a bug

```
If you find a bug:
- Stop, write a short report with the exact issue, the file/line you suspect, and a screenshot ID.
- Don't fix it yourself — the parent agent will.
- Restart the checklist after parent reports back with a fix? — no, just report and stop. The parent will re-dispatch.
```

### 6. What to return

```
Return:
- Verdict: PASS / FAIL / FAIL-WITH-MINOR
- For each checklist section, a one-line note (what you actually did + outcome)
- For any FAIL: file path, line guess, screenshot ID, exact symptom
- Total time spent on the verification (rough estimate)
```

## Full briefing template

Copy/paste this template, fill in the bracketed parts, send to the agent (via the Agent tool with `subagent_type: visual-qa-inspector` if installed, or `subagent_type: general-purpose`):

```
You are doing a rigorous visual QA pass on UI changes I just made. Read the
ship-polished-ui skill at ~/.claude/skills/ship-polished-ui/SKILL.md and its
references/visual-qa-checklist.md before starting. Run through the entire
checklist faithfully — do not skip sections.

Goal of the change:
[1 paragraph]

Files changed:
[list with one line each]

Verify scope (must-cover items, in addition to the standard checklist):
[explicit items]

Context to be aware of:
- App URL: [url]
- App is in [iframe / regular browser / native shell]
- Browser MCP: [Chrome MCP / computer-use / preview]
- Special quirks: [SSO, no-reload, etc.]

Do NOT fix anything yourself. If you find a bug, stop, document it, and return.

Return format:
- One-line verdict (PASS / FAIL / FAIL-WITH-MINOR)
- Per-section notes: "S1 (scope) — listed 4 surfaces, all verified. S2 (open browser) — connected to [tab]. S3 (multi-scroll) — top/mid/bottom screenshots OK except <issue>. S4 (zoom edges) — clean except <issue>. S5 (interactive) — dropdown click → renders behind cards [bug]. S6 (cross-check) — OK. S7 (label/value pairs) — OK. S8 (edge cases, if applicable) — empty state OK." etc.
- For each failure: file (best guess), line, screenshot ID, exact symptom in one sentence.

Report under 300 words.
```

## Why "don't fix yourself"

If the agent fixes things, it's no longer a clean QA pass — it's another implementation cycle. The parent agent loses visibility into what was found vs. what was applied. Keep the agent narrow: **find bugs, return, hand off**.

The exception is if the user explicitly said "the agent can fix small stuff" — then the agent has more authority. Default is no.

## When NOT to use the sub-agent

- The change is one CSS file, ~10 lines. Just verify yourself.
- The change is a one-off bug fix the user already described. Just verify the fix.
- You're already in the verify phase and just need to look at one more thing.
- Context is tight (close to compaction) — spawning the agent costs tokens; finish your own pass instead.

## Cost / time estimate

A full visual QA pass typically takes the agent ~30–60 seconds of wall time and 10–20k tokens (lots of screenshots). Plan accordingly — don't dispatch for trivial changes; do dispatch for risky ones.
