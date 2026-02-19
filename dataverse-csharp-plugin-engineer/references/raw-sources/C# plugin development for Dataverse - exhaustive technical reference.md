# C# plugin development for Dataverse: exhaustive technical reference

## 1. Executive summary

Every Dataverse plugin is a .NET Framework 4.6.2 class implementing `Microsoft.Xrm.Sdk.IPlugin` with a single `void Execute(IServiceProvider)` method. The platform caches plugin instances across requests, so classes **must be stateless**—store nothing mutable in fields. Plugins hook into a four-stage pipeline (PreValidation → PreOperation → MainOperation → PostOperation) via step registrations that bind a plugin class to a specific message, entity, stage, and execution mode. The execution context (`IPluginExecutionContext`) exposes `InputParameters`, `OutputParameters`, `PreEntityImages`, `PostEntityImages`, and `SharedVariables`—each available only at specific stages. All Dataverse online plugins run in a **sandbox** (isolation mode 2): no file system, no registry, no parallel threads, HTTP/HTTPS web calls only. Assemblies must be ≤ **16 MB**, strong-named (unless using plugin packages), and stored in the database. The hard timeout for all synchronous plugins in a single pipeline is **2 minutes**; recommended per-plugin time is under 2 seconds. Use `InvalidPluginExecutionException` exclusively for user-facing errors. The maximum pipeline depth is **8** to prevent infinite loops.

---

## 2. The plugin execution pipeline processes every Dataverse operation in four stages

Every `OrganizationRequest` entering Dataverse traverses a deterministic event pipeline. The platform invokes registered synchronous plugins sequentially at each stage, ordered by their `Rank` (execution order) value. Asynchronous plugins are queued after pipeline completion.

```
Client Request (OrganizationRequest)
    │
    ▼
┌──────────────────────────────────────┐
│  Stage 10: PreValidation             │  ← Usually OUTSIDE DB transaction
│  • InputParameters: readable/writable│
│  • PreEntityImages: available        │
│  • Cancel here = cheapest rollback   │
└──────────────┬───────────────────────┘
               │
    ═══════════╪═══════════════════════ DB TRANSACTION BEGINS
               │
┌──────────────▼───────────────────────┐
│  Stage 20: PreOperation              │  ← INSIDE DB transaction
│  • InputParameters: readable/writable│
│  • PreEntityImages: available        │
│  • Best place to modify entity values│
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Stage 30: MainOperation             │  ← INTERNAL (Custom API only)
│  • Platform writes to database       │
│  • OutputParameters set here         │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Stage 40: PostOperation (SYNC)      │  ← INSIDE DB transaction
│  • OutputParameters: now readable    │
│  • PreImages + PostImages available  │
│  • Exception = full rollback         │
└──────────────┬───────────────────────┘
               │
    ═══════════╪═══════════════════════ DB TRANSACTION COMMITS
               │
┌──────────────▼───────────────────────┐
│  Stage 40: PostOperation (ASYNC)     │  ← OUTSIDE DB transaction
│  • Queued to Asynchronous Service    │
│  • Cannot roll back original op      │
└──────────────────────────────────────┘
```

### Stage-by-stage data availability matrix

| Capability | PreValidation (10) | PreOperation (20) | PostOperation (40) |
|---|---|---|---|
| Read InputParameters | ✅ | ✅ | ✅ |
| Modify InputParameters | ✅ | ✅ | ✅ (no effect on saved data) |
| Read OutputParameters | ❌ | ❌ | ✅ |
| Modify OutputParameters | ❌ | ❌ | ✅ |
| PreEntityImages | ✅ (if record exists) | ✅ | ✅ |
| PostEntityImages | ❌ | ❌ | ✅ |
| Cancel operation | ✅ (cheapest) | ✅ (causes rollback) | ✅ (full rollback) |
| IsInTransaction | Usually false* | true | true (sync) / false (async) |

*PreValidation runs outside the transaction for top-level operations. However, when triggered by logic inside another stage's transaction (e.g., a Create called from a PostOperation plugin), PreValidation **inherits** that transaction. Always check `context.IsInTransaction` at runtime.

### Transaction boundary rules

Synchronous PostOperation plugins extend the database transaction's lifetime. Any exception thrown at Stages 20 or 40 (sync) causes a **complete rollback** of the entire operation including all prior stage work. Asynchronous plugins at Stage 40 run after the transaction commits; their failures create failed System Jobs but do not affect the original operation.

