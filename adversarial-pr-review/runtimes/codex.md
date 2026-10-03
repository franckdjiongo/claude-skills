Codex text for each runtime slot of ../SKILL.md. Built by
scripts/build-runtime-variant.mjs (claude-skills root); see its header for the format.

<!-- slot:engine-intro -->
The engine is a **find → adversarially-verify → (you) fix** fan-out. Codex cannot run the Workflow template
below by itself, so the engine is always the hand-run fan-out: parallel `spawn_agent` calls (one per dimension),
`wait_agent` for all of them, then one verifier `spawn_agent` per finding. The Workflow template
below is still the exact specification of what each agent receives and returns; you execute it by
hand. Never scale the fan-out down because the user didn't name a multi-agent review: the size of
the diff decides (see "Scaling & cost").
<!-- /slot:engine-intro -->

<!-- slot:template-intro -->
Workflow template (a Claude Code script; on Codex it is the specification you run by hand, as
follows):

1. Resolve the two roles first and write the result in your thread:
   `node <this skill's folder>/scripts/resolve-codex-models.mjs --repo '<absolute repo path>'`.
   It prints `{ "review-hunter": {model, effort, source, notes}, "review-verifier": {...} }` from
   the repo's `.codex/model-routing.json`, then `~/.codex/model-routing.json`, then the session
   model in `~/.codex/config.toml`. Fill `HUNTER` and `VERIFIER` below with it. Never pass an
   effort above `high` to a sub-agent and never omit `reasoning_effort`: the session default here
   is higher than that, and an agent spawned without an effort inherits it.
2. Fill `NEW_FILES`, `INVENTORY_COMPLETE` and each dimension's `targets` exactly as the script
   does (the round-robin of wholly-new files included).
3. Each `agent(prompt, opts)` call in the Hunt phase is one
   `spawn_agent({ task_name: "hunt_<dimension key, underscores>", agent_type: "default", fork_turns: "none",
   model: HUNTER.model, reasoning_effort: HUNTER.effort, message })`, where `message` is the prompt string the script
   builds, followed by: "Reply with ONLY one JSON object matching this schema:" and the `FINDINGS`
   schema. Do not invent `agent_type` names: the role lives in the message. Codex limits how many
   agents run at once: spawn in waves, and when `spawn_agent` answers "agent thread limit reached",
   wait for a running agent to finish, then spawn the refused one again. Never drop a dimension.
   `wait_agent` (e.g. `timeout_ms: 60000`) only says that some agent finished; keep a checklist of
   your `task_name`s and keep waiting until every one has delivered its final JSON reply.
4. For every finding returned, spawn one verifier the same way (`task_name: "verify_<n>"`) with `VERIFIER.model`,
   `VERIFIER.effort`, the verify prompt of the script and the `VERDICT` schema.
5. Parse each reply as JSON. A reply that is not valid JSON, or lacks `sweeps`, `residualRisk` or
   `checksPerformed`, is NOT DONE: ask that agent again, never fill the gap yourself.
6. Compute the return block of the script by hand from the replies (dedupe, `notExaminedSweeps`,
   `inconsistentSweeps`, `uncoveredTargets`, `residualRisks`, verdict) and write the resulting
   fields in your thread.
<!-- /slot:template-intro -->

<!-- slot:model-policy -->
**Model policy (Franck's decision, 2026-10-03):** hunters and verifiers run the SAME model,
resolved at use time by `scripts/resolve-codex-models.mjs` (step 1 above); this skill never names a
model, so a new model generation is one edit to a routing file. Effort comes from the routing
file's role entry, else `medium` for hunters and `high` for verifiers, and never above `high` for a
sub-agent. Pass both `model` and `reasoning_effort` on every `spawn_agent` (if the resolver found no
model at all, its note says so: omit `model` and keep `reasoning_effort`); never let a hunt or a
verify inherit the session's model or effort. If `spawn_agent` rejects the resolved model, retry
once without `model` (session default) but keep `reasoning_effort`, and say so in your thread. A
blind replay of 12 reviews on a cheaper model (2026-09-09) showed the rigor comes from the protocol
(second round on the fix diff, executed proofs, independent verify), not from the model tier. The
second round on the fix diff and the Verify step are NOT optional: both runs that skipped Verify
missed boundary defects (state overwritten by a PUT body, the "item" half of a fix) that
independent verification exists to catch.
<!-- /slot:model-policy -->

<!-- slot:workflow-prompts -->
<!-- /slot:workflow-prompts -->

<!-- slot:agent-deaths -->
Long verify fan-outs WILL occasionally lose agents to provider rate limits (16 verifiers died in one
field round). Do not restart the round from scratch:

- **Hunters or verifiers died** → keep every JSON reply you already have and re-spawn ONLY the dead
  ones, with the same message, model and effort. Codex keeps no run cache, so the replies in your
  thread are the cache: never re-run an agent whose reply you hold.
- **A fixer died or stalled** → if your session exposes a tool to message a running agent, send it
  the next step; otherwise spawn a fresh fixer whose message carries the finding, the files the dead
  fixer already edited (`git status` / `git diff` in its worktree) and the instruction to continue
  from that state, so it neither re-pays the whole context ramp blindly nor double-edits.
<!-- /slot:agent-deaths -->

<!-- slot:anti-pattern-deaths -->
- ❌ Restarting a round from scratch (or respawning agents one by one) after rate-limit deaths. → ✅
  Keep the replies you hold and re-spawn only the dead agents; restart a dead fixer from its
  worktree state, not from zero.
<!-- /slot:anti-pattern-deaths -->
