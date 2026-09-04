# Workflow: new app — from idea to first shippable increment

## Purpose
Turn an app idea into a buildable, tested, runnable macOS project with a written brief, an architecture sketch, a distribution decision, a design-system seed, a privacy inventory, and one vertical slice that does the most important job end to end. The output is a foundation later sessions can extend without re-deriving decisions, not a demo.

## Inputs to establish first
- Environment: run `bash scripts/doctor.sh`. Note Xcode (stable vs beta), SDK, Swift version, architecture, and whether Apple agent skills are exportable. If exportable, run `bash scripts/export-apple-skills.sh` and skim the SwiftUI specialist skill before writing UI code.
- The idea in the user's words, plus answers to: who is the user, what is the one job that must work first, is it a windowed app / document app / menu-bar utility / mixed, is there paid functionality, is there any network or file access.
- Distribution channel: Mac App Store or Developer ID. If the user has no opinion, recommend based on `references/distribution-security.md` (payments and updates handled by Apple vs owned by the developer) and record the choice as an ADR.
- Deployment target: decide with `references/platform-baseline.md` (usually current major or current minus one; beta SDK only as an opt-in lane). Never inherit a target from memory.
- Existing constraints: team ID / signing identity available? Existing brand assets? Any repo already created?

## Steps

1. **Environment discovery.** Run `doctor.sh`; summarize toolchain, SDK, arch, and target in one paragraph for the user. If Xcode is missing or only a beta is installed, say so and ask before proceeding (a beta-only toolchain cannot ship to the Mac App Store).

2. **Product brief.** Copy `templates/PRODUCT_BRIEF.md` to `docs/PRODUCT_BRIEF.md` and fill it from the conversation. Rank the core jobs; job 1 becomes the vertical slice. List non-goals explicitly. Stop and confirm the brief with the user if anything material was inferred rather than stated.

3. **Distribution and business model decision.** Write `docs/adr/ADR-0001-distribution.md` from `templates/ADR.md`. Consequences to spell out: Sandbox required vs recommended, StoreKit available vs direct licensing, who ships updates. If there are paid features, add a second ADR for the entitlement model using `references/monetization-storekit.md` (paid upfront, one-time unlock, subscription, or direct license) — do not default to subscription.

4. **Architecture sketch.** Copy `templates/ARCHITECTURE.md` to `docs/ARCHITECTURE.md`. Use `references/architecture.md` to size the structure to the product: a menu-bar utility needs three folders, not twelve packages. Decide state ownership for the slice, the concurrency model (Swift 6 language mode for new targets unless a dependency forces otherwise; record the reason if not), persistence (or none), and network boundaries (or none). Every window gets a stated purpose (`references/macos-ux.md`, window questions).

5. **Create the project.** Preferred forms: an Xcode project with an app target and a test target, or a Swift package holding domain/data/design-system modules plus a thin Xcode app target that depends on it. Project creation options:
   - Xcode's New Project UI (the user does it; give exact settings: product name, bundle ID, organization, macOS, SwiftUI, Swift, include tests, App Sandbox on).
   - A generator already used by the user (e.g. a project-spec tool) if present — detect, do not install one unprompted.
   - Hand-written `Package.swift` for the library modules, which you can create directly.
   Whatever produced it, verify with `bash scripts/project-info.sh`: correct scheme, deployment target, Swift language mode, entitlements file with Sandbox, test target present, Git initialized. Fix drift before writing features. Add `.gitignore` covering DerivedData, `.artifacts/`, `.apple-skills/`, and `xcuserdata`.

6. **Design-system seed.** Copy `templates/DESIGN_SYSTEM.md` to `docs/DESIGN_SYSTEM.md` and create `DesignSystem/` with spacing, surface, text, and shape tokens on system semantics (`references/macos-ux.md`). Record the glass policy now so no one adds translucent cards later. Keep it small: tokens plus one or two reusable controls the slice needs.

7. **Privacy inventory seed.** Copy `templates/PRIVACY_INVENTORY.md` to `PRIVACY_INVENTORY.md` at the project root. Enter every entitlement from step 5, every data item the slice touches, and every network host. Add `PrivacyInfo.xcprivacy` to the app target if any required-reason API or tracking is involved (`references/data-network-security.md`). Run `bash scripts/privacy-audit.sh` to confirm the seed and the project agree.

8. **Build and test scripts.** Confirm `scripts/build.sh --scheme <Scheme>` and `scripts/test.sh --scheme <Scheme>` work against the empty project before adding features; write the exact invocations into `docs/ARCHITECTURE.md` (Testing strategy) so CI later just calls them.

9. **First vertical slice.** Implement job 1 end to end: entry point → feature view → state owner → domain rule → (persistence/network if the job needs it) → visible result. Follow `references/macos-ux.md` basics from the start: sensible minimum window size, a real menu command for the primary action with a keyboard shortcut, empty state that teaches the next action, error state that is recoverable. Prefer SwiftUI; wrap AppKit only where the job needs a mature control. Localize strings via the String Catalog from day one — no concatenated sentences.

10. **Tests from day one.** Per `references/testing-quality.md`: Swift Testing for the domain rule and the state owner; a persistence test with a temporary store if persistence exists; a network test with substitution if networking exists; at most one XCUITest covering job 1. Run `scripts/test.sh` and read `.artifacts/Tests.xcresult`.

11. **First run and visual check.** Build with `scripts/build.sh`, launch the app (use `/run` where available), perform job 1 by hand, resize the window narrow and wide, toggle dark mode, and Tab through the controls. Fix what is broken before reporting. Do not run the full `workflows/ui-polish.md` yet; note what it should address.

12. **Record and hand over.** Update `docs/ARCHITECTURE.md` with what actually exists, list open questions, and commit locally if the user wants (never push or tag unprompted).

## Done when
- [ ] `doctor.sh` and `project-info.sh` output summarized; deployment target and language mode are intentional.
- [ ] `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `PRIVACY_INVENTORY.md`, and at least ADR-0001 (distribution) exist with real content.
- [ ] Project builds with `scripts/build.sh` and tests pass with `scripts/test.sh`; `.xcresult` shows the new tests.
- [ ] Job 1 works end to end in a launched app; window resizes sanely; dark mode and keyboard navigation basically work.
- [ ] `scripts/privacy-audit.sh` reports no mismatch between entitlements, manifest, and inventory.
- [ ] No secrets in source; `.gitignore` covers build artifacts.

## What the user gets
A repository with docs (brief, architecture, ADRs, design system, privacy inventory), a project that builds and tests from scripts, one real job working in a native-feeling window, and a written list of next increments ranked by the brief.

## End-of-task report
Use the SKILL.md reporting format. Under **Environment**, include channel and target. Under **Changed**, list docs, project structure, the slice, and tests. Under **Verified**, quote test counts from the `.xcresult` and what was observed in the running app. Under **Not done / needs you**, list: signing identity/team setup, App Store Connect or Developer ID account steps, decisions deferred in the brief, and the recommended next workflow (`workflows/feature.md` for job 2, `workflows/ui-polish.md` before the first external demo).
