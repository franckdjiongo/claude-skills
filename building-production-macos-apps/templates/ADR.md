# ADR-<NNNN> — <Short decision title, e.g. "Use SwiftData with versioned schema for the library store">

<!-- One decision per file, in docs/adr/, numbered sequentially. Write it when the decision is made, not after the code lands. A good ADR lets a future session (or the user in six months) understand why the code looks the way it does without re-deriving it. Keep it to one screen. Link it from ARCHITECTURE.md. -->

- Status: <Proposed | Accepted | Superseded by ADR-NNNN | Deprecated>
- Date: <YYYY-MM-DD>
- Deciders: <user / agent session>
- Related: <ADR-NNNN, PRIVACY_INVENTORY.md entry, issue link>

## Context
<!-- The forces at play: product requirement, platform constraint (Sandbox, deployment target, distribution channel), existing code, timeline. State facts you detected (toolchain from scripts/doctor.sh, project facts from scripts/project-info.sh), not assumptions. 3–8 sentences. -->
<What situation forces a decision? What constraints are non-negotiable?>

## Decision
<!-- One or two sentences, in the active voice: "We will…". Then the concrete shape: which types, which module, which entitlement, which API guarded by #available if relevant. -->
<We will …>

## Alternatives considered
<!-- At least two. For each: what it is, why it was not chosen. "Rejected because it was not the default" is not a reason. -->
- <Alternative A> — <why not>
- <Alternative B> — <why not>

## Consequences
<!-- Both directions. What becomes easier, what becomes harder, what new obligations appear (migration path, tests to add, privacy declarations, release steps). -->
- Positive: <…>
- Negative: <…>
- Obligations: <e.g. "Add schema migration test before shipping v2", "Update PRIVACY_INVENTORY.md">

## Verification
<!-- How we will know the decision held up: a test, a measurement, a release-build check. -->
<e.g. "DataTests/MigrationTests passes against a v1 fixture store; scripts/test.sh green.">
