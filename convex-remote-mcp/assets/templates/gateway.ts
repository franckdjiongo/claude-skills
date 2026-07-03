// convex/mcp/gateway.ts
//
// Remote MCP gateway — exposes selected Convex functions as MCP tools to
// claude.ai / Claude Desktop / Code over Streamable HTTP, isolated from the app's
// own auth. claude.ai authenticates against WorkOS AuthKit (DCR/CIMD), and
// `resolveIdentity` validates the resource-bound access token LOCALLY against the
// upstream JWKS, then resolves the user's email; `authorize` gates it by allowlist.
//
// PARAMETERS to substitute in THIS file: <SERVER_NAME>, <MCP_PATH>,
// <SYSTEM_PROMPT_IMPORT>, and the tool catalog. (The allowlist table/index are
// substituted in ./functions.ts → isEmailAllowed, not here.) The JWKS-verify /
// resolveIdentity / authorize / configureOAuth core below is project-AGNOSTIC —
// keep it verbatim.

import {
  McpGateway,
  defineMcpQuery,
  defineMcpMutation,
  defineMcpAction,
  type McpAuthorizerHandler,
  type McpIdentityResolver,
  type McpToolRegistration,
  type RunQueryCtx,
} from 'convex-mcp-gateway'
import { v } from 'convex/values'
import { components, internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
// import { SYSTEM_PROMPT } from '../agents/systemPrompt' // <SYSTEM_PROMPT_IMPORT> — reuse the in-app prompt verbatim

export const gateway = new McpGateway(components.mcpGateway)

export const MCP_PATH = '/mcp' // <MCP_PATH>

// ---------------------------------------------------------------------------
// Per-tool metadata helpers
// ---------------------------------------------------------------------------
const READ = { write: false }
const WRITE = { write: true }
// Redact PII-carrying ARGS from the component audit log. This scrubs the recorded
// input only — it does NOT reshape the response (that is the projection layer's
// job; see ./functions.ts). Still flagged write:true/false for the authorizer.
const writeRedacting = (...redact: string[]) => ({ write: true, auditArgs: { redact } })
const readRedacting = (...redact: string[]) => ({ write: false, auditArgs: { redact } })

// ---------------------------------------------------------------------------
// Tool catalog — REPLACE with your tools. The type annotation `: McpToolRegistration[]`
// is REQUIRED (one of two circular-inference sites; the other is actions that
// reference internal.*, which need an explicit Promise<…> return type).
//
// Point a tool DIRECTLY at an existing internal.* fn ONLY if that fn never returns
// a raw Convex doc. Otherwise point at a projection wrapper in ./functions.ts.
// The examples below illustrate every metadata class.
// ---------------------------------------------------------------------------
export const tools: McpToolRegistration[] = [
  // Clock context — an ACTION (a query would freeze the date). Read-only.
  defineMcpAction({
    name: 'getCurrentDate',
    description: 'Current date/time. Call before any date math or overdue check.',
    fn: internal.mcp.functions.getCurrentDate,
    args: {},
    metadata: READ,
  }),
  // Pure DB reshape → projection QUERY (whitelisted fields, no _id/PII).
  defineMcpQuery({
    name: 'getEvent',
    description: "Full details of an event by its PUBLIC id.",
    fn: internal.mcp.functions.getEvent,
    args: { eventId: v.string() },
    metadata: READ,
  }),
  // Reshape + a clock field (isOverdue) → projection ACTION, with a v.id guard
  // against cross-table disclosure.
  defineMcpAction({
    name: 'getReminderById',
    description: 'A reminder by its Convex id, with full message + computed isOverdue.',
    fn: internal.mcp.functions.getReminderById,
    args: { reminderId: v.id('reminderQueue') }, // v.id rejects a foreign-table id
    metadata: READ,
  }),
  // Write with a JSON-string arg (the Convex codec rejects non-ASCII field keys at
  // the boundary, so nested/accented detail keys must travel as a JSON string and
  // be parsed + sanitized in the handler). Redact the PII fields from the audit.
  defineMcpMutation({
    name: 'createEvent',
    description:
      'Create an event. `details` is a JSON OBJECT STRING (keys auto-normalized to ' +
      'snake_case ASCII). Top-level keys are merged SHALLOW on update — return the ' +
      'COMPLETE nested object/array to change a nested value.',
    fn: internal.mcp.functions.createEvent,
    args: {
      type: v.string(),
      title: v.string(),
      date: v.string(),
      details: v.optional(v.string()), // JSON string, not v.any/v.record
    },
    metadata: writeRedacting('details', 'title'),
  }),
  // Free-text search → read-side audit redaction (the query term may carry PII).
  defineMcpAction({
    name: 'searchArchive',
    description: 'Search the archive by keywords/type/date.',
    fn: internal.mcp.functions.searchArchive,
    args: { query: v.optional(v.string()), type: v.optional(v.string()), limit: v.optional(v.number()) },
    metadata: readRedacting('query'),
  }),
]

// ---------------------------------------------------------------------------
// Authorization — every tool requires an authenticated, allowlisted caller.
// Resolve the email ONCE here (not per tool): a dispatched tool cannot read the
// caller (ctx.auth is stripped at the component boundary), and a caller-supplied
// identity arg would be spoofable.
// ---------------------------------------------------------------------------
export const authorize: McpAuthorizerHandler = async (ctx, args) => {
  const identity = args.identity
  if (!identity) return { allowed: false, reason: 'Unauthorized' }

  const claims = identity.claims ?? {}
  // Test each candidate claim independently as a string (so a non-string `email`
  // can't short-circuit a fallback), then normalize. Only a VERIFIED email is
  // trusted (set by resolveIdentity). No preferred_username fallback — spoofable.
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : undefined
  if (!email) return { allowed: false, reason: 'No verified email resolved for this token.' }

  const { runQuery } = ctx as unknown as {
    runQuery: (
      ref: typeof internal.mcp.functions.isEmailAllowed,
      a: { email: string }
    ) => Promise<{ allowed: boolean }>
  }
  const result = await runQuery(internal.mcp.functions.isEmailAllowed, { email })
  if (!result.allowed) {
    console.warn('[mcp] authorize denied: email not in allowlist')
    return { allowed: false, reason: `Email ${email} not allowed.` }
  }
  return { allowed: true }
  // Future read-only mode = a one-liner: if (args.toolMetadata?.write) return deny.
}

// ---------------------------------------------------------------------------
// Identity resolution — validate the access token LOCALLY via JWKS.
// MCP tokens are resource-bound (aud = this server), so they are NOT accepted at
// the IdP's userinfo endpoint. Verify the RS256 signature against the JWKS and
// check iss/aud/exp ourselves. The token carries `sub` but maybe not `email`, so
// resolve the email from the WorkOS Management API (cached per isolate).
//
// REQUIREMENT (incl. bridge mode): the upstream MUST mint resource-bound RS256 JWT
// access tokens whose `aud` is this <MCP_PATH> URL. Opaque tokens and aud=client_id
// tokens fail CLOSED here (null → 401), by design.
// ---------------------------------------------------------------------------
function issuerMatches(actual: string, expected: string): boolean {
  return actual.replace(/\/+$/, '') === expected.replace(/\/+$/, '')
}
function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// JWKS cache, per V8 isolate. Refreshed on a kid miss (key rotation) or after a
// TTL; forced refetches are rate-limited so a kid-spraying attacker can't amplify
// load. Failed/malformed fetches never poison the cache — fall back to last good.
type Jwk = { kid?: string; kty: string; n: string; e: string; alg?: string }
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null
let lastForcedFetch = 0
const JWKS_TTL_MS = 3_600_000
const JWKS_FORCE_MIN_INTERVAL_MS = 60_000

let jwksUriCache: { uri: string; resolvedAt: number } | null = null
async function resolveJwksUri(issuer: string): Promise<string> {
  const override = process.env.MCP_UPSTREAM_JWKS_URI
  if (override) return override
  const base = issuer.replace(/\/+$/, '')
  const now = Date.now()
  if (jwksUriCache && now - jwksUriCache.resolvedAt < JWKS_TTL_MS) return jwksUriCache.uri
  try {
    const res = await fetch(`${base}/.well-known/openid-configuration`)
    if (res.ok) {
      const meta = (await res.json()) as { jwks_uri?: unknown }
      if (typeof meta.jwks_uri === 'string' && meta.jwks_uri) {
        jwksUriCache = { uri: meta.jwks_uri, resolvedAt: now }
        return meta.jwks_uri
      }
    } else {
      console.warn('[mcp] OIDC discovery failed:', res.status)
    }
  } catch (e) {
    console.warn('[mcp] OIDC discovery error:', e instanceof Error ? e.message : 'unknown')
  }
  return `${base}/oauth2/jwks` // WorkOS-style fallback (verified-working default)
}

async function getJwks(issuer: string, force = false): Promise<{ keys: Jwk[] }> {
  const now = Date.now()
  if (jwksCache && !force && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache
  if (force && jwksCache && now - lastForcedFetch < JWKS_FORCE_MIN_INTERVAL_MS) return jwksCache
  if (force) lastForcedFetch = now
  try {
    const res = await fetch(await resolveJwksUri(issuer))
    if (!res.ok) {
      console.warn('[mcp] JWKS fetch failed:', res.status)
      return jwksCache ?? { keys: [] }
    }
    const data = (await res.json()) as { keys?: unknown }
    if (!Array.isArray(data.keys)) {
      console.warn('[mcp] JWKS malformed')
      return jwksCache ?? { keys: [] }
    }
    jwksCache = { keys: data.keys as Jwk[], fetchedAt: now }
    return jwksCache
  } catch (e) {
    console.warn('[mcp] JWKS fetch error:', e instanceof Error ? e.message : 'unknown')
    return jwksCache ?? { keys: [] }
  }
}

async function verifyAccessToken(
  token: string,
  issuer: string,
  audiences: string[]
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  let header: { kid?: string; alg?: string }
  let payload: Record<string, unknown>
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(h)))
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(p)))
  } catch {
    return null
  }
  if (header.alg !== 'RS256') return null
  if (typeof header.kid !== 'string') return null

  let jwks = await getJwks(issuer)
  let jwk = jwks.keys.find((k) => k.kid === header.kid)
  if (!jwk) {
    jwks = await getJwks(issuer, true) // kid miss → forced (rate-limited) refetch
    jwk = jwks.keys.find((k) => k.kid === header.kid)
  }
  if (!jwk) return null

  let ok = false
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: false },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`)
    )
  } catch (e) {
    console.warn('[mcp] jwt signature verify error:', e)
    return null
  }
  if (!ok) return null

  // Claims are mandatory; the verified signature covers them.
  if (typeof payload.iss !== 'string' || !issuerMatches(payload.iss, issuer)) return null
  const now = Math.floor(Date.now() / 1000)
  const LEEWAY_S = 60
  if (typeof payload.exp !== 'number' || payload.exp < now - LEEWAY_S) return null
  if (typeof payload.nbf === 'number' && payload.nbf > now + LEEWAY_S) return null
  // Audience confinement: the token MUST be bound to this MCP server. An empty
  // `audiences` list can never satisfy this (resolveIdentity fails closed first).
  const aud = payload.aud
  const audOk =
    audiences.length > 0 &&
    (typeof aud === 'string'
      ? audiences.some((a) => issuerMatches(a, aud))
      : Array.isArray(aud) && aud.some((x) => audiences.some((a) => issuerMatches(a, String(x)))))
  if (!audOk) return null
  return payload
}

// Resolve a WorkOS user's email from its id via the Management API. Cached per
// isolate with a TTL so a removed/changed email stops authorizing. Only SUCCESSES
// are cached — a transient failure must not negative-cache and lock out a user.
const EMAIL_TTL_MS = 600_000 // 10 min
const emailCache = new Map<string, { email: string; fetchedAt: number }>()
async function fetchWorkosEmail(userId: string): Promise<string | undefined> {
  const cached = emailCache.get(userId)
  if (cached && Date.now() - cached.fetchedAt < EMAIL_TTL_MS) return cached.email
  const apiKey = process.env.WORKOS_API_KEY
  if (!apiKey) {
    console.warn('[mcp] WORKOS_API_KEY not set; cannot resolve email')
    return undefined
  }
  try {
    const res = await fetch(
      `https://api.workos.com/user_management/users/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) {
      console.warn('[mcp] WorkOS user lookup failed:', res.status)
      return undefined
    }
    const user = (await res.json()) as { email?: unknown }
    const email = typeof user.email === 'string' ? user.email : undefined
    if (email) emailCache.set(userId, { email, fetchedAt: Date.now() })
    return email
  } catch (e) {
    console.warn('[mcp] WorkOS user lookup error:', e)
    return undefined
  }
}

