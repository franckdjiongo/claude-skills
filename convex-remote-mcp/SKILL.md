---
name: convex-remote-mcp
description: >-
  Build a production-ready REMOTE MCP server (Streamable HTTP) hosted INSIDE an
  EXISTING Convex backend — exposing your Convex functions as authenticated tools
  to claude.ai / Claude Desktop / Claude Code, secured by OAuth (WorkOS AuthKit),
  with a mandatory anti-leak projection layer, a gated test/verification
  discipline, and a production rollout. Use this skill whenever the user wants to
  create/build/set up an MCP server or custom connector on or for a Convex project,
  expose Convex functions/tools to claude.ai or Claude, add a remote/distant MCP
  connector backed by Convex, wire the `convex-mcp-gateway` component, add WorkOS
  AuthKit OAuth to a Convex MCP, safely project a Convex document for an LLM tool,
  harden a Convex MCP tool that reads the wall clock (e.g. a getCurrentDate / overdue
  / isOverdue tool returning a stale date over midnight or off by a timezone offset),
  or roll a Convex MCP server out to production — even if they only say "un MCP pour
  ce projet Convex", "expose mes fonctions Convex à Claude", "connecteur MCP distant
  Convex", "MCP gateway Convex", or mention `convex-mcp-gateway`. Project-agnostic
  and parameterized. NOT for: a generic non-Convex MCP server (use mcp-builder); a
  local stdio MCP; ordinary Convex app development or an in-app @convex-dev/agent
  assistant; or app/user sign-in auth (e.g. WorkOS/AuthKit login for a web app) that
  does not stand up an MCP server.
---

# Convex Remote MCP — production-ready, repeatable

