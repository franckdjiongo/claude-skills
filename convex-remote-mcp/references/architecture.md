# Phase 1 — Architecture & wiring

Topology, the canonical environment-variable table, and the ordered steps to install
and wire the `convex-mcp-gateway` component. Substitute the Phase-0 `<PLACEHOLDERS>`.

## Table of contents
- [Topology & protocol](#topology--protocol)
- [Environment variables — single source of truth](#environment-variables--single-source-of-truth)
- [Ordered wiring steps](#ordered-wiring-steps)

## Topology & protocol

A **remote MCP server (Streamable HTTP)** hosted **inside the app's own Convex
backend** — not a separate service. The `convex-mcp-gateway` component is mounted once
(`app.use(mcpGateway)`) and exposed at `$CONVEX_SITE_URL<MCP_PATH>`. A **declarative
tool catalog** built with `defineMcpQuery/Mutation/Action` is reconciled into the
component's registry on the client's `initialize` (fingerprint / change-detection — no
manual `register` mutation). claude.ai authenticates via WorkOS AuthKit; the JWT is
verified **locally against the JWKS**; the email is resolved and checked against an
**allowlist**.

**Central security fact:** dispatch returns the handler value **VERBATIM** to the
client. Any function pointing at a raw Convex doc leaks `_id`/PII → hence the mandatory
**projection layer** (Phase 3).

**Protocol version: MCP `2025-06-18` (Streamable HTTP).** This exact string is the
transport contract — it appears in the smoke test and in the `initialize` body:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
  "protocolVersion":"2025-06-18",
  "capabilities":{},
  "clientInfo":{"name":"<client>","version":"0"}}}
```

Server constants: `serverInfo = { name: '<SERVER_NAME>', version: '0.1.0' }` and
`MCP_PATH = '<MCP_PATH>'`. Routes are registered in a loop over
`[MCP_PATH, ` ${MCP_PATH}/ ` ]` so **both the bare and trailing-slash forms** resolve.

## Environment variables — single source of truth

**This is the ONLY env-var reference.** Phases 2, 4, and 5 point back here instead of
re-listing. All `MCP_*` vars live in the **Convex env store**
(`bunx convex env set … [--prod]`), never in the bundle.

| Var | Secret? | Prod-only? | Role |
|---|---|---|---|
| `MCP_UPSTREAM_ISSUER` | no | re-set with `--prod` | AuthKit domain = OIDC issuer. **Fail closed if absent** (`resolveIdentity` → null → 401). |
| `WORKOS_API_KEY` (`sk_...`) | **yes** | re-set with `--prod` | Management API → resolve `sub`→email→allowlist. **Skipped** if the token already carries `email` + `email_verified:true`. |
| `CONVEX_SITE_URL` | no | **auto** | Set by every deployment → computes the expected audience. Do not touch. |
| `MCP_UPSTREAM_JWKS_URI` | no | optional | Pin/override JWKS (bridge mode). Unnecessary with WorkOS. |
| `MCP_UPSTREAM_CLIENT_ID` / `MCP_UPSTREAM_USERINFO_URL` | — | — | **VESTIGIAL** in WorkOS-direct (not read). **Omit them.** |

> **Doc-vs-reality nuance on `WORKOS_API_KEY`.** `.env.example` and docs tend to
> announce it as *flatly required*. In reality it is required only **conditionally**:
> if the token already carries `email` + `email_verified:true`, the Management API call
> is **skipped for that request** and the key is not read. Tokens *usually* omit the
> email, which is why docs say "required" — but it is not an invariant. Documenting the
> nuance avoids the "why does it work without the key on some tokens?" confusion.

> Non-MCP application vars (for memory, posed elsewhere, unrelated to this skill):
> provider API keys, bot tokens, app auth secrets, `SITE_URL`, client `VITE_*` URLs.
> `JWKS` / `JWT_PRIVATE_KEY` are auto-set by Convex.

## Ordered wiring steps

### 1.1 Install + register the component

Add the dependency, then register it in `convex/convex.config.ts` (see
`assets/templates/convex.config.ts`):

```ts
import { defineApp } from 'convex/server'
import mcpGateway from 'convex-mcp-gateway/convex.config'
const app = defineApp()
// app.use(<any other components, e.g. @convex-dev/agent>)
app.use(mcpGateway)        // ← creates components.mcpGateway (registry/audit/sessions tables)
export default app
```

> Forgetting `app.use(mcpGateway)` → `components.mcpGateway` doesn't exist → the gateway
> constructor throws.

### 1.2 Instantiate the gateway + metadata helpers

In `convex/mcp/gateway.ts` (see `assets/templates/gateway.ts`):

```ts
export const gateway = new McpGateway(components.mcpGateway)

const READ  = { write: false }
const WRITE = { write: true }
const writeRedacting = (...redact: string[]) => ({ write: true,  auditArgs: { redact } })
const readRedacting  = (...redact: string[]) => ({ write: false, auditArgs: { redact } })
```

### 1.3 Declare the tool catalog

`export const tools: McpToolRegistration[] = [...]`. **Annotate the array type**
`: McpToolRegistration[]` — this is **one** of the two circular-inference sites (the
other, distinct one is *actions* referencing `internal.*`; see rollout pitfalls).

```ts
defineMcpAction({
  name: 'getReminderById',
  description: '…',
  fn: internal.mcp.functions.getReminderById,   // ← projection wrapper, NOT the raw internal
  args: { reminderId: v.id('reminderQueue') },   // Convex validators
  metadata: READ,
})
```

Per-tool `metadata`: `READ` / `WRITE`, or `writeRedacting(...)` / `readRedacting(...)`
to keep PII out of the audit log (Phase 3). About half the tools may point **directly**
at the same `internal.*` functions the in-app agent uses (single source of truth, zero
drift); only value-add / projection tools get a wrapper in `mcp/functions.ts`.

> **Auto-reconciliation:** passing `tools` to `handleMcpRequest` fingerprints the list
> and only rewrites the registry when it changes, on the next `initialize`. **No
> `register` mutation to run.** (`gateway.register(...)` exists for dynamic catalogs;
> its semantics are *replace-always* because an additive register leaks stale
> registrations across deploys.)

### 1.4 Mount the HTTP route + well-known

In `convex/http.ts` (see `assets/templates/http.ts`): an `httpAction` calling
`gateway.handleMcpRequest`, routed **POST/GET/DELETE/OPTIONS** in a loop over
`[MCP_PATH, ` ${MCP_PATH}/ ` ]`, with `requireAuth: true` (anonymous POST → 401 +
`WWW-Authenticate`, which starts the OAuth flow). Add the RFC 9728 / 8414 / 7591
well-known routes — details in Phase 2 (`references/auth-workos.md`).

The full `initialize` payload should be built **only for the `initialize` request**
(peek the JSON-RPC method on a cloned request); other methods get a static base so you
don't re-run identity resolution + DB reads on every call.

After wiring, proceed to **Phase 2** to configure OAuth, then **Phase 3** for the
projection wrappers before the first real verification.
