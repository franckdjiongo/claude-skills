# Workflow: refactor — improve structure while protecting behavior

## Purpose
Change the shape of existing code (split a 2000-line view model, extract a service boundary, migrate to Observation or Swift 6 language mode, untangle a coupled feature) without changing what users observe, in increments that each build and pass tests. A refactor with no characterization tests is a rewrite with extra steps; a refactor that lands as one giant diff cannot be reviewed or bisected.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh`; note Swift version and language mode support, since migration refactors depend on them.
- Project facts: `bash scripts/project-info.sh` — targets, language mode per target, packages, test targets, Git state. Start from a clean tree on a branch; refuse to refactor over uncommitted feature work.
- The goal as a property, not a wish: "settings can be tested without launching the app", "no shared mutable state outside actors", "build time under N seconds". Write it down.
- Scope boundary: which module(s) are in scope; everything else is frozen for this task.
- Baseline measurements: `scripts/build.sh` wall time (clean and incremental), `scripts/test.sh` duration and test count, warning count from `scripts/analyze.sh`. Record them before touching code.

## Steps

1. **Read the code in scope fully.** Map responsibilities, hidden dependencies (singletons, notifications, environment lookups, global state), and every caller of the types you intend to move. Reference: `references/architecture.md`. Write the target structure as a short before/after sketch and confirm with the user if it changes module boundaries.

2. **ADR for structural changes.** New module, new dependency direction, new state-ownership model, language-mode change, or a new persistence/network boundary → `templates/ADR.md` into `docs/adr/`. Small extractions inside a module do not need one.

3. **Characterization tests first.** Before changing anything, pin current behavior with tests that assert what the code does now, including quirks (`references/testing-quality.md`). Prioritize: public behavior of the state owner, persistence round-trips, formatting/parsing rules, and the one or two user journeys the module serves (XCUITest if it is a critical journey). Run `scripts/test.sh`; all new tests must pass against the untouched code. If code is untestable as-is, do the minimum seam (protocol for a dependency, injected clock/URLSession) as its own tiny increment, then test.

4. **Plan increments.** Each increment: one mechanical move (extract type, introduce protocol, move file, rename, replace singleton with injected dependency) that leaves the build green and tests passing. Order them so the riskiest ownership change comes after the seams exist. Write the list; it becomes the commit sequence.

5. **Execute the loop.** For every increment: change → `scripts/build.sh` → `scripts/test.sh` → commit locally (if the user wants commits). Never combine "move" and "improve" in one step; move first with behavior identical, then improve in the next increment with a test that shows the improvement. If an increment breaks a characterization test, decide explicitly: revert the increment, or the test captured a bug and the user agrees to change behavior (record that in the report).

6. **Protect behavior at the UI.** After increments touching views or state owners, launch the app (use `/run` where available) and exercise the affected journeys, including keyboard navigation, window resize, and an error path. Observation and state-ownership changes often surface as "view stopped updating" or "updates twice", which unit tests miss.

7. **Special case: Observation / Swift 6 migration.**
   - Opt in per module or target, not the whole workspace at once. Start with leaf modules (domain, then data), finish with the app target.
   - Turn on strict concurrency checking as warnings first (`references/platform-baseline.md` for the build-setting names in the installed toolchain; verify against the SDK); triage warnings by ownership: what is this state, who mutates it, from which isolation domain?
   - Fix isolation properly: mark UI-facing types `@MainActor`, move serialized mutable state into an actor, make value types `Sendable` by construction, pass results across boundaries as values. Structured child tasks over detached tasks.
   - `@unchecked Sendable` or `nonisolated(unsafe)` only with a comment stating the invariant that makes it safe and an ADR note; treat each as debt.
   - Migrate `ObservableObject`/`@Published` to `@Observable` one type at a time; update views to `@State`/`@Bindable`/Environment per `references/architecture.md`, then verify updates fire by running the app. Confirm any newer Observation APIs against the exported Apple skill or current docs before relying on them.
   - Flip the target to Swift 6 language mode only when warnings are zero; run the full suite and the app.

8. **Measure after.** Repeat the baseline: clean and incremental build times, test duration and count, warning count, and any goal-specific metric (e.g. lines per file, number of singletons). If a number regressed (build time is the usual), find out why before finishing.

9. **Tidy.** Delete dead code the refactor exposed (as its own increment), update `docs/ARCHITECTURE.md` module map and state ownership, and keep the characterization tests unless they now duplicate behavior tests.

## Rules
- No big-bang rewrites. If the plan needs more than roughly a dozen increments or cannot keep the build green between them, split it into separately shippable phases and report that.
- Behavior changes found along the way are logged, not fixed, unless the user opts in per item.
- Public API and file moves are separate commits from logic changes so history stays bisectable.
- Keep the app runnable at every commit; a refactor branch that only builds at the end is not incremental.

## Done when
- [ ] Goal property demonstrably true (test, measurement, or structural fact you can point to).
- [ ] Characterization tests were written before changes and still pass; any intentional behavior change is listed and approved.
- [ ] Every increment built and passed tests; history is a sequence of small commits (if commits were requested).
- [ ] App launched and affected journeys exercised after state or view changes.
- [ ] Before/after measurements recorded; regressions explained or fixed.
- [ ] ADR written for structural changes; `docs/ARCHITECTURE.md` matches reality.
- [ ] For migrations: zero concurrency warnings in migrated targets; no unexplained escape hatches.

## End-of-task report
SKILL.md format plus a **Before/after** block: build time (clean/incremental), test duration and count, warning count, goal metric. List escape hatches remaining with their justification. Under **Not done / needs you**: phases deferred, behavior quirks discovered, modules not yet migrated and the recommended order.
