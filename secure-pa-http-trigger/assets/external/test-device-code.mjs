// Test harness — invoke a secured Power Automate HTTP-trigger flow with a
// delegated user token via device code flow. Use this to validate the
// secured flow end-to-end before wiring up real production callers.
//
// Why device code: zero-secret, interactive, works with any tenant user
// account, satisfies MFA — ideal for dev/test loops. For production use the
// confidential client / cert template in `assets/external/invokeFlow.ts`.
//
// Why double-slash: Entra v2's token endpoint strips the trailing slash from
// the resource URI when you pass `.../service.flow.microsoft.com/.default`,
// producing a token whose `aud` claim is missing the slash. Power Automate
// rejects with `403 MisMatchingOAuthClaims`. Doubling the slash makes Entra
// trim one and leaves the required slash in `aud`. Full analysis in
// `references/11-known-bugs-and-workarounds.md`.
//
// Node 20+ — uses native fetch and --env-file.
//
// Setup:
//   npm i @azure/msal-node
//
// .env (do NOT commit):
//   TENANT_ID=...
//   CLIENT_ID=...   ← App A's Application (client) ID
//   FLOW_URL=https://<env>.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/<wfid>/triggers/manual/paths/invoke?api-version=1
//
// Run:
//   node --env-file=.env scripts/test-device-code.mjs
//
// Expected on success:
//   1. Acquisition du token...
//      Claims: aud=https://service.flow.microsoft.com/  ← trailing slash present
//      tid=...  oid=...  upn=...
//   2. Appel du flow...
//      Statut HTTP : 200 (or 202 if async)
//      ✓ Succès

import { PublicClientApplication } from "@azure/msal-node";

const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const FLOW_URL  = process.env.FLOW_URL;

// Public cloud — replace with the cloud-specific audience for sovereign clouds
// (still using the double-slash trick — e.g.
// "https://gov.service.flow.microsoft.us//.default" for GCC).
const SCOPE = "https://service.flow.microsoft.com//.default";

if (!TENANT_ID || !CLIENT_ID || !FLOW_URL) {
  console.error("Missing env: TENANT_ID, CLIENT_ID, FLOW_URL");
  process.exit(1);
}

const pca = new PublicClientApplication({
  auth: {
    clientId:  CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
  },
});

function decodeJwtClaims(jwt) {
  const payload = jwt.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function main() {
  console.log("1. Acquiring token via device code...");
  const result = await pca.acquireTokenByDeviceCode({
    scopes: [SCOPE],
    deviceCodeCallback: (response) => {
      console.log("\n" + response.message + "\n");
    },
  });

  if (!result?.accessToken) throw new Error("No access token returned.");

  const claims = decodeJwtClaims(result.accessToken);
  console.log("   Claims:");
  console.log("   aud :", claims.aud, claims.aud?.endsWith("/") ? "✓ slash" : "✗ NO SLASH — will 403");
  console.log("   tid :", claims.tid);
  console.log("   oid :", claims.oid);
  console.log("   upn :", claims.upn);

  console.log("\n2. Calling the flow...");
  const correlationId = crypto.randomUUID();
  const response = await fetch(FLOW_URL, {
    method: "POST",
    headers: {
      "Authorization":   `Bearer ${result.accessToken}`,
      "Content-Type":    "application/json",
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify({ test: true, source: "test-device-code", correlationId }),
  });

  console.log(`   Status: ${response.status}`);
  const text = await response.text();
  if (text) console.log("   Body:", text);

  if (response.status >= 200 && response.status < 300) {
    console.log(`\n✓ Success — flow accepted the authenticated request. Correlation ${correlationId}`);
  } else if (response.status === 401) {
    console.log("\n✗ 401 — token rejected. Verify aud, tid, scope.");
  } else if (response.status === 403) {
    console.log("\n✗ 403 — claims rejected. Most common cause: aud missing trailing slash. See references/11.");
  } else if (response.status === 502) {
    console.log("\n✗ 502 — flow has no Response action. Add one or enable async response. See references/11.");
  } else {
    console.log(`\n? Unexpected status ${response.status}.`);
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
