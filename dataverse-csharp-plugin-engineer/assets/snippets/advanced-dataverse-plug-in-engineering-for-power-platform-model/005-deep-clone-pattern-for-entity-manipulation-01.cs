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
