# Phase 3 — Anti-leak projection layer

The heart of the security model. The component's dispatch does
`data = await ctx.runQuery(handle, args); return { ok: true, data }` — **`data` goes to
the LLM verbatim.** So every tool that *could* return a raw Convex document needs an
`internal*` wrapper that maps **only whitelisted fields**.

## Table of contents
- [Patterns and what they prevent](#patterns-and-what-they-prevent)
- [The projection wrapper, per tool](#the-projection-wrapper-per-tool)
- [Clock-in-action rule](#clock-in-action-rule)
- [Audit redaction — read AND write](#audit-redaction--read-and-write)
- [Single source of truth — catalog & system prompt](#single-source-of-truth--catalog--system-prompt)

## Patterns and what they prevent

| Pattern | What it prevents |
|---|---|
| **Dispatch VERBATIM ⇒ projection mandatory.** Any `fn` on a raw doc (`ctx.db.get`/`.collect()`) → `internal*` wrapper mapping explicit public fields. | Leaking `_id`/`_creationTime`/`scheduledJobId`/PII to the LLM. And an `_id` exposed as e.g. `eventId` gets reinjected into an update tool → "not found". |
| **Projection ≠ `auditArgs.redact`.** Redaction only scrubs the recorded **input args** (`true`→verbatim, `false`→null, `{redact:[...]}`→`"[redacted]"` by dotted path). It **never reshapes the response.** | Believing a `WRITE`+redact tool is response-safe. It is not. |
| **`ctx.auth` is STRIPPED at the component boundary.** A dispatched tool **cannot read the caller** from the token. The supported channel is `identityArg` (injected from the gateway-resolved identity, **stripped from caller-supplied args** so it can't be spoofed). Resolving identity once in `authorize` (via the allowlist) means tools need no `identityArg`. | Why the allowlist gate lives in `authorize`, not per-tool: a tool couldn't authenticate the caller anyway, and a caller-supplied `identityArg` would be spoofable. |
| **`initialize` gated by `callerIsAllowlisted`** (mirror of `authorize`). `initialize` runs BEFORE `authorize`; `requireAuth` only blocks anonymous. | A valid-but-not-allowlisted token receiving private admin instructions. |
| **Everything is `internal*`** — reachable only via the gateway after the allowlist check. | A public fn callable by anyone who knows the URL → bypasses all MCP auth. |
| **Action vs Query for the clock** (below). | A query caches and FREEZES the date (notably at midnight) → missed overdue items. |
| **`v.id('table')` + shape guard:** `args: { reminderId: v.id('reminderQueue') }` + `if (!r || !('originalEventId' in r)) return null`. | Cross-table disclosure: a foreign `_id` returning an out-of-scope doc. |
| **Catalog reconciled** (fingerprint on `initialize`). | Stale/forgotten registrations across deploys. |

## The projection wrapper, per tool

For **each** tool, decide: *can this `fn` return a raw Convex doc?* If yes → an
`internal*` wrapper with whitelisted fields. Never `return ctx.db.get(...)`.

```ts
export const getEvent = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const e = await ctx.db.query('events')
      .withIndex('by_eventId', q => q.eq('eventId', args.eventId)).first()
    if (!e) return null
    return { eventId: e.eventId, type: e.type, date: e.date,
             title: e.title, status: e.status, details: e.details ?? {} }
    // NO _id / _creationTime / internal job ids / unrelated heavy fields
  },
})
```

Placement rules:
- **Pure DB reshape** → `internalQuery` (list/get/search projections).
- **Reshape + a clock field** (`isOverdue`, `currentDate`) → `internalAction` (see
  below). Split: an `internalQuery` `*Rows` (pure DB) + an action wrapper that projects
  and reads the clock.
- **List vs detail:** lists strip the heavy body (`content`/`message`/`details`) →
  metadata + a **code-point-truncated** preview; the full body lives only in detail
  tools.
- **All** backing functions are `internalQuery`/`internalMutation`/`internalAction`
  (never public).

See `assets/templates/mcp-functions.ts` for the full set of patterns (preview
truncation, JSON-string arg boundary, depth guard, `isEmailAllowed`).

## Clock-in-action rule

`getCurrentDate`, `isOverdue`, `currentDate` — anything reading the wall clock — must
live in an **`internalAction`**, never an `internalQuery`. A query result is cached
around its DB reads, so a clock-only query returns a **frozen** date across a long
session (notably over midnight), making overdue items invisible. Split the work:

```ts
export const listPendingRemindersRows = internalQuery({ /* pure DB, no clock */ })
export const listPendingReminders = internalAction({   // reads the clock
  handler: async (ctx) => {
    const rows = await ctx.runQuery(internal.mcp.functions.listPendingRemindersRows, {})
    // ...compute isOverdue / currentDate against Date.now() and project
  },
})
```

## Audit redaction — read AND write

The component records each tool call's input args in an audit table. Args that carry
PII (a message body, a search term with a person's name) would be a **second verbatim
copy** of that PII. Redact them — for **both** writes and reads:

```ts
const writeRedacting = (...redact: string[]) => ({ write: true,  auditArgs: { redact } })
const readRedacting  = (...redact: string[]) => ({ write: false, auditArgs: { redact } })
```

Apply per tool, e.g. `writeRedacting('message')` on a create/update reminder,
`writeRedacting('content','relatedPeople','keywords')` on archive writes,
`readRedacting('query')` / `readRedacting('keyword')` on free-text searches. Remember:
this scrubs the **audit row only** — it is not a substitute for the response projection.

## Single source of truth — catalog & system prompt

- **Catalog:** point as many tools as possible **directly** at the same `internal.*`
  functions the in-app agent uses (identical behavior, zero drift). Only value-add /
  projection tools get a wrapper in `mcp/functions.ts`.
- **System prompt:** if the app has an agent, **reuse its system prompt verbatim**
  (`<SYSTEM_PROMPT_IMPORT>`) as the base of the `initialize` instructions, so the MCP
  surface can't drift from the app. **Place the MCP addendum FIRST** (before the long
  base prompt): clients **front-truncate** the `initialize` instructions, so leading
  with the MCP-only overrides (date via `getCurrentDate`, list tools return previews,
  fetch full content before editing) guarantees they survive truncation.

> **Coverage-by-class lesson (reusable).** The first self-review projected only the
> **READ** tools; the adversarial review then found the **WRITE** tools left raw.
> Self-review **by class** — all reads, then all writes, then all clock tools — so you
> don't miss siblings of the same family.
