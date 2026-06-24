#!/usr/bin/env bash
# Provision App A — single-tenant confidential client used by:
#   - Dataverse C# plugin (Pattern A FIC issuer / Pattern B caller identity)
#   - Custom connector OAuth 2.0 / Microsoft Entra ID security definition
#   - External services
#
# Adds delegated `User` permission on the Flow Service first-party app
# (7df0a125-d3be-4c96-aa54-591f83ff541c) and grants admin consent.
#
# Run: ./provision-app-a.sh
# Pre-req: az login (with sufficient Entra admin rights)
set -euo pipefail

APP_A_NAME="${APP_A_NAME:-pa-http-trigger-server-prod}"
FLOW_SP_APPID="7df0a125-d3be-4c96-aa54-591f83ff541c"

echo "==> Creating app registration: $APP_A_NAME"
az ad app create \
  --display-name "$APP_A_NAME" \
  --sign-in-audience AzureADMyOrg >/dev/null

APP_A_ID=$(az ad app list --display-name "$APP_A_NAME" --query "[0].appId" -o tsv)
echo "    appId = $APP_A_ID"

echo "==> Resolving Flow Service 'User' delegated scope id"
USER_SCOPE_ID=$(az ad sp show --id "$FLOW_SP_APPID" \
  --query "oauth2PermissionScopes[?value=='User'].id | [0]" -o tsv)
echo "    User scope id = $USER_SCOPE_ID"

echo "==> Adding delegated permission"
az ad app permission add \
  --id "$APP_A_ID" \
  --api "$FLOW_SP_APPID" \
  --api-permissions "${USER_SCOPE_ID}=Scope" >/dev/null

echo "==> Granting admin consent"
az ad app permission admin-consent --id "$APP_A_ID"

echo
echo "App A provisioned. Next:"
echo "  - For Pattern A (plugin Managed Identity): add a Federated Credential"
echo "    on this app with subject"
echo "      component:pluginassembly,thumbprint:<thumb>,environment:<envid>"
echo "    and issuer"
echo "      https://<env-prefix>.<env-suffix>.environment.api.powerplatform.com/sts"
echo "  - For Pattern B / external service: upload a certificate"
echo "      az ad app credential reset --id $APP_A_ID --cert @public-cert.pem --append --years 2"
echo "    or, only if you must, a client secret:"
echo "      az ad app credential reset --id $APP_A_ID --append --years 2 --display-name 'rotate-2026'"
echo "  - For the custom connector: paste the connector-generated Redirect URL"
echo "    into App A's Authentication → Web redirect URIs."
