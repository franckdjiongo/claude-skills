// External-service caller for a secured Power Automate HTTP-trigger flow.
// Node 20+. Uses MSAL's ConfidentialClientApplication for client-credentials.
//
//   npm i @azure/msal-node axios
//
// IMPORTANT: client_credentials directly into `Any user in my tenant` is
// `[Inference]` per references/01-protocol-and-claims.md §1. Production-safe
// route is `Specific users in my tenant` with the SPN's Object ID
// allow-listed. If you must keep `Any user`, validate in non-prod first.
//
// Required env:
//   TENANT_ID
//   CLIENT_ID
//   CLIENT_SECRET   — prefer certificate; secrets only with Key Vault rotation
//   FLOW_URL
//   FLOW_SCOPE      — e.g. https://service.flow.microsoft.com//.default (Public,
//                      DOUBLE slash — Entra v2 strips one trailing slash,
//                      producing a token with aud lacking the slash, which
//                      Power Automate rejects with 403 MisMatchingOAuthClaims.
//                      See references/11-known-bugs-and-workarounds.md.)

import axios from "axios";
import { ConfidentialClientApplication } from "@azure/msal-node";

const tenantId = process.env.TENANT_ID!;
const clientId = process.env.CLIENT_ID!;
const clientSecret = process.env.CLIENT_SECRET!;
const flowUrl = process.env.FLOW_URL!;
const scope = process.env.FLOW_SCOPE!;

const cca = new ConfidentialClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret,
  },
});

let token = "";
let expiresAt = 0;

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && token && Date.now() < expiresAt - 5 * 60 * 1000) {
    return token;
  }

  const result = await cca.acquireTokenByClientCredential({
    scopes: [scope],
  });

  if (!result?.accessToken) {
    throw new Error("No access token returned.");
  }

  token = result.accessToken;
  expiresAt = result.expiresOn?.getTime() ?? Date.now() + 55 * 60 * 1000;
  return token;
}

export async function invokeFlow(payload: unknown, correlationId: string) {
  let accessToken = await getToken(false);

  const send = async (bearer: string) =>
    axios.post(flowUrl, payload, {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
        "x-correlation-id": correlationId,
      },
      validateStatus: () => true,
    });

  let response = await send(accessToken);

  if (response.status === 401) {
    accessToken = await getToken(true);
    response = await send(accessToken);
  }

  if (response.status === 403) {
    throw new Error(`403 Forbidden. CorrelationId=${correlationId}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}. CorrelationId=${correlationId}`);
  }

  return response.data;
}