---

## 3. Core interfaces reference

### IPlugin — the sole entry point

**Namespace:** `Microsoft.Xrm.Sdk` | **Assembly:** `Microsoft.Xrm.Sdk.dll`

```csharp
public interface IPlugin {
    void Execute(IServiceProvider serviceProvider);
}
```

The platform supports three constructor overloads: parameterless, one-string (unsecure config), and two-string (unsecure + secure config). The constructor runs **once** per cached instance. The assembly must target **.NET Framework 4.6.2** (with 4.8 runtime support planned for June 2026).

### Services available from IServiceProvider

| `typeof(...)` | Returns | Purpose |
|---|---|---|
| `IPluginExecutionContext` | Pipeline context | Message name, stage, entity data, images |
| `IOrganizationServiceFactory` | Service factory | Creates `IOrganizationService` instances |
| `ITracingService` | Trace logger | Writes to `PluginTraceLog` (10 KB limit, 24-hour retention) |
| `IServiceEndpointNotificationService` | Azure bus poster | Posts context to Azure Service Bus endpoints |
| `Microsoft.Xrm.Sdk.PluginTelemetry.ILogger` | App Insights logger | Writes telemetry to Application Insights (no size limit, 90-day default retention) |

**Critical `ILogger` gotcha:** Import `Microsoft.Xrm.Sdk.PluginTelemetry`, **not** `Microsoft.Extensions.Logging`. The wrong namespace returns null.

### IOrganizationServiceFactory.CreateOrganizationService behavior

| userId parameter | Execution identity |
|---|---|
| `null` | **SYSTEM** user (full privileges) |
| `Guid.Empty` | Same user as `context.UserId` (calling/impersonated user) |
| Specific `Guid` | That specific system user (impersonation) |

### IOrganizationService — exactly 8 methods

```csharp
Guid Create(Entity entity);
Entity Retrieve(string entityName, Guid id, ColumnSet columnSet);
void Update(Entity entity);
void Delete(string entityName, Guid id);
void Associate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
void Disassociate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
OrganizationResponse Execute(OrganizationRequest request);
EntityCollection RetrieveMultiple(QueryBase query);
```

All seven convenience methods internally delegate to `Execute`. The `QueryBase` parameter for `RetrieveMultiple` accepts `QueryExpression`, `FetchExpression`, or `QueryByAttribute`.

### IPluginExecutionContext version progression (v1–v7)

The runtime context always implements the latest interface version. Cast upward to access new properties.

| Version | Key additions | Introduced |
|---|---|---|
| v1 (base) | Stage, ParentContext, Mode, Depth, MessageName, all base properties | Original SDK |
| v2 | `IsPortalsClientCall`, `InitiatingUserAzureActiveDirectoryObjectId`, `InitiatingUserApplicationId` | ~2022 |
| v3 | `AuthenticatedUserId` | ~2023 |
| v4 | `PreEntityImagesCollection[]`, `PostEntityImagesCollection[]` (for CreateMultiple/UpdateMultiple) | 2023 |
| v5 | `InitiatingUserAgent` (identifies client: browser, XrmTooling, etc.) | 2024 |
| v6 | `EnvironmentId`, `TenantId`, `UserAzureActiveDirectoryObjectId` | 2024 |
| v7 | `IsApplicationUser` (service principal detection) | 2025 |

### Complete IPluginExecutionContext property table (v1 base)

