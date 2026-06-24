# Prompt Structure — Ordering, Length, Multi-LLM Delivery, and the Brief-to-Audit Pipeline

How BRIEF mode assembles the final brief: the 6-part order and why, when to write prose vs lists, how long the brief and the persistent design file may be, how to deliver across Claude Code / Codex CLI / Gemini CLI, and how to write design intent so AUDIT/TEST can grade against it. This file OWNS brief *shape and delivery*; it does not re-document the *content* of the design direction (color/type/spacing/motion → `references/spec-language.md`), the archetypes (`references/archetype-library.md`), the anti-slop negatives (`references/anti-slop-rules.md`), token/component bootstrapping or iterative refinement passes (`references/refinement-and-systems.md`).

## Table of Contents
- [The 6-Part Ordering](#the-6-part-ordering)
- [Why This Order](#why-this-order)
- [Prose vs Structured Lists](#prose-vs-structured-lists)
- [Length Calibration by Project Size](#length-calibration-by-project-size)
- [The Instruction-Density Ceiling](#the-instruction-density-ceiling)
- [Context-Window Efficiency](#context-window-efficiency)
- [System vs User Message vs Persistent File](#system-vs-user-message-vs-persistent-file)
- [Multi-LLM Adaptation](#multi-llm-adaptation)
- [Structuring for Long Sessions](#structuring-for-long-sessions)
- [Prompt-Structure Anti-Patterns](#prompt-structure-anti-patterns)
- [Brief-to-Audit Pipeline](#brief-to-audit-pipeline)

---

## The 6-Part Ordering

Deliver every brief in this exact sequence. It consistently produces premium, consistent output.

| # | Part | Contents | Form |
|---|---|---|---|
| 1 | **Project description** | What it is, who it's for. One or two plain sentences. Pin the subject, audience, and the page's single job. | Prose |
| 2 | **Functional requirements** | What it must do: features, entities, roles, views. | List |
| 3 | **Design direction** | Archetype, emotional tone, reference anchors, and color/type/spacing/motion in natural language. | Prose |
| 4 | **Anti-slop constraints** | The negatives, framed as guardrails riding inside the direction (not a bare rules list). | Prose (or short list of hard rules) |
| 5 | **Component guidance** | Premium phrasing only for the components that matter; leave the rest open. | List |
| 6 | **Quality standards / foundations** | Tokens up front, reusable components, light/dark theming, responsive behavior, accessibility baseline. | List |

Section content is owned elsewhere: Part 3 phrasing → `references/spec-language.md` + `references/archetype-library.md`; Part 4 vocabulary → `references/anti-slop-rules.md`; Part 5 premium component phrasing → `references/spec-language.md`; Part 6 token/theming/a11y bootstrapping → `references/refinement-and-systems.md`.

---

## Why This Order

The model must commit to **what** and **for whom** before **how it looks**. Once Parts 1–2 fix the subject and behavior, the aesthetic direction in Part 3 shapes every subsequent visual decision instead of competing with feature parsing. Parts 4–6 then act as the frame around that committed direction: negatives become guardrails on a vision already chosen (a banned font without a positive direction just pushes the model to the next default — pair every negative with a positive per `references/anti-slop-rules.md`), and the standards lock in consistency. Burying the design direction after a wall of technical requirements is the most common structural failure — the model has already defaulted to the median by the time it reads the aesthetic.

---

## Prose vs Structured Lists

Mix the two deliberately within one brief.

| Use **prose** for | Use **lists** for |
|---|---|
| Design direction and emotional tone | Functional requirements |
| Reference anchoring ("the quiet confidence of an instrument built for experts") | Component states (default/hover/focus/disabled/loading) |
| The "visual thesis" — one sentence of mood, material, energy | Quality checklists and foundations |
| Anti-slop framed as a creative-director paragraph | Hard rules a literal-following tool must obey (Codex) |

Prose carries nuance the model interprets richly; lists parse cleanly and are easy to audit later. The canonical shape is **a prose direction paragraph followed by bulleted requirements**.

---

## Length Calibration by Project Size

Match brief size to scope. Do not over-specify a single component; do not under-specify a multi-screen app.

| Scope | Brief form | Design-direction length |
|---|---|---|
| Single component | One tight paragraph (skip the full 6-part skeleton) | A few sentences |
| Full page | The full 6-part structure | `~150–300 words` of design direction |
| Multi-screen app | A **persistent design file** + short per-feature briefs that reference it | Direction lives once in the file; per-feature briefs stay short |

### Persistent design-file length limits

The persistent file (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) must stay lean:

- **`<=200 lines`** per file (Anthropic's recommendation for `CLAUDE.md`).
- Some teams keep theirs **under 60 lines, with `300` as a hard cap** (HumanLayer, citing Claude Code creator Boris Cherny). Treat `300` as the absolute ceiling, not a target.

Past these limits most content is ignored, and Codex truncates context files past its byte limit — long files are not just wasteful, they are silently dropped.

---

## The Instruction-Density Ceiling

There is a hard cognitive limit on how many instructions a model follows, which is the real reason for the line caps above.

- The IFScale benchmark (Jaroslawicz et al., Distyl AI, arXiv:2507.11538) found even the best frontier models reach only **~68% accuracy at a density of 500 instructions**.
- Practitioners therefore conclude frontier models follow **`~150–200` instructions with reasonable consistency**.
- Claude Code's own system prompt already consumes **roughly 50** of those slots before your design file is read.

Operational consequence: keep the always-relevant system file well under the budget, put per-feature detail in the chat message, and put the highest-priority constraints first (instruction-following degrades with length, so the tail of a long file is the least reliable place for a non-negotiable).

> Treat IFScale's numbers as a directional ceiling that will shift as models improve — the *mechanism* (accuracy decays as instruction count rises) holds even as the exact percentages move. Do not cite `68%`/`500` as a fixed property of any specific current model.

---

## Context-Window Efficiency

Split content by how often it changes:

- **Stable design system** → the persistent file. Read every session, cacheable. Keep it in compact lists, not verbose prose, to save tokens.
- **Changing per-feature brief** → the user message. The specific screen being built right now.

Do not paste the entire design system into every chat message — reference the file (`"using the design system, build the settings page"`). Do not put rapidly-changing values in the cached system file, or you defeat caching and let stale values steer.

---

## System vs User Message vs Persistent File

| Channel | Holds | Lifetime |
|---|---|---|
| **Persistent design file** (`CLAUDE.md`/`AGENTS.md`/`GEMINI.md`) | The durable design system: token rules, anti-slop constraints, accessibility baseline — everything that should apply every session. Produced by BRIEF mode; the artifact is `assets/design-intent-template.md`. | Every session |
| **User message** | The specific feature/screen being built right now, referencing the file. | This turn |
| **Skill (`SKILL.md`)** | Reusable aesthetic behavior loaded on demand — where this design-forge module lives. | On invocation |

Because LLMs have no cross-session memory, the persistent design file is the only thing that survives between sessions — it is the mechanism that keeps screen ten on-brand with screen one.

---

## Multi-LLM Adaptation

The **design content is identical** across all three tools — the same archetype, vocabulary, and anti-slop constraints work everywhere because they target shared training-data biases. Only the **delivery mechanism** differs.

| Tool | Native file | Delivery notes |
|---|---|---|
| **Claude Code** | `CLAUDE.md` (merges global `~/.claude/CLAUDE.md`, project root, and subdirectory files) | Most convention-aware — best matches existing patterns; tends to act on questions, so phrase the design file as **standing instructions**, not questions. Layer the official frontend-design skill as the aesthetic floor. |
| **Codex CLI** | `AGENTS.md` (the cross-tool open standard) | Follows `AGENTS.md` more **literally and over longer ranges** — explicit hard rules land especially well (`"No cards by default."`, `"No more than two typefaces."`). Truncates context files past its byte limit. Pair with OpenAI's `frontend-skill`. |
| **Gemini CLI** | `GEMINI.md` | Notably strong at **multimodal input** — can ingest a reference screenshot or Figma mockup alongside the brief, so lean on visual references with it. |

**Cross-tool gotcha:** Claude Code does **not** read `AGENTS.md` natively. To share one file, import it via `@AGENTS.md` inside `CLAUDE.md`, or symlink. Best-practice setup: **one shared `AGENTS.md` as source of truth + a thin tool-specific layer** per tool — never duplicate the same rules across all three files.

> Tool file conventions, skill formats, and instruction-following limits reflect 2026 norms and will move. Verify the current native file name and skill availability per tool before relying on it; never assume a tool reads another tool's file.

---

## Structuring for Long Sessions

So the model keeps referencing the design file across a long autonomous session:

- Keep the file **concise and rule-shaped**: bulleted Do/Don't, named token roles.
- Put the **highest-priority constraints first** — instruction-following degrades with length.
- State the **few non-negotiables explicitly**: `"the accent is rationed to one primary action per screen — this is non-negotiable."`
- **Restate the single most important aesthetic constraint in the per-feature prompt** so it survives context compaction in long sessions.

---

## Prompt-Structure Anti-Patterns

- **Don't bury the design direction** after a wall of technical requirements — the model defaults before it reads it.
- **Don't write a 1,000-line design file** — most is ignored and Codex truncates it.
- **Don't duplicate the same rules** across `CLAUDE.md`, `AGENTS.md`, and the chat — maintain one source of truth.
- **Don't put rapidly-changing values in the cached system file** — they go stale and defeat caching.

---

## Brief-to-Audit Pipeline

A brief should be written so its quality can later be **verified**. The same design intent that steers generation becomes the rubric for AUDIT/TEST. This closes the loop: **brief → build → audit → refine**, all anchored to one documented intent. The persisted artifact is the design-intent file (`assets/design-intent-template.md`); the audit side reads it and scores per `references/scoring-and-report.md`.

### Write design intent as CHECKABLE statements

Never ship intent as vibes. Every line of the intent file must be countable, measurable, or binary-verifiable so AUDIT can pass/fail it.

| Vague (un-auditable) — reject | Checkable (auditable) — write this |
|---|---|
| "use color sparingly" | "one accent color, used only for the single primary action per screen" → AUDIT counts accent uses per screen |
| "numbers should align" | "all numeric data uses tabular figures" → AUDIT inspects the number style |
| "good dark mode" | "dark mode uses at least three distinct elevation surfaces" → AUDIT counts surface levels |
| "accessible" | "every interactive element has a visible focus state" + "AA contrast throughout" → AUDIT tests focus and measures ratios |
| "responsive" | "no horizontal scroll from 375px to 1920px" → AUDIT/TEST checks every breakpoint |

These statements become the audit checklist AUDIT/TEST runs.

### Persist intent so AUDIT/TEST grade against the same source of truth

Persist the brief's aesthetic decisions and constraints in the project's design file. The audit role reads the **same file** and grades the implementation against the stated intent — they share one source of truth. Example finding the loop produces:

> The design-intent file specifies a rationed single accent (one primary action per screen). The build uses `--accent` in six decorative, non-action places (hero divider, two card borders, footer rule, badge background, link underline) → violation of the rationed-accent rule.

### The audit-back-to-brief loop

When AUDIT/TEST flags **recurring drift** — the build keeps falling back to Inter, shadows are inconsistent, the accent keeps leaking — feed those findings back into the design-intent file as **sharper constraints** for the next session. The brief gets more precise exactly where the model drifts. Paste-ready tightening example:

> In the persistent design-intent file, replace the line `"use a distinctive non-default typeface"` with: `"Body and display both use IBM Plex Sans; never use Inter, Roboto, or Open Sans. Elevation uses only the three defined shadow tokens --shadow-1, --shadow-2, --shadow-3 — no ad-hoc box-shadow values."` Keep the rest of the file unchanged.

### Document decisions AND why

Record not just *what* but *why*, so future sessions and audits don't undo intentional choices mistaking them for omissions:

> Headlines are light-weight (300) because authority-through-restraint is the brand voice; the accent is rationed to one action per screen because high information density needs visual calm.

### Cross-session consistency

Because LLMs have no cross-session memory, the design-intent file is the only thing that survives. Keep it current; every new screen request (`"now build the settings page"`) then inherits the full system automatically and stays on-brand. This is what prevents screen ten from looking like a different product than screen one.

### Pipeline anti-patterns

- **Don't write intent so vaguely it can't be audited** (`"make it premium"`).
- **Don't let the brief and the audited build diverge silently** — reconcile through the shared design-intent file.
- **Don't re-explain the system each session** — persist it.
