# Power Apps Code Apps - Troubleshooting Guide

## 1. Network Debugging

### DevTools shortcuts

| Browser / OS    | Shortcut            |
|-----------------|---------------------|
| Windows / Linux | F12 or Ctrl+Shift+I |
| macOS           | Command+Option+I    |

Also: right-click any page element and choose **Inspect**.

Browser documentation references:
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Microsoft Edge DevTools](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/)
- [Firefox DevTools](https://developer.mozilla.org/docs/Tools)

### Network tab filter strings

Use these filter strings in the DevTools Network tab to isolate code app data requests:

| Data Source | Filter String  | What it captures                |
|-------------|----------------|---------------------------------|
| Connectors  | `apihub.net`   | Connector API traffic           |
| Dataverse   | `dynamics.com` | Dataverse API traffic           |

---

## 2. PAC Data Source Troubleshooting (`pac code add-data-source`)

### Prerequisites

Before troubleshooting, confirm:
1. Latest Power Platform CLI installed. Update if unsure.
2. Authenticated to the correct environment (`pac auth create` / `pac auth list`).
3. Network allows outbound HTTPS to Power Platform endpoints.

### Systematic 5-step flow

#### Step 1: Validate configuration

Open `power.config.json` and confirm:
- `environmentId` matches the target environment.
- `region` is set to `prod` (unless intentionally targeting another region). Add it if missing.

```json
{
  "environmentId": "aaaabbbb-0000-cccc-1111-dddd2222eeee",
  "region": "prod"
}
```

#### Step 2: Cross-check with `pac env who`

Run `pac env who` and compare the `Environment ID` in the output with `environmentId` in `power.config.json`.

```powershell
# Example output (annotated)
Connected as user@domain.com
Organization Information
  Org ID:           00aa00aa-bb11-cc22-dd33-44ee44ee44ee
  Unique Name:      unq2889ab2be728ef118406000d3a33f
  Friendly Name:    User Name
  Org URL:          https://myorg.crm.dynamics.com/
  User Email:       user@domain.com
  User ID:          aaaaaaaa-bbbb-cccc-1111-222222222222
  Environment ID:   aaaabbbb-0000-cccc-1111-dddd2222eeee  # <-- Must match
```

#### Step 3: Re-run the command

```cmd
pac code add-data-source -a dataverse -t account
```

Look for HTTP status codes or error messages in the output.

#### Step 4: Network & security validation

If still failing:
- Confirm no corporate proxy/firewall blocks CLI processes (non-browser traffic).
- Allowlist required Power Platform endpoints per [connectivity requirements](https://learn.microsoft.com/en-us/power-platform/admin/online-requirements).

**Browser connectivity test**: Open a browser on the same machine, navigate to the data source (e.g., the Dataverse environment URL), sign in with the same credentials used for `pac auth create`. If you cannot access the resource, it is a permissions issue. If you can, proceed to Fiddler analysis.

**Fiddler analysis**:
1. Download and install [Fiddler Classic](https://www.telerik.com/fiddler/fiddler-classic).
2. Start Fiddler > **File** > **Capture Traffic**.
3. Run the failing `pac code add-data-source` command.
4. In the session list, find requests to your endpoint (e.g., `yourorg.crm.dynamics.com`).
5. Interpret responses:
   - `200` = success.
   - `401` / `403` = authentication or permission issue.
   - Other codes or no response = firewall/proxy blocking.

#### Step 5: Auth reset

If a mismatch is detected, clear or reset auth context:

```cmd
pac auth list
pac auth select --index <n>
pac env who

rem If incorrect, re-authenticate:
pac auth create --environment <yourEnvironmentId>
```

---

## 3. Symptom-to-Cause Table

| Symptom                     | Example Message                                                                 | Likely Cause                                      | First Action                           |
|-----------------------------|---------------------------------------------------------------------------------|---------------------------------------------------|----------------------------------------|
| Fetch Failed                | `Fetch Failed` (no additional stack)                                            | Proxy/firewall blocking CLI traffic               | Step 4: network validation             |
| Fetch Failed (Zscaler)      | `TypeError: fetch failed` / `[AddDataSource...Failure] ... fetch failed`        | SSL-inspecting proxy (Zscaler, etc.)              | See Section 4: Zscaler/SSL Proxy Fix   |
| Empty Request Failed        | `Error: Request failed: {}` (no body)                                           | Proxy stripping response body                     | See Section 4: Zscaler/SSL Proxy Fix   |
| ETIMEDOUT                   | `ETIMEDOUT`                                                                     | Network timeout, endpoint unreachable             | Check connectivity, firewall rules     |
| ENOTFOUND                   | `ENOTFOUND`                                                                     | DNS resolution failure                            | Check DNS, proxy PAC configuration     |
| ECONNRESET                  | `ECONNRESET`                                                                    | Connection forcibly closed (proxy/firewall)       | Check proxy rules, VPN config          |
| TLS / Cert errors           | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `SELF_SIGNED CERT IN CHAIN`                 | SSL-inspecting proxy certificate not trusted      | See Section 4: Zscaler/SSL Proxy Fix   |
| Wrong schema / not found    | Data source not found / unexpected schema                                       | Environment mismatch in config                    | Step 1-2: validate config + env who    |
| Works off corporate network | Command succeeds when disconnected from Zscaler/VPN                             | Corporate proxy/VPN interference                  | See Section 4 or Section 5 (VPN)       |

---

## 4. Zscaler / SSL-Inspecting Proxy Fix

### How it works

Zscaler (and similar proxies) perform SSL/TLS inspection by decrypting and re-encrypting HTTPS traffic. The proxy replaces the original server certificate with its own, signed by a corporate root CA. Browsers trust this because the corporate root CA is in the system trust store. Node.js does NOT use the system trust store by default, causing failures.

### Symptom recognition table

| Symptom                          | Example Message / Pattern                                                     |
|----------------------------------|-------------------------------------------------------------------------------|
| Fetch Failed                     | `TypeError: fetch failed` / `[AddDataSource.ServiceCall.GetConnector.Failure] ... fetch failed` |
| Empty Request Failed             | `Error: Request failed: {}` (no body)                                         |
| TLS Handshake / Cert errors      | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `SELF_SIGNED CERT IN CHAIN`              |
| Works off corporate network      | Command succeeds when disconnected from Zscaler                               |

### Prerequisites checklist

1. Latest Power Platform CLI installed.
2. Authenticated to the correct environment.
3. Node.js >= v22 (older versions have stricter trust behavior).
4. Able to read the user certificate store (no locked-down profile restrictions).
5. Corporate policy permits adding Zscaler root CA to user trust for developer tooling.

### Complete PowerShell workflow

**Step 1 -- Validate baseline**: Run `pac env who`. If it succeeds, general connectivity is fine; failures are isolated to data source calls.

**Step 2 -- Verify Zscaler cert in store**:

```powershell
Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Subject -like "*Zscaler*" } |
    Select-Object Subject, Thumbprint
```

If a Zscaler issuer appears, the proxy is intercepting HTTPS.

**Step 3 -- Export Zscaler root CA to PEM**:

```powershell
$cert = Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Subject -like "*Zscaler*" } |
    Select-Object -First 1

$pem = @(
    '-----BEGIN CERTIFICATE-----'
    [System.Convert]::ToBase64String(
        $cert.RawData,
        [System.Base64FormattingOptions]::InsertLineBreaks
    )
    '-----END CERTIFICATE-----'
) -join "`n"

Set-Content -Path "$env:USERPROFILE\.zscaler-root-ca.pem" -Value $pem
```

**File permissions with icacls** (recommended hardening -- removes inheritance, grants read-only):

```powershell
icacls "$env:USERPROFILE\.zscaler-root-ca.pem" /inheritance:r /grant:r "$env:USERNAME:(R)"
```

If removing inheritance conflicts with corporate policy or triggers endpoint protection:

```powershell
# Grant explicit read only, without removing inheritance
icacls "$env:USERPROFILE\.zscaler-root-ca.pem" /grant:r "$env:USERNAME:(R)"
```

**Step 4 -- Set NODE_EXTRA_CA_CERTS**:

```powershell
[System.Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS', "$env:USERPROFILE\.zscaler-root-ca.pem", 'User')
```

Close and reopen the terminal / VS Code to propagate.

**Scope impact**: This variable affects ALL Node.js processes run by the user account.

### Validation steps

```powershell
# 1. Confirm PEM file exists
Test-Path "$env:USERPROFILE\.zscaler-root-ca.pem"   # Expect: True

# 2. Verify environment variable is set
[System.Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS', 'User')

# 3. Check PEM content is valid (not empty/corrupted)
Get-Content "$env:USERPROFILE\.zscaler-root-ca.pem" -TotalCount 2
# First line should be: -----BEGIN CERTIFICATE-----
```

### Re-run and verify

```powershell
pac code add-data-source -a <apiId> -c <connectionId> [-t <tableName>] [-d <dataset|siteUrl>]
```

Expected success output:

```
[AddDataSource.ServiceCall.GetConnector.Start] { apiId: 'shared_office365users' }
[AddDataSource.ServiceCall.GetConnector.Success] { apiId: 'shared_office365users' }
```

Instead of the failure pattern:

```
[AddDataSource.ServiceCall.GetConnector.Failure] { apiId: 'shared_office365users', error: 'fetch failed' }
```

### Troubleshooting matrix (post-fix)

| Issue                          | Action                                                                                   |
|--------------------------------|------------------------------------------------------------------------------------------|
| `fetch failed` persists        | Reconfirm `NODE_EXTRA_CA_CERTS` is set after restarting shell; ensure PEM is not 0 bytes. |
| Multiple Zscaler certs         | Identify the root CA (typically `Zscaler Root CA`). Modify Step 3 to select by issuer name or thumbprint. |
| `SELF_SIGNED CERT IN CHAIN`    | Certificate chain is incomplete. Export full chain (root + intermediates) or request complete root CA bundle from network team. |
| Works outside VPN only         | Network-level blocking, not cert trust. `NODE_EXTRA_CA_CERTS` will not help. Engage network team to allowlist `*.powerplatform.com`, `*.dynamics.com`, `*.azure.net` on port 443. |

---

## 5. Other Proxy Products

The Zscaler fix applies to any corporate proxy that performs SSL inspection. Adapt the certificate filter in Step 2/Step 3:

```powershell
# Blue Coat
$cert = Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Subject -like "*Blue Coat*" } |
    Select-Object -First 1

# Forcepoint
$cert = Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Subject -like "*Forcepoint*" } |
    Select-Object -First 1

# Netskope
$cert = Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Subject -like "*Netskope*" } |
    Select-Object -First 1
```

After matching the certificate, complete the same Steps 3-4 (export to PEM, set `NODE_EXTRA_CA_CERTS`).

---

## 6. Escalation Checklist

Before contacting technical support, collect the following information:

### For general `pac code add-data-source` failures

| Item                        | How to collect                                    |
|-----------------------------|---------------------------------------------------|
| CLI version                 | `pac --version`                                   |
| OS and shell                | e.g., Windows PowerShell 7 / Windows CMD / WSL    |
| Full command used            | Sanitize any secrets                              |
| Debug output excerpt        | Sanitized error block (first occurrence)          |
| `power.config.json`         | After redacting secrets                           |

### For Zscaler/SSL proxy failures (additional items)

| Item                        | How to collect                                                                               |
|-----------------------------|----------------------------------------------------------------------------------------------|
| Node.js version             | `node --version`                                                                             |
| NODE_EXTRA_CA_CERTS value   | `[System.Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS','User')`                 |
| PEM file presence and hash  | `Get-FileHash $env:USERPROFILE\.zscaler-root-ca.pem`                                         |

---

## 7. Security Warning

### NODE_TLS_REJECT_UNAUTHORIZED=0

This setting **completely disables SSL certificate validation** for all Node.js HTTPS connections in the current session. It is a diagnostic-only workaround to prove certificate trust is the root cause.

```powershell
# DIAGNOSTIC ONLY -- exposes session to MITM attacks
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

**Risks**:
- Any attacker with network access can perform man-in-the-middle attacks.
- Credential harvesting and content tampering become possible.
- Removes all authenticity and integrity guarantees of HTTPS.

**Rules**:
- Use ONLY for a one-time diagnostic session.
- Never commit to scripts.
- Never use in production environments.
- Immediately unset after testing:

```powershell
Remove-Item Env:\NODE_TLS_REJECT_UNAUTHORIZED
```

The proper fix is always to export the proxy root CA and set `NODE_EXTRA_CA_CERTS` (see Section 4).

---

## Notes

- Repeat PEM export if the proxy rotates certificates.
- Changes only affect the current user scope -- no system-wide risk.
- Adding trust via `NODE_EXTRA_CA_CERTS` is safe: it adds CAs, it does not disable validation.
- Use a dedicated development machine if corporate policy restricts certificate export.
