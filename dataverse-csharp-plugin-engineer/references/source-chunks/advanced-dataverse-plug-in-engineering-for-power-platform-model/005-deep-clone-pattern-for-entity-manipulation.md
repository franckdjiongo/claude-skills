# Deep-clone pattern for entity manipulation

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 86-147
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Advanced plug-in patterns

---

### Deep-clone pattern for entity manipulation

Dataverse plug-ins receive “late-bound” `Entity` instances via `InputParameters` (for example `Target`). citeturn8view0 When using early-bound types, Microsoft explicitly warns you **must not set** `context.InputParameters["Target"]` to a new early-bound instance because it causes a `SerializationException`. citeturn33view0

Practical “deep clone” goal: avoid cross-step side effects by creating a working copy of attributes, then applying controlled changes back to `Target` (in PreOperation) or via an explicit `Update` (in PostOperation/async) [Inference]. Microsoft doesn’t prescribe a single clone method, but the constraints above and the stage rules imply the safest approach is:

* In PreOperation, mutate `Target` directly but based on a **copied attribute map** so your logic is not disrupted by later modifications within the same method.
* When you need an immutable snapshot for audit/tracing or for downstream steps, serialize a safe subset into SharedVariables as a string. citeturn8view0  

**Template: attribute copy + controlled apply**

```csharp
using System;
using System.Collections.Generic;
using Microsoft.Xrm.Sdk;

public static class EntityClone
{
    // “Deep enough” clone for plug-in mutation logic: copy attribute dictionary values.
    // For reference-type attribute values, treat them as immutable or clone as needed.
    public static Dictionary<string, object?> CloneAttributes(Entity entity)
    {
        var copy = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in entity.Attributes)
        {
            copy[kvp.Key] = kvp.Value; // OptionSetValue, Money, EntityReference are reference types; treat carefully.
        }
        return copy;
    }

    public static void ApplyAttributes(Entity target, IDictionary<string, object?> newValues)
    {
        foreach (var kvp in newValues)
        {
            if (kvp.Value == null)
                target.Attributes.Remove(kvp.Key);
            else
                target[kvp.Key] = kvp.Value;
        }
    }
}

public sealed class PreOperation_EnrichWithClone : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
        var target = (Entity)context.InputParameters["Target"];

        var attrs = EntityClone.CloneAttributes(target);

        // Work against attrs (safe copy)
        attrs["new_normalizedname"] = ((string?)attrs.GetValueOrDefault("name"))?.Trim();

        // Apply back to Target (supported in PreOperation per pipeline guidance)
        EntityClone.ApplyAttributes(target, attrs);
    }
}
```

This avoids prohibited patterns like replacing `Target` with an early-bound object. citeturn33view0turn8view0
