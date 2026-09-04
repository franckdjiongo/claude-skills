# Architecture

The architectural goal is a small number of explicit boundaries: around I/O, persistence, platform services, and commercially sensitive behavior (licensing, payments, privacy-relevant data). Inside those boundaries, keep the code as plain as the app allows. Every rule below exists to give each important piece of state one understandable owner and each side effect one place to happen; when a rule would add a layer without adding an owner, skip it.

Contents: layout · sizing abstractions · state ownership · view splitting · concurrency · dependency injection · AppKit boundary · ADR habit.

## Recommended layout (feature-oriented)

This is a recommendation for new projects and a vocabulary for describing existing ones, not a mandate. An existing project keeps its layout unless an ADR says otherwise.

```text
App/
├── Application/            # process lifecycle, scenes, commands, composition root
│   ├── AppEntry.swift      # @main App: scenes, Settings, commands
│   ├── AppEnvironment.swift# composition root: builds services, injects them
│   └── Commands/           # menu bar command groups, one file per menu area
├── Features/               # one folder per user-facing capability
│   ├── Dashboard/          # views + feature model + feature-local types
│   ├── Settings/
│   └── .../
├── Domain/                 # pure Swift: entities, rules, calculations; no imports of UI or I/O frameworks
├── Data/                   # persistence and networking: SwiftData models, repositories, API clients, DTOs
├── Platform/               # macOS-specific services: Keychain, file access, notifications, AppKit wrappers
├── DesignSystem/           # tokens (AppSpacing, AppSurface, AppText, AppShape), reusable styled components
├── Resources/              # asset catalogs, String Catalogs, PrivacyInfo.xcprivacy, entitlements
└── Tests/                  # mirrors the above: DomainTests, DataTests, FeatureTests, UITests
```

Why this shape: a feature folder is where a task starts ("change how Dashboard filters"), so co-locating its view and model shortens every edit. `Domain` has no framework imports so it tests in milliseconds and survives UI rewrites. `Data` and `Platform` are the seams you substitute in tests. `DesignSystem` is where visual consistency is enforced (`references/liquid-glass.md`). The dependency direction is one way: Features → Domain, Features → Data/Platform through protocols, never Domain → anything.

Use folders inside one target for small apps. Split into Swift packages (`Domain`, `Data`, `DesignSystem`) only when build time, reuse across targets (extensions, a helper tool), or team boundaries justify it; packages add build configuration to maintain and a language-mode setting per package to keep consistent (`references/platform-baseline.md`).

## Sizing abstractions to the app

| App shape | Enough | Too much |
|---|---|---|
| Menu-bar utility, one or two windows, little data | `App` + one feature folder per window, one `@Observable` model per feature, a `Platform/` service or two, direct `UserDefaults` for preferences | Repository protocols over nothing, a "core" package, a use-case layer |
| Single-window productivity app with persistence | The full layout above, repository protocols around SwiftData, an `AppEnvironment` | Generic event buses, view-model-per-row |
| Document-based app | `DocumentGroup`/`FileDocument` or `ReferenceFileDocument` as the persistence boundary, per-document model, undo manager integration from day one | A database that duplicates the document model |
| Multi-window app with shared services (sync, licensing, background work) | Everything above plus actors for shared mutable services and an explicit background-work owner | Singletons reached from views |

Ask "which of these boundaries will this app cross in its first year?" and build only those. A boundary you add later with a refactor and tests costs less than one carried unused from the start.

## SwiftUI state ownership

The wrappers are not interchangeable; each one declares who owns the value and who may change it. Choose by answering "who owns this, who mutates it, and how long does it live?"

| Need | Tool | Owner and lifetime | Notes |
|---|---|---|---|
| Ephemeral view-local state (hover, expanded, text being typed) | `@State` with a value type | The view; dies with the view | Never the place for data another view needs. |
| Shared feature state, mutated from several places | `@Observable` class, held by `@State` in the owning view or created in `AppEnvironment` | The creating view or the environment; lifetime of that owner | Observation tracks only the properties a body reads, so keep models granular enough to avoid whole-screen invalidation. |
| A child that must edit a parent's value | `Binding` (to `@State`) or `@Bindable` (to an `@Observable`) | Still the parent | The child reads and writes; it does not own. Prefer passing a `Binding` to one property over the whole model. |
| A dependency needed by a subtree or the whole app (services, theme, current user) | `Environment` with a custom key or `.environment(model)` | The injector, usually `AppEnvironment` or a scene | Use for dependencies, not as a global mutable store for feature data. |
| Durable data (user content, settings the user expects to persist) | Persistence layer: SwiftData, files, `UserDefaults` via a typed wrapper | The store; outlives the process | Views see it through a feature model or a query, never through raw store calls in `body`. |
| Anything that leaves the process (network, file system, Keychain, other apps) | Explicit service behind a protocol in `Data/` or `Platform/` | The service; injected | Results flow into a model; the view never awaits a network call directly. |

A model that contains `var isLoading`, `var items`, `var error` and one method per user intent is usually the right size. Split it when two parts change at different rates or are owned by different features. Merge when views need to coordinate state that only one of them holds.

For legacy `ObservableObject`/`@Published` code: keep it working; migrate to `@Observable` as a dedicated refactor with tests, since the update semantics differ (per-property tracking versus whole-object publish).

## Split views by update boundary, not line count

A view invalidates when any observed value it reads changes. Split a view when two pieces of data change at different frequencies (a live progress value next to a static header), when a subtree is expensive to rebuild (a table body), or when a subtree would benefit from its own `@State`. Do not split merely because a body is long; a 120-line body reading one model is cheaper to understand than five 25-line views passing bindings around.

