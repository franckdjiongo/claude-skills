# Product brief — <App name>

<!-- Fill this in about 10 minutes. Concrete beats complete: one real user, three ranked jobs, and an honest non-goals list are worth more than a vision statement. Update it when an answer changes; delete these guidance comments as you go. -->

## Problem
<One paragraph. What is painful today, for whom, and how do they cope now (spreadsheet, shell script, a competitor's app)?>

## Target user
<Who exactly: role, skill level, environment. "Indie video editors on a 14-inch MacBook Pro who also plug into a 5K display", not "creative professionals".>
<!-- Mac-specific details matter: laptop vs desktop, one window or many, keyboard-heavy or mouse-heavy, works with files or with services. These drive window design and the macos-ux review later. -->

## Core jobs
<!-- 3–5 jobs phrased as outcomes, ranked. Job 1 is what the first vertical slice must do end to end. -->
1. <Job — e.g. "Import a folder of RAW files and tag them without waiting">
2. <Job>
3. <Job>

## Non-goals
<!-- What this version will not do even if asked. This is what keeps the first release shippable. -->
- <Non-goal>
- <Non-goal>

## Distribution channel
<Mac App Store | Developer ID direct distribution | both — and why>
<!-- Decide now. Mac App Store requires App Sandbox and gives you StoreKit; Developer ID requires notarization and you own payments and updates. Changing later costs entitlement, licensing, and update-architecture work. See references/distribution-security.md. -->

## Business model
<Free | paid upfront | one-time unlock | paid upgrades | subscription | direct license>
<!-- Subscription only when recurring value is real. List which features are free vs paid; that list becomes the entitlement design in references/monetization-storekit.md. -->

## Platform baseline
- Minimum macOS: <version and why — e.g. "current major minus one; covers the Macs our users own">
- Toolchain: <stable Xcode as reported by scripts/doctor.sh; beta lane yes/no>
- Architectures: <Apple silicon only | universal>
<!-- Detect with scripts/doctor.sh; do not guess. The deployment target decides which SwiftUI APIs are usable without #available fallbacks. See references/platform-baseline.md. -->

## Success criteria
<!-- Measurable, for the first shippable increment. Mix product and quality metrics. -->
- <e.g. "A new user completes job 1 in under 2 minutes without reading docs">
- <e.g. "Cold launch to usable window under 1 s on the baseline laptop">
- <e.g. "Zero crashes in a week of dogfooding">

## Risks
<!-- Technical, platform, and business. For each: the cheapest experiment that retires it. -->
| Risk | Likelihood | Impact | Mitigation / experiment |
|---|---|---|---|
| <e.g. "Sandbox blocks access to the user's library folder"> | <L/M/H> | <L/M/H> | <e.g. "Spike security-scoped bookmarks in week 1"> |
| <Risk> | | | |

## Open questions
- <Question — owner — needed by>
