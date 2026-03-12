---
name: code-app-connect
description: >
  Connect a Power Apps code app to data sources, implement CRUD operations, and integrate
  platform services. Covers Power Platform connectors (SQL, SharePoint, Office 365), Dataverse
  tables, Copilot Studio agents, metadata retrieval, and runtime context. Use this skill whenever
  the user wants to add a data source to a code app, connect to Dataverse, add a connector,
  implement CRUD operations, integrate Copilot Studio, retrieve metadata, or use getContext().
  Also triggers on: "pac code add-data-source", "connect my app to SQL", "add SharePoint data",
  "how to query Dataverse from code app", "integrate AI agent", "get user context in code app",
  or any question about data integration patterns in Power Apps code apps.
---

# Power Apps Code App — Data Integration

Guide developers through connecting code apps to data sources, implementing data operations,
and integrating platform services. For complete CLI commands, TypeScript patterns, and API
reference, see [references/data-integration-guide.md](references/data-integration-guide.md).

## Workflow Overview

```
1. Discover connections    → pac connection list
2. Add data source         → pac code add-data-source ...
3. Import generated code   → import { XxxService } from './generated/services/...'
4. Implement operations    → Service.create(), .get(), .getAll(), .update(), .delete()
5. Test locally            → npm run dev
```

## Step 1 — Discover Available Connections

```bash
pac connection list
```

This returns Connection IDs and API Names for all connections in the environment. Note these values — you'll need them for `add-data-source`.

## Step 2 — Add a Data Source

The command varies by data source type:

**Nontabular (Office 365 Users, etc.):**
```bash
pac code add-data-source -a <apiName> -c <connectionId>
```

**Tabular (SQL, SharePoint) — requires dataset + table discovery:**
```bash
pac code list-datasets -a <apiId> -c <connectionId>
pac code list-tables -a <apiId> -c <connectionId> -d <datasetName>
pac code add-data-source -a <apiName> -c <connectionId> -t <tableId> -d <datasetName>
```

**Dataverse:**
```bash
pac code add-data-source -a dataverse -t <table-logical-name>
```

**Copilot Studio:**
```bash
pac code add-data-source -a "shared_microsoftcopilotstudio" -c <connectionId>
```

After adding, the SDK generates typed models in `/generated/models/` and services in `/generated/services/`.

## Step 3 — Use Generated Services

Every data source generates a `[Name]Service` and `[Name]Model`. Import and use them:

```typescript
import { AccountsService } from './generated/services/AccountsService';
import type { Accounts } from './generated/models/AccountsModel';
```

### Dataverse CRUD Pattern

```typescript
// Create
const result = await AccountsService.create({ name: "Acme", statecode: 0 });

// Read single
const account = await AccountsService.get(accountId);

// Read multiple with filtering
const accounts = await AccountsService.getAll({
  select: ['name', 'accountnumber'],
  filter: "address1_country eq 'USA'",
  orderBy: ['name asc'],
  top: 50
});

// Update (partial)
await AccountsService.update(accountId, { name: "New Name" });

// Delete
await AccountsService.delete(accountId);
```

### Copilot Studio Pattern

Use `ExecuteCopilotAsyncV2` — the only action that returns synchronous responses:

```typescript
import { CopilotStudioService } from './generated/services/CopilotStudioService';

const response = await CopilotStudioService.ExecuteCopilotAsyncV2({
  message: "What is the status of my order?",
  notificationUrl: "https://notificationurlplaceholder",  // Required but unused
  agentName: "cr3e1_customerSupportAgent"                  // Case-sensitive, includes publisher prefix
});
```

**Warning:** Do NOT use `ExecuteCopilot` (fire-and-forget) or `ExecuteCopilotAsync` (returns 502). Only `ExecuteCopilotAsyncV2` returns actual response data.

## Step 4 — Advanced Patterns

### Runtime Context

```typescript
import { getContext } from '@microsoft/power-apps/app';

const ctx = await getContext();
// ctx.user.fullName, ctx.user.objectId, ctx.user.userPrincipalName
// ctx.app.appId, ctx.app.environmentId, ctx.app.queryParams
// ctx.host.sessionId
```

### Dataverse Metadata

```typescript
const { data } = await AccountsService.getMetadata({
  schema: { columns: 'all', manyToOne: true }
});
// data.Attributes → column labels, types, required flags
// data.ManyToOneRelationships → lookup relationships
```

Cache metadata at app startup — these calls are heavy.

### Removing Data Sources

```bash
pac code delete-data-source -a <apiName> -ds <dataSourceName>
```

## Dataverse Capabilities

| Supported | Not Supported |
|-----------|---------------|
| CRUD operations | Polymorphic lookups |
| OData filter, sort, top | Dataverse actions/functions |
| Paging (skipToken) | FetchXML |
| Formatted values (option sets) | Alternate keys |
| Metadata retrieval | Deleting Dataverse datasources via CLI |
| Lookup associations (many-to-one) | |

## What NOT to Do

- Do not use `ExecuteCopilot` or `ExecuteCopilotAsync` for Copilot Studio — only `ExecuteCopilotAsyncV2` works
- Do not skip dataset/table discovery for tabular sources — the command will fail without proper IDs
- Do not call `getMetadata()` on every render — cache at app startup
- Do not hardcode user info — use `getContext()` instead
