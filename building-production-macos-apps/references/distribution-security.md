# Distribution and security

Contents: choosing a channel · recording it · entitlements and Hardened Runtime · signing identities · release artifacts · notarization (user-run commands) · verification commands · privacy manifests · updates for direct distribution · App Review preparation · scripts.

Distribution is an architecture decision with a deadline: it changes entitlements, monetization, update mechanics, and what "release" even means. Decide it in `workflows/new-app.md` or the first `workflows/release.md` pass, and record it. Apple's process details change; verify the current rules live (`references/source-refresh.md`) before every release.

## Mac App Store versus direct distribution

| Question | Mac App Store | Direct distribution (Developer ID) |
|---|---|---|
| App Sandbox | Required | Recommended (strongly, for user trust and future flexibility) |
| Signing identity | Apple Distribution / App Store | Developer ID Application (and Developer ID Installer for `.pkg`) |
| Notarization | Handled through App Store submission | Developer notarizes with `notarytool`, then staples |
| Hardened Runtime | Required for the archive | Required for notarization |
| StoreKit / in-app purchase | Available | Not available; developer builds licensing (`references/monetization-storekit.md`) |
| Payment processing | Apple (commission applies) | Developer chooses a payment provider |
| Updates | Apple delivers | Developer ships an update mechanism |
| Billing, refunds, download support | Apple | Developer |
| Hosting | Apple | Developer (CDN/site, checksums, release notes) |
| Review | App Review before each release | None, but Gatekeeper/notarization scans apply |
| Both at once | Possible with one codebase, two configurations/targets, one entitlement gate abstraction | |

Choose the App Store when: you want Apple to own payments and updates, the product fits Sandbox constraints, and discoverability matters. Choose direct when: the product needs capabilities the Sandbox forbids, you want control over pricing/trials/updates, or you already have a customer channel. Supporting both is legitimate for mature products; it doubles release verification, so start with one.

## Record the decision

Write an ADR from `templates/ADR.md` covering: channel, why, Sandbox status and entitlements implied, monetization consequence, update mechanism (direct only), and the date to revisit. Reflect it in `ARCHITECTURE.md` and in `PRIVACY_INVENTORY.md` (notarization and licensing services are network destinations). `scripts/project-info.sh` reads signing settings and entitlements; compare its output with the ADR at every release.

## Entitlements and Hardened Runtime

Entitlements are the contract between the app and the system. Keep the set minimal and justified; every entry is a line in `PRIVACY_INVENTORY.md` and, for the App Store, a potential review question.

- Sandbox entitlements name capabilities (network client/server, user-selected files, downloads folder, printing, camera/microphone, Apple Events to specific apps). Add the one that matches the feature; never add a broad temporary-exception entitlement to get past a denial (`references/debugging-observability.md`, sandbox class).
- User-selected file access persists through security-scoped bookmarks; document-scoped bookmarks travel with the document. Design this before building file features.
- Hardened Runtime protects the process (library validation, no unsigned code injection, restricted debugging). Exceptions (allow unsigned executable memory, disable library validation, allow DYLD variables) each weaken it and each need a written reason; JIT-style plugins, third-party unsigned frameworks, and embedded interpreters are the usual honest reasons. Prefer signing the dependency over disabling validation.
- Usage-description strings in `Info.plist` are required for protected resources (camera, microphone, contacts, automation, location, and others); a missing string means a silent failure or a crash on access. `scripts/privacy-audit.sh` cross-checks entitlements, usage strings, the privacy manifest, and `PRIVACY_INVENTORY.md`.
- Inspect the built product, not the source file: `codesign -d --entitlements :- <App.app>`.

## Code signing identities and provisioning

- Identities: check what the Mac has with `security find-identity -v -p codesigning`. Development certificates run locally; Apple Distribution signs App Store archives; Developer ID Application signs direct-distribution apps; Developer ID Installer signs `.pkg`. Do not confuse them — a Developer ID-signed app cannot be uploaded to the App Store and an App Store-signed app will not pass Gatekeeper outside it.
- Provisioning profiles matter on macOS when entitlements require them (iCloud, App Groups with team prefix, push, some restricted entitlements). Automatic signing manages them for development; release lanes should use explicit settings so the archive is reproducible.
- Every nested binary (frameworks, XPC services, helpers, login items, command-line tools) must be signed with the same identity, with Hardened Runtime, inside-out; `codesign --deep` is a diagnostic, not a release strategy.
- Signing identities and notarization credentials are the user's. This skill never creates, imports, revokes, or rotates them, and never stores an app-specific password anywhere other than the user's Keychain profile (`notarytool store-credentials`, run by the user).
- Timestamping (`--timestamp`) is required for Developer ID so the signature outlives the certificate; `release-build.sh` passes it.

## Artifacts a release should produce

`bash scripts/release-build.sh --scheme "$SCHEME" --method <app-store|developer-id>` and `bash scripts/verify-release.sh <artifact>` produce, under `.artifacts/release/`:

| Artifact | Produced by | Purpose |
|---|---|---|
| Release archive (`.xcarchive`) with dSYMs | `release-build.sh` | Reproducible source of the exported app; dSYMs for crash symbolication — keep them |
| Signed exported artifact (`.app`, `.pkg`, or `.dmg`) | `release-build.sh` | The thing users receive or App Store Connect ingests |
| Entitlement report | `verify-release.sh` | Entitlements as built, diffed against the ADR and `PRIVACY_INVENTORY.md` |
| Hardened Runtime verification | `verify-release.sh` | Flags present, exceptions listed with reasons |
| Signature verification | `verify-release.sh` | `codesign --verify` result for the bundle and every nested binary |
| Notarization submission package | `release-build.sh` | Zip/DMG/PKG ready for `notarytool`; **not submitted** |
| Notarization result | user runs `notarytool` | Accepted/Invalid, plus the log if invalid |
| Stapled artifact | user runs `stapler` | Ticket attached so offline Gatekeeper checks pass |
| Gatekeeper verification | `verify-release.sh` | `spctl --assess` and `stapler validate` results |
| Release smoke-test report | `workflows/release.md` | Results of running the exported build (`references/testing-quality.md`) |
| Privacy audit | `privacy-audit.sh` | Manifest/entitlement/usage-string/inventory alignment |

