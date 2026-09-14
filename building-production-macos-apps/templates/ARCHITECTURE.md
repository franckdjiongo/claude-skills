# Architecture — <App name>

<!-- Living document. Describe what IS, not what you hope for; when reality drifts, fix the doc or write an ADR. Keep each section short enough that a new session can read the whole file before touching code. Guidance: references/architecture.md. -->

Last updated: <YYYY-MM-DD> · Toolchain baseline: <from scripts/doctor.sh> · Deployment target: <macOS x.y>

## Module map
<!-- One line per module/target/package: name, responsibility, what it may depend on. Feature-oriented structure with explicit boundaries around I/O, persistence, platform services, and paid behavior. Not every app needs every layer; a menu-bar utility may be three folders. -->
| Module | Responsibility | May depend on |
|---|---|---|
| `Application` | Entry point, environment wiring, commands/menus | Features, Platform |
| `Features/<Name>` | Views + feature state for one user job | Domain, DesignSystem |
| `Domain` | Pure models and rules, no I/O | — |
| `Data` | Persistence and network boundaries | Domain |
| `Platform` | Keychain, file access, notifications, StoreKit, AppKit bridges | Domain |
| `DesignSystem` | Tokens, reusable controls, materials policy | — |

## State ownership
<!-- One owner per important piece of state. Name the type and its lifetime. -->
| State | Owner (type) | Lifetime | Exposed as |
|---|---|---|---|
| <e.g. "Selected project"> | <e.g. `ProjectSession` (@Observable)> | <window> | <Environment / Binding> |
| <View-local ephemeral state> | <the view (@State)> | <view> | — |

Rules: view-owned ephemeral → `@State`; shared feature state → `@Observable`; controlled mutation → `Binding`/`@Bindable`; subtree dependencies → Environment; durable data → persistence layer.

## Concurrency model
- Swift language mode: <5 | 6> per target (<why, and migration plan if not 6>)
- UI isolation: <what is `@MainActor`; how background work hands results back>
- Actors: <list each actor and the mutable state it serializes>
- Cancellation: <where tasks are scoped; what happens on window close / app quit>
<!-- No @unchecked Sendable or nonisolated(unsafe) without an ownership argument recorded here or in an ADR. -->

## Persistence
- Store: <SwiftData | files | SQLite | none> — <why>
- Schema versioning: <how version N+1 migrates data from N; what happens if migration fails>
- Export: <can user-created data leave the app? format>
- Test isolation: <in-memory / temp-directory container used by tests>

## Networking
- Boundary type: <e.g. `APIClient` protocol + `URLSession` implementation>
- Policy: <timeouts, retry, cancellation, error mapping, decoding>
- Secrets: <where tokens live (Keychain), how they are redacted from logs>
- Test substitution: <protocol mock / URLProtocol stub>

## Platform services
<!-- Each capability with its entitlement and where it is wrapped. Keep in sync with PRIVACY_INVENTORY.md. -->
| Capability | Entitlement / permission | Wrapper |
|---|---|---|
| <e.g. "User-selected folders"> | <`com.apple.security.files.user-selected.read-write`> | <`FileAccessService`> |

## Design system
<See DESIGN_SYSTEM.md. Note here only where it lives (`DesignSystem/`) and any deliberate deviations.>

## Testing strategy
| Layer | Tool | Where | Runs in |
|---|---|---|---|
| Domain/state | Swift Testing | `Tests/DomainTests` | `scripts/test.sh` |
| Persistence/migration | Swift Testing + temp store | `Tests/DataTests` | `scripts/test.sh` |
| Critical journeys | XCUITest (<n> tests max) | `Tests/UITests` | `scripts/test.sh --ui` |
| Release smoke | manual/agent | `workflows/release.md` | before every release |

## Open questions
- <Question — owner — decision needed by>

## Decisions (ADRs)
<!-- One line per ADR in docs/adr/, newest first. Template: templates/ADR.md -->
- <ADR-0001 — Distribution channel: Mac App Store — accepted YYYY-MM-DD>
