# 06 — Caller context: Model-Driven app custom button

Source: §7.3 of the brief.

The recommended pattern keeps **authentication out of ribbon JavaScript**.
Ribbon JS opens a **Custom Page dialog**; the custom page calls a connector
or a cloud flow action. Microsoft documents both halves of this pattern.

## Architecture (recommended — 7.3a)

```
Ribbon button → Web resource (Xrm.Navigation.navigateTo)
                 → Custom Page (Canvas app dialog)
                    → YourConnector.TriggerFlow (delegated user token, connector-managed)
                       → Power Automate flow trigger
                          → Validates aud/iss/tid/oid
```

## 7.3a — Custom Page hosting a Canvas app that calls the connector

Add a custom page to the model-driven app, create the command in the modern
command designer, and set the command action to **Run JavaScript**.
Microsoft's commanding doc for this scenario explicitly says the customization
currently supports **only JavaScript**, and the sample article says you can
call a cloud flow from the custom page dialog.

**Web resource template:** `assets/mda/InvokeFlowPage.js` (also
`assets/mda/InvokeFlowPage.hardened.js` if you want correlation IDs and
graceful global notifications).

Inside the custom page, the canvas formula on the button is:

```
Set(_resp, YourConnector.TriggerFlow({ accountId: Param("recordId"), source: "mda-button", correlationId: GUID() }));
Notify("Flow started: " & _resp.runId, NotificationType.Success);
Back();
```

## 7.3b — Direct fetch with `@azure/msal-browser` (community fallback)

Use only when no Custom Page is in scope. Bundle MSAL into a single web
resource (webpack/esbuild). Ship a tiny `blank.html` web resource as the
redirect URI to keep MSAL on the same origin and prevent the model-driven
shell from clobbering iframe checks (Honza Hájek pattern, hajekj.net,
2025-04-28).

**Templates:**
- `assets/mda/InvokeFlowDirect.js` — bundled MSAL + fetch
- `assets/mda/blank.html` — companion redirect page (deploy as Web Resource
  with name `cont_/blank.html` or your namespace equivalent)

## Configuration checklist

- [ ] **For 7.3a (Custom Page):**
  - Custom page published and model-driven app republished
  - Command points at the web-resource function
  - DLP policies on the environment do not block the connector
- [ ] **For 7.3b (direct MSAL fetch):**
  - App B SPA registration includes both the MDA host and the `blank.html`
    web-resource URL as redirect URIs
  - Delegated `User → Access Microsoft Flow as signed in user` granted with
    admin consent on App B
  - Conditional Access policies do not enforce MFA on every silent token
    acquisition for App B (test with a non-privileged account)

## Test procedure

### 7.3a (Custom Page)

1. Publish the custom page and republish the model-driven app.
2. Click the command from a record form and from a grid if both are supported.
3. Confirm the dialog opens with the correct record context.
4. Confirm the custom page's connector/flow path works for a regular licensed
   user.
5. Confirm errors display a user-visible notification and a client-side
   correlation ID.

### 7.3b (direct MSAL fetch)

- First click in MDA shows a brief popup; subsequent clicks are silent.
- Decode the request token at https://jwt.ms — `aud=https://service.flow.microsoft.com/`,
  `oid` populated, `tid` matches.
- Negative test: open the same MDA in a different profile signed in as a
  different user — flow runs as the other user; `oid` differs.

## Limitations and support status

Direct ribbon-JavaScript `fetch` calls to the flow endpoint with a
script-added `Authorization` header are a cross-origin browser scenario and
can hit CORS enforcement unless the target endpoint explicitly permits the
origin and header. Microsoft documents the same-origin / CORS behavior
generally and specifically documents enabling CORS when browser-based Power
Platform clients call APIs through API Management-backed connectors.
Therefore, direct browser-to-flow `fetch` should be treated as `[Inference]`
and not the cleanest production design.

The MSAL.js direct-fetch pattern is functional and used in production by
multiple MVPs (Hájek, Microsoft Graph Toolkit team), but is not documented by
Microsoft as a supported pattern for ribbon JS. **Prefer the Custom Page +
connector path whenever possible.**
