# Performance

Performance work has one rule: measure, change one thing, measure again. Intuition about where time goes is wrong often enough that an unmeasured optimization is a refactor with a made-up justification. The procedure lives in `workflows/performance.md`; this reference covers what to measure, how, and the Mac-specific traps.

## Two different problems: responsiveness and throughput

**UI responsiveness** is whether the main actor is free to draw the next frame and answer the next keystroke. **Throughput** is how fast the machine finishes a job. A fast machine improves the second and does nothing for the first: a 200 ms synchronous file read on the main actor is a visible hitch on an M5 Pro exactly as it is on an older laptop, and a semaphore wait is a hang on any hardware. Treat "it is fast on my Mac" as no evidence about responsiveness. Separate the two in reports: frame hitches and hangs are responsiveness defects; long imports are throughput work to be moved off the UI actor and shown with progress.

## Profile before optimizing — Instruments

| Instrument | Use it when | What to look for |
|---|---|---|
| Time Profiler | Anything is slow; first stop | Heaviest stack on the main thread; inverted call tree; "Hide system libraries" off first, then on |
| Hangs | Beach ball, stalls, keystroke lag | Main-thread hangs over the threshold with the blocking stack; run the app normally, not under a microbenchmark |
| SwiftUI | Views updating too often, sluggish interaction | Body evaluation counts and durations per view; which dependency triggered the update |
| Animation / Core Animation | Jank during transitions, resize, scrolling | Frame duration spikes, commits per frame, offscreen rendering |
| Allocations | Memory growth, churn during scrolling | Persistent allocations by category; generation analysis between two points of steady state |
| Leaks + Memory Graph Debugger | Memory never returns after closing a window/document | Leaked objects; retain cycles (closures capturing `self`, delegate strong references, timers) |
| Energy / Activity Monitor energy impact | Menu-bar or background apps | Wakeups, CPU while idle, timers firing when nothing changed |
| File Activity, Network | I/O suspected | Synchronous calls on the main thread, chatty polling |

Profile the **Release** configuration (Profile action uses it by default) with the same data volume users have; a Debug build without optimization misattributes time, and a 20-row fixture hides the 20,000-row problem. Save the trace under `.artifacts/` and name it with the scenario and date.

## Main-actor hygiene

The main actor is a budget of roughly one frame at the display's refresh rate; everything that runs there competes with input handling and rendering.

- Do on the main actor only: state mutation that drives UI, view body evaluation, AppKit calls. Do elsewhere: parsing, decoding, image decoding and resizing, file I/O, hashing, network waits, database queries over large sets, sorting/filtering large collections.
- Never block it: no `DispatchSemaphore`/`DispatchGroup.wait`, no synchronous `Data(contentsOf:)` on user files, no `Task { }` whose result is awaited synchronously, no `Thread.sleep`. Blocking in an `async` main-actor function is still blocking.
- Batch UI updates: mutate observable state once per unit of work, not per element in a loop. A background task that streams 10,000 updates to an `@Observable` model produces 10,000 invalidations.
- Prefer `Task` with explicit priority (`.userInitiated` for work the user is waiting on, `.utility`/`.background` for indexing and sync) and check `Task.isCancelled` in loops so a closed window stops its work.
- Actors are for serialized mutable state, not for "background threads"; an actor that does heavy compute still needs to avoid reentrancy hazards and should not be awaited synchronously by the main actor. See the concurrency section of `references/architecture.md`.

## SwiftUI update boundaries and view-body cost

SwiftUI re-evaluates a view's body when a dependency it read changes. Costs come from bodies that are expensive, bodies that run too often, or both.

- Make bodies cheap: no formatting, sorting, filtering, date math, or image decoding inline. Compute derived values in the model when inputs change, or cache them in `@State` keyed on inputs.
- Split by update rate, not by line count: a view that reads a frequently changing value (progress, timer, live search text) should be a small separate view so its parent is not re-evaluated with it. This is the "update boundary" idea from Apple's current guidance; use the SwiftUI instrument to confirm which views update on which change.
- Observation tracks properties actually read in the body; reading a whole model where one field is needed widens the dependency. Pass narrow values into child views.
- Stable identity: explicit `id` for `ForEach` over value collections; avoid constructing new reference-type objects inside body (fresh `@StateObject`/`@State` initial values are fine, new model objects per body are not).
- Avoid `AnyView` and deep conditional trees in hot lists; prefer `@ViewBuilder` branches with stable structure.
- `GeometryReader` for measurement is fine; as a general layout tool in lists it multiplies layout passes.

## Lists and tables with large data

- `List` and `Table` are lazy over their rows; the row view must still be cheap. Precompute row display models (strings, formatted numbers, thumbnails) off the main actor and hand rows immutable values.
- Sorting and filtering happen in the model, incrementally when possible, never in body. For SwiftData, fetch with predicates and sort descriptors and use fetch limits or paging rather than loading everything and filtering in Swift.
- Thumbnails: decode and downsample once (image I/O at the target pixel size), cache by identifier, cancel decoding when the row scrolls away.
- Selection in large tables should be by identifier, not by object; `Table` with tens of thousands of rows needs measured verification of scroll, sort, and selection; if SwiftUI cannot hit the target, `NSTableView` via `NSViewRepresentable` is a legitimate choice — record it as an ADR with the measurement that justified it (`references/macos-ux.md`).

