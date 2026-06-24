---
description: Feature-first slice ownership; no cross-feature imports; small shared/.
paths:
  - src/features/**
  - src/routes/**
  - src/app/**
---

# Feature organization

Every feature owns its slice. New code lands inside one feature folder.

## Slice layout
A feature at `src/features/<name>/` holds:
- `components/` — UI specific to this feature
- `hooks/` — feature hooks
- `schemas/` — Zod schemas for this feature's boundaries
- `services/` (or `api/`) — feature business logic / API calls
- `types/` — feature-internal types
- `<name>.test.ts` — feature-level test

## Imports
- Routes (`src/routes/**` or `src/app/**`) import from features and `shared/`.
- A feature imports from `shared/` only — never from another feature.
- `shared/` imports from itself or external packages only.

## When to extract to `shared/`
A piece of code goes to `shared/` only when it's used by **2+ features** or it's clearly cross-cutting (design tokens, the i18n provider, http client, error types).

Reuse-of-1 is not reuse. Don't pre-share.

## When to split a feature
If a feature folder has >300 LOC across files OR contains >2 distinct subdomains (e.g., `auth/login`, `auth/register`, `auth/reset` are fine; `auth/billing` is not), split it.

## What goes in `routes/` (or `src/app/` for Next)
Route entries only — the page/layout/handler boundary. Composition. They:
- Parse params and validate input
- Call feature services
- Render or respond

Routes do not contain durable business logic. If a route file grows past 120 lines, extract.

## Enforcement (palier 3+)
`eslint-plugin-boundaries` enforces these rules at lint time. See `~/.claude/skills/meta-govern/references/tooling-architecture-checks.html`.

## Anti-patterns
- Top-level `components/`, `hooks/`, `services/`, `helpers/` parallel folders.
- A `shared/utils/` that grows past 30 files.
- Cross-feature imports — almost always a missing shared module or a feature that should split/merge.
