---
description: DRY/KISS/YAGNI/SOLID/SINE, meaningful names, small functions, fail-fast, Boy Scout Rule across all source
paths:
  - {{SOURCE_GLOB}}
---

# Clean code — principles

Loaded when touching any source file. Link back here from skills and agents; do not duplicate.

## DRY — threshold of three

Two near-identical blocks: leave them. Three: extract. Premature abstraction is a worse smell than duplication.

## KISS

Pick the boring solution a new contributor reads top-to-bottom. One return path beats four nested ternaries; a flat `if/else` beats a strategy map for three cases.

## YAGNI

Build for the requirement on the table — no "extensible" hooks for imagined futures, no config flags with one consumer, no backwards-compat shims for code from five minutes ago.

## SOLID — pragmatic

- **S** — a unit renders OR fetches OR coordinates; mixing two grows the file past `file-size-budget`.
- **O** — extension is a sibling file (`Card.Premium.tsx`), not a flag-prop matrix.
- **I** — narrow props at the boundary; destructure the 12-field DTO.
- **D** — depend on hooks/abstractions, not raw `fetch` or hardcoded strings.

## SINE — Single side-effect, In, Named, Explicit

Pure functions never mutate. Mutators start with `set`/`update`. Effects declare every dep — no lying arrays.

## Names, size, comments

Domain-shaped names: `cartItems`, `submitQuote`. Booleans start `is`/`has`/`can`/`should`. Files match their primary export. A function fitting one screen (~30 lines) is reviewable. Extract a helper when JSX has 3+ levels of conditional logic; extract for clarity, not size. Default zero comments — add only when *why* is non-obvious (workaround citing a bug, magic constant citing a spec id, invariant the type system can't express).

## Fail fast

Validate at the boundary, then trust the type. Throw structured errors with codes — silent `return null` masks bugs.

## Boy Scout Rule

Leave the code cleaner on the path you're touching. Out-of-scope cleanups go to a deferred backlog. The diff matches the title.
