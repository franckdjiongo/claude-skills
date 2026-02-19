# Complete IPluginExecutionContext property table (v1 base)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 139-170
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

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
