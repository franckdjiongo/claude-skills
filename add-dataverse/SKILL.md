---
name: add-dataverse
description: Adds Dataverse tables to a Power Apps code app with generated TypeScript models and services. Can also create new Dataverse tables. Use when connecting to Dataverse, adding tables, creating schema, or querying Dataverse data.
user-invocable: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, LSP, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion, Skill, EnterPlanMode, ExitPlanMode
model: opus
---

**📋 Shared Instructions: [shared-instructions.md](${CLAUDE_PLUGIN_ROOT}/shared/shared-instructions.md)** - Cross-cutting concerns.

**References:**

- [dataverse-reference.md](./references/dataverse-reference.md) - Picklist fields, virtual fields, lookups, form patterns (CRITICAL)
- [api-authentication-reference.md](./references/api-authentication-reference.md) - Dataverse API auth, token, publisher prefix
- [table-management-reference.md](./references/table-management-reference.md) - Query, create, extend tables and columns
- [data-architecture-reference.md](./references/data-architecture-reference.md) - Relationship types, dependency tiers

# Add Dataverse

Two paths: **existing tables** (skip to Step 5) or **new tables** (full workflow).

## Workflow

1. Plan → 2. Setup API Auth → 3. Review Existing Tables → 4. Create Tables → 5. Add Data Source → 6. Review Generated Files → 7. Build

---

### Step 1: Plan

Check memory bank for project context. Ask the user:

1. Which Dataverse table(s) do they need? (e.g., `account`, `contact`, `cr123_customentity`)
2. Do the tables **already exist** in their environment, or do they need to **create new** ones?

**If tables already exist:** Skip to Step 5.

**If creating new tables:**

- Ask about the data they need and design an appropriate schema
- Use standard Dataverse tables when appropriate (`contact` for people, `account` for organizations)
- Build a dependency graph -- see [data-architecture-reference.md](./references/data-architecture-reference.md) for tier classification
- Enter plan mode with `EnterPlanMode`, present ER model with tables, columns, relationships, and creation order
- Get approval with `ExitPlanMode`

### Step 2: Setup API Auth (if creating tables)

See [api-authentication-reference.md](./references/api-authentication-reference.md) for full details.

```powershell
az account show   # Verify Azure CLI logged in
pwsh -NoProfile -Command "pac org who"       # Get environment URL

$api = Initialize-DataverseApi -EnvironmentUrl "https://<org>.crm.dynamics.com"
$headers = $api.Headers
$baseUrl = $api.BaseUrl
$publisherPrefix = $api.PublisherPrefix
```

Requires **System Administrator** or **System Customizer** security role.

### Step 3: Review Existing Tables (if creating tables)

**Always query existing tables first before creating:**

```powershell
$existingTables = Invoke-RestMethod -Uri "$baseUrl/EntityDefinitions?`$filter=IsCustomEntity eq true&`$select=SchemaName,LogicalName,DisplayName" -Headers $headers
```

See [table-management-reference.md](./references/table-management-reference.md) for `Find-SimilarTables`, `Compare-TableSchemas`, and `Build-TableNameMapping` functions.

Present findings to user with `AskUserQuestion`:

- Tables that can be **reused** (already exist with matching columns)
- Tables that need **extension** (exist but missing columns)
- Tables that must be **created** (no match found)

### Step 4: Create Tables (if creating tables)

Get explicit confirmation before creating. Create in dependency order:

- **Tier 0**: Reference tables (no dependencies)
- **Tier 1**: Primary entities (reference Tier 0)
- **Tier 2**: Dependent tables (reference Tier 1)

Use safe functions from [table-management-reference.md](./references/table-management-reference.md):

- `New-DataverseTableIfNotExists`
- `Add-DataverseColumnIfNotExists`
- `Add-DataverseLookupIfNotExists` (from [data-architecture-reference.md](./references/data-architecture-reference.md))

### Step 5: Add Data Source

> **macOS / Linux users — read this first:**
> `pac code add-data-source` has a confirmed packaging bug on macOS and Linux
> (GitHub issue #302) that causes "Could not find the PowerApps CLI script" regardless
> of pac version. Use the workaround script instead (see below).

**Windows:**
```bash
pac code add-data-source -a dataverse -t <table-logical-name>
```
Run once per table. Can batch by looping.

**macOS / Linux — use `pa-generate.mjs`:**

Before running, make sure pac points to the correct environment:
```bash
pac env list                                       # find your environment ID
pac env select --environment <env-id>             # activate it
```

Then regenerate all tables declared in `power.config.json` at once:
```bash
node ~/.claude/scripts/pa-generate.mjs
```

The script:
- Reads all `dataSources` from `power.config.json` automatically
- Resolves the org URL from `pac env list` using the `environmentId`
- Authenticates via MSAL (device code on first run, cached Keychain token after)
- Runs the npm `power-apps` CLI directly, bypassing the broken `pac code` wrapper
- The telemetry 401 errors printed per table are harmless (wrong audience for the PP API analytics call)

**First-time auth on macOS:** The script will print a device code and a URL. Open
`https://microsoft.com/devicelogin` in your browser, enter the code, and sign in.
Subsequent runs use the cached macOS Keychain token silently.

### Step 6: Review Generated Files

The command generates:

- `src/generated/models/{Table}Model.ts` -- TypeScript interfaces
- `src/generated/services/{Table}Service.ts` -- CRUD methods (create, get, getAll, update, delete)

Show the user a usage example:

```typescript
import { AccountsService } from "../generated/services/AccountsService";

const result = await AccountsService.getAll({
  select: ["name", "accountnumber"],
  filter: "statecode eq 0",
  orderBy: ["name asc"],
  top: 50
});
const accounts = result.data || [];
```

**Key rules:**

- Use generated services (e.g., `AccountsService.getAll()`), not fetch/axios
- Check `result.data` for actual data
- Don't edit generated files unless needed
- **Read [dataverse-reference.md](./references/dataverse-reference.md) before writing any Dataverse code** -- picklist fields, virtual fields, and lookups have critical gotchas

### Step 7: Build

```powershell
npm run build
```

Fix TypeScript errors before proceeding. Do NOT deploy yet.

### Step 7b: Refresh the cloud snapshot (only if the project ships one)

Some projects run autonomous cloud sessions (claude.ai routines) that clone the
repo from GitHub — they cannot regenerate the gitignored `src/generated/` SDK
(`pac` requires an authenticated machine), so they restore it from a shuttle
branch. **If `.claude/scripts/push-generated-snapshot.mjs` exists in the
project, run it after EVERY SDK (re)generation:**

```bash
node .claude/scripts/push-generated-snapshot.mjs
```

It force-pushes an orphan commit containing only `src/generated/` to the
`cloud/generated-snapshot` branch (pure git plumbing — never touches your
working tree or branch). Skipping this leaves cloud runs typechecking against
a stale SDK. If the script does not exist in the project, skip this step.

### Update Memory Bank

Record which tables were added (or created), generated files, and any schema notes.