## Launch time

- Measure with signposts across launch phases (process start → first window visible → interactive → data loaded) and with the App Launch template in Instruments. Users judge "first window visible"; deferred loading behind it is acceptable if the window is honest about loading state.
- Move off the launch path: store opening for large stores, network calls, migrations (run with a visible progress state), font/image registration, StoreKit product fetch (start it, do not block on it; the entitlement gate uses cached entitlements at launch — `references/monetization-storekit.md`).
- Avoid heavy static initializers and `+load`-style side effects; watch dynamic library count in the launch trace.
- Window restoration must not reopen ten heavy documents synchronously; restore lazily.

## Memory

- Leaks are usually closures capturing `self` in long-lived callbacks, `NotificationCenter`/KVO observers not removed, timers retaining targets, delegate properties declared strong, or parent/child model references without `weak`. Use the Memory Graph Debugger after closing a window: the window's views and models should be gone.
- Images: decode at the display size, never keep full-resolution bitmaps for thumbnails; use `NSCache` (evicts under pressure) rather than dictionaries for caches; clear caches on memory-pressure notifications.
- Document apps: unloading a closed document must release its model graph; check with Allocations generation analysis (open → close → open → close, then compare).
- Steady-state growth during normal use is a defect even if the absolute number looks small on a 64 GB machine — users run many apps.

## Energy for menu-bar and background apps

An app living in the menu bar is judged on idle behavior. Idle CPU should be near zero and wakeups rare.

- Replace polling timers with event sources: file-system events for watched folders, notifications for system state, push or long-poll only when the product needs it. If a timer is unavoidable, use a tolerance so the system can coalesce wakeups.
- Cancel work when the popover/window closes; suspend refresh when the display is asleep or the app is not visible.
- Batch network activity; respect low-power mode where the API exposes it (confirm against the installed SDK).
- Verify with Activity Monitor's Energy tab and the Energy Log in Instruments over a realistic idle period (10+ minutes), and record the wakeups/second before and after.

## Measuring: signposts and XCTest metrics

```swift
import os
// verify against installed SDK
let signposter = OSSignposter(subsystem: Bundle.main.bundleIdentifier ?? "app", category: "import")

func importLibrary(_ url: URL) async throws {
    let id = signposter.makeSignpostID()
    let state = signposter.beginInterval("importLibrary", id: id, "\(url.lastPathComponent, privacy: .public)")
    defer { signposter.endInterval("importLibrary", state) }
    // work…
}
```

Intervals appear in Instruments as a lane you can correlate with CPU and hangs; they cost almost nothing when nobody is recording. Instrument the phases the product cares about (launch, open, import, export, search) and keep them — they are the observability for the next performance report.

For repeatable local measurements, use XCTest performance tests with metrics (`XCTClockMetric`, `XCTCPUMetric`, `XCTMemoryMetric`, `XCTStorageMetric`; `XCTApplicationLaunchMetric` in UI tests) and set a baseline in the test plan so regressions fail the full plan. Run them on the Release configuration and treat the numbers as machine-specific: compare against the baseline recorded on the same machine class.

## Before/after report format

Every performance change ends with this, kept in the PR or ADR:

```
Scenario:      <what the user does, data size, configuration (Release), machine>
Metric:        <hang count / p95 frame time / wall time / peak memory / wakeups per s>
Before:        <value, trace name in .artifacts/>
Change:        <one sentence, the single thing that changed>
After:         <value, trace name>
Verified:      <re-ran scenario N times; tests passed; no behavior change>
Not addressed: <remaining hotspots, in order>
```

If the "after" is not better on the metric you named, revert, even if the code looks nicer.

## Common Mac-specific issues

- **Window resize jank**: bodies re-evaluated on every resize step because layout reads window size through `GeometryReader` or environment, or because an expensive view is not isolated. Check with the Animation instrument while dragging the corner; isolate the expensive subtree and give it stable size proposals.
- **Timeline/animation cost**: `TimelineView` and continuous animations keep bodies evaluating; scope them to the smallest view and pause them when the window is inactive or occluded.
- **File-system watching**: watching a whole home directory with fine-grained events produces floods; coalesce events, debounce, and process off the main actor. Re-scanning the tree on every event is the classic energy and hang source in sync-style apps.
- **Sidebar + detail**: switching selection re-creating the entire detail view with fresh model loads; keep loaded detail state in the model keyed by selection.
- **Multiple displays / high scale factors**: rendering large images or custom-drawn views at 2x on a large external display multiplies pixel work; cache rasterized layers where content is static.
- **Sandbox file access**: repeated security-scoped resource start/stop around each small read is slow; scope once per operation.
