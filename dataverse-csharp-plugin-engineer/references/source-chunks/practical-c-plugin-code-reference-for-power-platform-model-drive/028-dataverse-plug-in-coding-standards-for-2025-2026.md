# Dataverse plug-in coding standards for 2025/2026

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 1525-1550
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > Coding standards cheatsheet and cited sources

---

### Dataverse plug-in coding standards for 2025/2026

Standards below are tuned to Dataverse plug-in constraints (stateless execution, net462, sandbox restrictions).

| Rule | Compliant | Non-compliant |
|---|---|---|
| Nullable reference types | `#nullable enable` + explicit null guards | Implicit nulls, `NullReferenceException` risk |
| Stateless plug-in classes | No per-invocation stored state; use services from context each call citeturn18search0turn8view0 | Storing `IOrganizationService` or context in fields |
| Exceptions for validation | `throw new InvalidPluginExecutionException("User-actionable message")` citeturn18search1turn18search20 | Throwing raw `Exception`, HTML messages, swallowing faults |
| Async in plug-ins | Sync wrapper: `SendAsync(...).GetAwaiter().GetResult()` for `HttpClient` citeturn14view1 | `async void Execute(...)` or `await` inside `Execute` |
| Parameter keys and messages | Central constants for `"Target"`, `"Create"`, etc citeturn15view0 | Magic strings scattered |
| JSON in plug-ins | Prefer `System.Text.Json`, but include it in plug-in package due to sandbox version mismatch citeturn9view0 | Relying on sandbox `System.Text.Json` without packaging |
| SharedVariables | Store only serializable values; use ParentContext when required citeturn15view0 | Putting non-serializable objects into SharedVariables |

Side-by-side snippet example:

```csharp
// compliant
#nullable enable
if (!context.InputParameters.Contains("Target"))
    throw new InvalidPluginExecutionException("Target parameter is missing.");

// non-compliant
var target = (Entity)context.InputParameters["Target"]; // throws KeyNotFoundException / InvalidCast at runtime
```
