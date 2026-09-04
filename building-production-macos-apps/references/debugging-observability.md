# Debugging and observability

Contents: the loop · evidence sources · failure classes (14) · Swift concurrency diagnostics · observability architecture · reading `.xcresult` and crash logs · Console.app · anti-patterns.

Debugging is a scientific procedure, not a search for whatever edit makes the compiler quiet. The step-by-step procedure lives in `workflows/debug.md`; this reference explains the loop, what evidence each failure class needs, and which "fixes" are actually suppressions.

## The loop and why each step exists

```
Reproduce → Capture evidence → Classify → Falsifiable hypothesis → Minimize
→ Fix root cause → Regression protection → Build → Same reproduction → Adjacent tests
```

- **Reproduce** before touching code. A bug you cannot trigger on demand cannot be proven fixed. Record the exact steps, configuration (Debug/Release), scheme, macOS build, and whether it needs a fresh container/user data.
- **Capture evidence** while it is fresh: build log, `.xcresult`, crash report, unified log excerpt, screenshot/recording, entitlement dump. `bash scripts/collect-diagnostics.sh` gathers most of this into `.artifacts/diagnostics/`.
- **Classify** using the list below. Classification decides which evidence matters and which reference to open next; misclassification is the usual cause of hours lost (a "crash" that is really a Sandbox denial, a "SwiftUI bug" that is really a main-actor violation).
- **Falsifiable hypothesis**: state it so a single observation can kill it. "The context is saved from a background task while the main actor reads it" is falsifiable; "SwiftData is flaky" is not.
- **Minimize**: strip the reproduction to the smallest unit that still fails — one test, one view, one request. Minimizing often reveals the cause on its own and yields the regression test for free.
- **Fix the root cause**, not the symptom. If the fix is a `try?`, a `DispatchQueue.main.async` sprinkled without ownership reasoning, or a removed entitlement, you have suppressed, not fixed.
- **Regression protection**: a test that failed before and passes after, or, when untestable, a scripted verification step recorded in the report. See `references/testing-quality.md`.
- **Build, re-run the identical reproduction, then adjacent tests.** Adjacent means the same module and anything that shares the touched state or service. `bash scripts/build.sh` then `bash scripts/test.sh --only-testing <target>` and finally the full `test.sh`.

Report every fix with: reproduction, evidence, root cause (one sentence), fix, regression protection, verification performed.

## Evidence sources at a glance

| Evidence | How to get it | Best for |
|---|---|---|
| Build log with full error text | `bash scripts/build.sh` → `.artifacts/build-*.log`; grep `error:` and `warning:` | compiler, linker, packages, signing |
| `.xcresult` | `bash scripts/test.sh` → `.artifacts/Tests.xcresult`; `xcrun xcresulttool get ...` | test failures, attachments, coverage |
| Crash report (`.ips`) | `~/Library/Logs/DiagnosticReports/`, Console.app → Crash Reports; `collect-diagnostics.sh` copies recent ones | runtime crash, concurrency traps |
| Unified log | `log show --predicate 'subsystem == "<bundle id>"' --last 10m`; `log stream` while reproducing | sandbox denials, runtime behavior, your `Logger` output |
| Entitlements as built | `codesign -d --entitlements :- <path/to/App.app>` | sandbox/entitlement, signing |
| Signature/Gatekeeper | `bash scripts/verify-release.sh <artifact>` | code signing, release-only behavior |
| Instruments trace | Time Profiler, Allocations, Leaks, Hangs, SwiftUI | performance/memory; see `references/performance.md` |

## Failure classes

For each class: typical evidence · first checks · common root causes · what not to do.

**Compiler.** Evidence: first `error:` in the log (later errors cascade). Checks: is it the first error; does it mention a module/API that the deployment target or SDK does not have; Swift language mode (5 vs 6) from `project-info.sh`. Causes: API newer than the deployment target (needs `#available`), beta API signature changed (confirm against the exported Apple skill or current docs), language-mode strictness, type-inference timeouts in giant view bodies. Do not: lower the language mode, delete code you do not understand, add `@unchecked` anything to silence isolation errors.

