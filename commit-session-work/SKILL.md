---
name: commit-session-work
description: >
  Finish Git work safely at the end of a Claude Code session: commit, and — depending on the mode — integrate, push, and clean up. Three modes. Default (no argument) is SCOPED: commit only the work attributable to THIS session, land it on the primary branch when the work lives on a session-created branch/worktree, push it, and safely clean disposable session artifacts. Pass `local` / `commit` / `commit-only` for a LOCAL commit of session work on the current branch with NO fetch, integration, push, upstream change, or cleanup. Pass `all` / `tout` / `clean` for FULL-TREE: commit every non-ignored change and push. Use this skill whenever the user is wrapping up and wants their work committed — triggers include "commit this session", "committe ce qu'on vient de faire", "commit the work", "fais juste un commit local", "just commit locally", "ne pousse pas", "don't push", "mets ça dans main", "land this on main", "commit tout", "commit everything", "rends la branche clean", "clean up the branch", or simply "/commit-session-work". Reach for it proactively when the user signals a session is done and their changes should be saved to Git. It always audits ownership, ignore candidates, repository policy, secrets, and validation gates before mutating anything, and never force-pushes, rewrites history, discards changes, or commits secrets.
---

# Commit Session Work

Finish Git work safely, using the mode selected by the invocation. Preserve user data, repository policy, and remote history in every mode. Never force-push, rewrite history, discard changes, expose secrets, or bypass a required red gate.

Invoking this skill authorizes only the actions selected by its mode. Scoped and Full-tree modes authorize ordinary commits, safe integration into the resolved target branch, a normal push, and cleanup of session-created worktrees or local temporary branches after proof that their useful content is retained. Local-commit mode authorizes only an in-place commit on the current branch. No mode authorizes force-push, remote-branch deletion, destructive cleanup of ambiguous content, or bypassing a protection rule enforced by the repository or runtime.

"This session" means the current Claude Code conversation, including any subagents/threads it delegated to. Attribution is read from the conversation, not from timestamps, file names, or `git status` alone.

## 1. Select the mode

The mode comes from the first word of the skill argument, normalized to lowercase. An absent or unrecognized argument is **Scoped**.

| Argument | Mode | Scope | Branch |
|---|---|---|---|
| *(none)* | Scoped | Only work attributable to this session and its delegated threads/subagents | Primary branch when the source is session-created; otherwise the current checkout |
| `local` | Local commit | Session-attributable work only | Current branch only; no integration or push |
| `commit` | Local commit | Alias of `local` | Same as `local` |
| `commit-only` | Local commit | Alias of `local` | Same as `local` |
| `all` | Full tree | Every tracked and untracked non-ignored change | Primary branch when source is session-created; otherwise current branch |
| `tout` | Full tree | French alias of `all` | Same as `all` |
| `clean` | Full tree | Same as `all`, with clean source/target/disposable-session postconditions | Same as `all` |

`clean` is not a dry run — it commits and pushes the full tree. Local-commit mode is strict: do not fetch, resolve or switch to the primary branch, integrate, push, set/change an upstream, create or remove a branch/worktree, or clean the source checkout.

In Full-tree mode, do not ask which files to include. Decide `.gitignore` autonomously, commit everything else from the source checkout, and push the resolved target. If a hard safety or repository-policy blocker remains, stop and report it without asking a question.

Before any Git mutation, capture the source checkout path, `INITIAL_BRANCH=$(git branch --show-current)`, `INITIAL_HEAD=$(git rev-parse HEAD)`, `git rev-parse --git-common-dir`, and `git worktree list --porcelain`. A detached `HEAD` is supported in push-enabled modes, but is a hard blocker in Local-commit mode because there is no current branch to receive the commit.

Outside Local-commit mode, resolve `PRIMARY_BRANCH` without assuming `main`:

1. use an explicit repository-policy target when one exists;
2. otherwise use the branch named by `refs/remotes/origin/HEAD`;
3. otherwise use an existing local `main`, then an existing local `master`;
4. if still ambiguous, stop before mutation.

