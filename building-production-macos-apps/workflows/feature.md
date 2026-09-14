# Workflow: feature — add or extend functionality in an existing app

## Purpose
Implement a feature inside the project's existing architecture, in verified increments, with tests and documentation that keep the next session from having to rediscover what was done. The failure modes this workflow prevents: silently introducing a second architecture, batching a day of edits before the first build, and shipping UI that compiles but does not behave like a Mac app.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh`; export Apple skills if supported and the feature touches SwiftUI surface you are not certain about.
- Project facts: `bash scripts/project-info.sh` — scheme, deployment target, Swift language mode, entitlements, Sandbox state, packages, test targets, Git state. Work on a clean tree or a branch; if the tree is dirty, ask before touching it.
- The feature as a user outcome, its acceptance criteria, and what is explicitly out of scope. If the request is vague ("add sync"), write two sentences of intended behavior and confirm before coding.
- Project docs: read `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and `PRIVACY_INVENTORY.md` if present. If absent, note it; do not create the full set unless the user wants them.
- Whether the feature adds data, permissions, entitlements, or network destinations (this decides whether step 9 applies).

## Steps

1. **Inspect the neighborhood.** Find the feature's boundary: which existing feature folder, state owner, service, and views it touches. Read those files fully. Identify the pattern already used for state (`@Observable` models, environment injection, view-owned state) and for services (protocol + implementation, actor, etc.). Match it. Reference: `references/architecture.md`.

2. **Locate the seam.** Decide where the new code lives: new `Features/<Name>/` folder, extension of an existing one, a new domain rule, a new platform wrapper. Write the list of files you expect to add or modify before editing. If the list is long (more than roughly ten files) or crosses module boundaries in a new direction, stop and treat it as architecture.

3. **ADR only if architecture changes.** A new persistence store, a new module dependency direction, a new concurrency ownership model, a new entitlement, or a change of distribution assumptions warrants `templates/ADR.md` → `docs/adr/ADR-NNNN-<slug>.md`. Adding a view and a model inside an existing feature does not. Link new ADRs from `docs/ARCHITECTURE.md`.

4. **Plan the increments.** Split the feature into slices that each build and can be observed: model/rule first, then state owner, then the view, then menu/toolbar/keyboard integration, then persistence or network. Each slice ends with `scripts/build.sh` and, where tests exist for the layer, `scripts/test.sh --only <TestTarget>` (check `--help` for the filter flag name).

5. **Implement the domain and state.** Pure logic goes in domain types with no I/O so it can be tested without the app. The state owner exposes intent methods (`func rename(to:)`), not raw mutable fields the view fiddles with. Keep UI work on the main actor and hand results back explicitly; no `@unchecked Sendable` to silence the compiler (`references/architecture.md`, concurrency).

6. **Implement the UI.** Follow `references/macos-ux.md` basics: the primary action appears in the menu bar with a shortcut, in the toolbar if it is window-level, and in a context menu if it is item-level; lists and tables support selection and sorting where the data is tabular; empty, loading, and error states exist; controls use system styles and `DesignSystem/` tokens; every icon-only control has a label and `.help`. Do not add glass or custom materials here; `workflows/ui-polish.md` handles visual refinement after behavior is right. Wrap AppKit via `NSViewRepresentable` only where SwiftUI lacks the control.

7. **Add tests.** Per `references/testing-quality.md`: Swift Testing for the rule and the state owner (including the failure paths), an integration test with a temporary store or substituted network layer if either is involved, and an XCUITest only if the feature is one of the critical journeys. Name tests after the behavior, not the method.

8. **Run and verify.** `scripts/build.sh`, `scripts/test.sh`, then launch (use `/run` and `/verify` where available) and exercise the acceptance criteria by hand: primary path, one error path, keyboard-only, resize narrow, dark mode. Read `.artifacts/Tests.xcresult` rather than inferring from console noise. Fix before reporting.

9. **Update the artifacts that must stay aligned.** If data, permissions, entitlements, or network destinations changed: update `PRIVACY_INVENTORY.md`, the entitlements file, `PrivacyInfo.xcprivacy` and Info.plist usage strings, then run `bash scripts/privacy-audit.sh`. Update `docs/ARCHITECTURE.md` module map / state ownership if either changed. Add strings to the String Catalog.

10. **Commit locally if asked.** One commit per coherent increment with a message describing behavior; never push or tag without the user's say-so.

## Done when
- [ ] Acceptance criteria demonstrated in the running app, not just in tests.
- [ ] `scripts/build.sh` clean (no new warnings introduced) and `scripts/test.sh` green with new tests visible in the `.xcresult`.
- [ ] Feature follows the project's existing state and service patterns; any deviation has an ADR.
- [ ] Menu command, keyboard shortcut, toolbar/context-menu placement, and empty/error states exist where the feature calls for them.
- [ ] `PRIVACY_INVENTORY.md` and entitlements updated if anything about data or permissions changed; `privacy-audit.sh` passes.
- [ ] No security suppression, no concurrency escape hatches, no secrets in code or logs.

## End-of-task report
SKILL.md format. **Changed**: files by layer (domain / state / UI / platform / tests / docs). **Verified**: build result, test counts, exactly what was exercised in the running app and what was observed (including keyboard and resize checks). **Not done / needs you**: deferred scope, any ADR awaiting approval, follow-up polish (`workflows/ui-polish.md`) or release implications (`workflows/release.md`).
