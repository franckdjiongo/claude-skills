# 9. Ten common architectural mistakes with root causes

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 399-422
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference

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
