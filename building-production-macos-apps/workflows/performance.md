# Workflow: performance — make it measurably faster without making it worse

## Purpose
Turn "it feels slow" into a number, find the actual cause with a profiler, fix that cause, and prove the improvement with the same measurement. The failure modes this workflow prevents: optimizing code that was never the bottleneck, trading UI responsiveness for raw throughput, and "fixing" a hang by moving work to a detached task that now races. Fast hardware (a recent Apple Silicon Mac) hides main-actor blocking during development and does not excuse it; customers run older machines with other apps open.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh`; project facts: `bash scripts/project-info.sh` (scheme, configuration, Swift language mode, whether a Release configuration exists — Debug builds lie about performance).
- The symptom in the user's words, mapped to a category: launch time, UI hang/beach ball, slow list or table, slow operation (import, search, export), memory growth, energy/CPU while idle (menu-bar and background apps), animation or resize jank.
- A reproduction: the data set size, the action, the machine. Ask for or generate a realistic fixture (10× the expected data is a good stress size).
- What "fast enough" means for this product: a target the user agrees to (e.g., search results under 100 ms for 50k items; launch to usable window under 1 s; zero hangs over 250 ms in the main flow). Without a target, "faster" cannot be declared done.

Reference: `references/performance.md` throughout; `references/debugging-observability.md` for signposts and diagnostics; `references/architecture.md` for concurrency ownership when the fix moves work off the main actor.

## Steps

1. **Measure before touching code.** Build the Release configuration (`bash scripts/build.sh --configuration Release`) and reproduce with the fixture. Capture a baseline: wall-clock for the operation (an `OSSignposter` interval or a stopwatch around the call), hang detection output, memory footprint after the operation, CPU while idle for background apps. Write the numbers down; they are the "before" column of the report.

2. **Pick the instrument for the symptom.**
   - UI hang / beach ball → Hangs instrument and Time Profiler filtered to the main thread. Look for synchronous I/O, decoding, sorting, or layout on the main actor.
   - Slow operation → Time Profiler on the operation's signpost interval; invert the call tree to find the heaviest leaf.
   - Slow list/table/scroll → SwiftUI instrument (view body counts, update causes) plus Time Profiler; look for whole-list re-evaluation on a single-row change and for expensive `body` computation.
   - Memory growth → Allocations (persistent vs transient, generation marks between repetitions) and Leaks; look for retain cycles in closures and observers, decoded images kept at full size, unbounded caches.
   - Launch time → App Launch template; look for synchronous work in the app entry, eager container/model loading, network on launch.
   - Idle CPU/energy → Energy or CPU counters; look for timers, file-system watchers polling, animations running off-screen, `Task` loops that never sleep.
   - Animation/resize jank → Animation Hitches / Core Animation; look for layout thrash, custom drawing at 2× on large displays, non-cached rasterization.
   Record the instrument and the top three findings.

3. **Form one hypothesis** that explains the profile ("the table re-sorts the full array on every keystroke because the sort is inside `body`"). If the profile does not support a hypothesis, gather more evidence (`bash scripts/collect-diagnostics.sh` for hangs and crashes) rather than guessing.

4. **Fix the cause, respecting ownership.** Typical shapes, in order of preference: do less work (cache the derived value, sort once, paginate, debounce); do it in the right place (move decoding/parsing/I/O into an `async` boundary or an actor that owns the data, return values to the main actor); do it lazily (load detail on selection, thumbnail on appear); only then micro-optimize. Moving work off the main actor must keep a single owner for the mutable state; `Task.detached` and `@unchecked Sendable` are not performance tools. Preserve behavior: run `bash scripts/test.sh` after the change.

5. **Re-measure with the same procedure** in Release. Same fixture, same action, same instrument. Confirm the target is met and that memory and idle CPU did not regress. If the change helped but the target is unmet, return to step 2 with the new profile; do not stack speculative optimizations.

6. **Guard the gain where it matters.** For operations with a target, add a performance test (XCTest metrics with a baseline, or a Swift Testing timing assertion with a generous ceiling to avoid flakiness) or leave the `OSSignposter` interval in place so the next regression is visible in Instruments. Note the target in `ARCHITECTURE.md` under performance budgets.

7. **Verify in the running app**, not only in the profiler: perform the user's original action, resize the window during the operation, confirm the UI stays responsive and the result is unchanged. Use `/run` and `/verify` where available.

## Done when
- [ ] A baseline and an after measurement exist for the same reproduction in Release, and the agreed target is met or the shortfall is explained.
- [ ] The fix addresses the profiled cause; no speculative changes remain in the diff.
- [ ] No new concurrency escape hatches; state ownership is unchanged or explicitly re-documented.
- [ ] `scripts/test.sh` green; a performance guard (test or signpost) exists for the targeted operation where valuable.
- [ ] Memory, idle CPU, and UI responsiveness did not regress.

## End-of-task report
SKILL.md format plus a **Before/after** table: operation, fixture size, metric, before, after, target, instrument used. Under **Verified**: the profiler evidence in one sentence each and what was observed in the running app. Under **Not done / needs you**: targets not met, measurements that need the user's real data or an older Mac, and any architectural change proposed as an ADR (`templates/ADR.md`).
