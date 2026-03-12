# Power Apps Code Apps - Data Integration Reference

> Distilled from Microsoft Learn docs (Feb 2025). Self-contained reference for Claude skills.

---

## 1. Connection Discovery

Before adding data sources, discover your existing connections.

### pac connection list

```powershell
pac connection list
```

Returns a table with columns: **Connection ID**, **API Name**, and others.
The **API Name** acts as the `-a` (appId) parameter when adding data sources.

### Alternative: Power Apps URL

Navigate to **Connections** in [make.powerapps.com](https://make.powerapps.com). Select a connection and extract from the URL:

```
https://make.powerapps.com/.../connections/<apiName>/<connectionId>/details
```

---

## 2. Adding Data Sources

All commands require a prior `pac code init`. All connectors are supported **except** Excel Online (Business) and Excel Online (OneDrive).

**Important:** You can only use existing connections from Power Apps. You cannot create new connections via PAC CLI.

### CLI Command Reference

| Command | Purpose |
|---|---|
| `pac code add-data-source` | Add a data source to the code app |
| `pac code delete-data-source` | Remove a data source |
| `pac code list-datasets` | Discover available datasets for a connection |
| `pac code list-tables` | Discover tables within a dataset |
| `pac code list-sql-stored-procedures` | Discover stored procedures |
| `pac code list-connection-references` | List connection references in a solution |

### 2a. Nontabular Connectors (e.g., Office 365 Users)

```powershell
pac code add-data-source -a <apiName> -c <connectionId>
```

Example:

```powershell
pac code add-data-source -a "shared_office365users" -c "aaaaaaaa000011112222bbbbbbbbbbbb"
```

### 2b. Tabular Connectors (SQL, SharePoint)

Requires `-t` (table ID) and `-d` (dataset name):

```powershell
pac code add-data-source -a <apiName> -c <connectionId> -t <tableId> -d <datasetName>
```

Example:

```powershell
pac code add-data-source `
  -a "shared_sql" `
  -c "aaaaaaaa000011112222bbbbbbbbbbbb" `
  -t "[dbo].[MobileDeviceInventory]" `
  -d "paconnectivitysql0425.database.windows.net,paruntimedb"
```

#### Discover Datasets and Tables

```powershell
# Step 1: List datasets
pac code list-datasets -a "shared_sql" -c "aaaaaaaa000011112222bbbbbbbbbbbb"

# Step 2: List tables in a dataset
pac code list-tables -a "shared_sql" -c "aaaaaaaa000011112222bbbbbbbbbbbb" `
  -d "paconnectivitysql0425.database.windows.net,paruntimedb"

# Step 3: Add the table
pac code add-data-source -a "shared_sql" -c "aaaaaaaa000011112222bbbbbbbbbbbb" `
  -t "[dbo].[MobileDeviceInventory]" `
  -d "paconnectivitysql0425.database.windows.net,paruntimedb"
```

**Tip:** Copy exact **Name** values from command output. Names are case-sensitive and may contain special characters.

### 2c. Dataverse Tables

No connection ID needed -- uses the PAC CLI environment connection:

```powershell
pac code add-data-source -a dataverse -t <table-logical-name>
```

Example:

```powershell
pac code add-data-source -a dataverse -t account
```

**Prerequisites:** PAC CLI v1.46+, environment with Dataverse enabled, connected via `pac auth`.

### 2d. SQL Stored Procedures

```powershell
pac code add-data-source -a <apiId> -c <connectionId> -d <dataSourceName> -sp <storedProcedureName>
```

Example:

```powershell
pac code add-data-source `
  -a "shared_sql" `
  -c "33dd33ddee44ff55aa6677bb77bb77bb" `
  -d "paconnectivitysql0425.database.windows.net,paruntimedb" `
  -sp "[dbo].[GetRecordById]"
```

Discover stored procedures:

```powershell
pac code list-sql-stored-procedures -c <connectionId> -d <datasetName>
```

### 2e. Connection References (PAC CLI v1.51.1+, Dec 2025)

Connection references make solutions portable across Dev/Test/Prod environments.

**Step 1:** Get solution ID:

```powershell
pac solution list --json | ConvertFrom-Json | Format-Table
```

Or from the Power Apps URL: `https://make.powerapps.com/environments/<envId>/solutions/<solutionId>`

**Step 2:** List connection references in the solution:

```powershell
pac code list-connection-references -env <environmentURL> -s <solutionID>
```

**Step 3:** Add using connection reference:

```powershell
pac code add-data-source -a <apiName> -cr <connectionReferenceLogicalName> -s <solutionID>
```

---

## 3. Generated Code Structure

When you add a data source, typed TypeScript files are generated automatically.

### File Locations

| Type | Path |
|---|---|
| Service files | `src/generated/services/<Name>Service.ts` |
| Model files | `src/generated/models/<Name>Model.ts` |

### Naming Conventions

| Data Source | Model File | Service File | Import Example |
|---|---|---|---|
| Office 365 Users | `Office365UsersModel.ts` | `Office365UsersService.ts` | `import { Office365UsersService } from './generated/services/Office365UsersService'` |
| Dataverse (account) | `AccountsModel.ts` | `AccountsService.ts` | `import { AccountsService } from './generated/services/AccountsService'` |
| Copilot Studio | (generated) | `CopilotStudioService.ts` | `import { CopilotStudioService } from './generated/services/CopilotStudioService'` |

### Import Pattern

```typescript
// Service (methods)
import { AccountsService } from './generated/services/AccountsService';
// Model (types)
import type { Accounts } from './generated/models/AccountsModel';
```

**Schema refresh:** No refresh command exists. Delete the data source and re-add it if the schema changes.

---

## 4. Dataverse CRUD Patterns

### Create

```typescript
import { AccountsService } from './generated/services/AccountsService';
import type { Accounts } from './generated/models/AccountsModel';

// Exclude system-managed fields: primary key, ownerid, owneridname, owneridtype, owneridyominame
const newAccount = {
  name: "New Account",
  statecode: 0,
  accountnumber: "ACC001"
};

try {
  const result = await AccountsService.create(newAccount as Omit<Accounts, 'accountid'>);
  if (result.data) {
    console.log('Account created:', result.data);
  }
} catch (err) {
  console.error('Failed to create account:', err);
}
```

### Read (Single Record)

```typescript
const accountId = "00000000-0000-0000-0000-000000000000";

try {
  const result = await AccountsService.get(accountId);
  if (result.data) {
    console.log('Account retrieved:', result.data);
  }
} catch (err) {
  console.error('Failed to retrieve account:', err);
}
```

### Read (Multiple Records with IGetAllOptions)

```typescript
interface IGetAllOptions {
  maxPageSize?: number;    // Maximum records per page
  select?: string[];       // Specific fields to retrieve
  filter?: string;         // OData filter string
  orderBy?: string[];      // Fields to sort by
  top?: number;            // Maximum records to retrieve
  skip?: number;           // Records to skip
  skipToken?: string;      // Token for pagination
}
```

Example with options:

```typescript
const options: IGetAllOptions = {
  select: ['name', 'accountnumber', 'address1_city'],
  filter: "address1_country eq 'USA'",
  orderBy: ['name asc'],
  top: 50
};

try {
  const result = await AccountsService.getAll(options);
  return result.data || [];
} catch (err) {
  console.error('Failed to fetch accounts:', err);
  return [];
}
```

**Important:** Always limit columns with the `select` parameter.

### Update

Only include properties you are changing -- do not send unchanged fields (triggers false business logic/audit entries).

```typescript
const accountId = "<your-account-guid>";
const changes = {
  name: "Updated Account Name",
  telephone1: "555-0123"
};

try {
  await AccountsService.update(accountId, changes);
  console.log('Account updated successfully');
} catch (err) {
  console.error('Failed to update account:', err);
}
```

### Delete

```typescript
const accountId = "00000000-0000-0000-0000-000000000000";

try {
  await AccountsService.delete(accountId);
  console.log('Account deleted successfully');
} catch (err) {
  console.error('Failed to delete account:', err);
}
```

### Tabular Connectors (SQL/SharePoint) -- CRUD Summary

```typescript
await MobileDeviceInventoryService.create(<record>);
await MobileDeviceInventoryService.get(id);
await MobileDeviceInventoryService.getall();
await MobileDeviceInventoryService.update(id, <record>);
await MobileDeviceInventoryService.delete(id);
```

---

## 5. Copilot Studio Integration

### Add the Connector

```powershell
pac code add-data-source -a "shared_microsoftcopilotstudio" -c <connectionId>
```

Check for existing connection (API ID: `/providers/Microsoft.PowerApps/apis/shared_microsoftcopilotstudio`):

```powershell
pac connection list
```

### Get Your Agent Name

In Copilot Studio: **Channels** > **Web app** > connection string URL:

```
https://{id}.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/{agentName}/conversations?api-version=2022-03-01-preview
```

Agent names are **case-sensitive** and typically include a **publisher prefix** (e.g., `cr3e1_customerSupportAgent`).

### Use ExecuteCopilotAsyncV2 (the correct action)

> **WARNING:** Do NOT use `ExecuteCopilot` (`/execute`) -- only returns ConversationId, fire-and-forget.
> Do NOT use `ExecuteCopilotAsync` (`/executeAsync`) -- may return 502 "Cannot read server response" errors.
> Always use `ExecuteCopilotAsyncV2` (`/proactivecopilot/executeAsyncV2`).

```typescript
import { CopilotStudioService } from './generated/services/CopilotStudioService';

const response = await CopilotStudioService.ExecuteCopilotAsyncV2({
  message: "What is the status of my order?",
  notificationUrl: "https://notificationurlplaceholder",
  agentName: "cr3e1_customerSupportAgent"
});
```

### Request Parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `message` | Yes | string | Prompt or data to send. Can be JSON string for structured data. |
| `notificationUrl` | Yes | string | Always `"https://notificationurlplaceholder"`. Required by API but unused in synchronous mode. |
| `agentName` | Yes | string | Published Copilot Studio agent name (case-sensitive, includes publisher prefix). |

### Response Structure

| Property | Type | Description |
|---|---|---|
| `responses` | `string[]` | Array of response strings from the agent |
| `conversationId` | `string` | Conversation ID for tracking |
| `lastResponse` | `string` | Most recent response from the agent |
| `completed` | `boolean` | Whether the agent finished processing |

### JSON Parsing Pattern

```typescript
const response = await CopilotStudioService.ExecuteCopilotAsyncV2({
  message: JSON.stringify({ query: "monthly sales" }),
  notificationUrl: "https://notificationurlplaceholder",
  agentName: "cr3e1_dataAnalyzer"
});

if (response.data.responses && response.data.responses.length > 0) {
  const parsedData = JSON.parse(response.data.responses[0]);
  const summary = parsedData.summary;
  const metrics = parsedData.metrics;
}
```

### Property Casing Gotcha

Response property casing may vary. Use optional chaining:

```typescript
const convId = response.data.conversationId ??
               response.data.ConversationId ??
               response.data.conversationID;
```

---

## 6. Metadata API

Retrieve Dataverse table (entity) metadata at runtime using `getMetadata`.

### Signature

```typescript
AccountsService.getMetadata(
  options?: GetEntityMetadataOptions<Account>
): Promise<IOperationResult<Partial<EntityMetadata>>>
```

### GetEntityMetadataOptions

```typescript
interface GetEntityMetadataOptions {
  metadata?: Array<String>;    // Entity-level properties: ["Privileges","DisplayName","IsCustomizable"]
  schema?: {
    columns?: "all" | Array<String>;  // "all" or ["name","telephone1","createdon"]
    oneToMany?: boolean;
    manyToOne?: boolean;
    manyToMany?: boolean;
  };
}
```

**Note:** You cannot access properties from derived types (e.g., choice/picklist column options are NOT available via `columns`).

### Example: Column Display Labels

```typescript
async function getColumnDisplayNames() {
  const { data } = await AccountsService.getMetadata({
    schema: { columns: 'all' }
  });

  const columnDisplayNames: Record<string, string> = {};
  if (data.Attributes) {
    for (const attr of data.Attributes) {
      const label = attr.DisplayName?.UserLocalizedLabel?.Label;
      if (label) {
        columnDisplayNames[attr.LogicalName] = label;
      }
    }
  }
  return columnDisplayNames;
}
```

### Example: Required Fields

```typescript
async function getRequiredFields() {
  const { data } = await AccountsService.getMetadata({
    schema: { columns: 'all' }
  });
  if (!data.Attributes) return [];

  return data.Attributes
    .filter(attr => attr.IsRequiredForForm)
    .map(attr => ({
      logicalName: attr.LogicalName,
      displayName: attr.DisplayName?.UserLocalizedLabel?.Label,
      attributeType: attr.AttributeTypeName?.Value
    }));
}
```

### Example: Column Types

```typescript
async function getColumnTypes() {
  const { data } = await AccountsService.getMetadata({
    schema: { columns: 'all' }
  });
  if (!data.Attributes) return [];

  return data.Attributes.map(attr => ({
    logicalName: attr.LogicalName,
    attributeType: attr.AttributeTypeName?.Value
  }));
}
```

### Example: Lookup Relationships (Many-to-One)

```typescript
async function getLookupRelationships() {
  const { data } = await AccountsService.getMetadata({
    metadata: ['LogicalName', 'DisplayName'],
    schema: { manyToOne: true }
  });
  if (!data.ManyToOneRelationships) return [];

  return data.ManyToOneRelationships.map(rel => ({
    lookupField: rel.ReferencingAttribute,
    relatedTable: rel.ReferencedEntity,
    relatedTableAttribute: rel.ReferencedAttribute,
    relationshipName: rel.SchemaName
  }));
}
```

### Best Practices

- **Cache metadata** at app start or per session -- calls are heavy.
- **Request only what you need** -- prefer column lists over `"all"`.
- **Defensive access** -- always use optional chaining: `attr.DisplayName?.UserLocalizedLabel?.Label`.
- **Use TypeScript types** from generated Dataverse Web API types.

---

## 7. Context API

Retrieve runtime context about the app, user, and host session.

### Import and Usage

```typescript
import { getContext } from '@microsoft/power-apps/app';

const ctx = await getContext();
```

### IContext Interface

| Property | Type | Description |
|---|---|---|
| `app` | `IAppContext` | App context |
| `user` | `IUserContext` | User context |
| `host` | `IHostContext` | Host context |

### IAppContext

| Property | Type | Description |
|---|---|---|
| `appId` | `string` | ID of the app being played |
| `environmentId` | `string` | ID of the environment where the app lives |
| `queryParams` | `Record<string, string>` | Query parameters added to the URL |

### IUserContext

| Property | Type | Description |
|---|---|---|
| `fullName` | `string` | Full name of the user |
| `objectId` | `string` | ID of the user |
| `tenantId` | `string` | ID of the tenant |
| `userPrincipalName` | `string` | UPN of the user |

### IHostContext

| Property | Type | Description |
|---|---|---|
| `sessionId` | `string` | Current session ID (changes every app open) |

### Full Example

```typescript
import { getContext } from '@microsoft/power-apps/app';

const ctx = await getContext();

const appId = ctx.app.appId;
const environmentId = ctx.app.environmentId;
const queryParams = ctx.app.queryParams;
const fullName = ctx.user.fullName;
const objectId = ctx.user.objectId;
const tenantId = ctx.user.tenantId;
const userPrincipalName = ctx.user.userPrincipalName;
const sessionId = ctx.host.sessionId;
```

---

## 8. Removing Data Sources

```powershell
pac code delete-data-source -a <apiName> -ds <dataSourceName>
```

Example:

```powershell
pac code delete-data-source -a "shared_sql" -ds "MobileDeviceInventory"
```

**Note:** Deleting Dataverse datasources via PAC CLI is **not yet supported**.

---

## 9. Supported vs Unsupported (Dataverse)

### Supported

| Feature | Details |
|---|---|
| CRUD operations | `create`, `get`, `getAll`, `update`, `delete` via generated services |
| Delegation | `filter`, `sort`, `top` queries |
| Paging | Via `skipToken` in `IGetAllOptions` |
| Formatted values | Retrieve display names for option sets |
| Metadata | `getMetadata()` for entity definitions, attributes, relationships |
| Lookups | Via single-valued navigation property (associate on create or update) |
| Select columns | Via `select` in `IGetAllOptions` |
| OData filters | Via `filter` in `IGetAllOptions` |

### Not Supported

| Feature |
|---|
| Polymorphic lookups |
| Dataverse actions and functions |
| Deleting Dataverse datasources via PAC CLI |
| Schema definition (entity metadata) CRUD |
| FetchXML support |
| Alternate key support |
| Choice/picklist column options via metadata (derived type properties) |
