---
name: session-review
description: >
  Generate an honest, evidence-grounded retrospective of the current Claude Code session across 5 dimensions: self-evaluation on /10 with concrete rationale, what worked well with cited examples, what went poorly with cost analysis, review of any subagents/skills invoked during the session (reading their .md definitions and cross-referencing observed usage), and concrete improvement suggestions for the workflow plus considerations for next-generation models. Adapts to session complexity — skips sections that do not apply (e.g., no agent review if no subagents were invoked). Use this skill EVERY time the user types /session-review, says "session review", "rétrospective", "fais-moi une rétrospective", "évalue cette session", "post-mortem", "retour d'expérience", or asks any variant of "qu'est-ce qui a bien/mal marché dans cette session". Do NOT use for code reviews of specific PRs, commit messages, individual feature design reviews, or bug post-mortems — those have other tools.
---

# Session Review

This skill produces a calibrated retrospective of the Claude Code session that just happened, so the user can extract lessons that improve their workflow, agents, skills, hooks, or prompting approach. The value comes from **honesty grounded in specific evidence**, not from generic praise.

---

## Philosophy — the things that make or break this skill

### 1. Honest over sycophantic

The user explicitly wants an accurate read. Starting with "Great work!" or giving 10/10 by default destroys the value. The goal is to **identify gaps the user can act on**. If you would not stake money on the score being right, adjust it.

### 2. Evidence over impression

Every claim needs a concrete anchor from the session:
- A file path with line number
- A commit hash
- A specific tool invocation ("when I dispatched `tc-implementer` for Task 2…")
- A specific user intervention ("you reminded me to run loop-until-clean at turn N…")

"The work went well" without evidence is noise. "The worktree dispatch at turn 12 saved one wall-clock slot because Tasks 1, 2, 9 had no file overlap" is signal.

### 3. Cost of failure matters more than the failure itself

A small failure that forced the user to intervene is **worse** than a large failure that the system caught automatically — because the former indicates the guardrails missed something. When describing what went poorly, pair every event with an impact (extra round-trip, user correction, rework cost, context wasted).

### 4. Adaptive scope — do not force 5 sections into a trivial session

If the session was a 2-minute typo fix, do not pretend there are 5 dimensions of reflection. A 3-line response is correct. Force-fitting the template onto a small session is cargo-cult analysis and destroys the skill's credibility.

### 5. Each "went poorly" must pair with a proposed fix

Complaints without proposed fixes are noise. If you identify a gap, the same bullet should name (a) the root cause and (b) a concrete remediation — a hook to add, a rule to enforce, an agent section to rewrite, a prompt pattern to change.

---

## Step 0 — Run the session analyzer script FIRST