Practical signals: a text field lagging while typing (the whole screen rebuilds per keystroke: move the field and its state into a subview), a list re-rendering on unrelated toggles (extract the row and give it only the properties it needs), a preview needing half the app's environment (the view depends on more than it should).

## Swift concurrency rules

Compile-time data-race checking (Swift 6 language mode, `references/platform-baseline.md`) is the standard; the rules keep the code honest under it.

Prefer:

- `async/await` for anything that waits. Completion handlers stay only at the edge where a framework offers nothing else, wrapped once.
- Structured concurrency: `async let` and task groups inside a function; `.task(id:)` on views for work tied to a view's lifetime. Structure gives you cancellation and error propagation for free.
- Actors only for mutable state that is genuinely shared across isolation domains and must be serialized (a cache, a connection pool, a write-behind queue). A type that only one owner mutates does not need an actor; make it a value or keep it on the owning actor.
- Explicit UI isolation: models that drive views are `@MainActor`. Say it in the type declaration, not with `DispatchQueue.main.async` sprinkled through methods.
- Cancellation-aware operations: check `Task.isCancelled` or call `try Task.checkCancellation()` inside loops and between steps; pass cancellation to `URLSession` and long file work naturally by keeping them inside the task.
- Value semantics across boundaries: send `struct`s and `enum`s between actors; they are `Sendable` for free when their members are.

Resist, and treat each occurrence as a design question first:

- `@unchecked Sendable`: acceptable only with an internal lock or immutability that the compiler cannot see, and a comment naming that guarantee.
- `nonisolated(unsafe)`: acceptable for write-once globals initialized before concurrency starts, with a comment; otherwise it hides the race the compiler found.
- `Task.detached`: acceptable when the work must outlive its caller and must not inherit the caller's actor or priority, and something owns the returned task (stores it, cancels it on teardown). An unowned detached task is a leak of work.
- `DispatchQueue` for new code: only when wrapping a legacy API; it has no cancellation, no structured errors, and no isolation the compiler can check.

When a diagnostic appears, name the two isolation domains involved and the value crossing between them; the fix is one of: make the value `Sendable` (usually by making it a value type), move the mutation to its owner, or move the owner to an actor. Suppression is not on the list.

```swift
@MainActor @Observable
final class ProjectListModel {
    private(set) var projects: [Project] = []
    private(set) var isLoading = false
    private let repository: any ProjectRepository   // protocol from Data/, injected

    init(repository: any ProjectRepository) { self.repository = repository }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do { projects = try await repository.allProjects() }   // repository does its own isolation
        catch is CancellationError { /* view went away; nothing to show */ }
        catch { /* map to a user-facing error state; see references/macos-ux.md */ }
    }
}
```

## Dependency injection via `AppEnvironment`

One composition root builds every service once and hands them down; nothing reaches for a singleton from inside a view or model. The root is small: a `struct` or final class with the services as properties and two factories, `live()` and `preview()`/`test()`.

```swift
struct AppEnvironment {
    let projects: any ProjectRepository
    let secrets: any SecretStore          // Keychain-backed in live, in-memory in tests
    let api: any APIClient
    let clock: any Clock<Duration>

    static func live(modelContainer: ModelContainer) -> AppEnvironment { /* real services */ }
    static func test() -> AppEnvironment { /* in-memory container, stub client */ }
}
```

Inject with `.environment(\.appEnvironment, env)` at the scene root; feature models receive the specific services they need in their initializers, so their tests never construct the whole environment. Keep protocols narrow (three to six methods) and named after what they do for the app, not after their technology (`ProjectRepository`, not `SwiftDataStore`). This is also the seam for `references/data-network-security.md` test substitution and for previews that must not touch real data.

## AppKit interop boundary

SwiftUI is the default; AppKit is a deliberate choice when it is the better Mac engineering answer: an `NSTableView`/`NSOutlineView` with behavior SwiftUI's `Table` lacks, a custom text engine, `NSSavePanel` accessory views, precise window chrome, or a mature control that a custom SwiftUI rewrite would only imitate. Rules for the boundary:

- Wrap once, in `Platform/` or `DesignSystem/`, with `NSViewRepresentable` / `NSViewControllerRepresentable`. The wrapper exposes a SwiftUI-shaped API (bindings, closures) and hides `NSView` from the feature.
- Keep coordinator state minimal and unidirectional: SwiftUI values go in through `updateNSView`; AppKit events come out through closures or bindings. Two-way "sync" loops are the usual source of feedback bugs.
- Respect isolation: AppKit is main-thread; the representable is implicitly `@MainActor`; do not hand `NSView` references to other actors.
- Document why AppKit was chosen in a comment at the top of the wrapper and, for anything user-visible, in an ADR. "SwiftUI fought me" is a debugging note, not a reason; "SwiftUI `Table` has no column reordering persistence in our deployment target" is.
- Re-evaluate at each deployment-target bump: the reason may have disappeared, and the exported Apple skills will say so.

## The ADR habit

Any decision that a future session could reasonably reverse by accident deserves an ADR from `templates/ADR.md`: layout deviations, package splits, the persistence technology, AppKit escape hatches, concurrency patterns beyond the defaults, deployment target, architectures, distribution channel, monetization model. An ADR is five to twenty lines: context, decision, alternatives, consequences. Its value is that the *next* engineer (or the next invocation of this skill) reads a reason instead of guessing one and undoing it.

Keep `ARCHITECTURE.md` (`templates/ARCHITECTURE.md`) as the current picture and the ADR folder as the history. When inspecting an existing project (constitution: inspect before editing), read both first; if neither exists, write a short `ARCHITECTURE.md` describing what you found before changing it, so the "before" state is recorded.
