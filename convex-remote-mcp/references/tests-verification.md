# Phase 4 — Tests & verification

The gate discipline. **Never trust the typecheck alone** — `tsc --noEmit` does not see
Convex codegen, validators, or `internal.*` resolution. Run the gates in order; never
commit on a red gate.

## Table of contents
- [Gate sequence](#gate-sequence)
- [The smoke test](#the-smoke-test)
- [Anti-bug checklist (Codex rounds)](#anti-bug-checklist-codex-rounds)

## Gate sequence

```bash
# GATE 1 — Static validation (no deploy)
bun run validate     # = typecheck && lint && format:check
                     # format:check fails if unformatted → run the formatter first

# GATE 2 — Push/typecheck Convex (THE real gate — codegen/validators/internal.*)
bunx convex dev --once 2>&1 | tail -8      # prod: bunx convex deploy

# GATE 3 — Configure discovery (one-time per deployment; proves the internalMutation runs)
bunx convex run mcp/gateway:configureOAuth '{"authServerUrl":"<AUTHKIT_DOMAIN>"}'

# GATE 4 — RUNTIME verification (behavior, not types) — READ-ONLY probes, BEFORE any seed
bunx convex run mcp/functions:listReminders '{}'
bunx convex run mcp/functions:getEvent '{"eventId":"<an-existing-id>"}'   # pick an id that actually exists
bunx convex data <ALLOWLIST_TABLE> 2>&1 | head -20   # fallback: bunx convex run <ALLOWLIST_TABLE>:list '{}'

# GATE 5 — Test-data hygiene (seed → probe → DELETE → drop the temp file)
bunx convex run mcp/functions:createEvent '{...}'                  # seed via the real tool
bunx convex run mcp/functions:getEvent '{"eventId":"<seeded-id>"}' # confirm the round-trip
bunx convex run _cleanup_tmp:deleteEventByEventId '{...}'          # throwaway internalMutation
# ...one throwaway delete per table you seeded (e.g. _cleanup_tmp:deleteArchiveByMessageId)
bunx convex run _cleanup_tmp:cleanup '{}' 2>&1 | tail -4
rm convex/_cleanup_tmp.ts && bunx convex dev --once               # remove the throwaway from the deployment
git status                                                        # tree CLEAN — the temp file is NEVER committed

# GATE 6 — End-to-end smoke test
CONVEX_SITE_URL=<DEPLOYMENT> ./scripts/mcp-smoke-test.sh
# with a token: MCP_TOKEN=<bearer> CONVEX_SITE_URL=<DEPLOYMENT> ./scripts/mcp-smoke-test.sh
```

`scripts/verify-gates.sh` runs GATE 1 → 2 → 6 in sequence and prints the manual gates
(3/4/5) with PASS/FAIL framing.

**GATE 7 — ADVERSARIAL review before the PR.** Run the `adversarial-pr-review` skill
(multi-agent, 5 dimensions) over the **whole** diff. It writes a sentinel keyed to the
HEAD sha (`adversarial-review-passed`); a PreToolUse hook **BLOCKS `gh pr create`** until
sentinel == HEAD (any new commit invalidates it → run the review **last**, after all
fixes are committed). Address findings to **convergence**.

**GATE 8 — Re-verify after fixes:** re-run `bunx convex dev --once` + `bun run validate`
+ smoke test, then commit. **Never commit on a red gate.**

> *Cross-cutting trap:* an identical "Convex access denied" on BOTH the CLI and MCP =
> a stale Convex login, not a code bug → `bunx convex login` then re-`convex dev`.

## The smoke test

`scripts/mcp-smoke-test.sh` asserts the **full auth+protocol contract** (not just 200s).
It sends the `initialize` body with `"protocolVersion":"2025-06-18"` and the literal
header that distinguishes **406 vs 401**:

```
accept: application/json, text/event-stream
```

(sent at all curl sites). Without it a manual POST returns `406` and masks the auth —
always go through the script. Assertions:

1. RFC 9728 discovery (`/.well-known/oauth-protected-resource<MCP_PATH>` → AuthKit
   domain in `authorization_servers`).
2. RFC 8414 metadata (`/.well-known/oauth-authorization-server`).
3. `initialize` → `Mcp-Session-Id` header **OR** `401 + WWW-Authenticate` (this 401
   PROVES the OAuth challenge).
4. `tools/list` → the N tools.
5. `tools/call <a read-only, safe tool>` — never a destructive tool (delete) nor one
   that posts an external alert (e.g. a Telegram notification). Set the probe tool via
   `MCP_PROBE_TOOL` (default: skip step 5 if unset).

## Anti-bug checklist (Codex rounds)

> **Golden rule:** every correctness fix (timezone, details merge, list filter, overdue,
> ordering) applies **SYMMETRICALLY** to the MCP wrappers (`convex/mcp/functions.ts`)
> AND the in-app tools (`convex/agents/tools.ts`) via a shared helper (`shared/` or
> `convex/utils/`), or behavior drifts between the two surfaces.

- [ ] **Leak via raw doc** — *symptom:* `_id`/`_creationTime`/PII reach the LLM; `_id`
  exposed as `eventId` → update tool "not found". *Cause:* `fn` points at an
  `internal.*` that `return ctx.db.get(...)`/`.collect()`. *Fix:* whitelisted-field
  `internal*` wrapper (never `return doc`).
- [ ] **Cross-table disclosure** — *symptom:* an `_id` from another table returns an
  out-of-scope doc. *Cause:* `args: v.string()` + raw `ctx.db.get`. *Fix:*
  `args: { reminderId: v.id('reminderQueue') }` + guard
  `if (!r || !('originalEventId' in r)) return null`.
- [ ] **Wrong list ordering** — *symptom:* a list claims "sorted by send date" but comes
  out in creation order. *Cause:* the raw query ordered by the wrong index. *Fix:* the
  `*Rows` query uses the right index, then sort by `${sendDate}T${sendTime}` (the `HH:MM`
  sorts lexically) for correct intra-day order.
- [ ] **Non-ASCII field key rejected at the arg boundary** — *symptom:* a detail with an
  accented key (`{ prénom: '…' }`) fails, and a handler-side sanitizer is dead code.
  *Cause:* the Convex codec rejects non-ASCII field names **before the handler**, at any
  depth. *Fix:* transport as a **JSON string** (`details: v.optional(v.string())`), then
  `JSON.parse` + recursive `sanitizeFieldKeys` to snake_case ASCII inside a try/catch.
- [ ] **Frozen clock (clock-in-query)** — *symptom:* `currentDate`/`isOverdue` stale
  (especially at midnight); due items missed. *Cause:* a clock value in an
  `internalQuery` → cached. *Fix:* `internalAction`, split into a `*Rows` query + an
  action wrapper.
- [ ] **Truncation cuts a surrogate pair** — *symptom:* `Could not parse return value as
  json: unexpected end of hex escape` → the **whole** list response fails. *Cause:*
  `s.slice(0,n)` iterates UTF-16 units and halves an emoji. *Fix:* truncate by code
  points: `Array.from(s).slice(0,max).join('') + '…'`.
- [ ] **Naive `new Date` timezone bug** — *symptom:* an 18:00 `<TIMEZONE>` reminder
  marked overdue ~4-5h early. *Cause:* `new Date(sendDate+'T'+sendTime)` interpreted as
  UTC. *Fix:* `toUtcDateFromTimeZone(sendDate, sendTime, '<TIMEZONE>')` (shared
  `convex/utils/timezone.ts`).
- [ ] **ICU hour "24" quirk** — *symptom:* a 00:00–00:59 reminder overdue almost a day
  early. *Cause:* `Intl.DateTimeFormat('en-CA',{hour12:false})` formats midnight as `24`;
  `Date.UTC(...,24,...)` rolls to the next day. *Fix:* `hour: Number(lookup.hour) % 24`.
- [ ] **Date validation without round-trip** — *symptom:* `2026-13-40`/`2026-02-30`
  schedules a job for the wrong day with `scheduled:true`, no error. *Cause:*
  `v.string()` imposes no format; `Date.UTC` **silently normalizes** overflow. *Fix:*
  strict `YYYY-MM-DD` regex **then** round-trip: parsed Y/M/D/H/M must survive the `Date`
  construction unchanged.
- [ ] **Recursion-depth guard** — *symptom:* `RangeError: Maximum call stack size
  exceeded` **uncaught** → the mutation crashes instead of `{success:false}`. *Cause:* a
  recursive sanitizer outside the try/catch. *Fix:* a deterministic depth counter
  (e.g. `MAX_FIELD_DEPTH = 64`) → a typed error, **and** call it INSIDE the try.
- [ ] **Shallow merge vs replace** — *symptom:* fixing one key wipes sibling keys.
  *Cause:* `ctx.db.patch(id, {details})` **replaces the whole object**. *Fix:*
  `{ ...(doc.details ?? {}), ...safeDetails }` (SHALLOW merge — document this contract in
  the tool description so the model returns the COMPLETE nested object/array).
- [ ] **Two-filter query ignores one filter** — *symptom:* filtering by status+type
  returns all of the status, type ignored. *Cause:* only one index used. *Fix:* filter
  the second field in memory when both are provided.
- [ ] **PII duplicated in the audit** — *symptom:* a second verbatim copy of the message
  body in the audit table. *Cause:* `metadata` left as raw `WRITE`. *Fix:*
  `writeRedacting('message')` etc.; read-side `readRedacting('query')`.
- [ ] **`preferred_username` bypass** — *symptom:* an attacker sets their username to an
  allowlisted email and passes the gate. *Cause:* `claims.email ?? claims.preferred_username`
  (a non-string `email` short-circuits the `??`). *Fix:* test each claim
  `typeof === 'string'` independently; drop the fallback; trust only
  `email_verified === true` or the Management-API email.
- [ ] **Empty audience passes** — *symptom:* audience confinement effectively skipped.
  *Cause:* `CONVEX_SITE_URL` unset → empty list. *Fix:* `if (!site) return null` + guard
  `audiences.length > 0` in `verifyAccessToken`.
- [ ] **bash `set -u` + empty array** — *symptom:*
  `mcp-smoke-test.sh: AUTH_HEADER[@]: unbound variable` on the anonymous run. *Cause:*
  `"${AUTH_HEADER[@]}"` under `set -euo pipefail` with an empty array. *Fix:*
  `"${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"}"` at every curl site.
- [ ] **406 vs 401** — *symptom:* a manual curl POST returns `406`, masking the auth.
  *Cause:* the Streamable HTTP transport requires
  `accept: application/json, text/event-stream`. *Fix:* go through `mcp-smoke-test.sh`; a
  406 proves nothing about auth.
