# Workflow: release — produce a release candidate and a readiness verdict, then stop

## Purpose
Take a build from "tests pass on my machine" to a signed, verified, documented release candidate, and tell the user exactly what stands between it and customers. This workflow builds and validates; it never publishes. Notarization submission, App Store Connect upload, Git tagging and pushing, and any credential or identity change are the user's explicit actions, and this workflow ends by printing those commands rather than running them. The failure modes prevented: shipping a Debug-only-tested build, discovering an entitlement or privacy mismatch in App Review, and an agent uploading something the user has not seen.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh` (stable toolchain; a beta Xcode is not a release lane unless the user says so explicitly).
- Project facts: `bash scripts/project-info.sh` — scheme, Release configuration, deployment target, entitlements, Sandbox state, Hardened Runtime, privacy manifest, version and build numbers, Git state (clean tree, branch).
- Distribution channel, from `PRODUCT_BRIEF.md`, an ADR, or the user: Mac App Store, or Developer ID direct distribution. If it is undecided, stop; `references/distribution-security.md` explains why this cannot be guessed.
- Signing identity and team available on this Mac (`doctor.sh` lists identities without exposing them); App Store Connect access or a notarization credential profile exists (the user's, never created by the skill).
- Version and build number policy: what this release is called and whether the numbers are already bumped.
- The release checklist: copy `templates/RELEASE_CHECKLIST.md` into the project if absent.

References: `references/distribution-security.md`, `references/monetization-storekit.md` (if the app has paid features), `references/testing-quality.md`.

## Steps

1. **Freeze the candidate.** Confirm the tree is clean and on the intended branch, and the version/build numbers are correct. If anything is dirty, ask; do not commit or stash on the user's behalf.

2. **Full verification on the candidate.**
   - `bash scripts/build.sh --configuration Release` — no new warnings introduced.
   - `bash scripts/test.sh` — full suite, read `.artifacts/Tests.xcresult`; every failure is a blocker or an explicitly accepted known issue.
   - `bash scripts/analyze.sh` — static analysis; triage findings.
   - Release-build smoke test: launch the Release build and exercise the critical journeys (first launch, primary task, save/export, purchase or license path with a sandbox tester or test license, quit and relaunch with restored state). Debug-only differences (StoreKit configuration only applies from Xcode, `#if DEBUG` code paths, optimizer-exposed races) surface here and nowhere else.

3. **Privacy and permissions alignment.** `bash scripts/privacy-audit.sh` — entitlements, `PrivacyInfo.xcprivacy`, Info.plist usage strings, and `PRIVACY_INVENTORY.md` must agree. Fix mismatches in code and inventory together. Consult current App Review and privacy documentation for the disclosure categories on the day (`references/source-refresh.md`).

4. **Build the release artifact.**
   `bash scripts/release-build.sh --scheme <Scheme> --method <app-store|developer-id>` archives in Release, exports with the chosen method, and writes to `.artifacts/release/`. It does not upload.

5. **Verify the artifact.**
   `bash scripts/verify-release.sh .artifacts/release/<App>.app` (or the exported `.pkg`/`.dmg` as appropriate) reports signature validity, Hardened Runtime, entitlements as actually embedded, Sandbox state, and notarization/staple status. Compare embedded entitlements with the inventory; an entitlement present in the binary but absent from the inventory is a blocker.

6. **Channel-specific branch.**
   - **Mac App Store**: confirm Sandbox on, App Store signing, StoreKit products and restore path tested against the sandbox with the Release build, screenshots and metadata prepared, review notes written (test account, how to reach gated features). The upload to App Store Connect (Xcode Organizer or `xcrun altool`/Transporter as current tooling dictates) is the user's action.
   - **Developer ID**: confirm Hardened Runtime on, Developer ID signing, Sandbox state as decided, the update mechanism in place and tested against a staging feed, the installer or disk image built and signed. Notarization submission with `notarytool`, stapling, and the final Gatekeeper assessment on a clean machine are the user's actions; print the exact commands with the artifact path and the credential profile name placeholder.

7. **Fill the checklist and write the readiness report.** Complete `RELEASE_CHECKLIST.md` with evidence (paths under `.artifacts/`, test counts, verification output). Classify every open item as blocker, risk accepted by the user, or follow-up. Record the release decision as an ADR only if something about distribution, monetization, or entitlements changed.

8. **Stop at the explicit actions.** Print, do not run:

   ```
   # Developer ID — user runs:
   xcrun notarytool submit .artifacts/release/<App>.zip --keychain-profile "<profile>" --wait
   xcrun stapler staple .artifacts/release/<App>.app
   spctl --assess --type execute --verbose .artifacts/release/<App>.app
   # Mac App Store — user uploads via Organizer / Transporter, then submits in App Store Connect.
   # Git — user runs:
   git tag -a v<version> -m "<message>" && git push origin v<version>
   ```

   Confirm command names and flags against the installed toolchain before printing them; do not embed credentials, and do not create keychain profiles.

## Done when
- [ ] Release build, full tests, analysis, and Release smoke test completed on a clean tree with the intended version/build numbers.
- [ ] `privacy-audit.sh` passes; inventory, entitlements, manifest, and usage strings agree.
- [ ] Release artifact exists under `.artifacts/release/` and `verify-release.sh` reports valid signature, correct Hardened Runtime/Sandbox state, and expected entitlements.
- [ ] Channel-specific checks complete; StoreKit or licensing verified with the Release build.
- [ ] `RELEASE_CHECKLIST.md` filled with evidence; blockers listed with owners.
- [ ] No notarization submission, upload, tag, push, or credential change was performed by the skill.

## End-of-task report
SKILL.md format. Under **Verified**: test counts from the `.xcresult`, smoke-test journeys exercised, `verify-release.sh` summary, `privacy-audit.sh` result. Under **Not done / needs you**: the exact commands from step 8 with real paths, plus every blocker and accepted risk from the checklist, and a one-line rollback plan (previous version available where, how users get it).
