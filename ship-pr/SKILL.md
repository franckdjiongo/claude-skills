---
name: ship-pr
description: >
  Merge one or more explicitly-named pull requests and land the result safely: verify each PR is mergeable and its required checks are green, merge it with `gh pr merge`, sync the local primary branch (handling divergence without rewriting history), run the repo's validation gate, redeploy if the repo defines one and the merge touched deploy-relevant paths, verify post-deploy health when a health signal is discoverable, and clean up merged branches/worktrees. Works across any repo on this machine — detects the remote's SSH account alias (perso/automintech/cobacam), the repo's package.json scripts, and its own merge/redeploy conventions, so it never assumes workstation's. Use this skill whenever the user says "merge this PR", "merge these PRs", "ship this PR", "j'ai fini la revue, merge et redeploie", "merge le chantier X", gives one or more PR numbers/branch names/URLs to land, or asks to close out a chantier/branch whose PR is ready — including right after an `adversarial-pr-review` pass or a `brief-chantier` run that opened a PR. Never triggers on its own for a PR the user hasn't named — it does not scan for or merge PRs it wasn't explicitly pointed at. Distinct from `commit-session-work` (which commits/pushes uncommitted work, never merges a PR) and `adversarial-pr-review` (which reviews and opens a PR, never merges one).
---

# Ship PR

