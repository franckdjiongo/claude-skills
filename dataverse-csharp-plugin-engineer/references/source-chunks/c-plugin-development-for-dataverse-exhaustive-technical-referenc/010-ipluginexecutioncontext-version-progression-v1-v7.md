# IPluginExecutionContext version progression (v1–v7)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 125-138
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

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
