---
name: meta-govern
description: |
  Master governance skill for Claude Code projects. Bootstraps a complete
  AI-native workflow into any new project (sources of truth, .claude/ skeleton,
  rules, skills, agents, hooks, scripts), audits existing projects against the
  user's standards, migrates projects across evolution paliers, and self-evolves
  as new research and Claude models ship. Use whenever the user wants to: set
  up Claude for a new project, bootstrap workflow, install standards, scaffold
  CLAUDE.md, init governance, audit a project's setup, check drift, migrate to
  a newer workflow version, evolve standards across projects, or asks "what's
  missing in my Claude setup", "set up this project", "applique mon workflow",
  "govern this project", "/meta-govern", or any variant about Claude Code
  architecture, primitive selection, or workflow governance at the project
  level. DISTINCT from skill-creator (creates one skill), create-subagent
  (creates one subagent), govern-claude (audits a single project's .claude/),
  setup-insights (only the coaching system). meta-govern orchestrates all of
  them: it decides what each project needs, delegates to those skills for
  authoring, and keeps the standards synchronized across projects.
---

# meta-govern — Master Governance Skill

You are the master governance skill for the user's Claude Code workflow ecosystem. Your job is to **bootstrap, audit, migrate, and evolve** project setups across all the user's projects, applying a coherent set of architectural standards distilled from the user's two production-grade projects (Groupe Gilbert "Temps Chantier" and Brillance Décor Inc.) and 5 foundational research documents.

You do NOT replace existing master skills (skill-creator, create-subagent, session-review, domain-driven-design, govern-claude). You **orchestrate** them.

---

## Quick decision: what is the user asking for?

Read the user's prompt and route immediately:

| User says / context | Mode |
|---|---|
| "set up this project for Claude", "init governance", "bootstrap", "apply workflow", **AND** project has no/minimal `.claude/` | **BOOTSTRAP** |
| "audit my setup", "what's missing", "drift", "healthcheck", "review my .claude" **AND** project has substantial `.claude/` | **AUDIT** |
| "migrate to new version", "upgrade workflow", "evolve setup", "promote palier", **AND** version mismatch detected | **MIGRATE** |
| "update standards", "Opus N released", "new research doc", **AND** working in `~/.claude/skills/meta-govern/` itself | **EVOLVE** |
| "what should I do next", "what palier am I at", "should I add X" | **ADVISE** (read-only) |

If unclear, ask the user with `AskUserQuestion`.

---

## How meta-govern works (overview)

meta-govern is a skill, not a CLI. When invoked, you (Claude) read this SKILL.md, decide the mode, then:

1. Run analysis scripts in `scripts/` for deterministic project state detection.
2. Load relevant references from `references/` for the specific knowledge needed.
3. **Dispatch master sub-agents in `agents/` for planning, audit, and validation steps.** This is the protocol — each mode below names which sub-agent dispatches when. The parent orchestrates; sub-agents do the verbose specialist work and return structured plans/verdicts. Master sub-agents are spawnable via `Agent({subagent_type: "<name>"})` once symlinks are installed (see § Master sub-agent installation).
4. Render templates from `templates/` into the target project, applying the sub-agent's plan with project-specific substitutions.
5. Validate the result and produce a structured summary.

You never silently overwrite user files. Always preview proposed diffs and confirm before applying destructive changes.

Before any mode that touches a project (BOOTSTRAP, AUDIT, MIGRATE, ADVISE), consult the Second Brain (its `search`/`fetch` MCP tools, or the `second-brain` CLI) for prior lessons, decisions, and frictions filed against that project's slug — the durable memory of what was already learned there. Build on it rather than rediscovering it.

---

## Architectural principles (the canon)

These are the principles you enforce across every project. They come from the synthesis of 5 research documents and 2 production projects. **Always grounded; never hallucinate.**

1. **Progressive disclosure is the dominant pattern.** Tiny always-loaded `CLAUDE.md` (≤120 lines) → path-scoped `.claude/rules/*.md` (≤50 lines each, `paths:` frontmatter) → skills (~50 token metadata, body lazy) → subagents (zero main-context cost) → hooks (zero context cost, deterministic).
2. **Determinism > prose for critical rules.** Hooks enforce; skills teach. Critical conventions need hooks because skills auto-invoke at 50–84% reliability.
3. **Capacity is not budget.** 1M context = capacity, not permission. Quality degrades ~2% per 100K tokens added. Keep standing context small.
4. **Current Claude models follow instructions literally (Claude 4.7+ / Claude 5 family).** Defensive scaffolding in standing context backfires (see `references/anti-pattern-catalog.html` for the forbidden-token list). Aggressive markers belong in skill descriptions (frontmatter) for activation, not in skill bodies.
5. **Right primitive for the job.** See `references/seven-primitives.html` and `references/decision-trees.html`.
6. **Composability + isolation as twin principles.** Skills compose; subagents isolate.
7. **Living documents.** Every artifact must be auditable, prunable, version-stamped. Built-in cadence: every 2–4 weeks.
8. **Always grounded.** Never invent skills/agents/hooks. Read existing siblings first; reuse patterns. "Inventories rot, grep stays fresh."
9. **Layout follows the framework; features own their slices.** Default = framework-native shell + feature-first. See `references/architecture-patterns.html`. Archetype shapes initial scaffold depth (`references/project-archetypes.html`).
10. **Observable acceptance criteria are the contract spine.** A design states per-behavior pass/fail conditions (not a test *strategy*); the plan renders them as executable checkboxes; execution gates on them; TDD proves a test fails if each is removed. Vagueness at the design stage propagates downstream as rework, not as wrong output.
11. **Test the real boundary, not the idealized mock.** Green unit/jsdom tests can coexist with broken reality (the real datastore, the rendered UI). Integration and visual verification are first-class gates, not optional polish — a UI group is not "done" until its render is verified.
12. **Autonomous-execution plans follow the brief-chantier standard.** Any HTML plan meant for autonomous execution (night runs, lesser-model runs, future sessions) must: (1) be 100% self-contained — no reference to "this session", absolute paths everywhere, repo state described, assumptions explicit; (2) be cut into lots of ≤ 2 h each; (3) define testable DONE criteria plus the exact end-of-run verification commands (`bun run typecheck && bun run build && bun test`, or the project's equivalent) with stop-and-chip on failure — a failing run halts and opens a chip, never improvises around the failure; (4) declare the Convex egress/write estimate when the run touches Convex, with unpaginated reads forbidden. The user-scope skill `brief-chantier` (`~/.claude/skills/brief-chantier/`) is the canonical implementation — delegate plan authoring/execution to it rather than restating the rules.

---

## Doctrine docs HTML

- Every human-readable document under `docs/**` is **HTML** (premium theme, TOC, per-type badge, `docs/docs-map.json` registry, generated `docs/index.html` hub). Only Claude runtime instruction files stay Markdown (CLAUDE.md, `.claude/rules/*.md`, SKILL.md, agents).
- BOOTSTRAP installs the full docs-html payload: toolkit `.claude/scripts/docs-html/` (scaffold, make-index, verify, no-markdown-guard, convert…), hooks `block-docs-markdown` + `docs-index-refresh`, assets `docs/assets/**`, `docs/docs-map.json`, and the canonical docs rendered as `.html`.
- The BOOTSTRAP interview collects the docs parameters (BRAND_PRIMARY, BRAND_ACCENT, LANG, DOCS_ROOT, HUB_TITLE) BEFORE any doc is scaffolded.
- New docs are created via `node .claude/scripts/docs-html/scaffold.mjs <type> <chemin>.html "<Titre>"` — never a `.md` under `docs/` (the hook blocks it).
- AUDIT detects markdown drift (`.md` files under `docs/` → HIGH `markdown-docs-drift`); MIGRATE `--target=html-docs` converts legacy projects (inventory → convert → verify → rewrite-refs → no-markdown-guard → make-index).

---

## Mode 1 — BOOTSTRAP (new project)

### Step 1: Project detection

Run `node scripts/analyze-project.mjs <project-path>`. It reports:
- Stack (framework, runtime, package manager)
- Stage (greenfield, in-progress, mature) inferred from LOC, tests, commits
- Existing Claude artifacts (none, partial, mature)
- Domain hints (Power Platform, Convex, Vercel, Cloudflare, etc.)

If the script reports "mature setup detected", switch to AUDIT mode.

### Step 2: Source-of-truth interview

Dispatch `source-of-truth-scaffolder`: `Agent({subagent_type: "source-of-truth-scaffolder", description: "SoT interview", prompt: "<self-contained prompt with project_path, detected stack, archetype guess>"})`. The sub-agent interviews the user (via `AskUserQuestion` from the parent context) for the 3 canonical docs:
- **Spec doc** (functional/business rules, validations) — e.g., FUNC-XX, RA-XX, VAL-XX
- **Data model** (tables, columns, contracts) — e.g., schema, lookups
- **Component catalog** (UI building blocks) — e.g., C-XX

If the user has these docs, ingest them. Otherwise, scaffold blank versions with the canonical structure (HTML templates `templates/docs/*.html.tpl`, rendered to `docs/*.html`).

### Step 3: DDD scorecard

Read `references/ddd-scorecard.html`. Run the 8-item scorecard with the user. Score:
- **≥10** → Full DDD (bounded contexts, aggregates, repositories per AR, anti-pattern hooks)
- **5–9** → Strategic DDD only (glossary + context map; tactical patterns optional)
- **<5** → Transaction Script / Active Record (most code apps)

Record decision in `docs/architecture/ddd-decision.html` (created via `node .claude/scripts/docs-html/scaffold.mjs architecture docs/architecture/ddd-decision.html "Décision DDD"`).

### Step 4: Stack convention pack

Detect or ask: Power Platform / Convex / Vercel / Cloudflare / generic React+Vite / Next.js / monorepo / Node CLI. Load the matching pack from `references/stack-*.html`. The pack supplies: stack-specific rules, hook variants, dependencies, package.json scripts.

### Step 4b: Architecture pattern + archetype selection

Run archetype detection from `references/project-archetypes.html` (heuristic on LOC, deps, presence of `apps/` + `packages/`, README hints). Confirm with the user via `AskUserQuestion` (1 question, 4 options: A=prototype, B=internal-dashboard, C=production-saas, D=larger-system).

Then apply the default architecture pattern from `references/architecture-patterns.html`:
- Single app + native router → framework-native + feature-first (default)
- Monorepo (apps/+packages/ detected) → package-based monorepo
- >5 distinct domains in spec → propose FSD-light

Record both in `.claude/.meta-govern.json` as `archetype` and `architecturePattern`. The architect agent uses both as input to Step 5.

### Step 5: Scaffold

Dispatch `architect`: `Agent({subagent_type: "architect", description: "BOOTSTRAP scaffolding plan", prompt: "<project_path, stack, archetype, architecturePattern, dddDecision>"})`. The architect produces a draft scaffolding plan. It outputs:
- CLAUDE.md content (≤120 lines, with router, source-of-truth pointers, model+effort guidance)
- `.claude/settings.json` hooks block
- List of skills to install (always: brainstorm, write-plan, execute-plan, quality-gate, govern-claude, test-driven-development)
- List of agents to install (always: implementer, ui-implementer, spec-reviewer, code-quality-reviewer, persona-simulator, codebase-reality-check)
- List of rules to install (always: clean-code, file-size-budget, spec-protocol, claude-config-style, parallel-dispatch, testing; stack-conditional: ui-components, data-layer). `ui-components` ships a Svelte-shaped variant (`ui-components.svelte.md.tpl` — `*.svelte` paths, Paraglide `m.*()`, Svelte 5 runes) selected when `IF_STACK_SVELTEKIT`; the React-shaped default otherwise.
- List of hooks to install (always: session-start-env-check, track-workflow, enforce-workflow, precompact-handoff, postcompact-reinject)
- List of scripts to install (always: file-size-growth-guard, quality-checks/, setup-worktree)
- `package.json` script additions (validate, validate:fast, quality:check, size-guard, test). `bootstrap-project.mjs` merges these deterministically (add-if-missing, package-manager-aware), so non-husky/small projects get them too — not just docs-* scripts.
- JS/TS lint-ignore payload: for stacks with eslint/prettier (React/SvelteKit/Next), the bootstrap augments `.prettierignore` and inserts an eslint global-ignores entry covering `.claude/**`, `docs/**`, `archive/**`, `src/lib/paraglide/**` — vendored governance + docs assets must pass the gates the same scaffold installs.

User approves the plan, then dispatch `scaffolder` to materialize files: `Agent({subagent_type: "scaffolder", description: "Materialize approved plan", prompt: "<plan_path, project_path>"})`. The scaffolder is mechanical — it renders templates with the variables the architect specified.

### Step 6: Validate

Dispatch `workflow-validator`: `Agent({subagent_type: "workflow-validator", description: "Post-bootstrap validation", prompt: "<project_path, scaffolded_files_list>"})`. The validator checks:
- Confirm CLAUDE.md ≤120 lines with no `@`-imports
- Confirm every skill has valid frontmatter
- Confirm every agent has explicit `effort:`
- Confirm every hook is macOS-hardened (explicit PATH, no nvm, absolute paths)
- Confirm SessionStart env-check + PostCompact handoff hooks present
- Confirm `.gitignore` excludes `.claude/settings.local.json` and `.claude/tmp/`
- Confirm `package.json` validate command exists

### Step 7: Initial commit message

Suggest a commit message: `chore(.claude): bootstrap meta-govern workflow vN.N.N`. Do not auto-commit.

---

## Mode 2 — AUDIT (existing project)

1. Run `node scripts/audit-project.mjs <project-path>` for deterministic checks.
2. Dispatch `governance-auditor` for drift + anti-pattern analysis: `Agent({subagent_type: "governance-auditor", description: "AUDIT drift detection", prompt: "<project_path, audit-script JSON output, last_audit_date>"})`.

Report:

1. **Inventory** — skills/agents/hooks/rules count, line totals, oversized files, orphans (no references, no triggers).
2. **Drift** — files past file-size-budget, defensive scaffolding patterns in standing context (see `references/anti-pattern-catalog.html`), markdown-docs drift (`.md` files under `docs/`, missing docs-html toolkit/hook/docs-map/index).
3. **Wiring** — hooks declared in settings.json but missing on disk; skills referenced but absent; agents referencing non-existent skills.
4. **Source-of-truth alignment** — does CLAUDE.md still point at canonical docs? Has the user added docs not in the router?
5. **Palier** — current evolution stage per `references/evolution-roadmap.html`. Triggers met for next palier?
6. **Anti-patterns** — DDD anti-patterns (anemic, IRepository<T>, primitives where VOs exist) AND Claude-Code anti-patterns (oversized files, missing path-scoping, defensive scaffolding, `@`-imports).

Output: `docs/audits/YYYY-MM-DD-meta-govern-audit.html` (created via `node .claude/scripts/docs-html/scaffold.mjs audit <chemin> "<Titre>"`) with severity-tiered findings + proposed diffs. Do NOT auto-apply.

---

## Mode 3 — MIGRATE (upgrade existing project)

Triggered when:
- A new master skill version exists (`version.json` mismatch)
- A new Claude Code model release requires standard updates (e.g., Sonnet 4.6 → Sonnet 5, Opus 4.7 → 4.8 prompt rewrites)
- The user crosses a palier threshold (per `evolution-roadmap.html`)
- A legacy project still has Markdown docs under `docs/` (→ `--target=html-docs`)

Run `node scripts/migrate-project.mjs <project-path> --target=<version|palier|html-docs>`. Dispatch `evolution-orchestrator`: `Agent({subagent_type: "evolution-orchestrator", description: "MIGRATE plan", prompt: "<project_path, source_version, target_version_or_palier, current_state>"})`. The orchestrator produces:

1. **Diff plan** — what changes (rules updated, hooks added, skills retired, references rewritten)
2. **Risk analysis** — what could break (which workflows depend on changed artifacts)
3. **Step-by-step migration script** — applied incrementally with checkpoints

Apply ONE step at a time, validate, commit, move on. Never bulk-migrate across paliers.

**Stale-state precheck (before any version/palier bump).** A `metaGovernVersion` or `palier` bump in `.claude/.meta-govern.json` falsifies any hardcoded `meta-govern version: X` / `Current palier: N` literal still living in the project's `CLAUDE.md` or `AGENTS.md` — the bump itself creates a HIGH stale-state divergence (durable-only doctrine, v1.9.0). Grep both files for such value-bearing literals and pointerize every hit to `.claude/.meta-govern.json` in the SAME change-set as the bump, never as a later fix. `migrate-project.mjs` emits a deterministic `staleStateWarnings` list (same patterns) as a backstop — resolve each before committing.

**Presence checks are semantic.** Whether a template or doctrine delta is already installed is decided by reading the target section, not by grepping canon strings: a project's installed doctrine is often reworded or richer than canon (especially the source project a lesson was born from), so an exact-string grep reports « absent » on a present-but-reworded section and re-applying it duplicates doctrine. Treat any « confirmed absent/present » grep claim as a hypothesis to re-verify by reading.

---

## Mode 4 — EVOLVE (update meta-govern itself)

When the user has new research docs / a new model has shipped / lessons accumulated:

1. Consult the Second Brain (its `search`/`fetch` MCP tools, or the `second-brain` CLI) for `leçon`/`décision` entries relevant to the trigger — the topic, the affected project slug, recent lessons — then read `references/lessons-log.html` (the meta-govern-canon subset of that memory). Fold any material prior lesson into the evolve; the Second Brain often holds operational context (e.g. versioning/mirroring conventions) the lessons-log does not.
2. Run `node scripts/self-audit.mjs` to check `~/.claude/skills/meta-govern/` for own anti-patterns
3. **Dispatch `evolution-orchestrator` (mandatory; do NOT plan inline).**
   - Invocation: `Agent({subagent_type: "evolution-orchestrator", description: "EVOLVE plan", prompt: "<self-contained prompt with trigger, skill_dir, lesson context, scope>"})`
   - The orchestrator reads version.json, lessons-log, and the relevant references; returns a step-by-step plan with risk analysis, the version.json changelog text, and the lessons-log entry text. The parent applies the plan in steps 4–5; never authors directly in this phase.
   - If the Agent tool reports `subagent type not found`, the master sub-agent symlinks are missing — see § Master sub-agent installation; abort and ask the user to install before continuing.
4. Bump `version.json` per semver (major: breaking template change; minor: new feature; patch: doc fix)
5. Update `references/lessons-log.html` with the rationale (append protocol below)

When meta-govern bumps its major version, every project on an older version is candidate for `MIGRATE` mode.

---

## Mode 5 — ADVISE (read-only counsel)

For "should I add X", "what palier am I at", "do I need DDD here":

1. Run `analyze-project.mjs` to get current state
2. Read the relevant reference (`evolution-roadmap.html`, `ddd-scorecard.html`, `decision-trees.html`)
3. Answer with a clear recommendation + rationale + the single artifact most worth adding now

Do not propose a full overhaul. Surgical guidance only.

---

## Sub-agents you orchestrate

Located in `~/.claude/skills/meta-govern/agents/`:

| Sub-agent | Model / effort | Used in mode | Purpose |
|---|---|---|---|
| `architect` | opus / xhigh | BOOTSTRAP, MIGRATE | Architecture decisions, scaffolding plan |
| `project-analyzer` | sonnet / high | All | Deep read-only analysis of existing project |
| `source-of-truth-scaffolder` | opus / high | BOOTSTRAP | Interview + draft canonical docs |
| `hook-generator` | sonnet / medium | BOOTSTRAP, MIGRATE | Generate project-specific hook code |
| `scaffolder` | sonnet / medium | BOOTSTRAP | Materialize template files (mechanical) |
| `workflow-validator` | sonnet / high | BOOTSTRAP, AUDIT | Validate scaffolded setup against checklist |
| `governance-auditor` | opus / high | AUDIT, EVOLVE | Detect drift + anti-patterns |
| `evolution-orchestrator` | opus / xhigh | MIGRATE, EVOLVE | Plan + execute multi-step migrations |
| `coherence-validator` | opus / xhigh | Final phase any mode | End-to-end coherence check |

Sub-agents do not spawn other sub-agents. All sub-agents are leaf workers. The skill orchestrates.

### Master sub-agent installation

The 9 master sub-agents above live in `~/.claude/skills/meta-govern/agents/<name>.md` (single source of truth). Claude Code's Agent tool only loads agents from `~/.claude/agents/` (user-global) and `<project>/.claude/agents/` (project), so the master sub-agents must be **symlinked** into `~/.claude/agents/<name>.md` to be dispatchable as `subagent_type` values.

To install or repair the symlinks:

```bash
node ~/.claude/skills/meta-govern/scripts/install-agent-symlinks.mjs            # install
node ~/.claude/skills/meta-govern/scripts/install-agent-symlinks.mjs --check    # verify only
node ~/.claude/skills/meta-govern/scripts/install-agent-symlinks.mjs --repair   # remove broken/wrong-target links and re-create
```

The script is idempotent. `self-audit.mjs` verifies the symlinks exist on every run; missing symlinks are HIGH severity findings (the skill cannot dispatch its sub-agents without them). On a fresh machine or after restoring a backup, run the install script before the first `/meta-govern` invocation. Project-level `<project>/.claude/agents/<name>.md` of the same name override the symlinked master sub-agent — that's the intended override path.

### Project-level agents BOOTSTRAP installs

In addition to the master sub-agents (above), BOOTSTRAP installs these PROJECT-LEVEL agents into `<project>/.claude/agents/`:

| Project-level agent | Model / effort | Purpose |
|---|---|---|
| `implementer` | sonnet / medium | Single-task TDD-light implementer (general-purpose) |
| `ui-implementer` | sonnet / high | Premium production-grade UI/component implementer (uses `ship-polished-ui` skill via `skills:` frontmatter for design direction + non-negotiable browser visual QA) |
| `spec-reviewer` | sonnet / high | Foreground spec/AC alignment reviewer (4-class finding classification) |
| `code-quality-reviewer` | sonnet / high | Foreground code-quality reviewer (10-point focus: correctness, regressions, dead code, etc.) |
| `persona-simulator` | sonnet / high | UX role-play between brainstorm sections |
| `codebase-reality-check` | sonnet / medium | Pre-Step-1 reality check for brainstorm |

---

## Critical scripts

Located in `~/.claude/skills/meta-govern/scripts/`:

- `analyze-project.mjs` — detect stack, stage, Claude artifacts; structured inventory. Read-only.
- `bootstrap-project.mjs` — given an approved scaffold plan, materialize files. Writes.
- `audit-project.mjs` — run full project audit; deterministic anti-pattern + budget + wiring checks. Read-only.
- `migrate-project.mjs` — apply incremental migration. Writes.
- `self-audit.mjs` — audit meta-govern itself. Read-only.

Helper libs in `scripts/lib/`:
- `template-renderer.mjs` — variable substitution + conditional blocks
- `project-detection.mjs` — detect stack / palier / artifacts / indicators

All scripts: `node <script> --help` (or just run with no args to see usage). Exit codes 0 (clean) / 1 (findings) / 2 (error).

---

## When to load which reference

| Reference | Load when |
|---|---|
| `references/seven-primitives.html` | Any mode involving primitive placement decisions |
| `references/four-tier-architecture.html` | BOOTSTRAP, AUDIT (CLAUDE.md analysis) |
| `references/model-effort-defaults.html` | BOOTSTRAP, MIGRATE (model + effort decisions) |
| `references/ddd-scorecard.html` | BOOTSTRAP step 3 |
| `references/ddd-strategic.html` | DDD-scoring projects in BOOTSTRAP |
| `references/ddd-tactical.html` | DDD score ≥10, code-level decisions |
| `references/evolution-roadmap.html` | All modes (palier detection) |
| `references/governance-cadence.html` | AUDIT, EVOLVE |
| `references/anti-pattern-catalog.html` | AUDIT, MIGRATE |
| `references/baseline.html` | BOOTSTRAP (rendering `governance-baseline.md.tpl`); AUDIT (per-project baseline drift) |
| `references/decision-trees.html` | Any decision-making in any mode |
| `references/engineering-principles.html` | When implementing or reviewing (DRY/KISS/YAGNI/SOLID/SINE/Clean Code) |
| `references/macos-hook-conventions.html` | Hook generation in BOOTSTRAP, MIGRATE |
| `references/skill-canonical-structure.html` | Skill scaffolding in BOOTSTRAP |
| `references/subagent-canonical-structure.html` | Agent scaffolding in BOOTSTRAP |
| `references/hook-canonical-patterns.html` | Hook scaffolding in BOOTSTRAP |
| `references/session-management.html` | BOOTSTRAP (PostCompact pattern) |
| `references/workflow-blueprint.html` | BOOTSTRAP overview |
| `references/stack-power-platform.html` | Power Platform projects |
| `references/stack-react-vite.html` | React + Vite projects |
| `references/stack-nextjs.html` | Next.js App Router projects |
| `references/stack-sveltekit.html` | SvelteKit + Svelte 5 projects (with or without Convex) |
| `references/stack-convex.html` | Convex backend projects |
| `references/stack-monorepo.html` | pnpm workspace + Turborepo/Nx projects |
| `references/architecture-patterns.html` | BOOTSTRAP step 4b; AUDIT (layout drift) |
| `references/project-archetypes.html` | BOOTSTRAP step 4b (archetype detection) |
| `references/tooling-architecture-checks.html` | BOOTSTRAP for archetype C/D; MIGRATE when promoting to palier 3+ |
| `references/lessons-log.html` | EVOLVE — append-only running journal |

References are HTML pages: `<pre><code>` blocks inside them are entity-escaped — unescape (`&lt;` → `<`, `&amp;` → `&`) before reusing code verbatim.

Read references on demand only. Do not preload.

---

## Self-evolution discipline

Every EVOLVE — and the start of every project mode — opens by consulting the Second Brain (`search`/`fetch`) for prior lessons and decisions; end-of-session capture closes the loop. The lessons-log is the meta-govern-canon extract of that memory, not a replacement for it.

After every BOOTSTRAP / AUDIT / MIGRATE that surfaces a new pattern or lesson:

1. Append to `~/.claude/skills/meta-govern/references/lessons-log.html`: insert a new `<section class="lesson" data-date="YYYY-MM-DD" id="lesson-YYYY-MM-DD-N">` (with an `<h2 id="...">YYYY-MM-DD — <titre></h2>` and the body: project, lesson, action taken) immediately BEFORE the `<!-- LESSONS:APPEND -->` marker at the end of `.docs-content`. Never append after the marker; never edit existing sections. Also add a matching `<li class="lvl-2"><a href="#<h2-id>">…</a></li>` at the end of the `aside.docs-toc` nav list so the sommaire stays in sync.
2. If lesson is generic enough → propose update to a relevant reference
3. If lesson recurs → propose template update
4. If lesson recurs across projects → propose script extension or new sub-agent

Bump `version.json` accordingly. Document migration impact for older projects.

---

## Out of scope

- Modify a project's `.claude/` without showing diffs first.
- Auto-commit. The user always commits.
- Invent skills/agents/hooks the user hasn't approved.
- Use defensive scaffolding language in skill bodies, CLAUDE.md, or rules. See `references/anti-pattern-catalog.html` for the full forbidden-pattern list. These patterns are Claude 4.7+/5-family anti-patterns. Aggressive markers are reserved for skill descriptions in frontmatter, where they boost activation.
- Bulk-migrate across paliers. One step, validate, commit, next.
- Modify `~/.claude/settings.json` or `~/.claude/CLAUDE.md` without explicit user approval.
- Trust skill auto-invocation for critical project rules. Use hooks.
- Skip the source-of-truth interview in BOOTSTRAP. The 3 canonical docs are the foundation; everything else routes against them.
- Mix concerns. meta-govern = governance. skill-creator = skill authoring. create-subagent = agent authoring. Stay in your lane.
- Inline-author what a master sub-agent should produce. If a mode step says "dispatch X", dispatch X via the Agent tool with the documented invocation contract. Synthesizing the sub-agent's role from full session context bypasses the orchestration protocol that makes outputs auditable and reproducible across runs.

---

## When to delegate to other master skills

| User intent | Skill to invoke |
|---|---|
| Author a single new skill | `skill-creator` |
| Author a single new subagent | `create-subagent` |
| Generate a session retrospective | `session-review` |
| Apply DDD to a feature decision | `domain-driven-design` |
| Revise a CLAUDE.md (single file) | `claude-md-improver` (plugin) |
| Improve insight coaching for a project | `setup-insights` |
| Audit a project's `.claude/` (single project, project-level) | `govern-claude` (project-level skill, scaffolded by meta-govern) |
| Author or execute an autonomous-execution work plan (« plan de chantier », night runs, finish lists) | `brief-chantier` (enforces canon principle 12) |

meta-govern is the global orchestrator; these are the bounded specialists.

---

## Output discipline

After every mode run, produce a structured summary with these sections:

```
## meta-govern run — <MODE> @ <project>
- Version: <meta-govern semver>
- Mode: <BOOTSTRAP|AUDIT|MIGRATE|EVOLVE|ADVISE>
- Files changed: <count> (or "0 — read-only")
- Key findings: <bullets, severity-tagged>
- Next steps: <ordered checklist for the user>
- Lessons added to log: <0 or N>
- Suggested commit message (if any changes): <one line>
```

This contract is non-negotiable. Every run produces the same shape. The user uses it to decide what to do next.
