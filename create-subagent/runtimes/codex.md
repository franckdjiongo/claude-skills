Codex text of each runtime slot of ../SKILL.md. Built by
scripts/build-runtime-variant.mjs (root of claude-skills); format described in its header.

<!-- slot:intro -->
Scaffold a single, well-formed Codex custom agent with sensible defaults. The skill walks through three phases: **triage** (is a sub-agent really the right primitive?), **interview** (collect what's needed to choose defaults), and **scaffold** (write the file plus a smoke test).

The goal is one focused TOML file at `.codex/agents/<name>.toml` (project) or `~/.codex/agents/<name>.toml` (user-global), not a sprawling configuration. Sub-agents are most useful when small and pointed.
<!-- /slot:intro -->

<!-- slot:compare -->
Skills and custom agents are sometimes confused because both carry instructions for the model. They aren't the same thing:

| | Skill | Custom agent |
|---|---|---|
| Where it runs | The current conversation | A fresh sub-agent thread started with `spawn_agent` |
| What returns to the parent | Inline instructions, side effects in this turn | Only the agent's final message |
| Context cost on the parent | Body is loaded into the active window when triggered | Near-zero — the work happens elsewhere |
| Best for | Reusable procedures, reference packs, bounded how-tos | Verbose research, isolated review, long-running specialists |
| File location | `.agents/skills/<name>/SKILL.md` | `.codex/agents/<name>.toml` |
| Authoring tool | `skill-creator` | this skill |

If the user describes "a way to teach Codex how to do X every time", that's a skill. If they describe "a worker that goes off, does X, and reports back", that's a custom agent. If they describe "several agents collaborating across sessions", that's out of scope here.
<!-- /slot:compare -->

<!-- slot:triage-fit -->
- **Custom agent fits when:** the task is self-contained, produces verbose intermediate output, runs read-only research, or needs a stricter sandbox than the main conversation.
<!-- /slot:triage-fit -->

<!-- slot:triage-team -->
- **Something else fits better when:** the user describes workers that span separate sessions or keep running after this one ends. A Codex sub-agent lives inside the session that spawned it; it can spawn its own sub-agents only up to the depth set by `[agents] max_depth` in the Codex config.

If a custom agent is wrong, say so plainly and redirect:
- *"This sounds more like a skill — the work needs to happen in your current conversation. Want me to use `skill-creator` instead?"*
- *"This needs workers that outlive one session; this skill only writes a single custom agent that a session spawns."*
<!-- /slot:triage-team -->

<!-- slot:interview-fields -->
1. **Name** — lowercase-hyphenated, e.g. `migrator`, `plugin-reviewer`, `formula-auditor`. If the user proposes spaces, capitals, or underscores, normalize and confirm. The file is `<name>.toml` and its `name` key holds the same value.
2. **One-paragraph purpose** — what the agent does and what it returns. This becomes the `description` key, which the parent reads when choosing an `agent_type`. Keyword-dense and explicit beats elegant.
3. **Scope** — project (`.codex/agents/`) or user (`~/.codex/agents/`). Default to project unless the user clearly wants it across all their projects.

Helpful but not always required (use sensible defaults if the user doesn't care):

4. **Does it only read, or does it write files?** — drives `sandbox_mode` (`read-only` or `workspace-write`).
5. **Should its changes stay quarantined?** — Codex has no per-agent worktree setting: write "work in a git worktree you create" into `developer_instructions` when that matters.
6. **Does it need to remember things across runs?** — Codex has no per-agent memory directory: name a file it reads first and updates last in `developer_instructions`.
7. **Are there skills it should read first?** — list their `SKILL.md` paths in `developer_instructions`.
8. **Is the job much lighter or heavier than the session?** — drives `model_reasoning_effort`, and the model only through a routing file (see "Model routing" below).
<!-- /slot:interview-fields -->

<!-- slot:scaffold -->
Produce one regular TOML file at the chosen path. Keep `developer_instructions` short and focused: every line earns its place.

Read `references/codex-agents.md` before writing: it holds the keys the installed codex-cli validates, the TOML pitfalls and three templates (read-only researcher, reviewer, implementer). Ignore `references/frontmatter.md` and `references/templates.md`: they describe the other runtime's agent format.

### Default choices and why

| Key | Default | Reasoning |
|---|---|---|
| `name`, `description`, `developer_instructions` | required | codex-cli refuses an agent file whose `name` is empty or whose `description` or `developer_instructions` is blank. |
| `model` | omit (inherits the session) | Written only through a routing file, never from memory (see below). |
| `model_reasoning_effort` | omit (inherits) | When the routing file registers the agent, copy the role's effort exactly (its check enforces it). Otherwise omit it, or set `low`, `medium` or `high` when the job is clearly lighter or heavier than the session. Never above `high` for a sub-agent. |
| `sandbox_mode` | `read-only` for reviewers, auditors and researchers; omit for implementers (valid values: `read-only`, `workspace-write`, `danger-full-access`) | Codex has no per-agent tool allowlist: the read-only sandbox is the fail-safe equivalent. Never `danger-full-access` without a stated reason and a warning to the user. |
| `nickname_candidates` | omit | Cosmetic display names. Add only if the user asks. |

### Model routing

Never write a model name from memory in the agent or in this skill. A model is chosen in a routing file the user maintains:

1. Read `<repo>/.codex/model-routing.json` for a project agent, `~/.codex/model-routing.json` for a user agent.
2. If that file has an `agents` map (agent name to role) and the repo has a routing check (for example `node .agents/scripts/check-codex-model-routing.mjs`): add `"<name>": "<role>"` with the role that fits the job, copy that role's `model` and `reasoningEffort` into the TOML's `model` and `model_reasoning_effort`, run the check and show its PASS. The TOML values are a projection of the routing file; the check is what keeps them in sync.
3. Otherwise (no file, no `agents` map, or no check) omit `model`: nothing would keep a copied name in sync. Tell the user the agent inherits the session model.

### Plugins and shared copies

This skill writes project or user agents only. If the user wants the agent inside a Codex plugin, say that this skill does not cover that and write it at project or user scope. When one source repo feeds agents to several projects, each consumer gets a regular copy whose first line is `# GENERATED by <source-project>/<path>`: Codex lists a symlinked agent but `spawn_agent` refuses it ("agent type is currently not available").

### File template

The minimal valid form:

```toml
name = "<kebab-case-name>"
description = "<one paragraph, keyword-dense: what the agent does, when to spawn it, what it returns>"
developer_instructions = """
<what the agent is, the workflow it follows, what it must not do, and the report format it returns>
"""
```

A typical read-only researcher:

```toml
name = "dataverse-migrator"
description = "Dataverse migration planner. Spawn when the user asks to migrate, port, or restructure Dataverse tables, columns, relationships, or solution layers. Returns a migration plan; never writes."
sandbox_mode = "read-only"
developer_instructions = """
You are a senior Power Platform engineer specializing in Dataverse migrations.

When invoked:
1. Read the current solution structure under `solutions/` and the migration target under `docs/migration/`.
2. Read `docs/migration/lessons.md` if it exists: prior patterns and known gotchas.
3. Produce a migration plan: phases, tables touched, breaking changes, rollback notes.
4. Stop and return the plan. Do not edit files or spawn other agents.

Report format:
- Plan: numbered phases with one-line rationale each
- Risks: bulleted list, severity-tagged
- Open questions: what you'd need clarified before executing
"""
```
<!-- /slot:scaffold -->

<!-- slot:body -->
### `developer_instructions` — what to write

`developer_instructions` is the agent's job description, given to it on top of the session's own instructions. Treat it as a focused job description, not a procedures manual.

Include:

- **Identity** — one sentence on what the agent is.
- **Trigger conditions** — when it gets spawned. (Mostly redundant with `description` but reinforces behavior.)
- **Workflow** — numbered steps the agent follows on each invocation.
- **Constraints** — what it must not do (e.g., "do not run `terraform apply` without confirmation").
- **Report format** — exactly what the parent wants back. The parent reads only the agent's final message; structuring it improves downstream usefulness.

Avoid:

- Repeating Codex's general behavior — the agent already inherits the platform and the repo's `AGENTS.md`.
- Long lists of tools — the sandbox and the session decide what the agent can run.
- Defensive scaffolding ("double-check before returning"). Only include verification steps when they actually matter.
- Spawning descendants: say "do not spawn other agents" unless the job needs it.
<!-- /slot:body -->

<!-- slot:smoke-test -->
After writing the file, start a new Codex session so the agent is discovered (a project agent loads only when Codex trusts the project), then hand the user a concrete invocation that exercises it. Codex spawns a sub-agent only when asked to, so name it:

1. **In a session** — the parent calls `spawn_agent` with `agent_type: "<name>"`.
   ```
   Spawn the <name> agent to <small task that exercises the workflow>, then show me its answer.
   ```
2. **Non-interactive** — the same request through `codex exec`.
   ```
   codex exec "Spawn the <name> agent to <small task>, then print its answer."
   ```

A full-history fork inherits the parent's agent type: the parent must spawn without a full-history fork for `agent_type` to apply: `fork_turns: "none"`, or with the older multi-agent tools, no `fork_context`.

Pick the smoke test that proves the agent's *typical* invocation works — not its hardest possible task. The point is to confirm the file loads, the agent type is accepted, and the workflow runs end-to-end.
<!-- /slot:smoke-test -->

<!-- slot:validation -->
Before telling the user the agent is ready, run through:

- [ ] The file is a regular file at `.codex/agents/<name>.toml` or `~/.codex/agents/<name>.toml`, not a symlink (`test -f <path> && ! test -L <path>`).
- [ ] It parses: `python3 -c "import tomllib,sys; d=tomllib.load(open(sys.argv[1],'rb')); print(sorted(d))" <path>`.
- [ ] `name` equals the file name without `.toml`, and no other agent with that name exists in the project or user folder (`ls .codex/agents ~/.codex/agents`).
- [ ] `description` and `developer_instructions` are not blank, and `description` says when to spawn the agent and what it returns.
- [ ] `model` is absent, or comes from the routing file and the routing check printed PASS.
- [ ] `sandbox_mode` is `read-only` for an agent that must not write.
- [ ] codex-cli loads it: in a new session (or `codex exec`) no "Ignoring malformed agent role definition" warning names the file. `tomllib` does not catch an unknown key or an invalid value, which make Codex skip the whole file.
- [ ] `developer_instructions` is under ~80 lines unless complexity truly demands more.
- [ ] The smoke test was provided to the user, with the reminder to start a new Codex session.
<!-- /slot:validation -->

<!-- slot:scope -->
The user's word for "globally" usually means `~/.codex/agents/<name>.toml`. That's the right call when the agent's value is the same across every codebase the user opens (e.g., a personal `mac-debug` agent, a `git-historian`, a generic `pdf-extractor`). If the agent's knowledge is codebase-specific (it understands *this* repo's conventions, *this* team's style guide, *this* product's data model), put it in the project at `.codex/agents/` and check it into version control. Don't reuse a name across scopes: a project agent silently shadows a user agent with the same name, and only two files with the same name in one folder trigger a warning.
<!-- /slot:scope -->
