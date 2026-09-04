# Source refresh — the anti-staleness policy

This skill was designed from research dated 2026-09-01 and will be used across several Xcode and macOS releases. Apple ships new SDKs yearly, revises App Review guidelines without notice, changes StoreKit and privacy requirements, and renames or reshapes beta APIs before release. A skill that remembers "the current version" confidently and wrongly is worse than one that knows nothing, because the model will not think to check. Everything version-sensitive in this skill is therefore a *method for finding out*, never a stored answer.

## The six rules

Never trust a stored "latest Xcode" claim.
Never trust a stored "latest macOS" claim.
Never assume an App Review rule is unchanged.
Never assume a StoreKit requirement is unchanged.
Never assume a privacy requirement is unchanged.
Never assume a beta SwiftUI API retained its final signature.

Any sentence in this skill, in a project's docs, or in your own memory that violates one of these is a prompt to run the refresh pipeline, not a fact to act on.

## The refresh pipeline

Run it at the start of any session that will write version-sensitive code, and whenever `doctor.sh` output differs from what the project's `ARCHITECTURE.md` recorded.

```
Inspect installed Xcode           bash scripts/doctor.sh
        ↓
Inspect installed SDKs            (same output: xcodebuild -showsdks, swift --version)
        ↓
Export Apple's Xcode agent skills bash scripts/export-apple-skills.sh   (when supported)
        ↓
Consult current Apple docs        only for what the exported skills and SDK cannot answer
        ↓
Check the deployment target       bash scripts/project-info.sh
        ↓
Guard with #available / fallbacks where the target is below the API's minimum
```

Order matters: the installed toolchain is the only ground truth for "what compiles here", the exported Apple skills are the best available truth for "how Apple wants this API used now", and live documentation fills gaps. Memory comes last.

## Apple's exported Xcode agent skills

Recent Xcode versions bundle agent skills (a SwiftUI specialist skill, a "what's new in SwiftUI" skill, and possibly others) and can export them for other agentic tools with `xcrun agent skills export`. `doctor.sh` probes for that command and reports whether it exists; `export-apple-skills.sh` runs it into `.apple-skills/` next to the project (or the path you pass) and writes a manifest with the Xcode version that produced it.

How to use the export:

- Read the exported SwiftUI skill before writing Liquid Glass, new window or scene APIs, Observation patterns, or any control you are not certain exists at the deployment target.
- Read the "what's new" skill once per toolchain change and summarize the deltas that affect the project into `ARCHITECTURE.md` under a dated "Toolchain notes" heading, so the next session does not re-derive them.
- Treat the export as tied to the Xcode that produced it. If `doctor.sh` shows a different Xcode than the manifest, re-export before trusting it.
- If the command does not exist (older Xcode, command renamed), say so and fall back to SDK inspection plus live documentation. Do not invent the export's contents.

## Reconciling this skill with Apple's skills

Both will sometimes disagree. Resolve by domain, not by recency of who said it:

| Topic | Who wins | Why |
|---|---|---|
| API names, signatures, availability, recommended SwiftUI patterns | Apple's exported skill, then the SDK | Apple owns the API; this skill's snippets are illustrations |
| Liquid Glass and materials usage guidance | Apple's exported skill for mechanics; this skill for the commercial restraint rules (hierarchy before glass, no stacked glass content) | Both are Apple's stated intent; this skill encodes the product judgment |
| Architecture, testing bar, release discipline, privacy inventory, "no publishing by surprise" | This skill | These are the user's commercial process, not Apple's concern |
| Distribution and notarization mechanics | Apple documentation consulted live | Changes without SDK changes |
| App Review, StoreKit business rules, privacy declarations | Apple documentation consulted live, on the day | Policy, not code; never cached |

When a conflict changes something a project already recorded, write an ADR (`templates/ADR.md`) rather than silently switching.

## When a new Xcode appears

`doctor.sh` reports a version the project has not seen, or the user says "I installed the new Xcode":

1. Re-run `doctor.sh` and `project-info.sh`; note the new SDK, Swift version, and whether the project's deployment target still builds.
2. Re-export Apple skills; read the "what's new" deltas; record them in `ARCHITECTURE.md` toolchain notes.
3. Build and run the full test suite on the new toolchain before writing new code. New warnings are information; new errors decide whether the project migrates now or pins the previous Xcode (`DEVELOPER_DIR`, see `references/platform-baseline.md`).
4. Decide the lane: ship from stable; treat a beta Xcode as a forward-compatibility lane whose builds are not release candidates. Record the decision.
5. Re-run this skill's evals (`evals/evals.json`) in a fresh context, especially the "new Xcode installed" and "ugly but functional UI" scenarios, because those are where stale API knowledge shows.
6. Update `references/platform-baseline.md` only where the *method* changed (a new flag, a renamed tool). Do not add "Xcode N is current" sentences anywhere.

## Consulting live documentation

Use web access or the documentation tools available in the session for these areas, every time they matter, because they change independently of the SDK:

- App Review Guidelines and the Mac App Store review process (before a submission plan, before choosing a business model).
- StoreKit and in-app purchase policies, subscription rules, restore requirements, and pricing structures.
- Privacy manifests, required-reason API lists, and data-collection disclosure categories.
- Notarization requirements, Hardened Runtime expectations, and Developer ID policy.
- Human Interface Guidelines for macOS, materials, and Liquid Glass when a design question is not answered by the exported skill.

Quote what you found with its date in the project doc or ADR that depends on it. A guideline citation without a date will be trusted long after it expired.

## Maintenance log convention

Keep a short dated log at the bottom of the project's `ARCHITECTURE.md` (or `docs/TOOLCHAIN.md` for large projects):

```
## Toolchain notes
- 2026-09-02 — Xcode <version from doctor.sh>, SDK <version>, deployment target <version>. Apple skills exported (manifest: .apple-skills/manifest.json). Deltas: <two or three lines>.
```

Version numbers belong there, dated and tied to a machine, never in this skill's references.

## Maintaining this skill itself

Every few months, or after a WWDC cycle: re-read `SKILL.md` and each reference for sentences that have quietly become claims about "now"; move them into this method form or delete them. Re-run the evals in a fresh context and compare against the previous run. Update `evals/evals.json` when a scenario stops discriminating (passes without the skill) or when a real project failure reveals a missing scenario. The skill is healthy when a session that starts from nothing but the installed Xcode produces the same quality as the session that wrote it.
