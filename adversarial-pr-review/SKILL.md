---
name: adversarial-pr-review
description: >-
  Run an ultracode multi-agent ADVERSARIAL review of the working diff BEFORE its pull request is
  opened (Mode A), and resolve code-review bot comments (Codex, CodeRabbit, Greptile...) in one
  bounded pass (Mode B). Use it whenever you are about to create or open a PR ("create a PR", "open a
  PR", "tu peux créer la PR", "ouvre la PR", push a branch for review) or when a bot comments on a PR.
  A global PreToolUse hook BLOCKS `gh pr create` until this skill has validated the current HEAD, so
  reach for it proactively. Two rounds at most, one disposition per finding, then it finishes.
---

# Adversarial PR Review

Attack your own diff before the PR is public, fix only what matters with the smallest change, and finish.
Mode A runs before opening a PR, Mode B on bot comments.

## Hard rules

1. **Round cap: 2 rounds, NOT overridable by any plan or prompt.** A plan that says "until convergence" or
   "until clean" is overruled. A round is one full dimension fan-out plus its Verify step (a per-fix verifier
   is not a round). Round 1 reviews the whole diff. Round 2 reviews the delta since round 1 plus direct
   interactions AND re-judges the round-1 remarks (CHIP, WONT_FIX and HORS included) whose area a fix
   touched. A remark on untouched lines is INVALID. Each round-2 fix gets a fresh verifier that states
   whether the fix changes an existing behaviour or violates a plan prohibition. Never a 3rd round: a P1 still open after round 2 means not converged (rule 4). The cap counts
   per PR across Mode A and Mode B, whoever runs the rounds.
2. **Every finding gets a disposition:** FIX (a P1, or a P2 that serves the chantier intent), CHIP (only if
   the plan says chips are allowed; create it with `spawn_task`), WONT_FIX (one-line reason) or INVALID (its
   facts do not hold). P3 defaults to WONT_FIX or CHIP. A pre-existing finding is never FIX unless P1. A
   remark that contradicts a written decision of the plan or intent sheet (contract, error behaviour,
   prohibition, nice-to-have) is WONT_FIX unless P1. A fix proposal adding more than ~30 lines must say why
   no smaller fix works.
3. **Intent guardian.** If a chantier intent sheet exists (`.chantier/<slug>/intention.md`, or the path on the
   plan's `Fiche d'intention :` line), run the `gardien-intention` agent, fresh context, per
   `~/.claude/skills/brief-chantier/references/gardien-intention.md` (in a cloud clone:
   `.claude/skills/brief-chantier/references/gardien-intention.md`), which also gives what each verdict
   changes. Moment 1: after each round, before any fix. Moment 2: before the PR. Pass it the sheet path, the
   ABSOLUTE repo path, the `git diff --stat <base>...HEAD` output and the remarks (id, severity, summary,
   proposed fix). No sheet: skip it and say so in the report, never block.
4. **Closure never blocks an autonomous run.** After the cap, commit and push, then:
   - converged (no open P1/P2 with disposition FIX): record the sentinel, open the PR, list the open findings
     with their dispositions in its body;
   - not converged: no sentinel, no PR (the guard hook blocks `gh pr create`, even `--draft`). Save the PR
     body, open findings included, to a file and put it in the final report: the human opens the PR.
   No remote: the local branch is the deliverable and the PR body goes in the report; the sentinel is still
   recorded by the legitimate flow when converged. Never wait for a human, never run past the cap, never
   forge the sentinel.
5. **Prefer real execution evidence to more mocked tests.** Prove a finding and a fix by running the real
   thing before adding a simulated test.
6. **Every verification claim names a check actually run, and the check must be capable of proving the
   claim.** "Typecheck clean" needs an unfiltered run (a `| grep` pipe proves only the absence of the grepped
   text). Write the command and its observed output, or "not run". Never ship a behavioral claim the code
   does not structurally guarantee ("updates at midnight"). Report regressions you caused.

## Mode A — Preflight (before opening a PR)

1. Scope the diff (base, `git diff --stat <base>...HEAD`, uncommitted work that will ship), then run the
   local quality gate. Fix red before spending agents.
2. **Round 1** on the whole diff. Disposition every finding, run the guardian (rule 3), apply the FIX items,
   re-run the gate.
3. **Round 2** (rule 1), only if round 1 produced a FIX. Same dispositions and guardian, then fixes.
4. Guardian moment 2, commit the reviewed state, record the sentinel if converged ("Sentinel"), push, open the
   PR. The body states the review's coverage, the gate result, the guardian block and the open findings with
   dispositions.
5. **Read the bot's first pass before any merge** (yours, `ship-pr`'s, or a handover as "ready"): `gh pr view
   <n> --json comments,reviews` and `gh api repos/<owner>/<repo>/pulls/<n>/comments`. Review findings go to
   Mode B. Never merge over an unread comment.

## Mode B — Bot review comments (one pass, not ping-pong)

1. Collect ALL open comments at once and read every one before touching code.
2. Triage each against "What a hunter may report", verify its facts (bots have false positives), give it a
   disposition (rule 2), run the guardian when a sheet exists.
3. Fix the FIX batch together, with the class sweep of engine step 5.
4. Same cap: if a round remains, review the delta (rule 1), otherwise each fix gets a fresh verifier on its
   fix diff, never another full fan-out. Re-run the gate.
5. Commit, record the sentinel if converged, push once, reply on each addressed thread in one line and
   resolve it. A bot 👍 or silence ends it.

## The review engine

**What a hunter may report.** Every remark names the REAL input that triggers it today (existing data, call
or consumer) and its ORIGIN proven base against HEAD: introduced, aggravated or pre-existing. No real input:
P3. Classes: correctness; convention (cite the sibling `file:line`); scale or platform limit (unbounded read,
N+1, over-fetch, external hard limit), judged on the data and callers that exist today; enforcement code adds
wiring (never fires on the repo's real paths, or not called at every integration point) and state-safety
(satisfiable without the protected work, or can block forever). Severity: P1 harms users, data or security,
or breaks a hard limit; P2 is a real defect or idiom/scale violation with a bounded blast radius; P3 is
cosmetic, hypothetical input, or taste.

### 1. Inventory

<!-- runtime-slot:engine-intro -->
With ultracode/workflows enabled (`CLAUDE_CODE_WORKFLOWS=1`) use the **Workflow tool**, otherwise parallel
`Agent` subagents (same shape, fewer agents). Key the choice on the environment, never on the user's wording.
Locally, in auto mode, the Workflow tool launches without a dialog. A cloud routine prompts at every launch
and nobody can click: use the hand-launched fan-out there.
<!-- /runtime-slot:engine-intro -->

Group the paths of `git diff --stat <base>...HEAD` by what they ARE and give each category present at least
one dimension: application code (`correctness`, `scalability`, `platform-limits`), enforcement or tooling code
(`tooling-effectiveness`: a silent bug in a hook, lint or validator disables protection), docs and agent
instructions (`wiring-and-contract`), schema or contract surfaces (`contracts`, `blast-radius`). The PR
headline never picks the dimensions. A new enforcement category makes the diff Large/risky.

Fill `NEW_FILES` with the deduped paths from these two NUL-delimited commands (merge-base sha of the PR base
and HEAD): committed, staged and unstaged additions, then untracked files meant for the PR. Include tests and
fixtures, refresh after each fix round (round 2: only files added since `ROUND1_SHA`), exclude a path only
with a stated reason. If either command fails, preflight is `INCOMPLETE`: diagnose first, never infer an
empty inventory.

```bash
git -C '<absolute repo path>' diff --diff-filter=A --no-renames --name-only -z '<merge-base-sha>' --
git -C '<absolute repo path>' ls-files --others --exclude-standard -z
```

### 2. Hunt

<!-- runtime-slot:template-intro -->
The Workflow template is `references/workflow-template.js`. Fill `REPO`, `NEW_FILES`, `INVENTORY_COMPLETE`,
`ROUND` (and `ROUND1_SHA` for round 2) and trim `DIMENSIONS` to the inventory.
<!-- /runtime-slot:template-intro -->

Each wholly-new file is a named target of one dimension. Hunters return `findings` (each with its `trigger`
and `origin`), `sweeps` (per class or named target: sites actually checked, verdict `clean`, `finding-filed`
+ `findingRef`, or `not-examined` with no sites) and `residualRisk`. Anything investigated but not written
there counts as not done.

<!-- runtime-slot:model-policy -->
**Model policy: no Opus subagents.** Hunters run `model:'sonnet', effort:'medium'`, verifiers `model:'sonnet',
effort:'high'`, pinned in the agent options: a hunt or verify never inherits the session model. The rigor
comes from the protocol (second round on the delta, executed proofs, independent verify), not from the model
tier. The Verify step is not optional.
<!-- /runtime-slot:model-policy -->

### 3. Verify adversarially

One independent verifier per finding tries to refute it: it checks the facts, the trigger and the origin
(base against HEAD), sets `mustFix`, cites the repo idiom or limit for a non-correctness finding and lists
`checksPerformed` as "command → observed output". Dedupe confirmed findings by file and overlapping line.

**The hand-launched fan-out drops the Workflow tool, never a phase.** Agents return the same `findings`,
`sweeps`, `residualRisk` and `checksPerformed`; a report without them is not done. Apply the EVIDENCE FORM,
SHARED MACHINE and SHELL clauses of the template's hunt prompt, use the two inventory commands above (tests
and fixtures included), name every wholly-new file as a target, run one verifier agent per finding. Your own
re-read counts only with its `checksPerformed` printed in the thread. Reconcile by hand as the template does.

### 4. Read the results

Read `notExaminedSweeps`, `uncoveredTargets` (a named target no sweep quoted: silence, not a pass),
`inconsistentSweeps` and `residualRisks` every round. Each is an open question: re-ask that agent or examine
it yourself with `checksPerformed` in the thread. No PASS while open.

### 5. Disposition and minimal fix

Disposition every confirmed finding (rule 2), run the guardian (rule 3), fix only the FIX items. Every fixer
prompt imposes: minimal fix covering the whole family of the defect, no validation outside the modified path.
For each FIX sweep its class across the ENTIRE diff: literal twins (same signature, grep it) and structural
twins (the same invariant at another integration point, the same function's other code paths). Emit the enumeration table yourself: every grep hit with a disposition (swept,
has-guard, not-in-class and why).

**Parallel fixers on a shared tree.** Use worktree isolation (each fixer gets `isolation: 'worktree'`, merged
back at round close-out), or put this clause verbatim in every fixer prompt: *"The working tree is SHARED with
other fixers running now. Never run `git reset`, `git stash`, `git checkout --`, `git clean`, or any command
that reverts files you did not edit. Edit only your assigned files."*

<!-- runtime-slot:agent-deaths -->
**Agents dying mid-run (rate limits).** Do not restart the round or respawn agents one by one. Relaunch the
SAME Workflow script with `resumeFromRunId: <runId>`: finished agents return from cache, only the dead ones
re-run. A dead fixer is continued with `SendMessage` using its agentId, context intact.
<!-- /runtime-slot:agent-deaths -->

## Sentinel

The global hook `adversarial-pr-guard.mjs` blocks `gh pr create`, `gh pr ready` and MCP pull-request creation tools unless the **current HEAD** (with `--head <branch>`: that branch's tip) is recorded as reviewed.

Contract: the file `<git-dir>/.adversarial-review-passed`, `<git-dir>` being the output of
`git rev-parse --absolute-git-dir` in the reviewed checkout (for a worktree `.git/worktrees/<name>/`, never
the shared `.git`), whose first token is the reviewed commit sha. Record it at the end of EVERY converged
review (Mode A, Mode B, the Trivial tier, a review run outside this engine), never for one that did not
converge. Use a standalone Bash command with an explicit `cd` into the reviewed repo or worktree root, never
chained with the PR command or a push:

```bash
cd <absolute-root-of-the-reviewed-repo-or-worktree> && git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/.adversarial-review-passed"
```

The `cd` is not optional: from the wrong cwd the command forges a pass for a diff nobody validated. Confirm
the sha equals the HEAD you reviewed and, in Mode A, cite it in the PR body. A later commit makes the
sentinel stale and the hook re-blocks. Never write it into a `.git` that is not the reviewed checkout's own,
never write it to skip the review (a security incident). If the hook blocks despite a genuine completed
review, stop and report an infra failure.

**After the last round the cap allows**, re-record without a new round only if
`git diff <last-reviewed-sha>..HEAD` holds nothing but (a) fixes of confirmed findings, each with its own
fresh verifier, (b) quality-gate repairs changing no reviewed behavior, (c) a conflict-free base merge
(`git show --remerge-diff <merge>` prints no hunk), (d) the removal of the chantier intent sheet
(`.chantier/<slug>/intention.md`). A fresh verifier classifies every hunk into exactly one of these; an
unclassifiable hunk means not converged.

**An external pass** (a `codex exec` review) is an input to a round, not a round. It counts only if it
reviewed the whole diff against the PR base (cite its output file and HEAD sha), you read its full output,
each finding got a disposition with its own fresh verifier, and you emitted your own class-sweep table and
`checksPerformed`.

## Scaling & cost

Trivial (typo, comment, one line, config): no fan-out, read the diff, run the gate, record the sentinel.
Small (a few files): 2-3 dimensions, single-vote verify. Medium (feature, several files): 4-5 dimensions.
Large/risky (auth, schema, public API, shared dispatch, migration): all dimensions, 3-vote verify.

**Converged** means: round 1 confirmed no FIX (no round 2), or round 2 confirmed nothing FIX, or the last
round the cap allows confirmed FIX items and each is fixed, passed its own fresh verifier on the fix diff, and
the gate is green, or the Trivial tier read the diff in full with a
green gate. No open `notExaminedSweeps`, `inconsistentSweeps` or `uncoveredTargets`: close it in a round
already owed, or by examining it yourself.

A verifier that rejects a fix, or finds a regression in it, buys one more fix and one fresh verifier for that
finding. If that fails too, or a P1/P2 FIX stays unfixed, the review has NOT converged: no sentinel, and rule
4 applies. Always report the residual risk: what was swept, what the last round still surfaced, what was not
re-verified.
