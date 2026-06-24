# 03 — Migration procedure (12 steps + rollback)

Source: §6 of the brief.

## Pre-cutover check — REQUIRED

Microsoft is also migrating HTTP-trigger URLs off `logic.azure.com`. Old URLs
**stopped working on 30 November 2025** for environments on the new Self-Host
Multitenant architecture (Microsoft Learn — _Troubleshoot common issues with
Power Automate triggers_). **Verify the trigger URL host before changing the
auth setting.** If it's still `logic.azure.com`, fix that first by re-saving
the flow and copying the regenerated URL.

## Does flipping the setting break callers immediately?

**Yes.** The instant you save with `Any user in my tenant`:

- The trigger URL is regenerated **without** `?sp=...&sv=...&sig=...`
  (Joe Gill, joegill.com, _Who can trigger the Flow_).
- Unauthenticated requests return HTTP 401 with body
  `{"error":{"code":"DirectApiAuthorizationRequired","message":"The request must be authenticated only by Shared Access scheme."}}`.
- The previous SAS-bearing URL is **permanently invalidated**. Re-flipping back
  to `Anyone` does **not** restore the old URL — the SAS key is regenerated
  again.

So the cutover is **never in-place**. Always clone-and-cut, with a Dataverse
environment variable (`pa_flowEndpoint` recommended) holding the URL.

## The 12-step procedure

1. **Inventory every current anonymous caller.** Capture: flow name,
   environment, solution membership, current trigger URL, owner model, calling
   system, expected HTTP method, request schema, business-criticality. Filter
   Power Automate run history for any flow whose **Triggered by** equals
   `Anonymous`.

2. **Decide the target caller pattern per channel** before editing:
   - model-driven command bar → custom page → connector / cloud flow
   - code app → custom connector / connection reference
   - plugin → Pattern A (MI direct call) or Pattern B (broker API)
   - external service → delegated direct call or SPN + **Specific users**

3. **Confirm trigger URL host is not `logic.azure.com`** (see pre-cutover
   check). Fix that first if needed.

4. **Provision App A** (confidential client) and configure Power Platform
   Managed Identity FIC against the production plugin assembly (Pattern A) or
   the broker app registration (Pattern B). See §02 for the exact steps.

5. **Smoke-test the plugin/broker with a low-traffic table and a cloned flow.**
   Don't smoke-test against production callers.

6. **Prefer parallel deployment over big-bang mutation.** For production flows,
   create a versioned clone in a solution and cut new callers over to the
   secured endpoint first.

   **Recommended zero-downtime cutover:**

   1. **Clone** the production flow under a new name `Flow-X (v2-OAuth)`. Keep
      `Flow-X (legacy-Anyone)` running.
   2. In the clone, set **Who can trigger the flow? = Any user in my tenant**,
      save, and copy the new HTTP POST URL.
   3. Update the three caller contexts to read the URL from a Dataverse
      environment variable `pa_flowEndpoint` and to send
      `Authorization: Bearer …`.
   4. Deploy callers; smoke-test against the legacy URL via the env-var pointed
      at the legacy flow first.
   5. Flip `pa_flowEndpoint` to the v2-OAuth URL. Monitor.
   6. Confirm `Flow-X (legacy-Anyone)` shows **0 runs over 7 days**. Disable.
      After 30 days, delete.

7. **Secure the new flow trigger.** In the HTTP trigger of the clone, change
   **Who can trigger the flow** from **Anyone** to **Any user in my tenant**
   and save.

8. **Assume existing anonymous callers break immediately after save.**
   `[Inference]` — Microsoft does not publish a separate "cutover timing"
   article, but the protocol behavior makes this certain.

9. **Do not assume the trigger URL became harmless.** It still contains `sig=`
   in some configurations and Microsoft still documents SAS-key rotation.
   **Treat the URL as secret material** even after OAuth is enabled.

10. **Update callers by context.**
    - code apps and Power Apps-facing experiences: switch to a connector or
      delegated path.
    - plugins: Pattern A (MI direct call) or Pattern B (broker API).
    - external services: add delegated or verified app-only auth depending on
      mode.

11. **Test with four explicit probes:**

    | Probe                                      | Expected                  |
    |--------------------------------------------|---------------------------|
    | Anonymous request (no `Authorization`)     | 401 `DirectApiAuthorizationRequired` |
    | Valid delegated token, same tenant         | 202 Accepted              |
    | Wrong-tenant token                         | 401 `MisMatchingOAuthClaims` |
    | Wrong-audience token (e.g. Graph)          | 401 `MisMatchingOAuthClaims` |

12. **Turn on security hygiene around run history.** If request bodies or
    headers contain sensitive information, enable **secure inputs/outputs** on
    downstream actions and avoid storing secrets directly in the flow logic.
    Run history exposes trigger/action inputs and outputs.

13. **Monitor the cutover.** Watch flow failures, connector failures, plugin
    trace logs, Application Insights for code apps/plugins, and any 401/403
    responses from callers.

14. **Validate that no anonymous public path remains.** Keep an explicit
    negative test in the deployment checklist: a raw unauthenticated POST to
    the flow URL must fail. `[Inference]` — simplest practical control to catch
    missed rollbacks.

## Rollback

Flip `pa_flowEndpoint` back to the legacy URL — the legacy flow is untouched.
Do not attempt to revert the v2 flow's setting; it will regenerate the SAS
again.

If production callers fail after cutover:

- keep the secured flow disabled or unused
- repoint traffic to the previously working version
- rotate the old/anonymously exposed `sig` if you suspect the URL was widely
  shared
- fix caller auth and retest before retrying

## Version control

Export the flow inside an unmanaged solution to source control on every cutover
step. Tag the commit `pa-oauth-cutover-{flowname}-{yyyymmdd}`.

## Stage map (pacing)

| Stage | Timeframe   | Deliverable                                                |
|-------|-------------|------------------------------------------------------------|
| 1     | 1 week      | Inventory + App A + FIC + smoke-test on a clone            |
| 2     | 1 month     | Custom connector + connections per env + caller wiring     |
| 3     | 1 quarter   | Cutover per flow + DLP block on `Anyone` + Application Insights |
