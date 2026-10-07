# Phase 0 — Project parameters

Everything project-specific is a parameter. Fill this table **with the user** first; every template uses these as `<PLACEHOLDERS>`. Never hardcode the example values.

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