Land one or more already-open pull requests: merge, sync, validate, redeploy, verify, clean up. This is the second half of the chantier lifecycle — `adversarial-pr-review` (or `brief-chantier`'s closing lot) gets a PR *open and reviewed*; this skill gets it *merged and live*, the exact sequence a human would otherwise run by hand after clicking merge on GitHub.

Invoking this skill authorizes merging the PR(s) the user names, syncing and pushing the resolved primary branch, running the repo's own redeploy script when relevant, and deleting the branches/worktrees/locks that merge made obsolete. It does **not** authorize merging a PR the user didn't name, bypassing a failing or pending required check, force-pushing, rewriting history, or touching branch-protection settings.

## 1. Resolve the target PR(s) — never guess, never scan

The user must name what to merge: a PR number (`36`), a branch name (`chantier/mcp-distant-connecteur-claude-ai`), a PR URL, a chantier slug you can match to a branch, or a list of any of these. If they say "merge the PRs for the X and Y chantiers" without numbers, resolve each via `gh pr list --head <branch>` — but if resolution is ambiguous (no match, or more than one open PR touches the name), stop and ask rather than picking one.

Do not call `gh pr list` with no filter to go looking for mergeable PRs on your own initiative — that scope was explicitly declined when this skill was designed. A PR the user didn't name stays untouched, no matter how ready it looks.

If the user names several PRs, keep them in the order given (or ask if the order matters and isn't obvious — e.g. one PR's branch was created off another's).

## 2. Preflight each PR before merging it

For every target, `gh pr view <n> --json state,isDraft,mergeable,mergeStateStatus,statusCheckRollup,baseRefName,headRefName,url`. Refuse to merge — report why, touch nothing — when:

- `state` is already `MERGED` (skip it with a note, not an error) or `CLOSED` (report, stop for that PR).
- `isDraft` is true.
- `mergeable` is `CONFLICTING`, or `mergeStateStatus` shows a block (e.g. `BLOCKED`, `BEHIND` on a repo that requires being up to date).
- Any entry in `statusCheckRollup` is failing, or still pending and the user hasn't said to wait — a pending check is not the same as a green one; don't merge through it.

These are hard blockers the same way `commit-session-work` treats a red validation gate: real, not negotiable by this skill on its own. If a check is red because of a known flake, that's the user's call to force through (`gh pr merge --admin` or similar) — never yours by default, and only if they say so explicitly for that PR.

Confirm `baseRefName` is the repo's actual primary branch (see `PRIMARY_BRANCH` resolution below) — merging into the wrong base is a mistake worth catching before it happens, not after.

## 3. Merge

For each PR that passed preflight, in order:

```
gh pr merge <n> --merge --delete-branch
```

Default to `--merge` (an ordinary merge commit) unless the repo's own recent history shows a consistent squash or rebase convention — check `git log --oneline -20 --merges` on the primary branch: merge commits present → this repo uses `--merge`; none, but PRs clearly landed anyway → it's squashing or rebasing, match that with `--squash` or `--rebase`. When genuinely ambiguous, `--merge` is the safest default — it never rewrites what was reviewed.

`--delete-branch` removes the remote branch as part of the same call; that's the normal, expected cleanup for a feature branch and doesn't need separate authorization.

Record the merge commit SHA `gh pr merge` reports (or read it back via `gh pr view <n> --json mergeCommit`) — you'll need it for the report and for attributing any regression that shows up next.

**Multiple PRs, one at a time with a checkpoint between them.** After each individual merge, sync the primary checkout (step 4) and run at least the repo's fastest gate (typically `typecheck`) before merging the next one. This is what lets you say *which* PR broke something if one does — merge all three first and you're debugging a pile, not a diff. Stop the sequence at the first PR whose post-merge gate goes red; report it plainly, and don't merge the remaining PRs on top of a checkout you already know is broken.

## 4. Sync the primary checkout

Resolve `PRIMARY_BRANCH` the same way `commit-session-work` does: an explicit repo-policy target if one exists, else `refs/remotes/origin/HEAD`, else local `main` then `master`. Resolve the checkout that owns it via `git worktree list --porcelain`; if none does, work in a scoped `mktemp -d` integration worktree instead of inventing a checkout.

Before pulling, check for uncommitted changes in that checkout. If there are any and they are **not** part of what you're landing, `git stash push -m "<why>" -- <paths>` them first — never let an unrelated dirty file block or get silently swept up by the sync. `git fetch` then `git pull --ff-only`. If that fails because local has commits origin doesn't (a pre-existing local commit that predates this invocation, or a prior stash-restore artifact), don't rebase and don't force anything — `git merge --no-ff origin/<PRIMARY_BRANCH>` to reconcile without rewriting either side's history, exactly as you would for any other diverged branch. Pop the stash back afterward if you pushed one, and confirm it reapplied cleanly.

Push the synced primary branch to its own upstream if it now has commits origin doesn't (from the merge, or from that pre-existing local work) — never push a detached HEAD, never reuse another branch's upstream.

**Account check before any push.** Confirm the remote is an SSH alias URL (`git@github-<alias>:…`), never `https://github.com/…`, and that `git config user.email` in this checkout matches the account the alias implies. On this machine that's `git@github-perso:…` → `franckdjiongo` / `djiongoelly@yahoo.fr`, `git@github-automintech:…` → `automintech@gmail.com`, `git@github-cobacam:…` → `ca.cobacam@gmail.com`. A mismatch is a hard blocker — stop and report it rather than pushing under the wrong identity.

## 5. Validate the integrated result

Run the repo's own validation gate on the now-synced primary branch — don't invent one. Look for it in this order: an explicit instruction in `CLAUDE.md`/`AGENTS.md` (workstation's is `bun run typecheck && bun run build && bun test`, plus a separate `bun run test:hooks` because `bun test` skips dotdirs — other repos will differ), otherwise the obvious `package.json` scripts (`typecheck`, `build`, `test`, `lint`), otherwise whatever `commit-session-work` would have used for this same repo.

A red gate here means the merge broke primary, even though each individual PR may have looked clean in isolation (two PRs can each pass alone and still conflict in combination). Stop before touching deploy — report the failure, name the PR(s) most likely responsible from the per-merge checkpoints in step 3, and leave the rest of this workflow undone rather than pushing forward on a broken build.

## 6. Redeploy, only if it's relevant and defined

Look for a deploy/redeploy convention the repo itself declares — a `redeploy` (or clearly equivalent) script in `package.json`, or a rule file like `.claude/rules/server-deploy.md`. If one exists AND the merged diff touched paths that convention cares about (workstation: `server/**`; generalize by the same logic elsewhere — front-end-only or docs-only changes don't need a server redeployed), run it. If no such convention exists, or the merge didn't touch anything deploy-relevant, skip this step outright — don't invent a deploy step for a repo that doesn't have one, and don't redeploy for a docs-only PR just because the repo happens to have a `redeploy` script.

## 7. Verify health, best-effort

If the repo's own docs or rules name a health endpoint or a way to prove new code is live (workstation: `curl` the deployed URL and check for a response only the new code would produce, not just a 200), use it. If nothing like that is discoverable, don't fabricate a health check — say plainly that you redeployed but have no repo-defined way to confirm the new code is actually being served, rather than claiming a verification you didn't really do.

## 8. Clean up

- Remote branches: already handled by `--delete-branch` in step 3.
- Local branches for the merged PR(s), if they exist in any checkout: delete them (`git branch -d`, only after confirming the merge commit is an ancestor — never `-D` a branch you haven't proven is fully landed).
- A worktree created for the branch: `git worktree remove`, then `git worktree prune`, following the same retention-proof discipline as `commit-session-work` (never force-remove a worktree with content that isn't provably retained on primary).
- A session-scoped lock file convention if one is in use for this repo (e.g. a `night-run-lock`-style file) and this invocation is the one holding it: release it. Never release a lock you don't know you're holding.

## 9. Report

For each PR: number, merge commit SHA, merge strategy used, and whether it was skipped (already merged/closed) or blocked (with the exact reason — failing check, conflict, draft, wrong base). Then: whether the primary branch was pushed and to where, the validation gate's verdict, whether redeploy ran and its outcome, the health-check result (or the honest "no repo-defined way to check" note), and what was cleaned up. If anything stopped the sequence early (a red gate, a blocked PR, an account mismatch), say so first and plainly — a partial run that landed PR #1 but stopped before #2 is a normal, safe outcome to report, not a failure to hide.

## Hard blockers — stop without weakening safety

- A named PR is draft, has a merge conflict, or has a failing/pending required check the user hasn't explicitly said to force through.
- The remote account/SSH alias doesn't match repository policy for a push.
- The primary branch or its checkout can't be resolved safely.
- Source and target contain overlapping uncommitted changes that can't be disentangled by stashing.
- A non-fast-forward update can't be integrated without rebasing or force-pushing.
- The post-merge validation gate is red.
- Git reports corruption or an unresolved conflict during sync.

None of these are worked around silently. Report the blocker and the safest next action; don't ask a clarifying question when the answer is really "stop and tell the user" — reserve questions for genuine ambiguity in *which* PR or *what order*, not for whether to proceed past a red gate.
