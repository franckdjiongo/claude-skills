// convex/http.ts
//
// Mounts the MCP Streamable HTTP endpoint + OAuth discovery routes. This file is
// largely project-agnostic — the project-specific pieces (catalog, serverInfo,
// instructions, auth) all live in ./mcp/gateway. Substitute nothing here except
// any extra app routes you already have (e.g. Convex Auth).
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import {
  gateway,
  tools,
  authorize,
  resolveIdentity,
  MCP_PATH,
  upstreamIssuer,
  upstreamClientId,
  allowedRedirectPatterns,
  corsOrigins,
  serverInfo,
  baseInitializeInstructions,
  buildInitializeInstructions,
} from './mcp/gateway'

const http = httpRouter()

// --- your existing app auth routes (untouched by the MCP gateway) -----------
// import { auth } from './auth'
// auth.addHttpRoutes(http)

// --- MCP Streamable HTTP endpoint (mounted on $CONVEX_SITE_URL<MCP_PATH>) ----

// Only `initialize` consumes `initializeInstructions`. Building it on every
// tools/call/GET/DELETE/OPTIONS would needlessly re-run identity resolution + DB
// reads, so peek the JSON-RPC method on a CLONED request (the gateway still reads
// the original body) and compute the full payload only for `initialize`.
const isInitializeRequest = async (req: Request): Promise<boolean> => {
  if (req.method !== 'POST') return false
  try {
    const body = (await req.clone().json()) as { method?: unknown }
    return body?.method === 'initialize'
  } catch {
    return false
  }
}

const mcp = httpAction(async (ctx, req) =>
  gateway.handleMcpRequest(ctx, req, {
    authorize,
    resolveIdentity,
    tools,
    // All tools are private → challenge anonymous POSTs with 401 so browser MCP
    // clients (claude.ai) start the OAuth flow.
    requireAuth: true,
    cors: corsOrigins,
    serverInfo,
    initializeInstructions: (await isInitializeRequest(req))
      ? await buildInitializeInstructions(ctx, req)
      : baseInitializeInstructions,
  })
)
for (const path of [MCP_PATH, `${MCP_PATH}/`]) {
  http.route({ path, method: 'POST', handler: mcp })
  http.route({ path, method: 'GET', handler: mcp })
  http.route({ path, method: 'DELETE', handler: mcp })
  // Browser MCP clients send a CORS preflight before the authenticated POST;
  // route OPTIONS to the gateway (otherwise Convex 404s the unregistered method).
  http.route({ path, method: 'OPTIONS', handler: mcp })
}

// --- OAuth 2.1 discovery (so claude.ai can find + log in to the IdP) --------

// RFC 9728 protected-resource metadata. Only the pathPrefix form is mounted so the
// resource is derived as `…<MCP_PATH>`. The bare path would advertise the site ROOT
// as the resource, which resolveIdentity + WorkOS resource indicators reject.
// claude.ai fetches the `…/oauth-protected-resource<MCP_PATH>` URL from the
// `WWW-Authenticate: resource_metadata=…` header.
http.route({
  pathPrefix: '/.well-known/oauth-protected-resource/',
  method: 'GET',
  handler: httpAction(async (ctx, req) => gateway.serveProtectedResourceMetadata(ctx, req)),
})

// RFC 8414 authorization-server metadata, bridged from the upstream IdP. INERT in
// the WorkOS-direct setup (claude.ai discovers WorkOS's own metadata directly); it
// only serves bridge mode. Advertise the UPSTREAM issuer so the metadata `issuer`
// matches the `iss` of the tokens — otherwise strict clients reject the flow before
// any MCP call reaches resolveIdentity.
http.route({
  path: '/.well-known/oauth-authorization-server',
  method: 'GET',
  handler: httpAction(async (ctx, req) =>
    gateway.serveAuthorizationServerMetadata(ctx, req, {
      upstreamIssuer,
      registrationPath: '/oauth/register',
      overrides: { issuer: upstreamIssuer },
    })
  ),
})

// RFC 7591 Dynamic Client Registration shim. INERT in WorkOS-direct; used only when
// fronting a non-DCR IdP (configured via MCP_UPSTREAM_CLIENT_ID). Fail closed: an
// empty upstream client id would hand the client a broken registration.
const oauthRegister = httpAction(async (ctx, req) => {
  if (req.method === 'POST' && !upstreamClientId) {
    return new Response(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'DCR bridge not configured (MCP_UPSTREAM_CLIENT_ID unset).',
      }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    )
  }
  return gateway.handleClientRegistration(ctx, req, { upstreamClientId, allowedRedirectPatterns })
})
http.route({ path: '/oauth/register', method: 'POST', handler: oauthRegister })
http.route({ path: '/oauth/register', method: 'OPTIONS', handler: oauthRegister })

export default http
