# Testing and quality

Tests exist to make claims verifiable: "the feature works", "the bug is fixed", "the refactor preserved behavior", "the Release build runs". Each claim needs a different kind of evidence, so a Mac app carries several small test layers rather than one big one. Procedures that use these layers live in `workflows/feature.md`, `workflows/debug.md`, `workflows/refactor.md`, and `workflows/release.md`.

## Test layers and what each one buys

| Layer | Best use | Runs where | Speed |
|---|---|---|---|
| Swift Testing / domain tests | Business logic, state transitions, formatting, validation, entitlement gating decisions | `scripts/test.sh`, every change | seconds |
| Persistence integration | Store setup, fetch/insert/delete, schema migration N→N+1 on a copied fixture store | `test.sh`, before any schema change | seconds–minutes |
| Network integration with substitution | Request building, HTTP/error policy, decoding, cancellation, retry — against a stubbed `URLProtocol` or injected transport | `test.sh` | seconds |
| StoreKit tests | Purchase → verified transaction → entitlement, restore, revoke/expire, offline start — with a StoreKit configuration file | `test.sh` with the StoreKit config attached to the test scheme | seconds |
| XCUITest (small set) | Three to eight critical real journeys: launch clean, create/open/save, purchase-gated path, settings persist, quit and relaunch | `test.sh --ui`, before merge and release | minutes |
| Accessibility audit | Automated audit in an XCUITest (`performAccessibilityAudit`) plus Accessibility Inspector on key windows | with UI tests and in `workflows/ui-polish.md` | minutes |
| Release-build smoke test | Problems hidden by Debug: optimization, entitlements, signing, resources, StoreKit configuration absence | `scripts/release-build.sh` then run the exported app | minutes |
| Manual/agent visual verification | Appearance, resizing, focus, dark/light, interaction quality | `/run`, `/verify`, screenshots | minutes |

The lower rows are slower and more brittle; keep them few and meaningful. Most confidence should come from the top three rows, which is why architecture keeps logic out of views and I/O behind boundaries (`references/architecture.md`). If a behavior can only be tested through XCUITest, that is usually an architecture signal.

## Swift Testing basics

Prefer Swift Testing for new tests. Confirm details against the installed toolchain; the shapes below are stable.

```swift
import Testing
@testable import MyApp

@Suite("Entitlement gate")
struct EntitlementGateTests {
    @Test func freeUserCannotExport() {
        let gate = EntitlementGate(state: .free)
        #expect(gate.allows(.export) == false)
    }

    @Test("Expired subscription behaves like free", arguments: [EntitlementState.expired, .revoked, .free])
    func expiredIsFree(state: EntitlementState) {
        #expect(EntitlementGate(state: state).allows(.export) == false)
    }

    @Test func decodeFailsLoudly() throws {
        #expect(throws: DecodingError.self) { try Parser.parse(Fixtures.malformed) }
    }

    @Test(.disabled("Flaky under load — tracked in ISSUE-42"), .tags(.integration))
    func importLargeLibrary() async throws { try #require(await importer.run().count > 0) }
}
```

- `#expect` continues after failure and reports every failed expectation; `#require` stops the test when a precondition is unmet (unwrapping, throwing setup).
- Parameterized tests replace loops: each argument reports separately, so a failing case is named in the `.xcresult`.
- Traits carry policy: `.disabled(reason)` with a tracked reason, `.tags` for selection, `.timeLimit` for guardrails, `.serialized` when tests share a resource. Suites are value types instantiated per test, which discourages shared mutable state.
- Tests are `async` when the code under test is; isolate to `@MainActor` when testing main-actor types instead of forcing the type to be nonisolated.

Use XCTest when you need what Swift Testing does not cover: XCUITest (`XCUIApplication`), performance metrics (`measure(metrics:)`, see `references/performance.md`), or an existing XCTest suite you are extending. Both frameworks coexist in one target and one `.xcresult`.

## Test plans and selection

- Keep at least two test plans: a fast plan (domain, persistence, network, StoreKit) run on every change, and a full plan adding UI, accessibility, and performance tests run before merge and release. Test plans can set environment variables, arguments, language/region (for localization checks), and repetition for flakiness detection.
- `bash scripts/test.sh --scheme "$SCHEME" --test-plan Fast` is the everyday command; `--only-testing Target/Suite/test` narrows to the reproduction while debugging.
- A test target needs the StoreKit configuration file attached to its scheme's Run/Test action to exercise purchases deterministically (`references/monetization-storekit.md`).

## `.xcresult` is the evidence

`scripts/test.sh` writes `.artifacts/Tests.xcresult` and prints a summary. Report from the bundle, not from memory of console output:

```bash
xcrun xcresulttool get test-results summary --path .artifacts/Tests.xcresult   # verify subcommands against installed Xcode
xcrun xcresulttool get test-results tests   --path .artifacts/Tests.xcresult   # per-test status, failure text, file:line
xcrun xcresulttool export attachments --path .artifacts/Tests.xcresult --output-path .artifacts/attachments
```

Attachments (XCUITest screenshots, saved fixtures, audit output) are how a UI failure becomes something you can look at. Coverage lives in the same bundle when the plan enables it.

## Characterization tests before refactoring

When code has no tests and must change, first pin its current behavior — including behavior that looks wrong — with tests that call it through its existing public surface and assert on today's outputs. Then refactor with those tests green, and only afterwards change behavior deliberately, one test at a time. This is what makes `workflows/refactor.md` incremental rather than a rewrite. Snapshot-style assertions (serialized output compared to a stored fixture) are acceptable characterization tools; keep fixtures in the test bundle and note in the ADR which fixtures encode known-bad behavior.

## A regression test per fixed bug

Every fixed bug gets a test that failed before the fix and passes after it, named after the symptom or the tracker ID so a future failure is self-explanatory. When the bug is untestable at unit level (window restoration, a signing quirk), record a repeatable manual verification in the fix report and, where possible, in `RELEASE_CHECKLIST.md`. Do this before declaring the bug fixed — `references/debugging-observability.md` explains why the order matters.

## Coverage is a diagnostic, not a target

Enable coverage in the full test plan and read it to find untested business-critical paths: entitlement checks, migrations, export/import, error recovery. Do not chase a percentage; a view body at 0% is fine, a licensing validator at 60% is a defect. Coverage of generated or trivial code is noise. State coverage findings in reports as "these critical paths lack tests", never as a number alone.

## Test the actual Release build

Debug builds hide problems: assertions differ, optimization exposes undefined behavior and timing, StoreKit configuration files attach only to a scheme's run action, entitlements and signing identities can differ per configuration, and resources may be copied differently. Before any release:

1. `bash scripts/release-build.sh --scheme "$SCHEME" --method <app-store|developer-id>` — archives, exports, verifies the signature, stops before any upload.
2. Launch the exported `.app` from `.artifacts/release/` (not from Xcode). Run the smoke journeys: launch on a clean user account or fresh container, open/create/save, the purchase-gated path against the sandbox environment, settings persist across relaunch, quit cleanly.
3. `bash scripts/verify-release.sh <artifact>` for signature, entitlements, Hardened Runtime, and Gatekeeper assessment (`references/distribution-security.md`).
4. Record the results in `RELEASE_CHECKLIST.md`.

## Local scripts are the source of truth

`scripts/build.sh`, `scripts/test.sh`, `scripts/analyze.sh`, and `scripts/release-build.sh` define what "passing" means. Xcode Cloud or any other CI invokes the same scripts (or the same `xcodebuild` invocations they print) rather than a parallel configuration that drifts. Consequences: a CI failure is reproducible locally with one command; changing CI providers is a configuration change, not a re-specification of quality; the `.xcresult` produced locally and in CI has the same shape. Keep scripts parameterized by scheme, configuration, and test plan — never a hard-coded `MyApp`.

## Flaky test policy

A flaky test is a defect in either the test or the product, and both are worth finding. Policy:

- Reproduce with repetition (test plan repetition or `-test-iterations`; confirm the flag against the installed `xcodebuild`). A test that fails 1 in 50 under repetition is a real race, often in the product.
- Classify: shared mutable state between tests, real time/network/filesystem dependence, order dependence, main-actor timing in UI tests, unfinished StoreKit transactions leaking between tests.
- Fix within the same change when the cause is in the test; open a tracked issue and mark `.disabled("reason — ID")` only when the cause is in the product and needs its own fix. Never delete a flaky test silently, never add unconditional retries.
- UI tests wait on conditions (`waitForExistence`, expectations), never on `sleep`.

## What to test for menu-bar apps

- Status item lifecycle: appears at launch, survives display changes, disappears on quit; menu contents reflect state.
- Popover/window show/hide, keyboard shortcut activation, and behavior when the app has no main window (`LSUIElement` apps).
- Login-item registration and its removal; behavior when launched at login with no user interaction.
- Background work: does it respect cancellation and energy expectations (`references/performance.md`); does it recover after sleep/wake and network loss.
- Settings window opens once, remembers position, persists values.

## What to test for document apps

- New/open/save/save-as/revert/close round-trip; the file written is readable by the previous version where the format promises compatibility.
- Autosave and versions; unsaved-changes prompts; document restoration after relaunch.
- Undo/redo coalescing for every user-editable mutation; dirty state matches actual changes.
- Multiple documents open simultaneously with independent state; window restoration across relaunch.
- Sandbox interaction: user-selected files open via the panel and via drag-and-drop; security-scoped bookmarks resolve after relaunch; opening a file from another app's location.
- Import/export produce files a second tool can read (validate against a fixture set).