**Linker.** Evidence: `Undefined symbols`, `duplicate symbol`, `ld: warning` lines; framework search paths in build settings. Checks: target membership of the file, framework linked in the right target, arch slice (`arm64` vs `x86_64`) of a binary dependency, `-ObjC` flags. Causes: file in wrong target, static library duplicated through two packages, binary xcframework missing a slice. Do not: strip architectures or add `-Wl,-undefined,dynamic_lookup` as a fix.

**Package/dependency.** Evidence: `Package.resolved`, resolution errors, the package's own minimum platform. Checks: `xcodebuild -resolvePackageDependencies` output, package cache, whether the package supports the macOS deployment target, pinned versions vs branch dependencies. Causes: package raised its minimum platform, transitive conflict, stale DerivedData/package cache, network-restricted resolution. Do not: vendor a fork to skip resolution errors without an ADR.

**Code signing.** Evidence: `errSecInternalComponent`, "no identity found", provisioning profile mismatches, `codesign --verify --verbose=4` output. Checks: `security find-identity -v -p codesigning`, team/bundle ID match, `CODE_SIGN_STYLE`, embedded frameworks signed, entitlements requiring a profile (iCloud, groups). Causes: expired certificate, wrong team, entitlement not in profile, nested binary unsigned, Release using a different identity from Debug. Do not: set `CODE_SIGNING_ALLOWED=NO`, disable Hardened Runtime, or use ad-hoc signing "for now" in a release lane. See `references/distribution-security.md`.

**Sandbox/entitlement.** Evidence: `deny(1) file-read-data` style lines in the unified log (`log show --predicate 'sender == "Sandbox"'`), file operations returning permission errors, network requests failing only in the sandboxed build. Checks: entitlements as built (not the `.entitlements` file — the built product), whether the path is user-selected (security-scoped bookmark needed), whether the client/server network entitlement exists. Causes: missing `com.apple.security.files.user-selected.read-write`, bookmark not resolved/started, accessing a path outside the container, missing network client entitlement, Apple Events without automation entitlement. Do not: remove the Sandbox to make it work — decide the entitlement, document it in `PRIVACY_INVENTORY.md`, and, for direct distribution, record the reasoning in an ADR if the Sandbox is genuinely incompatible with the product.

**Runtime crash.** Evidence: crash report exception type (`EXC_BAD_ACCESS`, `EXC_BREAKPOINT` for Swift traps, `SIGABRT` for uncaught exceptions), the crashed thread's frames, the "Application Specific Information" block. Checks: symbolicate (below), is the crashed thread main, is there a fatal error message (`Fatal error: Unexpectedly found nil`, index out of range, `Swift runtime failure`). Causes: force unwraps, unchecked array indexing, KVO/NotificationCenter observers outliving their objects, AppKit exceptions from off-main UI work, exclusivity violations. Do not: wrap in `try?`/`if let` at the crash site without asking why the value was nil.

**Swift concurrency.** See the dedicated section below.

**Business logic/state.** Evidence: a failing domain test (write one if none exists), a state dump at the moment of failure. Checks: who owns the state (`references/architecture.md`), is there more than one source of truth, is the transition order-dependent. Causes: duplicated state between view and model, derived values cached and not invalidated, `Equatable`/`Hashable` on a type omitting a field, date/time zone/locale assumptions. Do not: patch the symptom in the view; fix the model and test it.

**Persistence/migration.** Evidence: store open errors, migration failures, missing attributes after upgrade. Checks: reproduce on a copy of a real store from version N, `ModelContainer` configuration, schema versioning plan, whether the app can start at all when the store is corrupt. Causes: renamed attribute without a migration stage, non-optional attribute added without a default, relationship delete rules, store path differences between sandboxed and unsandboxed builds. Do not: delete the user's store on failure; never test migrations against your only copy of real data. See `references/data-network-security.md`.