export const resolveIdentity: McpIdentityResolver = async (token) => {
  const issuer = process.env.MCP_UPSTREAM_ISSUER
  if (!issuer) {
    console.warn('[mcp] MCP_UPSTREAM_ISSUER not set; rejecting all tokens.')
    return null
  }
  // Fail closed: without the site origin we cannot confine the token audience.
  const site = (process.env.CONVEX_SITE_URL ?? '').replace(/\/+$/, '')
  if (!site) {
    console.warn('[mcp] CONVEX_SITE_URL not set; rejecting all tokens.')
    return null
  }
  const audiences = [`${site}${MCP_PATH}`, `${site}${MCP_PATH}/`]

  try {
    const payload = await verifyAccessToken(token, issuer, audiences)
    if (!payload) return null
    const subject = typeof payload.sub === 'string' ? payload.sub : undefined
    if (!subject) return null
    // Trust a token `email` only if the IdP marked it verified; otherwise resolve
    // the authoritative email from the Management API. (Non-WorkOS bridge issuers
    // MUST mint email + email_verified:true, since the API fallback is WorkOS-only.)
    const tokenEmail =
      typeof payload.email === 'string' && payload.email_verified === true
        ? payload.email
        : undefined
    const email = tokenEmail ?? (await fetchWorkosEmail(subject))
    return { subject, claims: { ...payload, email } }
  } catch (e) {
    console.warn('[mcp] resolveIdentity error:', e instanceof Error ? e.message : 'unknown')
    return null
  }
}