Resolve the checkout that owns `PRIMARY_BRANCH` from `git worktree list --porcelain`. If no checkout owns it, create a temporary integration worktree in a narrowly scoped `mktemp -d` location and remove it after successful landing. If the local primary branch is missing but its verified remote-tracking branch exists, create the local tracking branch only in that integration worktree. Classify the source as primary checkout, session-created secondary worktree, session-created branch, detached session worktree, or ambiguous/user-owned checkout. Use conversation evidence for ownership; never infer ownership only from a branch name or filesystem path.

## 2. Read repository policy and Git state

From the repository root:

- Read `CLAUDE.md`, `AGENTS.md`, and any governing instructions. Honor project rules (e.g. `.claude/rules/`), required gates, and commit conventions.
- Run `git status --short --branch`, `git diff --name-status`, and `git ls-files --others --exclude-standard`.
- Inspect `git worktree list --porcelain` and the current branch. Inspect target branches, merge-base, source-only commits, and both checkout states only when integration may be required.
- Inspect `git config user.name` / `git config user.email` without changing identity unless policy requires it. Inspect `git remote -v` and upstream configuration only in push-enabled modes.
- **Account / SSH alias (this machine).** This laptop has three GitHub accounts disambiguated by SSH remote aliases — `git@github-perso:…` (default, `franckdjiongo`, `djiongoelly@yahoo.fr`), `git@github-automintech:…` (`automintech@gmail.com`), and `git@github-cobacam:…` (`ca.cobacam@gmail.com`). The commit identity follows the remote alias automatically via `~/.gitconfig`. In push-enabled modes, confirm the remote is an SSH alias URL (never `https://github.com/…`, never a `gh` account switch) and that `git config user.email` matches the intended account before pushing. A mismatch between the resolved account and repository policy is a hard blocker.
- Inspect all untracked paths before staging.
- Check that no credential, private key, deployment token, secret value, or generated secret file would be staged. Never print secret values.

## 3. Build the scope ledger

### Scoped and Local-commit modes

Read the current conversation and record exact paths in four groups:

1. **Owned** — created or changed by this session, including completed delegated threads and subagents.
2. **Mixed** — changed by the session but already dirty, generated from unrelated inputs, or also changed by the user.
3. **Unrelated** — dirty before the session or produced by another task outside the request.
4. **Ignore candidates** — disposable local artifacts that should never be versioned.

Never infer ownership from timestamps, names, or `git status` alone. Leave an ambiguous material path unstaged and report it.

### Full-tree mode (`all`, `tout`, `clean`)

Inventory the same categories for awareness, but do not use ownership to exclude changes. Include every tracked modification, tracked deletion, and untracked path unless it is safely ignored or blocked by security/policy. An unknown non-secret path that is not clearly disposable must be committed rather than left dirty.

## 4. Resolve landing and transfer session work

### Local-commit mode (`local`, `commit`, `commit-only`)

Keep the current checkout and current named branch exactly as they are. Do not resolve a landing branch, transfer commits, fetch, push, create or remove worktrees or branches, change upstream configuration, or clean unrelated files. Build the Scoped ownership ledger, validate, stage only attributable work, commit in place, prove the new commit belongs to `INITIAL_BRANCH`, and leave all unrelated changes untouched. Then apply the Local-commit postconditions in sections 8–10; skip the transfer workflow below.

### Push-enabled modes

If the source is already the primary checkout, use the normal staging and commit workflow there.

If the source is a session-created worktree, detached session checkout, or secondary branch attributable to the current task, land its verified work on `PRIMARY_BRANCH`:

1. **Audit both sides.** Record source status, target status, merge-base, source-only commits, untracked files, and exact Owned/Mixed/Unrelated paths. Fetch before deciding whether integration is fast-forwardable.
2. **Validate at the source.** Run the repository-required gate and relevant targeted checks before materializing a transfer commit.
3. **Materialize safely.** Stage only the selected scope in Scoped mode, or the full audited source tree in Full-tree mode. If detached, create a uniquely named temporary local `claude/session-*` branch at `INITIAL_HEAD`; never commit while remaining detached. Commit the selected source work. Leave unrelated changes unstaged and do not remove that worktree while they remain.
4. **Select exact commits.** Identify the commit or ordered commit series attributable to the session. Never integrate an unreviewed source-only commit merely because it is on the same branch.
5. **Prepare the primary checkout.** Confirm it still owns `PRIMARY_BRANCH`, or create the temporary integration worktree described above. Fetch its upstream and inspect dirty paths. Non-overlapping unrelated changes may remain only when exact staging/integration can be proven safe; any overlap or ambiguity is a blocker. Never stash, reset, or discard another checkout's work to make integration easier.
6. **Integrate.** Prefer `git merge --ff-only <source>` when the entire source-only history is attributable and the primary branch is its ancestor. Otherwise cherry-pick the exact attributable commits oldest-to-newest. Do not create a broad merge that imports unrelated commits.
7. **Validate after landing.** Run the required repository gate in the primary checkout after integration. A green source gate does not replace this target gate.
8. **Push the target.** Push `PRIMARY_BRANCH` normally to its configured upstream, then verify target `HEAD` equals the remote-tracking branch.
9. **Prove retention.** Verify commit ancestry for a fast-forward/merge. For cherry-picked commits, compare stable patch IDs plus the selected file content because commit hashes and ancestry differ. Confirm every Owned file and untracked artifact selected for transfer is represented on the target.
10. **Clean session artifacts.** Remove a session-created source or integration worktree only after retention proof and only when no unrelated or ambiguous content remains. Inventory tracked, untracked, and ignored files first. Prefer normal `git worktree remove`; use `--force` only when content comparison proves every remaining tracked change is an exact retained duplicate and every untracked/ignored artifact is known disposable or retained elsewhere. Run `git worktree prune`. Delete only a local temporary branch created by this skill after no worktree uses it and retention is proven: `git branch -d` after merge/fast-forward; after cherry-pick, `git branch -D` is permitted only for that exact temporary branch because patch-ID and content proof replace ancestry. Never force-delete a pre-existing/user branch, and never delete a remote branch without a separate explicit request.

For an ambiguous or user-owned secondary branch, do not delete or reinterpret it. Integrate into the primary branch only when the user explicitly asked to land that branch or the session ledger proves the exact attributable commits; otherwise commit/push according to the branch's existing intent and report that primary integration remains pending.

Never use `git reset --hard`, `git checkout --`, an implicit stash, or another destructive shortcut to manufacture a clean tree.

## 5. Decide `.gitignore` autonomously

Add a narrow ignore rule only when all conditions hold:

- the path is a local, disposable, reproducible artifact (cache, dependency directory, build staging output, generated log, editor state, verification screenshot, temporary export);
- project conventions do not expect it to be versioned;
- it is not tracked;
- ignoring it will not hide source, documentation, fixtures, migrations, lockfiles, required generated outputs, or user-authored data.

Inspect existing ignore files and use `git check-ignore -v` where useful. Prefer the narrowest project-relative pattern. Never ignore an unknown directory wholesale when it contains source or configuration. Never ignore a tracked file instead of reviewing it.

In Full-tree mode: add safe ignore rules automatically without asking; commit the resulting `.gitignore` change; commit every remaining non-ignored path; if a secret file needs ignoring, add the narrow safe rule without reading or printing the secret; if a tracked file contains a secret, stop as a hard blocker because `.gitignore` cannot protect tracked content.

## 6. Validate before staging

Run repository-required gates and the smallest relevant validations for changed artifacts, then `git diff --check`.

In Scoped mode, regenerate canonical outputs only from inputs that belong in the commit. When a generated file contains unrelated inputs, build a commit-specific version from a known baseline plus Owned inputs and stage it without overwriting the richer working-tree version.

In Full-tree mode, regenerate canonical outputs from the full current tree when repository policy requires it, because all non-ignored inputs belong in the commit.

Do not commit when a required gate is red. Report the failure without asking a question.

## 7. Stage and review

### Scoped and Local-commit modes

- Stage whole Owned paths with `git add -- <exact-path>...`.
- For Mixed files, stage only attributable hunks or a verified commit-specific index entry.
- Never use `git add -A`, `git add .`, or a broad wildcard.

