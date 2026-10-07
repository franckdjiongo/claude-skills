---
name: adversarial-pr-review
description: >-
  Adversarial multi-agent review of the diff BEFORE a pull request is opened (Mode A), and one bounded pass over bot review comments (Mode B). Use when about to create or open a PR ("ouvre la PR") or when a bot comments. A hook BLOCKS PR creation until a PASS is recorded for HEAD. Two rounds max.
---

# Adversarial PR Review

Attack your own diff before the PR is public, fix only what matters with the smallest change, and finish. `scripts/review-run.mjs` owns the bookkeeping (repo and HEAD, round count, verdict, sentinel). You own the judgment: finding bugs and choosing dispositions.

## Hard rules

1. **Round cap: 2 rounds, NOT overridable by any plan or prompt** ("until convergence" is overruled). A round is one full dimension fan-out plus its Verify step; a per-fix verifier is not a round. Round 1 reviews the whole diff. Round 2 reviews the delta plus direct interactions AND re-judges the round-1 remarks (CHIP and WONT_FIX, not HORS) whose area a fix touched; a remark on untouched lines is INVALID. Each round-2 fix gets a fresh verifier that states whether it changes an existing behaviour or violates a plan prohibition. Never a 3rd round: a P1 open after round 2 means not converged. The cap counts per PR across Mode A and B; the script enforces it.
2. **Every finding gets one disposition:** FIX (a P1, a P2 that serves the chantier intent, or a non-pre-existing finding the end user sees whose fix fits in ~10 lines), CHIP (only a user-visible effect, and only if the plan allows chips; `spawn_task`), WONT_FIX (one-line reason) or INVALID (its facts do not hold). A pre-existing finding is never FIX unless P1. A remark contradicting a written decision of the plan or intent sheet is WONT_FIX unless P1. A fix over ~30 lines must say why no smaller one works. The script rejects what breaks this.
3. **Intent guardian.** If an intent sheet exists (`.chantier/<slug>/intention.md`, or the path on the plan's `Fiche d'intention :` line), run the `gardien-intention` agent, fresh context, per
   `~/.claude/skills/brief-chantier/references/gardien-intention.md` (in a cloud clone:
   `.claude/skills/brief-chantier/references/gardien-intention.md`), which gives what each verdict
   changes. Moment 1: after each round, before any fix, on new remarks only. Moment 2: before the PR. Pass it the sheet path, the ABSOLUTE repo path, the FULL `git diff <base>...HEAD` and the remarks. `finalize` refuses a PASS while a sheet exists without `--guardian aligned|drift`. No sheet: say so, never block.
4. **Closure never blocks an autonomous run.** After the cap, commit, push, `finalize`. PASS: open the PR with the open findings and their dispositions in its body. FAIL: no sentinel, so no PR (the guard hook blocks it, even `--draft`): save the PR body, open findings included, to a file and put it in the final report, the human opens the PR. Never wait for a human, run past the cap or forge the sentinel.
5. **Prefer real execution evidence to more mocked tests.**
6. **Every verification claim names a check actually run that can prove it.** "Typecheck clean" needs an unfiltered run (a `| grep` pipe proves only the absence of the grepped text). Write the command and its observed output, or "not run".

## The script

`node <this skill's folder>/scripts/review-run.mjs <command>`, from the reviewed checkout or with `--repo <absolute path>`. It resolves repo, worktree and HEAD itself (no hand-typed `cd`).

| Command | Does |
|---|---|
| `start [--base <ref>]` | Prints HEAD, base, `newFiles` (the inventory), `newFilesSinceLastRound`, intent sheets, rounds left, the round-file shape. |
| `round <file> [--triage]` | Records a round from a JSON file (its shape is printed by `start`). `--triage` records bot-comment dispositions once the cap is spent. |
| `fix <id...>` | Marks FIX findings fixed, after the fix commit and its fresh verifier. |
| `cross [--author claude\|codex]` | Billed read-only review by the other model family, once per HEAD (`--author` is your own runtime). Findings get ids `X<n>`, each needing a disposition. |
| `finalize --gate <cmd>` | Runs the gate, checks convergence, writes `verdict.json`, and the sentinel only on PASS for HEAD. Also `--guardian`, `--delta-ok "<note>"`, `--trivial`, `--no-gate "<reason>"` (recorded as skipped, never as a gate pass). Exit 0 PASS, 1 FAIL. |
| `check [--head <sha>]` | Exit 0 only for a PASS on that HEAD; 3 means absent or stale. |

Your report cites `verdict.json`, not your own words.

## Mode A: before opening a PR

1. `start`. Run the local quality gate; fix red before spending agents.
2. **Round 1** on the whole diff: disposition, guardian, `round`, commit the FIX items, `fix`, re-run the gate.
3. **Round 2**, only if round 1 committed a fix: same steps on the delta.
4. Guardian moment 2, commit, `finalize --gate '<the gate>'`, push, open the PR. The body states the coverage, the gate result, the guardian block and the open findings with dispositions.
5. **Read the bot's first pass before any merge**: `gh pr view <n> --json comments,reviews` and the PR's review comments via `gh api`. Its findings go to Mode B.

## Mode B: bot review comments (one pass, not ping-pong)

1. Read ALL open comments before touching code. Triage each against that `CONTEXT` block, verify its facts (bots have false positives), give it a disposition, run the guardian when a sheet exists.
2. Fix the FIX batch together, with the class sweep of engine step 5.
3. If `start` shows a round left, review the delta as round 2. Otherwise each fix gets a fresh verifier, never another fan-out, and dispositions go in with `round --triage`.
4. Commit, `fix`, `finalize`, push once, reply on each addressed thread in one line and resolve it. A bot 👍 or silence ends it.

## The review engine

**What a hunter may report** (trigger, origin proven base against HEAD, classes, P1-P3 severity) is the `CONTEXT` block of `references/workflow-template.js`. Read it before any triage, Mode B included.

### 1. Inventory

<!-- runtime-slot:engine-intro -->
With ultracode/workflows enabled (`CLAUDE_CODE_WORKFLOWS=1`) use the **Workflow tool**, otherwise parallel
`Agent` subagents (same shape, fewer agents). Key the choice on the environment, never on the user's wording.
Locally, in auto mode, the Workflow tool launches without a dialog. A cloud routine prompts at every launch
and nobody can click: use the hand-launched fan-out there.
<!-- /runtime-slot:engine-intro -->

Give each category of the diff at least one dimension: application code (`correctness`, `scalability`, `platform-limits`), enforcement or tooling code (`tooling-effectiveness`), docs and agent instructions (`wiring-and-contract`), schema or contract surfaces (`contracts`, `blast-radius`). The PR headline never picks them. New enforcement code makes the diff Large/risky.

`NEW_FILES` is the `newFiles` list from `start` (round 2: `newFilesSinceLastRound`). If `start` fails, preflight is `INCOMPLETE`: never infer an empty inventory.

### 2. Hunt

<!-- runtime-slot:template-intro -->
The Workflow template is `references/workflow-template.js`. Fill `REPO`, `NEW_FILES`, `INVENTORY_COMPLETE`,
`ROUND` (and `ROUND1_SHA` for round 2) and trim `DIMENSIONS` to the inventory.
<!-- /runtime-slot:template-intro -->

Each wholly-new file is a named target of one dimension. Hunters return `findings`, `sweeps` (per class or target: sites checked, verdict `clean`, `finding-filed` + `findingRef`, or `not-examined`) and `residualRisk`. What is not written there counts as not done.

<!-- runtime-slot:model-policy -->
**Model policy: no Opus subagents.** Hunters run `model:'sonnet', effort:'medium'`, verifiers `model:'sonnet',
effort:'high'`, pinned in the agent options: a hunt or verify never inherits the session model. The rigor
comes from the protocol (second round on the delta, executed proofs, independent verify), not from the model
tier. The Verify step is not optional.
<!-- /runtime-slot:model-policy -->

### 3. Verify adversarially

One independent verifier per finding tries to refute it: it checks the facts, the trigger and the origin, sets `mustFix`, cites the repo idiom or limit for a non-correctness finding and lists `checksPerformed` as "command → observed output". Dedupe confirmed findings by file and line.

**The hand-launched fan-out drops the Workflow tool, never a phase.** Agents return the same `findings`, `sweeps`, `residualRisk` and `checksPerformed`. Apply the EVIDENCE FORM, SHARED MACHINE and SHELL clauses of the template's hunt prompt, use the `newFiles` list from `start`, run one verifier agent per finding. Your own re-read counts only with its `checksPerformed` in the thread.

### 4. Read the results

Read `notExaminedSweeps`, `uncoveredTargets` (silence, not a pass), `inconsistentSweeps` and `residualRisks` every round; re-ask or examine each. What stays open goes in `openQuestions`: no PASS while any remains.

### 5. Disposition and minimal fix

Disposition every confirmed finding, run the guardian, `round`, then launch ONE fixer per round. It writes only in the chantier's repo (absolute path in its prompt), only the FIX remarks, minimal and covering the whole family of the defect. For each FIX sweep its class across the ENTIRE diff: literal twins (grep the signature) and structural twins (same invariant, another integration point). Emit the table yourself: every grep hit with a disposition (swept, has-guard, not-in-class and why).

<!-- runtime-slot:agent-deaths -->
**Agents dying mid-run (rate limits).** Do not restart the round or respawn agents one by one. Relaunch the
SAME Workflow script with `resumeFromRunId: <runId>`: finished agents return from cache, only the dead ones
re-run. A dead fixer is continued with `SendMessage` using its agentId, context intact.
<!-- /runtime-slot:agent-deaths -->

## Sentinel

The global hook `adversarial-pr-guard.mjs` blocks `gh pr create`, `gh pr ready` and MCP pull-request creation tools unless the **current HEAD** (with `--head <branch>`: that branch's tip) is recorded as reviewed. It reads `<git-dir>/.adversarial-review-passed`. Only `finalize` writes it, only on PASS: never by hand, never to skip a review (a security incident). A later commit makes it stale. If the hook blocks despite a PASS, stop and report an infra failure.

**After the last round the cap allows**, `finalize --delta-ok "<note>"` re-records without a new round only if `git diff <last-reviewed-sha>..HEAD` holds nothing but (a) fixes of confirmed findings, each with its own fresh verifier, (b) quality-gate repairs changing no reviewed behavior, (c) a conflict-free base merge (`git show --remerge-diff <merge>` prints no hunk), (d) the removal of the intent sheet. A fresh verifier classifies every hunk; an unclassifiable one means not converged.

**An external pass** (`cross`, or a `codex exec` review) is an input to a round, not a round. It counts only if it reviewed the whole diff against the PR base and each finding got a disposition with its own fresh verifier.

## Scaling & cost

Trivial (typo, comment, one line, config): no fan-out, read the diff, `finalize --trivial`. Small: 2-3 dimensions, single-vote verify. Medium: 4-5. Large/risky (auth, schema, public API, shared dispatch, migration): all dimensions, 3-vote verify, one `cross` run.

`finalize` computes **converged**: every FIX fixed, no open P1 or question, every cross finding dispositioned, a green gate, no HEAD movement after the last round without `--delta-ok`. A verifier that rejects a fix buys one more fix and one fresh verifier; if that fails too, FAIL (rule 4). Always report the residual risk: what was swept, what still surfaced, what was not re-verified.
