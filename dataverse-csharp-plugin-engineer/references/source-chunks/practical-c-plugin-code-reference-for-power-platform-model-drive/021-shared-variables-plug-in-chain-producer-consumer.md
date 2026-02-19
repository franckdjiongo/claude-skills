# Shared variables plug-in chain (producer + consumer)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 1149-1227
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > External call and chaining patterns

---

### Shared variables plug-in chain (producer + consumer)

Shared variables may be used to pass serializable data to later pipeline steps. citeturn15view0 For PreValidation → Pre/Post access on common messages, Microsoft notes that later steps may need to read `ParentContext.SharedVariables`. citeturn15view0

```csharp
#nullable enable
using System;
using System.Text.Json;
using Microsoft.Xrm.Sdk;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Plugins.Shared
{
    public static class SharedVariableKeys
    {
        public const string CalculationJson = "contoso.calc.json";
        public const string PrimaryContactId = "PrimaryContact";
    }

    public sealed class SharedVariablesProducerPlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Create || ctx.PrimaryEntityName != "account")
                return;

            var calc = new CalculationResult(
                TimestampUtc: DateTimeOffset.UtcNow,
                CorrelationId: ctx.CorrelationId,
                Value: 42);

            // Pattern: complex object -> serialize to JSON string (serializable)
            var json = JsonSerializer.Serialize(calc);
            ctx.SharedVariables[SharedVariableKeys.CalculationJson] = json;

            // Primitive example
            ctx.SharedVariables[SharedVariableKeys.PrimaryContactId] = "74882d5c-381a-4863-a5b9-b8604615c2d0";
        }

        public readonly record struct CalculationResult(DateTimeOffset TimestampUtc, Guid CorrelationId, int Value);
    }

    public sealed class SharedVariablesConsumerPlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Create || ctx.PrimaryEntityName != "account")
                return;

            var bag = GetSharedVariablesBag(ctx);

            if (!bag.TryGetValue(SharedVariableKeys.CalculationJson, out var jsonObj) || jsonObj is not string json)
                return; // nothing to consume

            var calc = JsonSerializer.Deserialize<SharedVariablesProducerPlugin.CalculationResult>(json);

            services.Tracing.Trace("[SharedVariablesConsumerPlugin] calc value={0} corr={1}", calc.Value, calc.CorrelationId);
        }

        private static ParameterCollection GetSharedVariablesBag(IPluginExecutionContext ctx)
        {
            // Microsoft guidance: in some PreValidation->Pre/Post scenarios,
            // later steps must access ParentContext.SharedVariables. citeturn15view0
            // Here we use the parent bag when present and non-empty.
            if (ctx.ParentContext != null && ctx.ParentContext.SharedVariables != null && ctx.ParentContext.SharedVariables.Count > 0)
                return ctx.ParentContext.SharedVariables;

            return ctx.SharedVariables;
        }
    }
}
```

Critical platform rule: **shared variable values must be serializable** or plug-in execution will fail. citeturn15view0