### Full-tree mode

After the ignore and secret audits, use `git add -A` to include all remaining modifications, deletions, and untracked files. This broad staging is authorized only in Full-tree mode.

### Every mode

Review `git diff --cached --name-status`, `git diff --cached --stat`, `git diff --cached --check`, and `git diff --cached` for text changes. In Scoped and Local-commit modes, compare the staged list to the ownership ledger. In Full-tree mode, compare it to `git status` and confirm every non-ignored change is staged. Never discard working-tree content while correcting staging.

## 8. Commit and optionally push

Derive a concise commit message from the staged outcome and follow repository conventions. **Never add AI attribution or `Co-Authored-By` metadata** (this is a standing rule on this machine).

Before committing, confirm identity, selected branch, staged scope, and required gates. In push-enabled modes, also confirm the remote and upstream.

Create one cohesive commit unless policy clearly requires separation. If no changes remain, do not create an empty commit.

In Local-commit mode, stop after creating and verifying the local commit. Confirm that `HEAD` is the new commit on `INITIAL_BRANCH` and that the selected staged changes are retained. Do not run `git fetch`, `git pull`, `git push`, any remote mutation, or any upstream-setting command.

In push-enabled modes, fetch the configured upstream before the final push check. Push normally:

- When landing session work, push `PRIMARY_BRANCH` to its own configured upstream.
- When intentionally keeping work on a user-owned/current branch, push `INITIAL_BRANCH` to its own upstream; if none exists and `origin` is valid, use `git push -u origin "${INITIAL_BRANCH}"`.
- Never reuse another branch's upstream or push a detached `HEAD`.

If the remote is ahead and the target has no divergent local commit, fast-forward the target from its upstream before landing the selected session commits. Do not rebase or rewrite history. Never force-push. On conflict or divergence, stop, preserve the state, and report the blocker without asking a question. Verify that `HEAD` equals the remote-tracking branch after pushing.

## 9. Enforce the postcondition

### Local-commit mode

The current checkout remains on `INITIAL_BRANCH`, `HEAD` is the reported local commit, selected session work is retained, the index contains no leftover selected paths, and no remote/upstream/branch/worktree state was changed. Unrelated working-tree changes may remain and must be reported explicitly. Do not claim the repository is clean unless `git status --porcelain` proves it.

### Scoped mode

Unrelated changes may remain. Report them explicitly; do not claim the source or target repository is clean. If session-created cleanup was requested, no disposable worktree or temporary branch may remain unless unrelated content prevents safe removal.

### Full-tree mode

Require all of: `git status --porcelain` is empty; the resolved target branch has an upstream; target `HEAD` equals its upstream commit; the source checkout is clean or was safely removed; no session-created disposable worktree remains; no integrated temporary local branch remains.

If ignored files remain, the branch is still clean. If any non-ignored path remains dirty, the operation is incomplete: stage, validate, commit, and push it in the same invocation unless a hard blocker applies.

## 10. Final report

Report the selected mode, source context, target/current branch, commit hash and message, integration method when applicable, remote action (`not contacted` in Local-commit mode), validations run, ignore rules added, worktrees/branches removed, and final synchronization state.

In Scoped and Local-commit modes, list unrelated changes left untouched. In Full-tree mode, state explicitly whether the branch is clean and synchronized.

## Hard blockers

Stop without weakening safety when:

- a required validation fails;
- Local-commit mode is selected while `HEAD` is detached;
- the attributable path scope is ambiguous;
- in a push-enabled mode, remote identity conflicts with repository policy (wrong account/SSH alias);
- in a push-enabled mode, the primary branch or its checkout cannot be resolved safely;
- in a push-enabled mode, the exact commit set required for landing/cleanup is ambiguous;
- in a push-enabled mode, source and target contain overlapping uncommitted changes;
- in a push-enabled mode, a non-fast-forward update cannot be integrated safely;
- a tracked secret or protected artifact would be committed;
- Git reports corruption or an unresolved conflict.

Do not ask a question in Full-tree mode. Explain the blocker and the safest next action. Preserve all user data.