// ---------------------------------------------------------------------------
// OAuth / transport configuration (consumed by ../http.ts)
// ---------------------------------------------------------------------------
export const upstreamIssuer = process.env.MCP_UPSTREAM_ISSUER ?? ''
export const upstreamClientId = process.env.MCP_UPSTREAM_CLIENT_ID ?? '' // bridge mode only

// Redirect URIs the DCR shim accepts (prevents open-redirect token theft).
export const allowedRedirectPatterns: RegExp[] = [
  /^https:\/\/claude\.ai\//,
  /^https:\/\/claude\.com\//,
  /^https:\/\/[a-z0-9-]+\.claude\.com\//,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//,
]

// Browser MCP clients send a CORS preflight; non-browser clients send no Origin.
export const corsOrigins: string[] = [
  'https://claude.ai',
  'https://claude.com',
  'http://localhost:6274', // MCP Inspector
]

export const serverInfo = { name: '<SERVER_NAME>', version: '0.1.0' }

// Reuse the in-app agent's system prompt VERBATIM as the base (single source of
// truth — the MCP surface can't drift from the app). The MCP addendum comes FIRST:
// clients FRONT-TRUNCATE `initialize` instructions, so the MCP-only overrides (date
// via getCurrentDate; list tools return previews; fetch full content before editing)
// must lead to survive truncation.
export const baseInitializeInstructions =
  '## MCP context (remote claude.ai connector) — TAKES PRECEDENCE\n\n' +
  'You operate via the MCP connector, not the app. These overrides take precedence ' +
  'over the system prompt below:\n' +
  '1. **Date** is NOT injected automatically — call `getCurrentDate` before any date math.\n' +
  '2. **Previews vs full content**: list tools return previews/metadata; fetch the full ' +
  'body via the detail tools before editing.\n\n'
