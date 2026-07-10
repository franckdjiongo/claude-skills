---
description: Data-layer governance — repository pattern per table, no raw SDK in components, integer-cents money, typed errors
paths:
  - {{DATA_LAYER_GLOB}}
  - hooks/use*.ts
  - services/**
---

# Data layer

Loaded when touching backend code, data hooks, or service modules.

## Data access — through repository hooks only

Components read data via repository hooks (`useQuery`, `useMutation`, generated services) — not raw `fetch`/`axios`. Server-side fetches live inside server actions. Adapter hooks are thin and stateless.

## Repositories — one file per table or aggregate root

```
{{DATA_LAYER_DIR}}/
  schema.ts
  rentals.ts        # list, getById, create, update, remove
  catalog.ts
```

Each file exports the standard CRUD set. A query joining two tables lives in the file of the primary table with a comment.

## Schema is the contract

One table per file/section. Every query pattern has a matching index. Schema changes flow through the delta protocol and reflect in `docs/data-model.html`.

## Money — integer cents, single currency

Store `priceCents: number` (12500 = $125.00). Format on the client with `Intl.NumberFormat`. Don't round in the database. Currency stays implicit until multi-currency is approved through the delta protocol.

## Validation and errors — server is authoritative

Validators reject malformed payloads at the boundary. Business rules throw a structured error with a `code` and `message`:

```ts
throw new {{ERROR_CLASS}}({ code: 'INVALID_GUESTS', message: 'Guests must be at least 1' });
```

The frontend has a single `errorToMessage(code, language)` translator — end users never see raw error text. A new code adds matching i18n entries on both sides.

## Mutations invalidate query keys

Dependent queries refresh through the framework's invalidation primitive — never manual cache key construction. Keys derive from the API ref, not hand-written arrays.

## Confirm-gated writes — two wirings, verified visible

A confirm-gated write tool is TWO wirings, not one: the server registration (the tool plus its confirm/approval binding) AND the client surface that renders its proposal (the write-tool allow-list plus the proposal-card builder). A server-only wiring passes every backend test while the card never appears — server-tested is not visible-in-practice. Verify the card renders in the running app, not just that the mutation is registered.

## Migration parity — logical refs must prove resolution

A data-migration/backfill parity report includes EVERY ref-like field — including typed string fields holding foreign keys — with its resolution rate against the target table's keys. Counts + sums + hard-FK checks alone are NOT parity: a string ref can stay 100% dangling while every counter reads green. A deliberate spec-authoritative improvement over legacy behavior is documented in the delta as intentional — never silently shipped, never reverted to match legacy.

`docs/data-model.html` is the source of truth; schema changes flow through `spec-protocol`.
