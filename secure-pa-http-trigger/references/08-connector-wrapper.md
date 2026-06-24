# 08 — Custom connector wrapper

Source: §8 of the brief.

## When to use it

Use a custom connector wrapper when the caller is a **Power Apps-facing
interactive experience** — Power Apps Code Apps, canvas/custom pages, or
model-driven custom pages — and you want Power Platform to manage user
sign-in, connection storage, and consent. This is **mandatory for Code Apps
after CSP enforcement (2026-01-30, MC1218747)** and **recommended for MDA
buttons** when paired with a Custom Page.

## When not to use it

- **Dataverse sandbox plug-ins** — there is no documented model where sandbox
  plug-in code reuses Power Platform custom connector connections. Use Pattern
  A or B from §04 instead.
- **Connector with No authentication** — does not satisfy the protected
  flow's bearer requirement.

## Identity flow

1. The user signs in to the custom connector connection.
2. The connector obtains a delegated token for the backend resource.
3. The connector calls the flow URL directly with `Authorization: Bearer …`.
4. The flow validates `aud`, `iss`, `tid` (and `oid` when applicable).

The connector's backend resource URI must be the Flow service audience
`https://service.flow.microsoft.com/` (`[Inference]` — Microsoft documents
the audience and the connector resource URI mechanism separately, not in one
article).

## `HTTP with Microsoft Entra ID (preauthorized)` is NOT a substitute

That connector runs through a Microsoft first-party trusted application with
preauthorization. Improved identity-isolation controls are planned. For
least-surprise app governance and discrete consent, use **your own custom
connector**.

## Three valid security configurations

| Connector security                                                                         | Flow trigger setting    | Best for                                                                                                  |
|--------------------------------------------------------------------------------------------|-------------------------|-----------------------------------------------------------------------------------------------------------|
| **OAuth 2.0 / Microsoft Entra ID** with Resource URL `https://service.flow.microsoft.com/` | `Any user in my tenant` | **Recommended** — full audit trail, delegated user token, works for all three caller contexts             |
| **No authentication** on the connector while the flow itself is OAuth-protected            | `Any user in my tenant` | Internal tenant-only callers where the connector runtime still injects the connection's user token        |
| _HTTP with Microsoft Entra ID (preauthorized)_                                             | n/a                     | Calling Microsoft first-party APIs as the signed-in user — **not a wrapper for your flow**                |

## Security scheme choice

Use **Microsoft Entra ID / OAuth 2.0**. Microsoft explicitly says custom
connector creation does **not** support client credentials in the OAuth
security definition; trying to use it will fail. If you need app-only,
expose the flow via a broker API (Pattern B) or change the flow to `Specific
users in my tenant` + SPN allow-list.

## OpenAPI 2.0 templates

- **Primary** wrapper: `assets/connector/apiDefinition.swagger.yaml`
  - Declares OAuth 2.0 access-code flow with the Flow service scope
  - Requires `workflowId` path parameter (the flow's GUID from its trigger URL)
  - Includes `TriggerFlowRequest` and `TriggerFlowResponse` definitions and
    `x-ms-` extensions for Power Platform UX
- **Env-parameterized** variant: `assets/connector/apiDefinition.envvar.swagger.yaml`
  - Wraps the existing flow URL with `{{FLOW_HOST}}`, `{{TENANT_ID}}`,
    `{{WORKFLOW_ID}}`, `{{FLOW_SIG}}` placeholders
  - Preserves legacy SAS query parameters (`sp`, `sv`, `sig`) for legacy URL
    bridging — these will not be present after migration to `Any user in my
    tenant`
  - Leaves `scopes: {}` empty and relies on connector UI configuration because
    Microsoft does not currently document the exact delegated scope name
    (`[Inference]`)

Power Platform requires **OpenAPI 2.0**, not 3.0. Don't migrate the YAML to
3.0 syntax.

## Connector creation steps (UI)

1. **make.powerapps.com → Custom connectors → + New custom connector → Import
   an OpenAPI file** with the chosen YAML.
2. **Security tab:** OAuth 2.0 → Identity Provider: Azure Active Directory →
   Tenant ID: tenant GUID (or `common` for multi-tenant) → Client ID + Client
   Secret from App A → Resource URL `https://service.flow.microsoft.com/` →
   Scope `https://service.flow.microsoft.com/User`.
3. Copy the generated **Redirect URL** and add it to App A's Authentication →
   Redirect URIs (Web).
4. **Test tab:** create a connection → invoke `TriggerFlow` → expect 202.
5. If using newer **custom-connector managed-identity authentication**, add
   the connector-generated federated credential to the Entra app.

## paconn / Azure CLI equivalent

```bash
pip install paconn
paconn login
paconn create --api-prop apiProperties.json --api-def apiDefinition.swagger.json
```

## Test procedure

Verify four cases:

| Case                                       | Expected         |
|--------------------------------------------|------------------|
| Signed-in tenant user                      | 202              |
| Unsigned user trying to create / use connection | Cannot      |
| Same-tenant token with wrong audience      | 401              |
| Wrong-tenant token                         | 401              |

If the wrapper is used from a browser-facing app fronted with API Management
or another API, configure CORS explicitly for browser clients.

## Limitations

- OAuth credential expiry must be managed.
- If multiple security definitions are hand-authored, Power Platform connector
  import picks the **top one**.
- OAuth security definitions in connector creation do **not** support client
  credentials.
- Authenticated principal surfaced in flow run history for connector-mediated
  calls is not documented — don't rely on run history alone for caller-identity
  audit. Use correlation IDs.