| Property | Type | Description |
|---|---|---|
| `MessageName` | `string` | "Create", "Update", "Delete", etc. |
| `Stage` | `int` | 10, 20, 40 |
| `Mode` | `int` | 0 = Synchronous, 1 = Asynchronous |
| `Depth` | `int` | Call stack depth (starts at 1) |
| `PrimaryEntityName` | `string` | Logical name of target entity |
| `PrimaryEntityId` | `Guid` | GUID of target record |
| `InputParameters` | `ParameterCollection` | Request parameters |
| `OutputParameters` | `ParameterCollection` | Response parameters (PostOperation only) |
| `SharedVariables` | `ParameterCollection` | Cross-step shared data |
| `PreEntityImages` | `EntityImageCollection` | Pre-operation snapshots |
| `PostEntityImages` | `EntityImageCollection` | Post-operation snapshots |
| `ParentContext` | `IPluginExecutionContext` | Parent pipeline context (null if top-level) |
| `UserId` | `Guid` | Executing user identity |
| `InitiatingUserId` | `Guid` | Original triggering user |
| `BusinessUnitId` | `Guid` | Calling user's business unit |
| `OrganizationId` | `Guid` | Organization GUID |
| `OrganizationName` | `string` | Unique org name |
| `CorrelationId` | `Guid` | Execution tracking GUID |
| `IsInTransaction` | `bool` | Whether inside DB transaction |
| `IsExecutingOffline` | `bool` | Offline client execution |
| `IsolationMode` | `int` | 1 = None, 2 = Sandbox |
| `OperationId` | `Guid` | System Job GUID (async) |
| `OperationCreatedOn` | `DateTime` | System Job creation time |
| `RequestId` | `Guid?` | Request GUID |
| `OwningExtension` | `EntityReference` | Reference to SdkMessageProcessingStep |

---

## 4. Plugin registration reference

### Step registration parameter matrix

| Parameter | Values / Type | Notes |
|---|---|---|
| **Message** | Create, Update, Delete, Retrieve, RetrieveMultiple, Associate, Disassociate, Assign, SetState, GrantAccess, RevokeAccess, ModifyAccess, Merge, Route, Send, + Custom API messages | Full list in `SdkMessage` table; filter on `iscustomprocessingstepallowed = true` |
| **Primary Entity** | Entity logical name | Omit = fires for ALL entities supporting the message |
| **Secondary Entity** | Entity logical name | Rarely used; backward compatibility |
| **Filtering Attributes** | Comma-separated attribute names | **Update message only.** Fires when listed attributes are *present* in request (regardless of value change). Never include primary key. |
| **Stage** | 10 (PreValidation), 20 (PreOperation), 40 (PostOperation) | Stage 30 is internal only (Custom API/virtual tables) |
| **Execution Mode** | Synchronous, Asynchronous | Async available **only** at PostOperation (40) |
| **Execution Order** | Integer | Lower = earlier. Same value = non-deterministic order |
| **Run in User's Context** | Calling User (default) or specific user GUID | Controls `context.UserId` |
| **Deployment** | Server (default), Offline | Offline = Dynamics 365 for Outlook client |

### Entity image registration rules