**Networking.** Evidence: `URLError` code, HTTP status and (redacted) response body, request as sent, timing. Checks: does it fail in the sandboxed build only (entitlement), is the response decoded strictly (`Codable` key mismatch), is a cancellation surfacing as an error, App Transport Security. Causes: missing network client entitlement, decoding a nullable field as non-optional, retry without backoff, ignoring cancellation. Do not: log tokens, cookies, or Authorization headers in the investigation; redact before you paste anything into a report.

**Layout/windowing.** Evidence: screenshot at the failing size, view hierarchy (Xcode's debug view hierarchy or the Accessibility Inspector), console warnings about constraints (AppKit) or SwiftUI layout. Checks: minimum window size, `frame` vs fluid layout, `fixedSize`, scene/window restoration, multiple displays, sidebar collapsed. Causes: hard-coded dimensions, `GeometryReader` used for layout instead of measurement, text truncation with long localized strings, window restoration loading a stale frame off-screen. Do not: hard-code a window size to hide a fluid-layout bug. See `references/macos-ux.md`.

**StoreKit.** Evidence: transaction verification result, product fetch result, StoreKit configuration in use, sandbox tester state. Checks: are you running with a StoreKit configuration file or against the sandbox, does the entitlement gate read current entitlements or a cached flag, is the transaction-updates listener started at launch. Causes: product IDs mismatch, unfinished transactions, revoked/expired handling missing, entitlement computed from purchase success rather than verification. Do not: grant features from an unverified transaction. See `references/monetization-storekit.md`.

**Performance/memory.** Evidence: Instruments trace, Hangs, memory graph, signpost intervals. Checks: main-actor work in the hot path, view body cost, retain cycles. Do not: optimize from intuition. See `references/performance.md`.

**Release-only behavior.** Evidence: behavior that differs between Debug and Release, or between Xcode-run and the exported `.app`. Checks: optimization-dependent code (uninitialized values, undefined behavior, `assert` vs `precondition`), `#if DEBUG` branches, different signing/entitlements per configuration, resources only copied in one configuration, StoreKit configuration only attached to the Debug scheme, App Sandbox enabled only in Release. Causes: relying on `DEBUG` side effects, timing changes exposing races, ad-hoc signing in Debug masking a Hardened Runtime restriction (e.g., loading unsigned plugins, JIT). Do not: ship without testing the actual Release build (`bash scripts/release-build.sh` then run the exported app). See `references/testing-quality.md`.

## Swift concurrency diagnostics

Swift 6 language mode diagnoses potential data races at compile time; treat those diagnostics as real defects found early, not as noise. The exact diagnostic text varies by compiler — confirm against the installed toolchain.

| Symptom | What it usually means | Right move |
|---|---|---|
| "non-Sendable type crossing actor boundary" | A reference type with mutable state is being handed to another isolation domain | Make the type a value, an actor, or `@MainActor`; pass only the data needed (`Sendable` snapshot) |
| "main actor-isolated property accessed from nonisolated context" | UI/model state read from a background task | Move the read into the main actor (`await MainActor.run` or isolate the caller); do not mark it `nonisolated(unsafe)` |
| "call to main actor-isolated method in a synchronous nonisolated context" | AppKit/SwiftUI API used off-main | Hop to main with `await`; check who called this synchronously |
| Runtime: `EXC_BREAKPOINT` in `_dispatch_assert_queue_fail` / "Incorrect actor executor assumption" | Code assumed an isolation it did not have (often a closure from a delegate/callback API) | Isolate the callback explicitly; wrap with a continuation that resumes on the right actor |
| UI freezes / beach ball, no crash | Main actor blocked: `DispatchSemaphore.wait`, synchronous file/network I/O, `Task { }.value` awaited synchronously, actor reentrancy deadlock | Instruments → Hangs; move the work off the main actor and `await` it; never block an actor waiting on another |
| Intermittent, timing-dependent failure | Unstructured `Task.detached` racing with owner, missing cancellation, actor reentrancy between two `await`s | Draw the ownership diagram first; prefer structured tasks; re-check invariants after every `await` inside an actor |

Escape hatches (`@unchecked Sendable`, `nonisolated(unsafe)`, `@preconcurrency`) are legitimate only with a written ownership argument in a comment: what serializes access and why the compiler cannot see it. Anything else is a suppressed race that will reappear in Release under different timing. See the concurrency section of `references/architecture.md`.

## Observability architecture

`print()` is for temporary investigation; remove it before committing, or it becomes noise that hides the signal next time. Production observability uses unified logging:

```swift
import os
// verify against installed SDK
enum Log {
    static let sync = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app", category: "sync")
    static let store = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app", category: "store")
}

Log.sync.info("Sync started, items=\(items.count)")                 // numbers are public by default
Log.sync.debug("Fetching \(url.host ?? "-", privacy: .public)")     // decide explicitly
Log.sync.error("Sync failed: \(error.localizedDescription, privacy: .public)")
Log.store.info("Account \(accountID, privacy: .private(mask: .hash))") // correlate without exposing
```

- One subsystem (the bundle ID), a small set of categories that map to architectural boundaries (sync, store, ui, purchases, licensing). Categories make `log show` filters and Console.app searches precise.
- Privacy levels are the point: strings interpolate as `<private>` by default in a released build. Mark public only what a support engineer needs; never log tokens, license keys, cookies, Authorization headers, file contents, or user-identifying data without hashing. Align with `PRIVACY_INVENTORY.md`.
- Levels: `debug` (not persisted by default), `info`, `notice` (default), `error`, `fault`. Use `fault` only for conditions that indicate a bug.
- Use `OSSignposter` for intervals you will want to see in Instruments (launch phases, import, render of a big table). Measurement details are in `references/performance.md`.
- Errors that reach the user should also reach the log with enough context to reproduce, minus secrets.

## Reading `.xcresult` and crash logs

```bash
bash scripts/test.sh --scheme "$SCHEME"                  # writes .artifacts/Tests.xcresult and a summary
xcrun xcresulttool get test-results summary --path .artifacts/Tests.xcresult   # verify subcommands against installed Xcode
xcrun xcresulttool get test-results tests --path .artifacts/Tests.xcresult
xcrun xcresulttool export attachments --path .artifacts/Tests.xcresult --output-path .artifacts/attachments
```

Prefer the structured result over scrolling console output: it carries per-test status, failure messages with file/line, attachments (screenshots from XCUITest), and coverage when enabled. The subcommand set changed across Xcode versions; run `xcrun xcresulttool --help` and use what the installed version offers.

Crash reports: open the `.ips` in Console.app or read it as text. Confirm the bundle ID and version match the build you are investigating. Unsymbolicated frames appear as addresses; symbolicate by opening the report in Xcode with the matching archive's dSYM available (Xcode → Window → Organizer keeps archive dSYMs), or with `atos -o <App.app/Contents/MacOS/App> -arch arm64 -l <load address> <frame address>`. Keep the dSYM for every released build — without it, user crash reports are unreadable. `bash scripts/collect-diagnostics.sh` copies recent reports for the bundle ID into `.artifacts/diagnostics/`.

## Console.app and `log` filtering

- Console.app → Start streaming, then filter by `subsystem:<bundle id>` and `category:<name>`; enable "Include Info Messages" and "Include Debug Messages" from the Action menu, otherwise you will not see `info`/`debug` output.
- Sandbox denials: search `process:<AppName>` with sender `Sandbox`, or `log show --predicate 'sender == "Sandbox" AND eventMessage CONTAINS "<AppName>"' --last 5m`.
- Reproduce with `log stream --predicate 'subsystem == "<bundle id>"' --level debug` running in a terminal to capture a clean timeline, then paste the excerpt (redacted) into the report.

## Anti-patterns that look like fixes

- Removing App Sandbox, Hardened Runtime, or an entitlement check because a denial appeared.
- `try?`, `!`, or empty `catch` at the crash site.
- `DispatchQueue.main.async` sprinkled until the warning disappears, with no reasoning about who owns the state.
- Cleaning DerivedData as the answer to a reproducible compiler error (fine as a first check for a non-reproducible one).
- Lowering the Swift language mode to make Sendable diagnostics vanish.
- Declaring the bug fixed after a green build without re-running the original reproduction.
