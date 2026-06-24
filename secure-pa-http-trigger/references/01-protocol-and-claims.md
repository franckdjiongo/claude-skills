# 01 — Protocol enforcement and claims

Source: §3 and §4 of the brief.

## What Power Automate validates on the inbound JWT

Validation is **claim-based, not RBAC-based**. There is no
Application-permission role on the Flow Service first-party app — only a
delegated `User → Access Microsoft Flow as signed in user` scope — yet
client-credentials (app-only) tokens still work for `Any user in my tenant`
because no `oid` is required. (`[Inference]` on app-only acceptance: see §1.)

| Element                   | Value                                                                                                  | Required                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| HTTP header               | `Authorization: Bearer <jwt>`                                                                          | REQUIRED                                     |
| `aud` (Public cloud)      | `https://service.flow.microsoft.com/`                                                                  | REQUIRED, trailing slash mandatory           |
| `aud` (GCC)               | `https://gov.service.flow.microsoft.us/`                                                               | REQUIRED for GCC                             |
| `aud` (GCC High)          | `https://high.service.flow.microsoft.us/`                                                              | REQUIRED for GCC High                        |
| `aud` (China)             | `https://service.powerautomate.cn/`                                                                    | REQUIRED for China                           |
| `aud` (DoD)               | `https://service.flow.appsplatform.us/`                                                                | REQUIRED for DoD                             |
| `iss`                     | `https://login.microsoftonline.com/{tid}/v2.0` (v2) or `https://sts.windows.net/{tid}/` (v1)           | REQUIRED                                     |
| `tid`                     | Tenant GUID                                                                                            | REQUIRED                                     |
| `oid`                     | Object ID of caller                                                                                    | Only when **Specific users in my tenant**    |
| Trigger URL               | No SAS signature when `Any user in my tenant` selected (in some configs `sig=` may persist — treat URL as secret) | (informational)                              |
| Token scope (acquisition) | `https://service.flow.microsoft.com//.default` (**double slash** — see below) or `https://service.flow.microsoft.com/User` | REQUIRED                                     |
| `scp` / `roles`           | Not listed as required by Microsoft Learn                                                              | `[Inference]` — do not assume a value        |

## Flow Service first-party application

`7df0a125-d3be-4c96-aa54-591f83ff541c` — same in every cloud (Microsoft Support
article 4316891; Microsoft Learn _Fix flow failures_ / _Troubleshoot broken
connections_).

The Flow Service first-party API exposes **only delegated permissions** in the
API-permissions blade. Don't waste time hunting for an Application-permission
role that doesn't exist.

## Embed-flow widget cross-confirmation

Microsoft's Power Automate embedding guidance independently confirms the same
audience: the host obtains a Power Automate access token for the **user** with
audience `https://service.flow.microsoft.com` and refreshes when needed.

## SAS relevance after migration

Microsoft still documents the trigger URL with `sig=<value>` and provides a SAS
regeneration procedure. The SAS value remains part of the URL in some
configurations even after switching to `Any user in my tenant`. **Treat the
complete URL as secret material** even after OAuth is enabled.

## Why this matters for code

Every sample must:

1. Send `Authorization: Bearer <jwt>` (no anonymous fallbacks).
2. Acquire the token against the correct cloud audience above.
3. Use `https://service.flow.microsoft.com//.default` as the canonical scope
   (note the **double slash** — Entra v2 strips one trailing slash; without
   the doubling the resulting `aud` claim has no slash and the flow returns
   `403 MisMatchingOAuthClaims` on Self-Host Multitenant URLs. Full root-cause
   analysis in `references/11-known-bugs-and-workarounds.md`).
   `https://service.flow.microsoft.com/User` is also valid (single slash there
   is fine because Entra preserves the path component). Never substitute
   `user_impersonation` or `Files.ReadWrite.All` or any other scope copied
   from another sample — `AADSTS650053` will result.
4. Match `tid` between caller token and flow tenant. Cross-tenant calls fail
   with `MisMatchingOAuthClaims`.
5. **Verify `aud` actually ends in `/`** by decoding the issued token at
   https://jwt.ms before assuming the call is going to work.

## When to set `oid` (allow-list) vs not

- **Any user in my tenant** — no `oid` allow-list. Any same-tenant user or
  app-only principal whose token claims match `aud` + `iss` + `tid` is
  accepted (`[Inference]` on app-only).
- **Specific users in my tenant** — Microsoft's documented allow-list. Add the
  user's UPN or the SPN's **Object ID** (Enterprise Apps → Service principal →
  Object ID, **not** Application ID). The `oid` claim in the inbound token is
  matched against this list.

If you need a pure daemon caller and the `[Inference]` on app-only into
`Any user` is unacceptable for governance reasons, switch to **Specific users
in my tenant** + SPN Object ID, or use Pattern B (broker API).
