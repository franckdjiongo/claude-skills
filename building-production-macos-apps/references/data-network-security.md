# Data, networking, and security

A shipping app's user data is a contractual responsibility, and its secrets are a liability. This reference covers where information lives, how it crosses the network, and which security class each kind of information belongs to. Read `references/distribution-security.md` for signing, notarization, and entitlement mechanics at release time; this file is about the code.

## Contents

1. Where does this information belong?
2. SwiftData patterns
3. Schema versioning and migration
4. Networking boundary
5. Security classes
6. Keychain patterns
7. App Sandbox and entitlement minimization
8. Logging hygiene
9. Keeping `PRIVACY_INVENTORY.md` true

## 1. Where does this information belong?

Ask before choosing a store. Most persistence bugs are the wrong store chosen for convenience.

| Information | Default home | Why |
|---|---|---|
| Ephemeral view state (selection, expansion, scroll) | `@State` / `@SceneStorage` | Not data; should die with the view or restore with the scene |
| Ordinary preferences (toggles, last folder, sort order) | `UserDefaults` via a typed preferences object | Small, non-sensitive, needs no migration story |
| Tokens, passwords, license keys, activation tokens | Keychain | Encrypted at rest, survives reinstall, never leaves the device unencrypted |
| Structured user-created records with relationships and queries | SwiftData (or Core Data / SQLite if the project already uses them) | Needs querying, migration, and integrity |
| Documents the user owns and names | Files via the document system or user-selected locations | The user expects to see, move, back up, and share them |
| Large blobs (media, exports, caches) | Files in Application Support or Caches | Databases are a poor fit; caches must be reconstructible |
| Anything that must not survive a crash | Memory only | If it is written, it is data you must migrate and protect |

"Does this actually belong in a database?" is a legitimate answer of "no" more often than new code assumes. A menu-bar utility with twelve preferences needs `UserDefaults` and nothing else.

## 2. SwiftData patterns

Confirm API signatures against the exported Apple skill or current documentation; the shape below is stable.

- One `ModelContainer` configured at app start from an explicit `ModelConfiguration` (store URL, in-memory flag, CloudKit or not). Create it in `AppEnvironment`, not ad hoc in views, so tests can substitute one.
- `ModelContext` is the unit of work: fetch, insert, delete, save. UI reads through the main-actor context; background imports use a separate context tied to the same container and hand identifiers, not model objects, back to the main actor.
- Keep `@Model` types free of UI concerns and free of business rules that belong in `Domain/`. Models are storage shape; domain types are behavior.
- Saves are explicit at meaningful boundaries (end of an edit, end of an import), not after every keystroke. Autosave exists, but relying on it hides when data is actually durable.

```swift
// verify against installed SDK
static func makeContainer(inMemory: Bool = false) throws -> ModelContainer {
    let config = ModelConfiguration(isStoredInMemoryOnly: inMemory)
    return try ModelContainer(for: Note.self, Tag.self, configurations: config)
}
```

Tests get `makeContainer(inMemory: true)`; nothing in a test may touch the user's real store.

## 3. Schema versioning and migration

Every persisted model answers these questions in `ARCHITECTURE.md` or an ADR before it ships:

- How will schema version N+1 migrate data created by version N? Use versioned schemas and a migration plan from the first release, even if the first plan is trivial; retrofitting versioning onto an unversioned store is where data loss happens.
- What happens if migration fails? Decide: refuse to launch with a clear message and an export path, or launch read-only, or restore from the pre-migration copy. Copying the store aside before a heavy migration is cheap insurance.
- Can important user-created data be exported? Provide a plain-format export (JSON, CSV, or the document type) independent of the database. It is the user's escape hatch and yours.
- Can persistence be tested without destroying real data? In-memory containers for logic; a fixture store copied to a temporary directory for migration tests. A migration test opens a version-N fixture and asserts the N+1 shape.
- Does the store live in the Sandbox container, in a group container, or in iCloud? This decides the path, the backup behavior, and the entitlements.

"The new model compiles" is not a migration plan.

## 4. Networking boundary

All network access goes through one boundary type per remote service. Views and models never touch `URLSession` directly, which keeps tests fast and makes the privacy inventory auditable.

Each boundary makes these explicit:

- Request creation: base URL, path, method, headers, encoding in one place.
- HTTP and error validation: status ranges, empty bodies, server error payloads decoded into typed errors.
- Decoding with `Codable` where the payload is structured; keep DTOs separate from domain types.
- Cancellation: use `async` APIs on `URLSession` (data, bytes, download) so structured cancellation propagates; never leave a request running for a view that disappeared.
- Timeouts: set per request or on the configuration; a default of "forever" is a hang waiting to happen.
- Retry: intentional, bounded, with backoff, and only for idempotent requests. Retrying a purchase or an upload blindly duplicates it.
- Redaction: authorization headers, cookies, tokens, and private payloads never reach logs or error messages shown to users.
- Substitution for tests: a protocol the boundary conforms to, plus a `URLProtocol` stub or a fake conforming type; tests exercise decoding, error policy, and cancellation without a network.

