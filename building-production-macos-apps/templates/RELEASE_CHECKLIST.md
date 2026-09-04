# Release checklist — <App name> <version> (<build>)

<!-- Copy per release. Fill every line with evidence (artifact path, test count, command output), not ticks. Anything unfilled is a blocker. The skill's scripts stop before submission/upload; the "Explicit user actions" section is where the user takes over. Guidance: workflows/release.md, references/distribution-security.md. -->

Date: <YYYY-MM-DD> · Toolchain: <from scripts/doctor.sh> · Channel: <Mac App Store | Developer ID> · Git: <branch @ commit, clean?>

## Pre-flight
- [ ] Full test suite green: `scripts/test.sh` → <n passed / n failed>, `.artifacts/Tests.xcresult`
- [ ] Static analysis clean or triaged: `scripts/analyze.sh` → <findings>
- [ ] Release build succeeds: `scripts/release-build.sh` → <.artifacts/release/...>
- [ ] Release-build smoke test (not Debug): launched <artifact>, exercised <core jobs 1–3>, observed <…>
- [ ] Version and build number bumped: <CFBundleShortVersionString / CFBundleVersion>
- [ ] Release notes / changelog written: <path>
- [ ] Deployment target unchanged or intentionally changed: <macOS x.y> (ADR if changed)

## Signing, entitlements, Hardened Runtime
- [ ] `scripts/verify-release.sh <artifact>` passes: <summary>
- [ ] Signing identity is the intended one: <Apple Distribution | Developer ID Application: …>
- [ ] Entitlements in the built binary match `PRIVACY_INVENTORY.md`: <diff none / listed>
- [ ] Hardened Runtime enabled; every runtime exception justified: <list or "none">
- [ ] Sandbox state as decided: <on / off + reason>
- [ ] Embedded frameworks/helpers signed with the same identity: <yes / n.a.>

## Privacy alignment
- [ ] `scripts/privacy-audit.sh` passes: <summary>
- [ ] `PrivacyInfo.xcprivacy` present and lists required-reason APIs and tracking status: <yes>
- [ ] Usage strings for every permission prompt, localized: <yes>
- [ ] `PRIVACY_INVENTORY.md` last audit date updated: <date>
- [ ] Privacy policy URL live and current: <url>

## Mac App Store path
<!-- Skip if Developer ID. -->
- [ ] App Sandbox on; no Developer ID-only entitlements
- [ ] StoreKit: products configured; purchase, restore, revoked/expired, and offline-launch paths tested (StoreKit configuration in tests, then sandbox account): <evidence>
- [ ] App Store Connect metadata: name, subtitle, description, keywords, category, age rating, privacy labels, support/marketing URLs: <status>
- [ ] Screenshots per required size, current UI, light or dark consistently: <status>
- [ ] App icon complete in asset catalog
- [ ] Review notes prepared (demo account, how to reach paid features): <status>
- [ ] Export compliance answer decided: <…>

## Developer ID path
<!-- Skip if Mac App Store. -->
- [ ] Developer ID Application signature verified (`scripts/verify-release.sh`)
- [ ] Notarization: submitted <yes/no, submission ID> → status <Accepted / pending / issues> (user action)
- [ ] Stapled to <app / dmg / pkg>: <yes/no>
- [ ] Gatekeeper check on a clean machine or fresh user account: `spctl` assessment <accepted> and first-launch experience observed
- [ ] Distribution container built (<dmg/pkg/zip>), signed, notarized, stapled: <path>
- [ ] Update mechanism tested from previous version: <from vX.Y → this build>
- [ ] Licensing: activation, deactivation, offline grace, invalid key paths tested: <evidence>
- [ ] Download page / release notes / checksum published: <status>

## Rollback plan
- Previous shippable build and where it lives: <path / tag>
- Data compatibility: can users downgrade after this version's schema migration? <yes / no — mitigation>
- Kill switch or remote config affected: <n.a. / …>
- Who can pull the release and how: <…>

## Explicit user actions (not performed by the skill)
<!-- The skill prints these commands; the user runs them. Fill in the exact invocations after release-build.sh reports the artifact paths. -->
- [ ] Notarization submit: `<xcrun notarytool submit … --wait>`
- [ ] Staple: `<xcrun stapler staple …>`
- [ ] App Store Connect upload: `<xcrun altool / Transporter / Xcode Organizer step>`
- [ ] Git tag and push: `<git tag -a vX.Y.Z -m … && git push origin vX.Y.Z>`

## Sign-off
- Engineering: <name> — <date> — "Tests, release build, and smoke test verified on <machine/macOS>."
- Product/owner: <name> — <date> — "Scope, notes, and pricing approved."
- Release approved for submission: <yes / no — blockers listed below>

## Blockers
- <Blocker, owner, next step>