// + SYSTEM_PROMPT  // <SYSTEM_PROMPT_IMPORT> — append the in-app prompt verbatim

// Is the bearer of this request's token allowlisted? Mirrors `authorize`, used to
// gate sensitive `initialize` content. `initialize` runs BEFORE per-tool authorize
// and `requireAuth` only blocks anonymous POSTs — so a valid-but-not-allowlisted
// token still reaches `initialize`. Fails closed on any missing/invalid token.
async function callerIsAllowlisted(ctx: RunQueryCtx, req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(auth)
  if (!match) return false
  try {
    const identity = await resolveIdentity(match[1])
    const claims = identity?.claims ?? {}
    const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : undefined
    if (!email) return false
    const result = await ctx.runQuery(internal.mcp.functions.isEmailAllowed, { email })
    return result.allowed
  } catch {
    return false
  }
}

// Build per-session `initialize` instructions. The base is shipped in this repo
// (not sensitive) → every authenticated caller gets it. Any PRIVATE operational
// context (e.g. admin-managed custom instructions) is appended ONLY for an
// allowlisted caller, since `initialize` is reached before the allowlist check.
export async function buildInitializeInstructions(ctx: RunQueryCtx, req: Request): Promise<string> {
  if (!(await callerIsAllowlisted(ctx, req))) return baseInitializeInstructions
  // Example: append active admin instructions for allowlisted callers only.
  // const active = await ctx.runQuery(internal.agents.instructions.internalGetActiveInstructions, {})
  // if (active?.content?.trim()) return baseInitializeInstructions + '\n\n' + active.content
  return baseInitializeInstructions
}

// ---------------------------------------------------------------------------
// One-shot OAuth discovery setup. Run after every deploy (idempotent, persists):
//   bunx convex run mcp/gateway:configureOAuth '{"authServerUrl":"<AUTHKIT_DOMAIN>"}'
// internalMutation (NOT public) → only the trusted CLI can run it.
// ---------------------------------------------------------------------------
export const configureOAuth = internalMutation({
  args: { authServerUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Default to the upstream issuer (WorkOS-direct), NOT CONVEX_SITE_URL: pointing
    // clients at our own (bridged) metadata routes them to /oauth/register (503).
    const authServerUrl = args.authServerUrl ?? process.env.MCP_UPSTREAM_ISSUER ?? null
    if (!authServerUrl) {
      throw new Error('Set MCP_UPSTREAM_ISSUER (or pass authServerUrl) before configuring OAuth.')
    }
    await gateway.setOAuthConfig(ctx, { authServerUrl })
    return { authServerUrl }
  },
})