Missing artifacts mean the release is not ready; the release workflow's report lists each one as present or missing.

## Notarization — commands the user runs

Submission is an explicit release action. The skill prepares the package and prints the commands; the user runs them from a terminal with their own credentials. The command shapes are stable; confirm flags against `xcrun notarytool --help` on the installed Xcode.

```bash
# one-time, by the user: stores the app-specific password in the Keychain under a profile name
xcrun notarytool store-credentials "AC_NOTARY" --apple-id "<apple id>" --team-id "<TEAMID>"

# submit the package prepared by release-build.sh and wait for the verdict
xcrun notarytool submit .artifacts/release/<App>.zip --keychain-profile "AC_NOTARY" --wait

# on "Invalid", fetch the log and fix the listed issues (usually signing or Hardened Runtime)
xcrun notarytool log <submission-id> --keychain-profile "AC_NOTARY" .artifacts/release/notarization-log.json

# staple the ticket to the distributable (.app, .dmg, .pkg — not to a .zip), then re-verify
xcrun stapler staple .artifacts/release/<App>.app
bash scripts/verify-release.sh .artifacts/release/<App>.app
```

Typical rejection causes: a nested binary without Hardened Runtime or timestamp, an unsigned helper, a Hardened Runtime exception not matching an entitlement, a Developer ID Installer package containing an app signed with a different identity. The notary service scans for malicious content and signing problems; it does not review functionality.

For the App Store, the equivalent explicit action is uploading the archive (Xcode Organizer or `xcrun altool`/Transporter as currently documented) and submitting in App Store Connect; the skill stops at a validated archive.

## Verification commands

```bash
codesign --verify --deep --strict --verbose=2 <App.app>         # signature integrity, all nested code
codesign -d --entitlements :- <App.app>                          # entitlements as built
codesign -d -vvv <App.app> 2>&1 | grep -E 'Authority|TeamIdentifier|flags|Timestamp'   # identity, runtime flag
spctl --assess --type execute --verbose=4 <App.app>              # Gatekeeper: "accepted", source=Notarized Developer ID
spctl --assess --type install --verbose=4 <App.pkg>              # for installer packages
xcrun stapler validate <App.app>                                 # ticket present and valid
```

`verify-release.sh` runs these and writes the results next to the artifact. Run them again on the artifact you actually upload or host — not on a rebuilt copy.

## Privacy manifests and required-reason APIs

Apple requires a privacy manifest (`PrivacyInfo.xcprivacy`) declaring collected data types, tracking, tracking domains, and reasons for using certain "required-reason" APIs (categories such as file timestamps, system boot time, disk space, active keyboards, user defaults — verify the current list live). Third-party SDKs on Apple's list must ship their own manifests and signatures.

- Generate the manifest from `PRIVACY_INVENTORY.md`, not from memory; `scripts/privacy-audit.sh` flags mismatches between manifest, entitlements, usage strings, and inventory.
- App Store submissions can be rejected or flagged for missing reasons; direct distribution has no gate, but the manifest still documents your position and Apple's requirements evolve.
- Keep the store privacy "nutrition label" answers consistent with the manifest and the inventory; they are three views of the same facts.

## Updates for direct distribution

Apple delivers App Store updates; outside the store, updates are the developer's responsibility and part of the product. Evaluate options rather than prescribing one:

- An established in-app update framework (appcast-style feeds with signed updates, delta support, sandbox-compatible installers), a custom checker that opens a download page, or a package manager channel for developer-oriented tools.
- Requirements regardless of choice: updates are signed and notarized like the initial release; the feed/URL is HTTPS with a pinned or signed manifest; the update process works from inside the Sandbox if the app is sandboxed; the user controls automatic checking and installation; the check is a network destination in `PRIVACY_INVENTORY.md`; a broken update must never leave the user without a working app.
- Record the choice in an ADR and add "update from previous release works" to `RELEASE_CHECKLIST.md`.

## App Review preparation

Review rules change; read the current App Review Guidelines before submission (`references/source-refresh.md`). Prepare in advance: accurate metadata and screenshots at real window sizes; a demo account or StoreKit sandbox instructions if features are gated; every entitlement matched to a visible feature; purchase restoration reachable from the UI; no references to external payment where the guidelines forbid them for App Store builds; privacy answers matching the manifest; the app launching cleanly on a fresh account with no network. Reviewers test on machines you do not control, which is one more reason to test the Release build on a clean user account (`references/testing-quality.md`).

## Scripts

- `bash scripts/release-build.sh --scheme "$SCHEME" --method <app-store|developer-id> [--configuration Release]` — archives, exports with the method's export options, verifies the signature, prepares the notarization package, prints the user-run commands, and stops. `--help` lists options.
- `bash scripts/verify-release.sh <artifact>` — runs the verification commands above, produces the entitlement and Hardened Runtime reports, and prints a pass/fail table.
- `bash scripts/privacy-audit.sh` — see privacy manifests above.
- Neither script uploads, submits, staples on the user's behalf, tags Git, or touches identities.
