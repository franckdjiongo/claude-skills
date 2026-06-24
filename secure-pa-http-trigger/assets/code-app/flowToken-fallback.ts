// Direct-fetch SPA fallback for Code Apps — use only when a custom connector
// is genuinely impossible AND `https://service.flow.microsoft.com` is
// allowlisted in the environment CSP via PPAC →
// Environment → Content Security Policy (Set-CodeAppContentSecurityPolicy).
//
// This is `[Inference]` per the brief — Microsoft does not document a
// first-class host API for raw flow access tokens. Prefer the connector path.
//
// Required env (Vite):
//   VITE_TENANT_ID    — Entra Directory ID
//   VITE_CLIENT_ID    — App B SPA client ID
//   VITE_FLOW_URL     — full v2-OAuth flow URL
//   VITE_FLOW_SCOPE   — https://service.flow.microsoft.com//.default (Public,
//                        DOUBLE slash — Entra v2 strips one. Without doubling,
//                        the issued aud has no trailing slash and Power
//                        Automate rejects with 403 MisMatchingOAuthClaims.
//                        See references/11-known-bugs-and-workarounds.md.)
//                        or the cloud-specific equivalent (also doubled).
//   VITE_REDIRECT_URI — must match an Authentication redirect URI on App B

import axios, { AxiosError } from "axios";
import {
  PublicClientApplication,
  AuthenticationResult,
  SilentRequest,
  PopupRequest,
} from "@azure/msal-browser";

export interface FlowRequest {
  correlationId: string;
  recordId: string;
  action: string;
}

export interface FlowResponse {
  status: string;
  referenceId?: string;
  message?: string;
}

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, data?: unknown): void {
  const payload = { ts: new Date().toISOString(), level, message, data };
  // Replace with App Insights or your telemetry sink
  console[level === "info" ? "log" : level](JSON.stringify(payload));
}

const config = {
  tenantId: import.meta.env.VITE_TENANT_ID as string,
  clientId: import.meta.env.VITE_CLIENT_ID as string,
  flowUrl: import.meta.env.VITE_FLOW_URL as string,
  flowScope: import.meta.env.VITE_FLOW_SCOPE as string,
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string,
};

if (
  !config.tenantId ||
  !config.clientId ||
  !config.flowUrl ||
  !config.flowScope ||
  !config.redirectUri
) {
  throw new Error("Missing required VITE_* configuration.");
}

const msal = new PublicClientApplication({
  auth: {
    clientId: config.clientId,
    authority: `https://login.microsoftonline.com/${config.tenantId}`,
    redirectUri: config.redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
});

let currentAuth: AuthenticationResult | null = null;

async function ensureSignedIn(): Promise<AuthenticationResult> {
  const accounts = msal.getAllAccounts();

  if (accounts.length > 0) {
    const silentRequest: SilentRequest = {
      account: accounts[0],
      scopes: [config.flowScope],
    };

    try {
      currentAuth = await msal.acquireTokenSilent(silentRequest);
      return currentAuth;
    } catch (err) {
      log("warn", "Silent token acquisition failed. Falling back to popup.", err);
    }
  }

  const popupRequest: PopupRequest = {
    scopes: [config.flowScope],
    prompt: "select_account",
  };

  currentAuth = await msal.acquireTokenPopup(popupRequest);
  return currentAuth;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  const accounts = msal.getAllAccounts();

  if (accounts.length === 0 || !currentAuth) {
    const authResult = await ensureSignedIn();
    return authResult.accessToken;
  }

  const silentRequest: SilentRequest = {
    account: accounts[0],
    scopes: [config.flowScope],
    forceRefresh,
  };

  const authResult = await msal.acquireTokenSilent(silentRequest);
  currentAuth = authResult;
  return authResult.accessToken;
}

function isAxiosError(error: unknown): error is AxiosError {
  return !!error && typeof error === "object" && "isAxiosError" in error;
}

export async function invokeProtectedFlow(
  request: FlowRequest,
): Promise<FlowResponse> {
  let token = await getAccessToken(false);

  try {
    const response = await axios.post<FlowResponse>(config.flowUrl, request, {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-correlation-id": request.correlationId,
      },
      validateStatus: () => true,
    });

    if (response.status === 401) {
      log("warn", "401 from flow. Refreshing token and retrying once.", {
        correlationId: request.correlationId,
      });

      token = await getAccessToken(true);

      const retry = await axios.post<FlowResponse>(config.flowUrl, request, {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-correlation-id": request.correlationId,
        },
        validateStatus: () => true,
      });

      if (retry.status === 403) {
        throw new Error(
          `403 Forbidden after refresh. CorrelationId=${request.correlationId}`,
        );
      }

      if (retry.status < 200 || retry.status >= 300) {
        throw new Error(
          `Flow call failed after retry. HTTP ${retry.status}. CorrelationId=${request.correlationId}`,
        );
      }

      log("info", "Flow call succeeded after token refresh.", {
        correlationId: request.correlationId,
        status: retry.status,
      });

      return retry.data;
    }

    if (response.status === 403) {
      throw new Error(`403 Forbidden. CorrelationId=${request.correlationId}`);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Flow call failed. HTTP ${response.status}. CorrelationId=${request.correlationId}`,
      );
    }

    log("info", "Flow call succeeded.", {
      correlationId: request.correlationId,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      log("error", "Axios error while calling flow.", {
        correlationId: request.correlationId,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    } else {
      log("error", "Unexpected error while calling flow.", {
        correlationId: request.correlationId,
        error,
      });
    }
    throw error;
  }
}

// Example button handler
export async function onRunButtonClick(recordId: string): Promise<void> {
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const request: FlowRequest = {
    correlationId,
    recordId,
    action: "RunBusinessOperation",
  };

  try {
    const result = await invokeProtectedFlow(request);
    log("info", "Business operation completed.", { correlationId, result });
  } catch (error) {
    log("error", "Business operation failed.", { correlationId, error });
    throw error;
  }
}
