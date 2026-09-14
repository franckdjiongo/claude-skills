# Platform baseline

A platform baseline is the set of facts that decide which APIs you may call, which compiler diagnostics you must satisfy, and which machines can run the result: Xcode lane (stable or beta), SDK, deployment target, Swift language mode, and CPU architectures. Establish it once per session from the real machine and project, write it down, and let every later decision refer to it. Nothing in this file states a current version number on purpose; versions rot, the method does not.

## Detect, then decide

Run the detection scripts before choosing anything:

```bash
bash scripts/doctor.sh              # machine + toolchain, read-only
bash scripts/project-info.sh [dir]  # project facts, read-only; --json for machine output
```

`doctor.sh` reports, in order: macOS version, CPU architecture (`uname -m`), the selected developer directory (`xcode-select -p`), `xcodebuild -version`, the installed SDKs (`xcodebuild -showsdks`), the Swift compiler version, Git, and whether `xcrun agent skills export` is supported by the selected Xcode. It also lists other Xcode installs it can see under `/Applications`. Read it as a whole: the SDK line tells you the *ceiling* of available API, the project's deployment target tells you the *floor* you must still support, and the gap between them is exactly the territory where `#available` lives.

`project-info.sh` adds the project side: workspace vs project, schemes, targets, `MACOSX_DEPLOYMENT_TARGET`, `SWIFT_VERSION` and strict-concurrency settings, entitlements, Sandbox state, privacy manifest presence, packages, and test targets. For a greenfield request there is no project yet, so the deployment target is a decision you make (below) and record in `templates/ARCHITECTURE.md`.

