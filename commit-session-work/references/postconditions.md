# Postconditions and final report

## Postcondition per mode

**Local-commit mode.** The current checkout remains on `INITIAL_BRANCH`, `HEAD` is the reported local commit, selected session work is retained, the index contains no leftover selected paths, and no remote/upstream/branch/worktree state was changed. Unrelated working-tree changes may remain and must be reported explicitly. Do not claim the repository is clean unless `git status --porcelain` proves it.

**Scoped mode.** Unrelated changes may remain. Report them explicitly; do not claim the source or target repository is clean. If session-created cleanup was requested, no disposable worktree or temporary branch may remain unless unrelated content prevents safe removal.

**Full-tree mode.** Require all of: `git status --porcelain` is empty; the resolved target branch has an upstream; target `HEAD` equals its upstream commit; the source checkout is clean or was safely removed; no session-created disposable worktree remains; no integrated temporary local branch remains.

If ignored files remain, the branch is still clean. If any non-ignored path remains dirty, the operation is incomplete: stage, validate, commit, and push it in the same invocation unless a hard blocker applies.

## Final report

Report the selected mode, source context, target/current branch, commit hash and message, integration method when applicable, remote action (`not contacted` in Local-commit mode), validations run, ignore rules added, worktrees/branches removed, and final synchronization state.

In Scoped and Local-commit modes, list unrelated changes left untouched. In Full-tree mode, state explicitly whether the branch is clean and synchronized.