This skill builds a **remote MCP server (Streamable HTTP, protocol `2025-06-18`)
hosted inside an existing Convex backend** — not a separate service. It mounts the
[`convex-mcp-gateway`](https://www.npmjs.com/package/convex-mcp-gateway) component in
one line, exposes `$CONVEX_SITE_URL/mcp`, authenticates clients with **WorkOS
AuthKit** (OAuth 2.1 + PKCE, DCR/CIMD), verifies the resource-bound JWT **locally
against the JWKS**, gates access by an **allowlist**, and — critically — wraps every
tool in an **anti-leak projection layer** so no raw Convex document, `_id`, or PII
reaches the LLM.

It is the distilled, reusable form of a real end-to-end build. The companion
**source of truth** is the playbook (read it once, in full, before you start):
`~/.claude/skill-drafts/convex-mcp-production-playbook.md`. If that file is absent,
tell the user and stop — do not guess its contents.

```
claude.ai
   │  POST /mcp (anonymous) → 401 + WWW-Authenticate          (protocolVersion 2025-06-18)
   ▼
OAuth WorkOS AuthKit (DCR/CIMD, PKCE) → resource-bound JWT (aud = …/mcp)
   │
   ▼
HTTP route /mcp  (httpAction, requireAuth:true)
   │   resolveIdentity = LOCAL JWKS verify (RS256 + iss/aud/exp) → email → authorize (allowlist)
   ▼
gateway.handleMcpRequest  (convex-mcp-gateway)
   │   fingerprint(tools) → reconcile registry   ·   dispatch VERBATIM
   ▼
internal Convex fn  (internalQuery / internalMutation / internalAction)
   ▼
PROJECTION (mcp/functions.ts) → whitelisted fields only → response to client
```

## When to use / not use

**Use** for: standing up a Convex-backed remote MCP connector, adding WorkOS OAuth
to one, fixing a leak/auth/projection issue in one, or rolling one to production.

**Don't use** for: a generic non-Convex MCP server (that's `mcp-builder`), a local
stdio MCP, or building the Convex *app* itself (that's `convex` / `convex-expert`).

## How to drive this skill

This is a **multi-phase build with hard verification gates**, not a single edit.
Work the phases in order. SKILL.md is the orchestrator; each phase points to one
reference file you read **just before** doing that phase (progressive disclosure —
don't preload all five). Bundled templates and scripts do the repetitive parts.

### Phase 0 — Collect the project parameters

Everything project-specific is a parameter. Fill this table **with the user** first;
every template uses these as `<PLACEHOLDERS>`. Never hardcode the example values.

| Parameter | Meaning | Example (real build) |
|---|---|---|
| `<SERVER_NAME>` | `serverInfo.name` (a slug for this MCP server) | `cobacam-communicator` |
| `<DEPLOYMENT_DEV>` | dev `.convex.site` origin | `https://agile-hare-487.convex.site` |
| `<DEPLOYMENT_PROD>` | prod `.convex.site` origin | `https://wonderful-shrimp-462.convex.site` |
| `<DEPLOYMENT>` | the dev **or** prod origin for whichever you're targeting (used by deployment-agnostic commands/scripts) | one of the two above |
| `<AUTHKIT_DOMAIN>` | WorkOS AuthKit domain = OIDC **issuer** | `https://premier-image-79-staging.authkit.app` |
| `<ALLOWLIST_TABLE>` | Convex table gating access by email | `allowedUsers` |
| `<ALLOWLIST_INDEX>` | index on the lowercased email | `by_email` |
| `<TIMEZONE>` | IANA tz for any clock/date tool (if any) | `America/Montreal` |
| `<MCP_PATH>` | mount path | `/mcp` |
| `<SYSTEM_PROMPT_IMPORT>` | the in-app agent prompt to reuse verbatim (if any) | `COBACAM_SYSTEM_PROMPT` |
| `<TOOL_CATALOG>` | *conceptual input* — the set of functions to expose, by READ/WRITE class; shapes the `tools` array in `gateway.ts`/`functions.ts`, not a literal substituted token | 30 tools |

Also confirm the **one-time prerequisites** (playbook §1): a Convex account with
**separate dev + prod** deployments, the `convex-mcp-gateway` npm package, a WorkOS
AuthKit tenant, claude.ai custom-connector access, and `bunx convex` / `gh` / `curl`.

### Phase 1 — Architecture & wiring  →  read `references/architecture.md`

Understand the topology and env-var contract, then install + wire the component:
`convex.config.ts` (`app.use(mcpGateway)`), instantiate the gateway, mount the HTTP
route on **both `<MCP_PATH>` and `<MCP_PATH>/`**, and add the well-known routes.
Templates: `assets/templates/convex.config.ts`, `http.ts`, `gateway.ts`. The single
source of truth for **environment variables** lives in this reference (§ env table) —
every later phase refers back to it instead of re-listing vars.

### Phase 2 — OAuth (WorkOS AuthKit)  →  read `references/auth-workos.md`

The full, self-contained OAuth contract: WorkOS dashboard config (enable DCR + CIMD,
register the resource indicator **with and without trailing slash**), the local JWKS
verify (`resolveIdentity` / `verifyAccessToken`), the `authorize` allowlist gate, the
`configureOAuth` one-shot internalMutation (defaults to the **issuer**, not
`CONVEX_SITE_URL`), and the well-known routes. Includes the bridge-mode requirements
for non-WorkOS IdPs and the OAuth pitfalls (`application_not_found`, `invalid_target`,
userinfo-rejects-token, wrong well-known path).

### Phase 3 — Anti-leak projection layer  →  read `references/anti-leak-projections.md`

The heart of the security model. Dispatch returns the handler value **VERBATIM**, so
**every** tool that could return a raw Convex doc needs an `internal*` projection
wrapper with **whitelisted fields only** (never `return ctx.db.get(...)`). Covers the
projection wrapper pattern, the read/detail vs list split, the **clock-in-action**
rule (clock values belong in `internalAction`, never `internalQuery`), `identityArg`
vs the `authorize`-time allowlist, and **audit redaction for reads AND writes**
(`writeRedacting` / `readRedacting`). Template: `assets/templates/mcp-functions.ts`.

### Phase 4 — Tests & verification  →  read `references/tests-verification.md`

The gate discipline — **never trust the typecheck alone**. Static validate →
`convex dev --once` (the real gate) → `configureOAuth` → **runtime READ-ONLY probes**
→ test-data hygiene (seed → probe → delete → drop the temp file) → smoke test →
**adversarial PR review** (the `adversarial-pr-review` skill; a PreToolUse hook blocks
`gh pr create` until it passes) → re-verify after fixes → commit. This reference also
carries the **anti-bug checklist** (the hard-won correctness traps: arg-boundary
non-ASCII keys, clock-in-query, emoji surrogate truncation, timezone, ICU "24", date
round-trip validation, shallow-merge, allowlist bypass, audience-empty, bash `set -u`,
406-vs-401). Scripts: `scripts/mcp-smoke-test.sh`, `scripts/verify-gates.sh`.

### Phase 5 — Production rollout  →  read `references/rollout-prod.md`

dev and prod are **separate DBs + env-stores**, so everything is re-done with `--prod`:
Vercel-coupled `convex deploy`, prod env vars (the §env table again), prod allowlist
seed, `configureOAuth --prod` (the easy-to-forget last brick), WorkOS resource
indicators for the prod URL (both slash forms), prod smoke test, then the claude.ai
connector. Includes the rollout pitfalls (orphan `_cleanup_tmp.ts`, circular type
inference sites, sentinel keyed on HEAD, multi-account git remotes).

## Bundled resources

Read references *as you reach each phase* (don't preload). Copy templates into the
target project and substitute the Phase-0 parameters. Run scripts to verify.

| Resource | Use |
|---|---|
| `references/architecture.md` | Phase 1: topology, env-var table, wiring. |
| `references/auth-workos.md` | Phase 2: full OAuth contract + pitfalls + bridge mode. |
| `references/anti-leak-projections.md` | Phase 3: projection, clock-in-action, audit redaction. |
| `references/tests-verification.md` | Phase 4: gate sequence + anti-bug checklist. |
| `references/rollout-prod.md` | Phase 5: prod rollout + pitfalls. |
| `assets/templates/convex.config.ts` | Component registration. |
| `assets/templates/gateway.ts` | Gateway scaffold: catalog, authorize, resolveIdentity, JWKS verify, configureOAuth, initialize. |
| `assets/templates/http.ts` | Route mounting + well-known. |
| `assets/templates/mcp-functions.ts` | Projection wrappers + helpers + `isEmailAllowed`. |
| `assets/templates/timezone.ts` | Clock helper with ICU-24 + date round-trip guards (drop if no date tools). |
| `scripts/mcp-smoke-test.sh` | End-to-end auth+protocol smoke test (parameterized). |
| `scripts/verify-gates.sh` | Runs the verification gate sequence in order. |

## Non-negotiables (the hard-won lessons)

These are the principles that distinguish a working build from a leaky/insecure one.
Each links to where the detail lives. Internalize them — they're *why* the skill exists.

- **Dispatch is VERBATIM ⇒ projection is mandatory.** The component returns the
  handler's value untouched to the LLM. Any tool that could return a raw doc leaks
  `_id`/`_creationTime`/PII — and an `_id` surfaced as e.g. `eventId` gets reinjected
  into an update tool and "can't be found". Wrap with whitelisted-field `internal*`.
  (Phase 3)
- **Projection ≠ audit redaction.** `auditArgs.redact` only scrubs the recorded
  *input args*; it never reshapes the *response*. A `WRITE`+redact tool is not
  response-safe. Redact audit for **reads and writes** that carry PII. (Phase 3)
- **Verify the JWT LOCALLY against the JWKS** (RS256 via `crypto.subtle`, no `jose`) +
  mandatory `iss`/`aud`/`exp`. **Never** call userinfo — a resource-bound token is
  rejected there. (Phase 2)
- **Trust only a VERIFIED email.** Management API (authoritative) or a token `email`
  with `email_verified === true`. No `preferred_username` fallback (spoofable); test
  each claim `typeof === 'string'` so a non-string can't short-circuit. (Phase 2)
- **Everything is `internal*`** and reachable only through the gateway after the
  allowlist check. A public function bypasses all MCP auth. (Phase 3)
- **Clock values live in `internalAction`, never `internalQuery`** — a query caches
  and freezes the date (notably across midnight). Split into a `*Rows` query + an
  action wrapper that reads the clock. (Phase 3 / anti-bug checklist)
- **Fail CLOSED everywhere.** A missing env var (`MCP_UPSTREAM_ISSUER`,
  `CONVEX_SITE_URL`) must DENY (→ 401), never silently disable a check; require
  `audiences.length > 0`; never negative-cache JWKS/email. (Phase 2)
- **Apply correctness fixes SYMMETRICALLY** to the MCP wrappers and the in-app tools
  via a shared helper, or behavior drifts between the two surfaces. (Phase 4)
- **Never commit on a red gate.** Static validate → `convex dev --once` → runtime
  probes → smoke test → adversarial review, in that order. The typecheck does not see
  codegen/validators/`internal.*` resolution; `convex dev --once` is the real gate.
  (Phase 4)
- **Run the adversarial review LAST**, after every fix is committed — its sentinel is
  keyed to HEAD, and any new commit re-blocks `gh pr create`. (Phase 4)

## Critical reminders

- **Read the playbook in full first.** It is the source of truth; this SKILL.md is the
  index over it.
- **Parameterize, don't copy COBACAM.** The example values above are illustrations.
- **dev ≠ prod.** Separate DB and env store — re-seed the allowlist, re-run
  `configureOAuth --prod`, re-add WorkOS resource indicators, re-probe with `--prod`.
- **`configureOAuth` must run** (per deployment) or `/.well-known/oauth-protected-resource<MCP_PATH>`
  returns `"OAuth discovery not configured"` and login is impossible.