| Message | Pre-Image | Post-Image |
|---|---|---|
| Create | ❌ (record doesn't exist yet) | ✅ PostOperation only |
| Update (PreValidation/PreOperation) | ✅ | ❌ |
| Update (PostOperation) | ✅ | ✅ |
| Delete (all stages) | ✅ | ❌ (record won't exist after) |
| SetState | ✅ | ✅ PostOperation only |
| Assign | ✅ | ✅ PostOperation only |

Each image is registered with an **Entity Alias** (arbitrary string key) and a **column selection**. The default selects all columns—**never use the default**; select only needed columns. Images are accessed via `context.PreEntityImages["alias"]` and `context.PostEntityImages["alias"]`.

### Secure vs. unsecure configuration

| Aspect | Unsecure | Secure |
|---|---|---|
| Visibility | Anyone with step access | System Administrators only |
| Solution export | ✅ Included | ❌ Not included |
| Constructor parameter | First `string` | Second `string` |
| Use case | Feature flags, URLs, thresholds | API keys, connection strings |

---

## 5. Context objects reference — exact keys per message

### InputParameters key-value table

| Message | Key | Type | Notes |
|---|---|---|---|
| **Create** | `"Target"` | `Entity` | Contains only attributes being set |
| **Update** | `"Target"` | `Entity` | Contains **only changed attributes** + primary key |
| **Delete** | `"Target"` | `EntityReference` | Reference to record being deleted |
| **Retrieve** | `"Target"` | `EntityReference` | Reference to record |
| **Retrieve** | `"ColumnSet"` | `ColumnSet` | Requested columns |
| **Retrieve** | `"RelatedEntitiesQuery"` | `RelationshipQueryCollection` | Optional related entity queries |
| **RetrieveMultiple** | `"Query"` | `QueryBase` | `QueryExpression`, `FetchExpression`, or `QueryByAttribute` |
| **Associate** | `"Target"` | `EntityReference` | Primary record |
| **Associate** | `"Relationship"` | `Relationship` | Relationship schema name |
| **Associate** | `"RelatedEntities"` | `EntityReferenceCollection` | Records to associate |
| **Disassociate** | `"Target"` | `EntityReference` | Primary record |
| **Disassociate** | `"Relationship"` | `Relationship` | Relationship schema name |
| **Disassociate** | `"RelatedEntities"` | `EntityReferenceCollection` | Records to disassociate |
| **SetState** | `"EntityMoniker"` | `EntityReference` | Target entity |
| **SetState** | `"State"` | `OptionSetValue` | State value |
| **SetState** | `"Status"` | `OptionSetValue` | Status value |

### OutputParameters key-value table (PostOperation only)

**Critical:** Some OutputParameters keys **do not match** the SDK Response class property names.

| Message | Key in OutputParameters | Type | SDK Property Name |
|---|---|---|---|
| **Create** | `"id"` | `Guid` | `CreateResponse.id` |
| **Retrieve** | `"BusinessEntity"` | `Entity` | `RetrieveResponse.Entity` |
| **RetrieveMultiple** | `"BusinessEntityCollection"` | `EntityCollection` | `RetrieveMultipleResponse.EntityCollection` |
| **Update** | (none significant) | — | — |
| **Delete** | (none significant) | — | — |

The key name `"BusinessEntity"` (not `"Entity"`) and `"BusinessEntityCollection"` (not `"EntityCollection"`) are legacy naming conventions that persist in the pipeline.

### SharedVariables cross-stage behavior

SharedVariables (`ParameterCollection`) allow inter-plugin data passing within a single pipeline execution. All values must be serializable. For **Create, Update, Delete, and RetrieveExchangeRate** messages, PreValidation runs in a separate context from PreOperation/PostOperation. To access PreValidation SharedVariables from later stages, traverse `context.ParentContext.SharedVariables`. For all other messages, SharedVariables flow directly across stages.

The `"tag"` key is reserved: values set via `OrganizationRequest["tag"]` or the Web API `tag` query parameter are accessible as `context.SharedVariables["tag"]` and are **immutable** within plugin code.

---

## 6. Sandbox rules for Dataverse online plugins

**Dataverse online mandates sandbox isolation (mode 2)**. Full trust (mode 1) is available only for on-premises Dynamics 365 CE deployments.

### Hard resource constraints

| Constraint | Value |
|---|---|
| Total synchronous pipeline timeout | **2 minutes** (all sync plugins + core operation combined) |
| Recommended per-plugin execution time | **≤ 2 seconds** |
| Assembly size limit | **16 MB** |
| Message payload size limit | **116.85 MB** (error code -2147220970 if exceeded) |
| Trace log per execution | **10 KB** (older lines truncated) |
| Trace log retention | **24 hours** |
| Pipeline depth limit | **8** (configurable on-premises via `WorkflowSettings.MaxDepth`) |
| .NET Framework target | **4.6.2** (4.8 runtime planned June 2026) |
| TLS requirement | **TLS 1.2** minimum |

### Permitted vs. blocked operations

| Category | Permitted | Blocked |
|---|---|---|
| **Dataverse access** | `IOrganizationService` (all 8 methods) | Dataverse Web API from plugin code |
| **Network calls** | `HttpClient`, `WebClient` over HTTP/HTTPS with DNS name resolution | Localhost/loopback, raw IP addresses, non-HTTP protocols |
| **Azure integration** | Azure Service Bus/Event Hub via `IServiceEndpointNotificationService` | Direct Azure SDK calls requiring blocked APIs |
| **File system** | ❌ Completely blocked | Read, write, enumerate—all blocked |
| **Registry** | ❌ Completely blocked | — |
| **Threading** | Single-threaded execution only | `Parallel.ForEach`, `Task.Run`, multi-threaded patterns—all unsupported |
| **AppDomain** | No event registration allowed | `AppDomain.CurrentDomain` events unreliable |
| **Reflection** | Limited (standard .NET reflection works) | Low-level Windows API interop blocked |
| **Data schema changes** | ❌ in synchronous plugins | Creating/modifying tables or columns |
| **Batch operations** | ❌ `ExecuteMultipleRequest` / `ExecuteTransactionRequest` not supported in plugin context | — |

### External web call requirements

External HTTP/HTTPS calls must target named web addresses (not IP addresses), set `Timeout` explicitly (recommended: 15 seconds), and set `ConnectionClose = true` (KeepAlive false). The target server must support current TLS and cipher suites and accept connections from the `PowerPlatformPlex` service tag IP ranges. Force synchronous execution using `.GetAwaiter().GetResult()` instead of `await`.

---

## 7. Entity model patterns and the type conversion cheatsheet

### Late-bound vs. early-bound decision tree

```
Does the plugin operate on a KNOWN, FIXED set of entities?
├── YES → Do you need compile-time safety and IntelliSense?
│         ├── YES → Use EARLY-BOUND (pac modelbuilder build)
│         └── NO  → Late-bound is acceptable
└── NO (generic plugin, works across entities) → Use LATE-BOUND (Entity class)
```

**Early-bound** classes are generated via `pac modelbuilder build` (recommended) or the legacy `CrmSvcUtil.exe`. Key `pac modelbuilder` flags: `--entitynamesfilter` (always specify—omitting generates all tables), `--emitfieldsclasses` (generates attribute name constants), `--suppressINotifyPattern` (recommended unless building WPF). Generated classes inherit from `Entity` and can always be used interchangeably with late-bound code via `entity.ToEntity<Account>()`.

**Performance note:** Early-bound has slight overhead from `OnPropertyChanging`/`OnPropertyChanged` notifications; suppress with `--suppressINotifyPattern` for plugin use.

### Dataverse type mapping cheatsheet

| Dataverse Column Type | C# SDK Type | Namespace | Safe Access Pattern |
|---|---|---|---|
| Lookup | `EntityReference` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<EntityReference>("field")?.Id` |
| Choice (Option Set) | `OptionSetValue` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<OptionSetValue>("field")?.Value` |
| Choices (Multi-Select) | `OptionSetValueCollection` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<OptionSetValueCollection>("field")` |
| Currency | `Money` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<Money>("field")?.Value` |
| Unique Identifier | `Guid` | `System` | `entity.Id` or `entity.GetAttributeValue<Guid>("field")` |
| Whole Number | `int` (`int?` early-bound) | `System` | `entity.GetAttributeValue<int>("field")` (returns 0 if missing) |
| Floating Point | `double` (`double?` early-bound) | `System` | `entity.GetAttributeValue<double>("field")` |
| Decimal | `decimal` (`decimal?` early-bound) | `System` | `entity.GetAttributeValue<decimal>("field")` |
| Two Options (Boolean) | `bool` (`bool?` early-bound) | `System` | `entity.GetAttributeValue<bool>("field")` |
| Date and Time | `DateTime` (`DateTime?` early-bound) | `System` | `entity.GetAttributeValue<DateTime?>("field")` — always UTC |
| Text / Memo | `string` | `System` | `entity.GetAttributeValue<string>("field")` |
| Aliased Value (joins) | `AliasedValue` | `Microsoft.Xrm.Sdk` | `((AliasedValue)entity["alias.field"]).Value` — cast inner value |
| Activity Party (To, CC) | `EntityCollection` | `Microsoft.Xrm.Sdk` | Contains `activityparty` entities with `partyid` (EntityReference) |
| Managed Property | `BooleanManagedProperty` | `Microsoft.Xrm.Sdk` | `.Value` (bool), `.CanBeChanged` (bool) |

**Critical null-safety rule:** `entity.GetAttributeValue<T>("name")` returns `default(T)` when the key is absent (null for reference types, 0 for value types). The indexer `entity["name"]` throws `KeyNotFoundException` if absent. Always prefer `GetAttributeValue<T>` or check `entity.Contains("name")` before using the indexer.

**FormattedValues** are server-generated display strings available only on retrieved entities: `entity.FormattedValues["statuscode"]` returns the label text (e.g., "Active"). Use `entity.FormattedValues.ContainsKey()` for safe access.

### Assembly versioning and plugin packages

Assemblies for Dataverse online must use **Database** storage and **Sandbox** isolation. Strong naming (SNK signing) is required for standalone assemblies but **not required** when using plugin packages.

**Version resolution rules:**

| Version Change | Behavior |
|---|---|
| Build or Revision change (1.0.0.0 → 1.0.1.0) | **In-place upgrade**—old version replaced, steps auto-re-pointed |
| Major or Minor change (1.0.0.0 → 1.1.0.0) | **New assembly**—old version persists, steps must be manually migrated |

**Plugin packages** (`.nupkg`) are the modern, supported approach for dependency management. They store assemblies in the `PluginPackage` table (file storage), support unsigned assemblies, and replace the unsupported ILMerge pattern. Microsoft explicitly states: **"We don't support ILMerge."** Package name and version cannot be changed once created. Maximum: 16 MB per package, 50 assemblies.

---

## 8. Architectural decision trees

### Sync vs. async execution mode

```
Does the plugin enforce data integrity or validation rules?
├── YES → SYNCHRONOUS
│         ├── Is it pure validation (reject bad input)?
│         │   └── YES → PreValidation (Stage 10) — cheapest cancellation
│         └── Does it modify entity values before save?
│             └── YES → PreOperation (Stage 20)
└── NO
    ├── Is the operation critical (must succeed for business logic)?
    │   ├── YES → SYNCHRONOUS PostOperation (Stage 40)
    │   └── NO  → ASYNCHRONOUS PostOperation (Stage 40)
    └── Does it call external services or perform heavy processing?
        └── YES → ASYNCHRONOUS PostOperation (Stage 40)
```

### Pre vs. post operation stage selection

```
What does the plugin need to do?
├── REJECT invalid operations → PreValidation (10)
│   Cheapest cancellation, outside transaction
├── MODIFY entity values before save → PreOperation (20)
│   Changes to InputParameters["Target"] are persisted
├── READ the ID of a newly created record → PostOperation (40)
│   OutputParameters["id"] available only here
├── CREATE related records after main operation → PostOperation (40, sync)
│   Within transaction, rolls back together if error
├── SEND notifications or call external APIs → PostOperation (40, async)
│   Outside transaction, no user wait, retry support
└── MODIFY query results before return → PreOperation (20) for RetrieveMultiple
    Modify the Query in InputParameters, or PostOperation to filter OutputParameters
```

### Filtering attributes usage decision

```
Is the plugin registered on the Update message?
├── YES → ALWAYS set filtering attributes
│         ├── List ONLY the columns your logic depends on
│         ├── NEVER include the primary key (always present, negates filter)
│         └── Note: triggers on attribute PRESENCE, not value change
└── NO → Filtering attributes do not apply (only Update-related messages)
```

---

## 9. Ten common architectural mistakes with root causes

**1. Mutable state in class fields.** The platform caches and reuses plugin instances across concurrent threads. Storing `IOrganizationService`, `IPluginExecutionContext`, or any per-invocation data in fields causes race conditions and data corruption. **Fix:** Declare all per-invocation state as local variables within `Execute`.

**2. Missing filtering attributes on Update steps.** Without filtering, the plugin fires on every Update regardless of which columns changed. With auto-save in model-driven apps, this means execution on every field focus change. **Fix:** Always register filtering attributes for Update-triggered steps; list only the columns your logic inspects.

**3. Synchronous plugins exceeding 2 seconds.** Sync plugins block the user's request. The hard pipeline limit is 2 minutes total for all sync plugins combined. Heavy sync plugins cause timeouts, rollbacks, and poor user experience. **Fix:** Move heavy operations (external calls, complex calculations, bulk processing) to asynchronous PostOperation.

**4. Throwing exceptions other than `InvalidPluginExecutionException`.** Any unhandled exception that is not `InvalidPluginExecutionException` produces a generic "An unexpected error occurred from ISV code" message with no diagnostic value. **Fix:** Wrap all logic in try-catch; throw `new InvalidPluginExecutionException("descriptive message")` with actionable error text.

**5. Self-triggering infinite loops.** A plugin on Update that performs an Update on the same entity re-enters the pipeline recursively until the depth limit (8) is hit, then fails. **Fix:** Use filtering attributes so the plugin's own Update writes to different columns than it monitors. Alternatively, set a SharedVariables flag and check it on re-entry.

**6. Retrieving data already available in context.** Making a Retrieve call to get the current record's attributes when those attributes are already in `InputParameters["Target"]` or in a registered PreEntityImage wastes a service call and adds latency. **Fix:** Use `context.InputParameters["Target"]` for changed values and registered images for unchanged values.

**7. Confusing `UserId` and `InitiatingUserId`.** `UserId` reflects the impersonated user (set during step registration); `InitiatingUserId` is the actual user who triggered the action. Using the wrong one for security-sensitive operations leads to privilege escalation or access failures. **Fix:** Use `InitiatingUserId` when auditing who performed an action; use `UserId` for service calls that should respect the configured execution identity.

**8. Default entity image column selection.** Registering images with all columns selected causes the platform to retrieve the entire record at every invocation, adding significant database overhead. **Fix:** Select only the specific columns your plugin logic requires.

**9. Using `ExecuteMultipleRequest` or `ExecuteTransactionRequest` inside plugins.** These batch operations are explicitly unsupported in the plugin context and can cause unpredictable failures. **Fix:** Execute operations individually via `IOrganizationService` methods.

**10. Hardcoding GUIDs.** Record GUIDs differ across environments (dev, test, production). Hardcoded GUIDs break during solution transport. **Fix:** Use unsecure/secure configuration strings, environment variables, or dynamic queries to resolve record identifiers at runtime.

---

## 10. Cited sources

All claims in this document are sourced from Microsoft Learn (learn.microsoft.com) and official Microsoft SDK documentation.

| Topic | URL |
|---|---|
| Event framework (pipeline stages, transactions) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/event-framework |
| Write a plug-in (IPlugin, constructors, stateless) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-plug-in |
| Understand the execution context | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/understand-the-data-context |
| Register a plug-in (PRT, steps, images, config) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/register-plug-in |
| IPluginExecutionContext interface | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.ipluginexecutioncontext?view=dataverse-sdk-latest |
| IOrganizationService interface | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/iorganizationservice-interface |
| IOrganizationServiceFactory.CreateOrganizationService | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.iorganizationservicefactory.createorganizationservice?view=dataverse-sdk-latest |
| ITracingService and logging | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/logging-tracing |
| ILogger (Application Insights) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/application-insights-ilogger |
| Handle exceptions (InvalidPluginExecutionException) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/handle-exceptions |
| Access external web services (sandbox HTTP) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/access-web-services |
| Build and package plugins (dependent assemblies) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/build-and-package |
| Entity operations (late-bound) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/entity-operations |
| Early-bound programming | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/early-bound-programming |
| Generate early-bound classes | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/generate-early-bound-classes |
| pac modelbuilder reference | https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/modelbuilder |
| Scalable customization design: transactions | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/scalable-customization-design/database-transactions |
| Analyze plug-in performance | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/analyze-performance |
| Optimize assembly development (16 MB limit) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/optimize-assembly-development |
| Supported customizations (.NET 4.6.2, TLS) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/supported-customizations |
| PluginAssembly entity reference | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/pluginassembly |
| IExecutionContext.Depth (infinite loop protection) | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.iexecutioncontext.depth?view=dataverse-sdk-latest |
| Stateless plugin best practice | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/develop-iplugin-implementations-stateless |
| Filtering attributes best practice | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/include-filtering-attributes-plugin-registration |
| Do not use parallel execution | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/do-not-use-parallel-execution-in-plug-ins |
| Asynchronous service | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/asynchronous-service |
| Write plug-in for CreateMultiple/UpdateMultiple (v4) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-plugin-multiple-operation |
| Azure-aware plugin | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-custom-azure-aware-plugin |
| Multi-select option sets | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/multi-select-picklist |
| DateTime behavior and format | https://learn.microsoft.com/en-us/power-apps/maker/data-platform/behavior-format-date-time-field |
| ActivityParty entity | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/activityparty-entity |
| Tutorial: Update a plug-in (versioning) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/tutorial-update-plug-in |
| Web access from plugin sample | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/samples/web-access-plugin |
| Troubleshoot plug-in errors (payload limit) | https://learn.microsoft.com/en-us/troubleshoot/power-platform/dataverse/plug-in-execution/dataverse-plug-ins-errors |
| Use messages with the Organization service | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/use-messages |
| IPlugin interface reference | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.iplugin?view=dataverse-sdk-latest |
| EntityReference class reference | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.entityreference?view=dataverse-sdk-latest |
| AliasedValue class reference | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.aliasedvalue?view=dataverse-sdk-latest |
| OptionSetValue class reference | https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.optionsetvalue?view=dataverse-sdk-latest |
| Download tools from NuGet | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/download-tools-nuget |
| Business logic best practices index | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/ |