**Before any qualitative reflection, run the deterministic analyzer.** It reads the persisted session JSONL at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` and extracts ground-truth signals that anchor the entire rapport:

```bash
python3 ~/.claude/skills/session-review/scripts/analyze_session.py --md
```

The script outputs (in markdown):
- **Session ID**, **git branch**, **cwd**, **duration** — exact values, no guessing
- **Tool usage distribution** — Bash N, Agent N, Edit N, etc. (deterministic count)
- **Subagents dispatched** — by `subagent_type` + by `description`, with counts
- **Skills invoked** — list with counts
- **Scope tier** — auto-classified (Micro / Small / Medium / Large) from tool counts + subagent count
- **User turns classified** — every user message with category (`command_invocation`, `continuation`, `confirmation`, `likely_intervention`, `initial_request`, `new_request_mid_work`, `other`), char length, and tool-uses-since-previous-user (signal of how autonomous the assistant was just before)
- **Failure patterns** — empty output counts, tool errors, bash non-zero exits

**Use the script output as the source of truth** for:
- The scope tier (don't guess — use what the script says)
- The exact subagent/skill inventory (for Dimension 4)
- The turn-by-turn list (for Dimension 3, "ce qui a moins bien marché" — scan for `likely_intervention` categories and assess each one)
- The duration and tool counts (for citing cost/friction concretely)

**If the script fails** (no JSONL found, parse error), fall back to context-memory reasoning and note the script failure in Dimension 3 as a session-analysis gap.

**Arguments** (advanced):
- `--session <uuid>` — analyze a specific past session rather than the current one
- `--file <path>` — direct path to a .jsonl
- `--cwd <path>` — override current working directory
- `--json` / `--md` — output only one format (default: both, JSON first, then markdown)
- `--rollup [N]` — **cross-session mode.** Aggregate the whole project instead of one session: `--rollup` covers every session in the project dir, `--rollup 10` the 10 most recent. Emits a per-session table + merged totals (subagent types, skills, slash commands, tool-error kinds, parallelism, commits, harness events). Use this whenever the request is about *multiple* sessions — see "Cross-session (project) review mode" below.

**Then layer qualitative reflection on top.** The script gives you the skeleton (what happened, quantitatively). The rapport adds why it matters and what to do about it.

---

## Cross-session (project) review mode

**Trigger this mode when the request is about MORE THAN the current session** — "analyze the last 10 sessions", "review the last N sessions", "review les N dernières sessions", "review the last N threads", "analyse toutes les sessions de ce projet", "review all the threads on this project", "lessons learned across the project", "what patterns keep recurring". The `--last N` / `--rollup N` flags map to this mode. Default `/session-review` (no such phrasing) stays single-session.

> **Boundary — this is a *conversation* retrospective, not an artifact audit.** Cross-session mode aggregates what *happened* across sessions (interventions, friction, dispatch patterns). It does NOT grade the QUALITY of your design/plan artifacts or the skills that produce them — the 14-dimension grid, design→plan fidelity, remediation cycles, and an HTML audit report are a separate, heavier multi-agent job. For "audit my pipeline", "are my brainstorming / writing-plan / execute-plan skills good enough", or "full pipeline audit", use the **`pipeline-audit`** skill instead. Keep the line clean: session-review = how the conversations went; pipeline-audit = how good the artifacts and skills are. Do not try to do the full pipeline audit from here.

In this mode the unit of analysis is the **project**, not one transcript. A single-session 5-dimension rapport applied to 10 sessions is the wrong shape — the value is in *recurring* patterns, not per-session events.

**Procedure:**

1. **Run the rollup first**, not the single-session analyzer:
   ```bash
   python3 ~/.claude/skills/session-review/scripts/analyze_session.py --rollup --md      # all sessions
   python3 ~/.claude/skills/session-review/scripts/analyze_session.py --rollup 10 --md   # 10 most recent
   python3 ~/.claude/skills/session-review/scripts/analyze_session.py --last 15 --md     # alias: the last 15 sessions
   ```
   This gives the per-session map + merged aggregate (subagent types, skills, slash commands, tool-error kinds, parallelism, commits, compactions/stop-hooks) as ground truth — no hand-aggregation.
2. **Drill into the highest-signal individual sessions** with `--session <uuid>` / `--file <path>` (JSON) to pull the exact intervention/correction previews from `user_turns_detail` (the rollup intentionally omits per-turn text to stay compact). One drill-down per session that carries a recurring pattern is usually enough.
3. **Score the workflow in aggregate**, not each session. State it's an aggregate of N sessions and weight by recurrence (a friction that appears in 6/10 sessions outranks a one-off). Use `active_duration_minutes_rounded`, not wall-clock, when citing effort — resumed sessions inflate wall-clock badly.
4. **Reframe the 5 dimensions as cross-cutting:**
   - **D1 (score):** aggregate /10 with a per-session map table.
   - **D2 (worked):** transferable patterns that held *across* sessions (e.g. delta-at-start commits every time).
   - **D3 (didn't):** recurring failures, ranked by how many sessions they appear in. A pattern in 1 session is an anecdote; in 5+ it's a systemic gap. Cite counts from the aggregate (e.g. `file_not_read_yet ×20`, `parallel_messages 0/15`).
   - **D4 (agents/skills):** judge the *dispatch ecosystem* over the window (which agents dominate, parallelism never used, role bleed) rather than one invocation. Read the top agents' `.md` once, not per session.
   - **D5 (suggestions):** prioritize fixes by recurrence × cost. The recurring hand-typed ritual or the never-used capability is usually the headline.
5. **Synthèse:** name the 2-3 systemic levers, in priority order, that change the *most sessions going forward*.

Everything else in this SKILL (calibration, anti-patterns, evidence-over-impression, each-complaint-pairs-a-fix) applies unchanged — only the unit of analysis widens.

---

## How to detect the session scope

The script auto-detects this in its `scope_tier` field. **Use its value.** Only override if you have strong qualitative evidence the signals are misleading (very rare).

For reference, here's how the script classifies (same semantics as before):

| Signal | How to detect | Implies |
|---|---|---|
| Subagents invoked | `Agent(...)` tool calls in the transcript | **Agent review dimension applies** — read the relevant `.claude/agents/*.md` files |
| Skills invoked | `Skill(...)` tool calls | Note which skills helped / underperformed |
| Plan executed | `Skill({skill: "execute-plan"})`, modifications to `docs/superpowers/plans/*.md` | Full 5-dimension rapport; check commit hygiene, pipeline discipline |
| Worktree parallelism used | `git worktree add` in Bash calls, `.worktrees/` paths | Note parallelism quality + merge cleanliness |
| User interventions / corrections | User messages that redirect, remind, or correct between your turns | **Must be called out** in "ce qui a moins bien marché" — these are the highest-signal failures |
| Commits made | `git commit` in Bash calls | Pull `git log <base>..HEAD --oneline` for revert map |
| Context compaction occurred | PostCompact hook fired, HANDOFF.md referenced | Note recovery quality |
| File-size / growth-guard blocks | Pre-commit hook rejections | Note reactive vs proactive handling |
| Review/quality gates run | `/quality-gate`, `/dataverse-audit`, `/spec-tracer`, code-reviewer / spec-reviewer agents | Note loop-until-clean discipline |

**Scope tiers** (choose one based on the signals):

| Tier | Signals | Output |
|---|---|---|
| **Micro** | < 5 tool calls, single file, no agents | 3-section compressed (score, 1 thing that worked, 1 thing to watch) — fits in ~15 lines |
| **Small** | Single task, no subagents, < 30 tool calls | 3 sections: score, worked, didn't — skip agent review |
| **Medium** | 1-3 subagents, moderate scope, plan-ish | 4 sections: score, worked, didn't, suggestions — light agent review (one paragraph per agent) |
| **Large** | Full plan execution, 4+ subagents, multi-group, commits | Full 5 sections including per-agent scored review |

---

## The 5 dimensions (adaptive)

### Dimension 1 — Auto-évaluation /10

**Always include this section, regardless of scope.** Start the rapport with the score. Do not bury it.

**Calibration guide:**
- **10/10** — Flawless. Zero user reminders, zero fire drills, zero rework. Every decision the first time was the right one. Extremely rare; reserve for genuinely ideal sessions.
- **9/10** — Near-flawless. One minor inefficiency (e.g., re-read a file once) but no user interventions and no reactive fixes.
- **8/10** — Strong. Outcome clean, but 1-2 visible inefficiencies (minor re-dispatch, one missed proactive check).
- **7/10** — Successful with friction. Outcome delivered, but the user had to remind me about a documented rule, or I ran a reactive fix (growth guard block, typecheck break) I could have prevented.
- **5-6/10** — Delivered but with significant rework. Multiple user corrections, or one major reactive fire drill, or a wrong strategic decision I had to undo.
- **3-4/10** — Outcome delivered only because the user caught blockers. I missed key rules; guardrails failed.
- **<3/10** — Outcome compromised or incomplete. Wrong approach chosen, major regressions, or I gave up prematurely.

**Rationale format:** 2-4 sentences. Cite at least 2 specific events from the session. State explicitly what would move the score up (what a 9 would have looked like) and what would move it down (what a 6 would have looked like). This forced calibration is what keeps the score honest.

**Common failure modes to avoid:**
- Defaulting to 8/10 because "the job got done" — if the user had to correct you, that is NOT 8/10
- Defaulting to 10/10 out of sycophancy — if you cannot justify "flawless" with evidence, it is not a 10
- Giving a number without rationale — the score alone is useless

---

### Dimension 2 — Ce qui a bien marché

Lead with **transferable patterns**, not one-off luck. Each bullet should follow this shape:
- **Name the pattern or decision** (e.g., "Worktree parallel dispatch in a single message")
- **Cite the instance** (e.g., "Group 1 Tasks 1 || 2 || 9, turn 18")
- **Explain why it was valuable** (e.g., "No file overlap → saved one wall-clock slot; merge was ort-clean across all 3 branches")

**Good bullets surface:**
- Tools or skills that proved their worth on THIS session
- Architectural decisions that paid off downstream
- Preventive actions (file-size checks, prop-threading verification) that avoided known traps
- Well-composed agent dispatches that returned clean output first try
- Scope boundaries that held (e.g., staying out of an uncommitted working tree)

**Avoid:**
- Generic praise ("tests passed") — that is the baseline, not a success
- Self-congratulation for reading files or following instructions
- Anything that is expected behavior rather than a positive signal

---

### Dimension 3 — Ce qui a moins bien marché

This is the most valuable section. Be specific; stay honest.

**Each bullet:**
- **Name the event** (e.g., "Missed loop-until-clean on first Group 2 review pass")
- **Cite the instance** (e.g., "Turn 34 — user had to remind me the rule was in orchestrator-instructions.md")
- **Impact** (e.g., "Re-dispatched spec-reviewer unnecessarily, +1 round-trip, +45k tokens")
- **Proposed fix** (e.g., "Enforce via PostToolUse hook that rejects pipeline item `[x]` when the most recent review returned findings > 0")

**Must-include categories (if applicable):**
- **User interventions** — any time the user corrected you, reminded you of a rule, or redirected. These indicate guardrails that did not fire.
- **Reactive fire drills** — growth guard blocks, typecheck breaks, ID collisions, etc. Each of these was detectable BEFORE the failure; note what preventive check would have caught it.
- **Re-work** — commits amended, tasks re-dispatched, reviews re-run. Quantify the cost.
- **Missed rules** — if a documented rule in `.claude/rules/*.md` or an agent body was not followed, name the specific file + section.
- **Unclear scope decisions** — moments where you had to guess the user's intent rather than ask.

**Avoid:**
- "The test suite is slow" — not actionable unless you propose something specific
- Blaming the tools generically — be specific about which tool and which scenario
- Hedging ("maybe I could have") — commit to the claim

---

### Dimension 4 — Review des agents / skills invoqués (si applicable)

**Skip this section entirely** if no subagents were invoked. Force-fitting it makes the rapport worse.

**If subagents were invoked:**

1. Identify each distinct subagent name used (`tc-implementer`, `code-quality-reviewer`, etc.)
2. Read the corresponding `.claude/agents/<name>.md` file (or `.claude/agents/` in the project root)
3. For each agent, produce a sub-section with this exact shape:

```markdown
#### `<agent-name>` — N/10 — <one-line takeaway>

**What I observed** (cite 1-3 specific invocations):
- ...

**Strengths observed:**
- ...

**Weaknesses observed:**
- ...

**Invocation friction:** <was the prompt easy to compose? did the agent need more/less context?>

**Suggested changes to the agent body:**
- <specific file:line edits, not vague improvements>
```

**If skills were invoked and materially affected the session** (e.g., `/execute-plan` orchestration, `/quality-gate`, `/spec-tracer`): add a **Skills invoked** sub-section with the same pattern but less strict.

**Cross-cutting observations to look for:**
- **Duplications between agents** (e.g., shared sections that should be extracted to `.claude/agents/_shared/*.md`)
- **Rules documented but not enforced** (agent body says "never do X" but the agent did X anyway → recommend a hook)
- **Grounding reading lists too long** (aspirational but unlikely to be followed on every invocation)
- **Model frontmatter overrides** (if the caller passed `model: opus` to a sonnet-default agent, note the pattern)

---

### Dimension 5 — Suggestions concrètes

Split into two clearly-labeled groups. Each suggestion must be actionable and concrete (a diff, a hook, a rule, a skill — not "do better").

#### 5a — Workflow improvements (actionable this week)

Each suggestion names:
- **What to change** (specific file, hook, skill, agent, rule)
- **Why it matters** (referencing a specific failure from Dimension 3)
- **Expected benefit** (qualitative or quantitative)

**Common themes to consider:**
- Hooks that would have prevented reactive failures (`PreToolUse` for file-size, `PostToolUse` for plan discipline)
- Scripts that would remove repeated manual steps (DEFERRED-ID allocator, next-task dispatcher)
- Agent body edits (specific line ranges)
- Rule file updates (`.claude/rules/*.md`)
- Skill orchestration tweaks (e.g., removing low-ROI steps from a pipeline)
- Prompt templates that were hand-composed but could be auto-generated

#### 5b — Considerations for next-generation models (directional)

With improved reasoning / longer context / better tool use, what patterns change?
- Sections of agent bodies that can be trimmed because the model generalizes better
- Dispatches that can become inline (e.g., small code reviews done by the orchestrator directly)
- Strategy-building steps that can leverage deeper reasoning
- Context-budget tactics that become unnecessary
- New guardrails that become viable because the model can police itself

Keep this section directional. Do not promise specific gains — note the pattern and the hypothesis.

---

## Output template

Use this exact structure. Adapt depth per scope tier. Default language: match the user's most recent message language (French if the user has been writing in French, English otherwise; mix technical terms as the project does).

```markdown
# Session Review — <short topic in 3-7 words>

## Auto-évaluation : **N/10**

<2-4 sentence rationale citing specific events. State what would have pushed it higher and what would have pushed it lower.>

## Ce qui a bien marché

- **<Pattern name>** — <instance citation> — <why it was valuable>
- ...

## Ce qui a moins bien marché

- **<Event name>** — <turn/file:line citation> — Impact: <cost>. Fix: <specific remediation>.
- ...

## Review des agents / skills   [if applicable]

#### `<agent-name>` — N/10 — <takeaway>

**What I observed:** ...
**Strengths:** ...
**Weaknesses:** ...
**Invocation friction:** ...
**Suggested changes:** ...

<repeat per agent>

## Suggestions d'amélioration

### Workflow (actionable now)
- **<Change>** — <why> — <expected benefit>
- ...

### Pour la génération suivante de modèle
- <pattern hypothesis>
- ...

## Synthèse

<1-3 sentences naming the 2-3 most important takeaways in priority order.>
```

---

## Continuous improvement of the analyzer (living script)

`analyze_session.py` is not frozen — it is a living asset that improves with use. Every time you run this skill, **you are expected to scan for improvement opportunities** and either apply them (when safe and additive) or propose them at the end of the rapport.

This exists because real sessions surface patterns the script author could not anticipate at design time. Compaction, overnight `/loop` runs, worktree choreography, new subagent types, new failure modes — all of these can appear without warning. Freezing the script on day one means every future session wastes a chance to get smarter.

### What counts as an improvement opportunity

While composing the rapport, you are looking for one of these signals:

1. **You had to grep the raw JSONL** to cite something the script should have extracted (e.g., you computed commit counts manually via `git log` because the script doesn't include them).
2. **A heuristic misclassified** a turn that had a clear category (e.g., a legitimate correction was labeled `other` because its char length fell just outside the threshold).
3. **A pattern repeated across the session** that the script's failure-pattern detector didn't catch (e.g., "four consecutive dispatches returned in < 5s each — likely cache hit, worth surfacing").
4. **A new subagent/skill/tool appeared** that the script handles generically but would benefit from a dedicated field (e.g., an MCP tool named `mcp__X__do_thing` that the user invokes heavily this session).
5. **A signal is in the context but absent from the script output** and you used it in the rapport — that's a red flag the script should extract it next time.

If none of these apply, say so explicitly in your improvement section: "No gaps identified this run." That discipline prevents silent drift where the script is never evolved.

### Additive-only contract (non-negotiable)

**The script may only grow richer. It must never get poorer.** Concrete rules:

- **ADD** new keys to the JSON output — never rename or remove existing keys.
- **ADD** new helper functions, classifiers, heuristics — never delete or simplify existing ones in ways that change their output.
- **ADD** new classifier categories — never remove existing ones (even if they seem redundant).
- **WIDEN** heuristic thresholds when a signal was missed — never narrow them except with strong cross-session evidence.
- **PRESERVE** the command-line interface — all existing flags (`--cwd`, `--session`, `--file`, `--json`, `--md`, `--rollup`) must keep their exact meaning.
- **PRESERVE** the output schema — downstream consumers (this skill, future tooling) must be able to read older keys unchanged.

If a change you want to make violates any of these, **do not apply it**. Instead, write a "proposed refactor" note in the improvement section and let the user decide in a future session.

### Improvement workflow

When you identify a safe additive improvement, follow this exact procedure:

1. **Backup first** — never edit without a rollback point:
   ```bash
   cp ~/.claude/skills/session-review/scripts/analyze_session.py \
      ~/.claude/skills/session-review/scripts/.analyze_session.py.bak
   ```
2. **Edit** the script with the minimal additive change. Follow the existing code style and structure. If you add a new extraction function, register it in the main `analyze()` call and add a corresponding markdown block in `render_markdown()`.
3. **Validate JSON schema** — run the script and confirm JSON still parses:
   ```bash
   python3 ~/.claude/skills/session-review/scripts/analyze_session.py --json > /tmp/_session_review_check.json
   python3 -c "import json; d=json.load(open('/tmp/_session_review_check.json')); print('OK,', len(d), 'top-level keys')"
   ```
4. **Validate schema is a superset** — confirm all previously-documented keys are still present. Spot-check: `session`, `scope_tier`, `event_counts`, `turns`, `tool_usage`, `tool_usage_total`, `subagents`, `skills_invoked`, `failure_patterns`, `user_turns_detail` must all exist. If any is missing, restore the backup and abort.
5. **Validate markdown renders** — run `--md` and confirm all previous sections still appear plus your new section.
6. **Bump the version marker** at the top of the script:
   ```python
   # ANALYZER_VERSION = "v1.N — <what you added>, <YYYY-MM-DD>"
   ```
   This provides an audit trail via `grep ANALYZER_VERSION` without needing git.
7. **Delete the backup** only after validation passes: `rm ~/.claude/skills/session-review/scripts/.analyze_session.py.bak`
8. **If validation fails at any step**, restore: `mv .analyze_session.py.bak analyze_session.py` and report the failure in the rapport.

### How to surface the improvement in the rapport

Always include a dedicated section at the end of the rapport (after Synthèse):

```markdown
## 🔧 Script self-improvement

<Choose one of three states:>

**State A — Applied:** During this rapport I noticed [specific gap]. I applied an additive improvement to `analyze_session.py`:
- What was added: <field / classifier / heuristic>
- Why it matters: <one sentence>
- Version bumped to: `vX.Y`
- Validation: ✅ JSON schema superset, markdown renders, backup deleted.

**State B — Proposed, not applied:** I noticed [specific gap]. The safe fix would be <description>, but it requires <reason for not auto-applying: user confirmation / touches existing behavior / needs cross-session data to calibrate>. Proposed diff:
```diff
<actual patch>
```
Apply this in the next session by saying "apply the pending analyzer improvement."

**State C — No gaps:** No improvement opportunities identified this run. Script coverage matched the session's analytical needs.
```

### Examples of safe improvements (for calibration)

**✅ Safe additive**: "During a session with 22 git commits, I computed them manually via `git log --since <first_event> --until <last_event>` to cite a revert map. Next time, the script should extract this automatically." → Add `commits_during_session` field by shelling out to `git log` with the session's time window.

**✅ Safe additive**: "The session had a `PostCompact` hook event that I can see in the JSONL as `type: system`. The script counts system events but doesn't distinguish compaction." → Add `compactions_detected` subfield to `failure_patterns` (or a new `harness_events` block).

**✅ Safe widening**: "A 650-char user turn after 40 tool uses was classified as `new_request_mid_work` but was clearly a correction ('you forgot X, please also do Y'). The threshold at 500 chars is too narrow." → Widen `likely_intervention` to 800 chars AND add a new `correction_keyword_detected` boolean based on text content ("forgot", "oublié", "please also", "don't forget", etc.).

**❌ Not safe**: "The `other` category is rarely useful, I'd remove it." → Never remove a category, even if rarely hit.

**❌ Not safe**: "Rename `tool_usage_total` to `total_tool_calls`." → Breaks schema contract.

**❌ Not safe**: "Narrow `likely_intervention` from 500 to 300 chars because I got a false positive once." → Single-session anecdotes don't justify narrowing heuristics.

### Why this works long-term

Each session leaves the script incrementally smarter while guaranteeing no prior capability is lost. Over 10, 20, 100 sessions, the analyzer converges toward capturing exactly the signals that matter for YOUR specific workflow — not the abstract ones the initial author imagined.

---

## Anti-patterns — do not do these

- **Start with "Great job!" or "Excellent work!"** — start with the score, period.
- **Default to 8-9/10 because "the outcome was delivered"** — user corrections mean 7 at best.
- **Pad sections that do not apply** — a session with no agents does not need an agent review. Write "N/A" or omit.
- **Propose vague improvements** — "be more proactive" is not a proposal. "Add a PreToolUse hook on Edit rejecting modifications to `PIPELINE TASK LIST` block by anyone but orchestrator" is a proposal.
- **Restate what happened** — do not summarize the session. Analyze it. If the user wanted a summary they would have asked for one.
- **Ignore user interventions** — if the user corrected you, that IS the finding. Do not bury it or soften it.
- **Claim strengths you cannot evidence** — "I was careful about X" is only admissible if you can point to a tool call or decision that shows it.
- **Hedge your claims** — "perhaps I could have" → "I should have" with a specific alternative.
- **Write a 5-section rapport for a 10-minute session** — match depth to scope.

---

## How to handle common session shapes

### Session was a long plan execution
Full 5 dimensions. Scope tier: Large. Include a commit list (revert map) in Dimension 1 or Synthèse.

### Session was a bug fix
Scope tier: Small or Medium. Skip agent review unless subagents were used. Focus Dimension 3 on whether the root cause was found or just patched around.

### Session was pure exploration / research
Scope tier: Micro or Small. Dimension 2 focuses on whether the mental model built was accurate; Dimension 3 on dead ends and how to avoid them next time.

### Session was a brainstorming or planning session
Scope tier: Small or Medium. Dimension 4 likely N/A. Focus Dimension 5 on whether the plan is well-calibrated or over/under-scoped.

### Session hit compaction mid-way
Explicitly note compaction as a quality-of-session event. Was context recovery clean via `HANDOFF.md` / `PostCompact` hook, or did state get lost? Score should reflect recovery quality, not punish compaction itself (which is normal).

### Session had no user interventions and completed cleanly
Candidate for 8-9/10. Be especially strict in Dimension 2 — "nothing went wrong" is not the same as "everything went great". Name the SPECIFIC decisions that worked, not the absence of problems.

### Request spans multiple sessions ("analyze the last 10 sessions", "all the threads on this project")
Switch to **Cross-session (project) review mode** (see that section). Run `--rollup` first, drill into the highest-signal sessions with `--session`, score the workflow in aggregate, and rank Dimension 3 findings by recurrence. Do NOT run a single-session rapport per session and concatenate.

---

## Final output self-check

Before returning the rapport, verify:

1. The score is an integer (or .5 increment) between 1 and 10, with a rationale that cites 2+ events.
2. "Ce qui a bien marché" has at least one bullet with a specific citation (file, commit, turn, or tool call).
3. "Ce qui a moins bien marché" has at least one bullet **unless the session was truly trivial**. If you list zero, state explicitly "Aucun point négatif notable identifié sur cette session" and justify briefly.
4. Every "moins bien marché" bullet pairs with a concrete fix proposal.
5. If subagents were invoked, Dimension 4 exists and each agent has its own sub-section with a score.
6. Dimension 5 has at least 2 actionable suggestions (not vague wishes).
7. Language matches the user's language throughout.
8. You did NOT start with "Great work!" or similar praise. You started with the score.

If any of these fail, revise before returning.
