// MDA ribbon command — Community fallback (7.3b).
// Direct fetch to the flow URL with @azure/msal-browser. NOT Microsoft-supported
// for ribbon JS. Use only when no Custom Page is in scope.
//
// Build:
//   - bundle this file with esbuild or webpack so @azure/msal-browser is inlined
//   - upload as a single Web Resource: cont_/InvokeFlowDirect.js
//   - also deploy the companion blank.html as cont_/blank.html (see asset)
//   - register both web resources in your solution
//
// App B SPA registration must list these redirect URIs:
//   - https://<org>.crm.dynamics.com
//   - https://<org>.crm.dynamics.com/WebResources/cont_/blank.html
//
// Replace placeholders before bundling:
//   - <App B SPA client id>
//   - <tenant id>
//   - <flow trigger url>            (or read from a Dataverse env var)

import { PublicClientApplication } from "@azure/msal-browser";

const FLOW_URL = "<flow trigger url>"; // build-time injected

const msalConfig = {
  auth: {
    clientId: "<App B SPA client id>",
    authority: "https://login.microsoftonline.com/<tenant id>",
    redirectUri: window.location.origin + "/WebResources/cont_/blank.html",
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
};

let _pca = null;

async function getPca() {
  if (_pca) return _pca;
  _pca = new PublicClientApplication(msalConfig);
  await _pca.initialize();
  return _pca;
}

window.Contoso = window.Contoso || {};
window.Contoso.Ribbon = {
  invokeFlowDirect: async function (primaryControl) {
    try {
      const recordId = primaryControl.data.entity.getId().replace(/[{}]/g, "");
      const userName = Xrm.Utility.getGlobalContext().userSettings.userName;
      const pca = await getPca();
      const scopes = ["https://service.flow.microsoft.com/User"];

      let result;
      try {
        const account = pca.getAccountByUsername(userName) || null;
        result = await pca.acquireTokenSilent({
          account: account,
          scopes: scopes,
        });
      } catch (_e) {
        result = await pca.acquireTokenPopup({
          scopes: scopes,
          loginHint: userName,
          prompt: "none",
        });
      }

      const resp = await fetch(FLOW_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + result.accessToken,
        },
        body: JSON.stringify({
          recordId: recordId,
          userName: userName,
          source: "mda-button",
          correlationId: crypto.randomUUID(),
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error("Flow returned " + resp.status + ": " + body);
      }

      await Xrm.Navigation.openAlertDialog({
        title: "Flow",
        text: "Process started.",
      });

      primaryControl.data.refresh(false);
    } catch (err) {
      await Xrm.Navigation.openErrorDialog({
        message: err.message || String(err),
      });
    }
  },
};
