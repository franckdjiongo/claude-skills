# Power Apps Code Apps - Setup & Architecture Reference

> Distilled from official Microsoft documentation (Feb-Mar 2026).
> Sources: overview, architecture, quickstart (PAC CLI), npm CLI quickstart, system configuration.

---

## 1. Prerequisites

### Developer Tools

| Tool | Version / Notes |
|------|-----------------|
| IDE (e.g. VS Code) | Any version |
| Node.js | **LTS** version |
| Git | Any recent version |
| Power Platform CLI (PAC CLI) | Required only for the **legacy** workflow. Not needed with the npm CLI (SDK >= 1.0.4). |

### Platform Requirements

- A **Power Platform environment with code apps enabled**.
  - Admin path: Power Platform admin center > Manage > Environments > select env > Settings > Product > Features > toggle **Enable code apps** ON > Save.
  - Both Power Platform admins and environment admins can set this option.
- **Power Apps Premium license** for every end-user who runs a code app.

---

## 2. Architecture Overview

### Development Layers

There are three key development components:

| Component | Role |
|-----------|------|
| `power.config.json` | Auto-generated metadata file used by both the CLI and the SDK for Power Platform connections and publishing. **Your app code should never interact with this file directly.** |
| Power Apps SDK (`@microsoft/power-apps` npm package) | Provides APIs your app calls directly. Manages generated models/services as connectors are added/removed. Starting v1.0.4, also includes the npm-based CLI. |
| CLI (PAC CLI or npm CLI) | Handles authentication, initialization (`init`), local dev (`run`), and publishing (`push`). |

### Runtime Layers

When a code app runs, three logical components collaborate:

| Layer | Responsibility |
|-------|---------------|
| **Your code** | Custom UI and business logic (React, Vue, or any SPA framework). |
| **Power Apps SDK** | Exposes APIs and generated models/services for data requests via Power Platform connectors. |
| **Power Apps host** | Manages end-user authentication, app loading, and contextual error messages if the app fails to load. |

### Config and Model/Service Generation

- When you add or remove connectors, the SDK automatically generates/updates models and services.
- `power.config.json` stores the metadata that drives this generation. It is created by the SDK and consumed by the CLI for publishing.
- On `push`, the compiled app bundle + config metadata are packaged and published to the target Power Platform environment.

---

## 3. CLI Tool Evolution

### PAC CLI (Legacy) vs npm CLI (Current/Recommended)

Starting with **Power Apps SDK v1.0.4**, the SDK ships an npm-based CLI that replaces the PAC CLI `pac code` commands. The `pac code` commands will be **deprecated in a future release**.

| Operation | PAC CLI (legacy) | npm CLI (recommended, SDK >= 1.0.4) |
|-----------|-----------------|--------------------------------------|
| **Auth** | `pac auth create` then `pac env select --environment <ID>` | Automatic on `npx power-apps init` (browser sign-in prompt) |
| **Init** | `pac code init --displayname "Name"` | `npx power-apps init` (interactive) or `npx power-apps init --displayName "Name" --environmentId <ID>` |
| **Dev server** | `npm run dev` | `npm run dev` (same) |
| **Push** | `npm run build \| pac code push` (piped) | `npm run build` then `npx power-apps push` (separate commands) |

### Key Difference: Fewer Prerequisites with npm CLI

- PAC CLI path requires installing the full **Power Platform CLI** tool.
- npm CLI path requires **only Node.js and Git** -- no PAC CLI installation needed.

### npm CLI Commands Summary

| Command | Description |
|---------|-------------|
| `npx power-apps init` | Initialize the code app (auth + config). Supports interactive mode or `--displayName` / `--environmentId` flags. |
| `npx power-apps run` | Start local development server. |
| `npx power-apps push` | Publish a new version of the code app to the environment. |

---

## 4. Scaffolding a New App

Both paths start with the same template scaffolding step.

### Step 1: Scaffold from Template

```bash
# Clone the official Vite template (no git history)
npx degit github:microsoft/PowerAppsCodeApps/templates/vite my-app
cd my-app
```

### Step 2: Install Dependencies

```bash
npm install
```

### Path A: Legacy (PAC CLI)

```bash
# Authenticate and select environment
pac auth create
pac env select --environment <your-environment-id>

# Initialize the code app
pac code init --displayname "My App Name"
```

### Path B: Modern (npm CLI, SDK >= 1.0.4)