State the baseline in one paragraph before writing code (SKILL.md's "How to work in a session" step 1). A baseline that lives only in your head is re-derived, differently, next session.

## Stable vs beta Xcode lanes

Apple normally has a stable Xcode/macOS pair and, for part of the year, a beta pair of the next major version. Treat them as two lanes:

| Lane | Use it for | Do not use it for |
|---|---|---|
| Stable (release Xcode, release SDK) | Everything that ships: release archives, notarization, App Store submissions, the CI baseline, the default for every feature | Experimenting with APIs that do not exist in its SDK |
| Beta (beta Xcode, beta SDK) | Forward-compatibility checks: does the app build, do deprecations appear, do new UI behaviors (glass, windowing) change the look; prototyping a feature that needs a new API behind `#available` | Producing the artifact you distribute; deciding a signature is final; adopting an API in shipped code without a stable-SDK fallback |

Reasons: App Store submissions must be built with a released Xcode; beta SDK API signatures can change between betas; and a beta-only feature paints the app into a corner if the user's macOS lags. So ship on stable by default. Move to beta only when the user explicitly asks, or when the release note says the stable version is discontinued for submissions, which `doctor.sh` cannot tell you; verify that against Apple's current release information rather than memory.

When a project is opened with the beta lane, run the build in *both* lanes when practical: a green beta build plus a green stable build is the real signal. Record which lane produced any artifact in the release report.

## Choosing and reading the deployment target

The deployment target is a product decision disguised as a build setting. It decides which of your users can install the app, and how much `#available` branching you carry.

Reading it: `project-info.sh` prints `MACOSX_DEPLOYMENT_TARGET` per target. If targets disagree, ask why; an app target lower than its embedded framework or extension fails at launch on older systems, and a test target higher than the app target can hide availability bugs.

Choosing it for a new project:

- Default to the previous major macOS release (SDK major minus one). It covers most active Macs, keeps current-year API usable behind `#available`, and matches what most commercial Mac apps do at launch.
- Choose the current major release only when the product is built around APIs that exist only there (a Liquid Glass-first design, a new framework) and the user accepts the smaller audience. Write that trade-off into an ADR.
- Go lower than minus one only when the user names a real audience (managed fleets, education) that is pinned to older systems. Each extra version back multiplies the fallback surface and the manual QA matrix.
- Never raise an existing project's target as a "fix" for a compile error; that silently drops users. Propose it, with the reason, and let the user decide.

## Swift language mode

`project-info.sh` reports `SWIFT_VERSION` and any `SWIFT_STRICT_CONCURRENCY` / upcoming-feature flags. Two modes matter:

- **Swift 6 language mode** turns data-race safety into compile-time diagnostics: sending non-`Sendable` values across isolation boundaries, mutating shared state from the wrong actor, and unsafe global variables become errors. This is the production standard for new projects because a race caught by the compiler costs minutes; one caught in a crash report costs a release.
- **Swift 5 language mode** on a Swift 6 compiler compiles the same code with those checks as warnings or silence, depending on strict-concurrency settings. Existing projects often live here. It is a legitimate *migration* state, not a destination.

Decide by project state, not preference:

- New project: Swift 6 mode from the first commit. Retrofitting is the expensive path.
- Existing project in Swift 5 mode: keep the mode for feature work; set strict concurrency to "complete" as warnings first, fix module by module, and flip the mode as a dedicated refactor (`workflows/refactor.md`), never as a side effect of a feature branch.
- Existing project already in Swift 6 mode: any diagnostic you see is a real ownership question. See the concurrency rules in `references/architecture.md`; do not reach for `@unchecked Sendable` or `nonisolated(unsafe)` to make the mode "pass".

The language mode is per target or per package; packages in the project may differ from the app. Check both before assuming a diagnostic policy.

## SDK availability, `#available`, and the fallback policy

An API is usable when three things line up: it is in the installed SDK (ceiling), the deployment target allows it unconditionally (floor), or you guard it. Policy:

1. Confirm the API exists in the installed SDK and confirm its signature against the exported Apple skill (`.apple-skills/`, produced by `scripts/export-apple-skills.sh`) or current documentation. Do not trust a remembered signature, especially for anything first seen in a beta.
2. If the deployment target is at or above the API's introduction, call it directly.
3. Otherwise wrap it in `if #available(macOS X, *)` with a fallback that is *functionally acceptable*, not merely compiling. For visual APIs (glass, new materials) the fallback is the system-standard control or material. For behavioral APIs, the fallback either provides the same outcome another way or the feature is hidden on older systems and the ADR says so.
4. Keep availability checks at the edge of the feature, not sprinkled through views; a single `@ViewBuilder` helper or a small adapter type per capability keeps the rest of the code readable.
5. Do not add `#available` for versions below the deployment target; the compiler already knows, and the check is dead code that misleads readers.

```swift
// verify against installed SDK
struct PrimaryActionButton: View {
    let title: LocalizedStringKey
    let action: () -> Void
    var body: some View {
        if #available(macOS 26, *) {           // introduction version: confirm in exported Apple skill
            Button(title, action: action).buttonStyle(.glassProminent)
        } else {
            Button(title, action: action).buttonStyle(.borderedProminent)
        }
    }
}
```

The version numbers in such a guard are facts you verify, not facts you recall.

## Apple Silicon vs universal builds

`doctor.sh` prints the host architecture. Most current Macs are Apple Silicon, but the *target* decision is separate from the host:

- Ship universal (`ARCHS = $(ARCHS_STANDARD)`, the Xcode default) unless the user explicitly limits the audience to Apple Silicon. A universal binary costs build time and download size, not engineering complexity.
- Ship Apple Silicon only when a dependency has no Intel slice, or the deployment target is high enough that Intel support is a non-goal and the user agrees. Record it as an ADR because it is a support-matrix decision.
- Verify with `lipo -archs` on the built binary in `scripts/verify-release.sh` output; a "universal" project with an arm64-only package silently produces an arm64-only app or a link failure under Rosetta.
- Test at least a smoke run under Rosetta (`arch -x86_64`) when shipping universal from an Apple Silicon host; some bugs (alignment, unsafe pointer code in C dependencies) appear only there.

## Multiple Xcode installs

Developers keep several Xcodes. The one that answers `xcodebuild` is decided by, in precedence order: the `DEVELOPER_DIR` environment variable, then `xcode-select -p`. Consequences:

- `doctor.sh` reports the *selected* Xcode. If the user says "use the beta" and doctor shows the stable path, do not switch globally with `sudo xcode-select -s` on your own; that changes every terminal on the machine. Prefer scoping it: `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer bash scripts/build.sh ...`. All scripts honor `DEVELOPER_DIR`.
- Record the lane in every build/test/release report. A test run from the beta lane and a release from the stable lane are different evidence.
- `xcrun agent skills export` exports the skills of the *selected* Xcode. Exported skills from a beta describe beta APIs; keep the export directory labeled by lane (the script names it) and do not mix them.
- Never delete or move an Xcode install, and never run `xcodebuild -runFirstLaunch` or license acceptance without telling the user; both are side effects on the machine.

## When to consult the exported Apple skills

The exported Apple skills (SwiftUI specialist, "what's new") are the most current API knowledge available offline and always outrank this skill's references (`references/source-refresh.md`). Open them when:

- writing any SwiftUI code that touches new-year features: Liquid Glass, toolbar or window APIs, scene modifiers, Observation changes;
- a compiler says a modifier or initializer does not exist, before assuming the API was renamed;
- a beta lane is in use, for every non-trivial API;
- a deprecation warning appears, to learn the replacement rather than silencing it.

If `doctor.sh` reports no export support, say so in the baseline paragraph and fall back to current Apple documentation for version-sensitive APIs; do not fill the gap from memory.

## Decision table: situation → baseline choice

| Situation | Xcode lane | Deployment target | Language mode | Architectures | Notes |
|---|---|---|---|---|---|
| New commercial app, general audience | Stable | SDK major − 1 | Swift 6 | Universal | Default. Record in `ARCHITECTURE.md`. |
| New app built around a current-year API (glass-first UI, new framework) | Stable | Current major | Swift 6 | Universal | ADR states the audience trade-off; fallback plan for each new API anyway. |
| New app for a pinned fleet (education, enterprise) | Stable | As required by the fleet | Swift 6 | Universal | Expect a larger `#available` surface; QA matrix includes the oldest system. |
| Existing app, Swift 5 mode, feature request | Stable | Keep | Keep, strict concurrency warnings on | Keep | Do not flip mode mid-feature. |
| Existing app, migration to Swift 6 requested | Stable | Keep | Swift 6, module by module | Keep | `workflows/refactor.md`; characterization tests first. |
| User asks "does it still work on the next macOS?" | Beta (scoped via `DEVELOPER_DIR`) | Keep | Keep | Keep | Build + smoke run only; do not ship from it; report deprecations. |
| Compile error that "goes away" by raising the target | Stable | Propose, do not change | Keep | Keep | Find the `#available` boundary instead; user decides on the target. |
| Dependency lacks an Intel slice | Stable | Keep | Keep | Apple Silicon only, or replace the dependency | ADR either way. |
| Release archive, App Store or Developer ID | Stable only | Project value | Project value | Project value | Beta-built artifacts are not release candidates. |
| `doctor.sh` shows no Xcode or no SDK | — | — | — | — | Stop; report the missing prerequisite. Planning and review can continue without a toolchain. |

When a row does not fit, apply the reasons behind it: ship from stable, keep the floor as low as the product needs and no lower, prefer compile-time race checking, prefer universal, and verify every version-sensitive fact against the machine or the exported Apple skills.