```swift
protocol LicensingClient: Sendable {
    func validate(_ key: LicenseKey) async throws -> LicenseStatus
}

struct HTTPLicensingClient: LicensingClient {          // production
    let session: URLSession
    let baseURL: URL
    func validate(_ key: LicenseKey) async throws -> LicenseStatus {
        var request = URLRequest(url: baseURL.appending(path: "validate"))
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(ValidateRequest(key: key))
        let (data, response) = try await session.data(for: request)
        try HTTPValidation.check(response, data)            // typed errors, no body echo
        return try JSONDecoder().decode(LicenseStatus.self, from: data)
    }
}
```

Requires the outgoing-connections Sandbox entitlement; record the destination in `PRIVACY_INVENTORY.md`.

## 5. Security classes

| Information or capability | Production default |
|---|---|
| Tokens, passwords, license keys | Keychain; never `UserDefaults`, plists, or source |
| Ordinary preferences | `UserDefaults` or a typed preferences model |
| Persistent structured data | SwiftData, files, or a database per section 1 |
| User-selected files and folders | Sandbox user-selected access; persist a security-scoped bookmark to reopen later; start/stop access around each operation |
| Incoming network connections (server) | The server entitlement only if the product needs it; document why |
| Outgoing connections | The client entitlement, with destinations listed in the inventory |
| Camera, microphone, contacts, calendar, location, automation, screen capture | Minimum justified set; each needs an entitlement where applicable, a usage string, and an inventory entry |
| APIs with required-reason declarations (file timestamps, disk space, user defaults, and others Apple lists) | Declare the reason in `PrivacyInfo.xcprivacy`; audit with `scripts/privacy-audit.sh` |
| Secrets used at build time (API keys, signing material) | Environment or Keychain on the build machine; never committed; `.gitignore` verified |
| Logging | Unified logging with privacy annotations; no credentials, no full payloads |

If a request would move something down this table ("just store the token in defaults for now"), stop and say why not; the cheaper path today is the breach report later.

## 6. Keychain patterns

- Wrap Keychain Services in one small type (`Platform/KeychainStore`) with `get`, `set`, `remove` for `Data`, keyed by service and account. Everything else uses that type; nobody else calls the Security framework directly.
- Choose accessibility deliberately: items needed at launch while the Mac is locked differ from items needed only when unlocked. Default to the most restrictive that still works.
- Use a Keychain access group only when an extension or helper must share the item; otherwise leave it app-private.
- Handle "item not found" as a normal state, not an error path that crashes; handle "interaction not allowed" and "auth failed" as recoverable with a user-facing explanation.
- Do not cache secrets in memory longer than the operation needs them; never put them in `@Observable` state that views can accidentally render or log.
- Tests use a fake `KeychainStore`, never the real keychain; CI runners have no unlocked keychain and will hang or fail.

## 7. App Sandbox and entitlement minimization

The Sandbox is required for Mac App Store builds and strongly recommended for Developer ID builds. Treat every entitlement as a claim you must defend in App Review and in the privacy inventory.

- Start from the Sandbox with no capabilities and add only what a feature demonstrably needs. `scripts/project-info.sh` lists current entitlements; compare them against features and remove the unused.
- Prefer user-selected access (open/save panels, drag-and-drop) over broad file-access entitlements. Persist security-scoped bookmarks to return to those locations; bookmark resolution can fail after the user moves files, so handle staleness.
- Temporary exceptions are exactly that; if one appears, record why and when it goes away.
- Helper tools, XPC services, and login items each carry their own entitlements and signing; keep them minimal and separate.
- Never "fix" a sandbox denial by disabling the Sandbox. Read the denial in Console (the `sandbox` process reports the operation and path), then choose the correct entitlement or the user-selected-access flow. See `references/debugging-observability.md`, sandbox/entitlement class.

## 8. Logging hygiene

- `Logger(subsystem:category:)` per subsystem; categories by feature or boundary, not by file.
- Interpolated values are private by default in release; mark only genuinely public values `privacy: .public`. Identifiers, file paths, emails, and payloads stay private.
- Never log tokens, headers, cookies, keys, or full request/response bodies, even at debug level; debug builds leak into bug reports.
- `print()` is for the current investigation only and does not survive a commit.
- Errors shown to users are typed and translated into recoverable guidance; raw error descriptions with URLs and identifiers are for the log.

## 9. Keeping `PRIVACY_INVENTORY.md` true

Whenever code adds a stored data kind, a network destination, an entitlement, a permission prompt, or a required-reason API, the same change updates `PRIVACY_INVENTORY.md` (template: `templates/PRIVACY_INVENTORY.md`) with data, purpose, storage, destination, retention, user control, and Apple declarations. Then run `bash scripts/privacy-audit.sh` to cross-check entitlements, the privacy manifest, Info.plist usage strings, and the inventory. Conversation memory is not an inventory; the file is what App Review, the store disclosure, and the next session read.