```bash
# Interactive mode (prompts for display name and environment)
npx power-apps init

# OR non-interactive mode
npx power-apps init --displayName "My App Name" --environmentId <your-environment-id>
```

The `init` command handles authentication automatically (browser sign-in prompt).

---

## 5. Local Development

### Start the Dev Server

```bash
npm run dev
```

This starts a local Vite dev server. Open the URL labeled **Local Play** in the terminal output.

### Browser Profile Requirement

**Open the Local Play URL in the same browser profile as your Power Platform tenant.** Authentication will fail otherwise.

### Local Network Access Permission (Chrome / Edge)

Since **December 2025**, Chrome and Microsoft Edge block requests from public origins to local endpoints by default. Because the code app connects to localhost during development:

- You may need to **grant browser permission** when prompted, or configure enterprise policies.
- For embedded scenarios (iframes), add `allow="local-network-access"` to the iframe tag.

---

## 6. Build & Deploy Commands

### Path A: Legacy (PAC CLI)

```bash
# Build and push in a single piped command
npm run build | pac code push
```

### Path B: Modern (npm CLI)

```bash
# Build first, then push (separate commands)
npm run build
npx power-apps push
```

### What Happens

- `npm run build` executes the `build` script from `package.json`. For the Vite template this is: `tsc -b && vite build`.
- The push command publishes a new version of the code app to the Power Platform environment.
- On success, the command returns a **Power Apps URL** to run the app.
- The app is also visible at [make.powerapps.com](https://make.powerapps.com) where you can play, share, or review details.

---

## 7. Configuration

### power.config.json

- **Auto-generated** by the Power Apps SDK. Do not edit manually.
- Contains metadata for Power Platform connections and publishing.
- Used by both the CLI and SDK internally.
- Your app logic should not read or write this file.

### Security Model: Hosted Code is Public

When a code app is published via `push`, the code is hosted on a **publicly accessible endpoint**.

**Critical rule:** Never store sensitive user or organizational data in the app code. Store such data in a data source so it is retrieved only after end-users pass authentication and authorization checks.

### Hide the Power Apps Navigation Bar

Append `hideNavBar=true` as a query string parameter to the app URL:

```
# Default (header visible)
https://apps.powerapps.com/play/e/{environment-id}/a/{app-id}

# Header hidden
https://apps.powerapps.com/play/e/{environment-id}/a/{app-id}?hideNavBar=true
```

---

## 8. Known Limitations

| Limitation | Details |
|------------|---------|
| **No mobile support** | Code apps are not supported in the Power Apps mobile app or Power Apps for Windows. |
| **No Power BI data integration** | The `PowerBIIntegration` function is not supported, but code apps *can* be embedded in Power BI Reports via Power Apps Visual. |
| **No SharePoint forms integration** | Code apps do not support SharePoint forms integration. |
| **No SAS IP restriction** | Storage Shared Access Signature IP restriction is not yet supported. |
| **No Power Platform Git integration** | Code apps do not support Power Platform Git integration. |

### Supported Platform Capabilities

Code apps do support these managed platform features:

- Connector consent dialogs (fine-grained permissions)
- Canvas app sharing limits
- App Quarantine
- Data Loss Prevention (DLP) policy enforcement at app launch
- Conditional Access on individual apps
- Admin consent dialog suppression (Microsoft OAuth + custom OAuth connectors)
- Tenant isolation
- Azure B2B (external user access / guest sharing)
- Operational health metrics (admin center + maker portal)

---

## 9. Licensing

End-users running code apps require a **Power Apps Premium license**.

Reference: https://www.microsoft.com/power-platform/products/power-apps/pricing

---

## Quick Reference: Full Workflow (Modern Path)

```bash
# 1. Scaffold
npx degit github:microsoft/PowerAppsCodeApps/templates/vite my-app
cd my-app

# 2. Install
npm install

# 3. Init (interactive -- handles auth automatically)
npx power-apps init

# 4. Develop locally
npm run dev
# Open "Local Play" URL in correct browser profile

# 5. Build and deploy
npm run build
npx power-apps push
# Returns the Power Apps URL for the published app
```

---

## Resources

- SDK npm package: https://www.npmjs.com/package/@microsoft/power-apps
- Templates & samples: https://github.com/microsoft/PowerAppsCodeApps
- Issues & bugs: https://github.com/microsoft/PowerAppsCodeApps/issues
