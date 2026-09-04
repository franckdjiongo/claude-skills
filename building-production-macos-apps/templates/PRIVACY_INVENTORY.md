# Privacy inventory — <App name>

<!-- The single source of truth that keeps code, entitlements, PrivacyInfo.xcprivacy, Info.plist usage strings, and store disclosures aligned. Update it in the same change that adds data collection, a permission, an entitlement, or a network destination. scripts/privacy-audit.sh cross-checks this file against the project; run it before every release. Guidance: references/data-network-security.md, references/distribution-security.md. -->

Last audit: <YYYY-MM-DD> by <who> · Distribution: <Mac App Store | Developer ID> · Sandbox: <on/off>

## Data inventory
<!-- One entry per kind of data the app stores, transmits, or derives. Be concrete: "email address used as account ID", not "user info". If a field is "none", say so explicitly; blanks are treated as unknown by the audit. -->

### <Data item, e.g. "License/account identifier">
- Data: <what exactly>
- Purpose: <why the app needs it, e.g. "determine paid entitlement">
- Storage: <Keychain | UserDefaults | SwiftData store at <path> | file | memory only>
- Network destination: <none | host/service name, TLS, what is sent>
- Retention: <e.g. "while license exists; deleted on sign-out">
- User control: <how the user can view / export / delete it>
- Apple declarations: <privacy manifest entry, App Store privacy label category, or "not required — reason">
- Code location: <type or module that owns it>

### <Data item>
- Data:
- Purpose:
- Storage:
- Network destination:
- Retention:
- User control:
- Apple declarations:
- Code location:

## Entitlements
<!-- From the .entitlements file(s) reported by scripts/project-info.sh. Every entry needs a justification; remove any that lack one. -->
| Entitlement | Target | Justification |
|---|---|---|
| `com.apple.security.app-sandbox` | <App> | <Required for Mac App Store / recommended for Developer ID> |
| <e.g. `com.apple.security.files.user-selected.read-write`> | <App> | <User opens and saves documents> |
| <e.g. `com.apple.security.network.client`> | <App> | <Licensing / sync to host X> |

## Required-reason APIs
<!-- APIs Apple requires a declared reason for in PrivacyInfo.xcprivacy. Verify the current list and reason codes against Apple's documentation at audit time; do not copy codes from memory. Include third-party packages: their manifests must also be present. -->
| API category | Used by (module / package) | Declared reason | Verified on |
|---|---|---|---|
| <e.g. file timestamp APIs> | <module> | <reason code> | <date> |

## Permission prompts and usage strings
<!-- Every system permission the app may request, with the Info.plist usage string shown to the user. The string must say what the app does with the access, in the user's language via the String Catalog. -->
| Permission | Info.plist key | Usage string | Triggered by |
|---|---|---|---|
| <e.g. Camera> | <NS…UsageDescription> | <"<App> uses the camera to scan barcodes on product boxes."> | <user action that triggers it> |

## Network destinations
| Host | Purpose | Data sent | Auth | Logged? |
|---|---|---|---|---|
| <api.example.com> | <licensing> | <license key hash, app version> | <bearer token from Keychain> | <request IDs only; no headers or bodies> |

## Logging and diagnostics
- Logger subsystem/categories: <…>
- Never logged: credentials, tokens, file contents, user identifiers in plain text.
- Crash reports: <Apple crash reporting only | third-party service (listed above as a destination)>

## Third-party SDKs and packages
| Package | Purpose | Sends data? | Has privacy manifest? |
|---|---|---|---|
| <name> | <…> | <no / to host X> | <yes / no — action> |

## Store and distribution alignment
- App Store privacy labels reflect every entry above: <yes / pending>
- Privacy policy URL: <…> — last updated <date>
- Direct distribution: privacy statement shipped with the app or website: <where>

## Audit log
| Date | Change | By |
|---|---|---|
| <YYYY-MM-DD> | <Initial inventory> | <who> |
