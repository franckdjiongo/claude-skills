# Workflow: debug — the production debugging loop

## Purpose
Take a reported failure (build error, crash, wrong behavior, flaky test, "won't launch after signing") from reproduction to a root-cause fix with regression protection, using evidence rather than guesswork. The loop: reproduce → capture evidence → classify → hypothesize → minimize → fix root cause → add regression protection → build → run the same reproduction → run adjacent tests.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh`. A toolchain change (new Xcode, beta SDK, changed deployment target) is a frequent root cause; note the current state before anything else.
- Project facts: `bash scripts/project-info.sh` — scheme, configuration, language mode, entitlements, Sandbox, signing, Git state. Note uncommitted changes: the bug may live in them.
- The exact symptom in the user's words plus: when it started, what changed (code, Xcode, macOS, dependencies), Debug vs Release, which machine/macOS, how often.
- A reproduction: steps, input data, or a failing test. If there is none yet, producing one is step 1 and the first thing to report if it cannot be done.

## Steps

1. **Reproduce.** Run the reproduction as given: `scripts/build.sh` for build failures, `scripts/test.sh` for test failures (read `.artifacts/Tests.xcresult`), launch the app (via `/run` where available) for runtime issues. Record exactly what you observed. If it does not reproduce, vary the obvious axes (clean build, Release configuration, fresh user defaults/container, different window size) before concluding anything. A bug you cannot reproduce cannot be verified fixed.

2. **Capture evidence.** Run `bash scripts/collect-diagnostics.sh` (crash logs, recent unified-log entries for the bundle ID, build settings) into `.artifacts/diagnostics/`. For build failures, keep the full build log from `.artifacts/`, not the last screen of it. For runtime failures, add temporary `Logger` output at the boundaries you suspect; remove it before finishing (`references/debugging-observability.md`).

3. **Classify.** Assign one primary class; it decides which reference to open:

   | Class | Signals | Open |
   |---|---|---|
   | compiler / linker | diagnostics, missing symbols, duplicate symbols | `references/platform-baseline.md` (SDK/language mode) |
   | package / dependency | resolution errors, version drift, mismatched manifests | `references/architecture.md` |
   | code signing | "damaged", killed at launch, provisioning errors | `references/distribution-security.md` |
   | sandbox / entitlement | operation not permitted, deny messages in unified log, file access silently failing | `references/data-network-security.md`, `references/distribution-security.md` |
   | runtime crash | crash log, exception, fatalError, force unwrap | `references/debugging-observability.md` |
   | Swift concurrency | Sendable diagnostics, main-thread checker hits, data race at runtime, actor deadlock | `references/architecture.md` |
   | business logic / state | wrong output, stale UI, double updates | `references/architecture.md` (state ownership) |
   | persistence / migration | store fails to open, data lost after update | `references/data-network-security.md` |
   | networking | timeouts, decoding errors, auth loops | `references/data-network-security.md` |
   | layout / windowing | wrong size, clipped content, restore misbehavior, focus loss | `references/macos-ux.md` |
   | StoreKit | entitlement missing, purchase never completes, restore fails | `references/monetization-storekit.md` |
   | performance / memory | slow, leaks, growing memory | hand off to `workflows/performance.md` |
   | release-only | works in Debug, fails in Release/notarized build | `references/distribution-security.md`, `references/testing-quality.md` |

4. **Hypothesis log.** Write hypotheses as falsifiable statements with the test that would disprove each, in a scratch note you keep updated (e.g. `.artifacts/diagnostics/hypotheses.md`):
   ```
   H1: Store fails because the container URL differs under Sandbox. Test: log resolved URL in Debug vs archived build. Result: …
   H2: …
   ```
   Test the cheapest-to-disprove hypothesis first. Record results even when they eliminate a hypothesis; the log goes in the report.

5. **Minimize.** Shrink the reproduction: smallest input, fewest steps, ideally a failing unit or integration test. For concurrency and layout issues, isolate the type or view in a test target or a throwaway view. A minimal reproduction usually reveals the cause; a fix without one is a guess.

6. **Fix the root cause.** Change the thing the evidence points at, at the layer that owns it. Ownership errors get ownership fixes (move state to an actor or the main actor, restructure the task tree); entitlement errors get the correct entitlement plus an inventory entry; migration errors get a migration. Keep the change small and explain in the commit or report why the fix addresses the cause rather than the symptom.

7. **Regression protection.** Add the minimized reproduction as a permanent test (Swift Testing, integration with temporary store, or a targeted XCUITest for UI/window behavior). If a test is impossible (e.g. notarized-build-only behavior), add a repeatable verification step to `docs/ARCHITECTURE.md` or the release checklist and say so in the report.

8. **Verify with the same reproduction.** `scripts/build.sh`, `scripts/test.sh`, then run the original steps from step 1, not a friendlier variant. For release-only classes, verify on a `scripts/release-build.sh` artifact. Then run the adjacent tests (the whole target the change touched) to catch collateral damage.

9. **Clean up.** Remove temporary logging and debug flags, keep the hypothesis log for the report, and update docs if the cause reveals a wrong assumption (ADR, `PRIVACY_INVENTORY.md`, architecture doc).

## Forbidden fixes
These may make the symptom disappear; they are not fixes, and using them without an explicit ownership or security argument violates the constitution:
- Removing or weakening App Sandbox, Hardened Runtime, or any entitlement to make a failing operation succeed.
- `@unchecked Sendable`, `nonisolated(unsafe)`, `Task.detached` sprinkled to silence diagnostics, or `DispatchQueue.main.async` wrapping until the checker stops complaining.
- Disabling code signing, ad-hoc signing a release artifact, or turning off library validation.
- Swallowing errors (`try?`, empty `catch`), force-unwrapping past the crash, or adding retries around a deterministic failure.
- Deleting or skipping the failing test, or marking it flaky without evidence of nondeterminism.
- Pinning to a beta SDK or lowering the deployment target to dodge an availability error without a `#available` design.

## When to stop and report instead of guessing
Stop after roughly three disproven hypotheses without a narrowing of the search, when the reproduction is not achievable locally (customer machine, specific hardware, external service), when the fix would require a security or architecture decision the user owns, or when the failure is in a toolchain beta. Report the evidence, the hypothesis log, and the decision needed. A clear "not reproducible here, here is what I need" is more valuable than a speculative patch.

## Done when
- [ ] Reproduction recorded and re-run after the fix with the same steps; observed behavior stated.
- [ ] Classification and hypothesis log show why the cause is the cause.
- [ ] Regression test added and visible in `.artifacts/Tests.xcresult`, or a documented reason it cannot exist.
- [ ] Adjacent tests green; no new warnings; temporary logging removed.
- [ ] No forbidden fix used; any concurrency or entitlement change has a written ownership/justification.
- [ ] Docs updated if the bug exposed a wrong recorded assumption.

## End-of-task report
SKILL.md format plus: **Root cause** (one paragraph, class + mechanism), **Hypothesis log** (condensed), **Regression protection** (test name and location). Under **Not done / needs you**: reproductions that require the user's environment, decisions deferred, follow-ups such as a performance pass or release re-verification.
