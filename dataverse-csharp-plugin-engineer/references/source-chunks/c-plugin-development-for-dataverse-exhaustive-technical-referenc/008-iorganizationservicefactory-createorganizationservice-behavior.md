# IOrganizationServiceFactory.CreateOrganizationService behavior

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 102-109
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

### IOrganizationServiceFactory.CreateOrganizationService behavior

| userId parameter | Execution identity |
|---|---|
| `null` | **SYSTEM** user (full privileges) |
| `Guid.Empty` | Same user as `context.UserId` (calling/impersonated user) |
| Specific `Guid` | That specific system user (impersonation) |
