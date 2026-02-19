# Custom API plug-in class (end-to-end)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 481-555
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > Custom API implementation

---

### Custom API plug-in class (end-to-end)

Custom APIs pass inputs via `IPluginExecutionContext.InputParameters` and outputs via `OutputParameters`. citeturn15view0 The plug-in below uses typed extraction and explicit output population.

```csharp
#nullable enable
using System;
using Microsoft.Xrm.Sdk;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Plugins.CustomApi
{
    /// <summary>
    /// Custom API plug-in example.
    /// Inputs:
    /// - "Amount" (decimal)
    /// - "Rate" (decimal)
    /// Outputs:
    /// - "Tax" (decimal)
    /// - "Total" (decimal)
    /// </summary>
    public sealed class CalculateTaxCustomApiPlugin : PluginBase
    {
        public CalculateTaxCustomApiPlugin(string? unsecureConfig = null, string? secureConfig = null)
            : base(unsecureConfig, secureConfig) { }

        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            // Custom API execution arrives as a message; in Dataverse this is usually the Custom API unique name.
            // [Inference] The exact message name equals the Custom API unique name configured in Dataverse.
            const string customApiMessageName = "contoso_CalculateTax";

            if (!string.Equals(ctx.MessageName, customApiMessageName, StringComparison.Ordinal))
                return;

            // Custom API plug-ins often run in main operation stage; still protect against recursion
            if (PluginGuards.ExceedsDepth(ctx, maxDepth: 2))
                return;

            // Typed input extraction
            if (!ctx.InputParameters.TryGet(CustomApiParameterKeys.Amount, out decimal amount))
                throw new InvalidPluginExecutionException("Amount is required.");

            if (!ctx.InputParameters.TryGet(CustomApiParameterKeys.Rate, out decimal rate))
                throw new InvalidPluginExecutionException("Rate is required.");

            if (amount < 0m)
                throw new InvalidPluginExecutionException("Amount must be zero or positive.");

            if (rate is < 0m or > 1m)
                throw new InvalidPluginExecutionException("Rate must be between 0 and 1 (for example 0.15).");

            var tax = decimal.Round(amount * rate, 2, MidpointRounding.AwayFromZero);
            var total = amount + tax;

            // Typed output population
            ctx.OutputParameters[CustomApiParameterKeys.Tax] = tax;
            ctx.OutputParameters[CustomApiParameterKeys.Total] = total;

            services.Tracing.Trace("[CalculateTaxCustomApiPlugin] Calculated tax={0} total={1}.", tax, total);
        }
    }

    public static class CustomApiParameterKeys
    {
        public const string Amount = "Amount";
        public const string Rate = "Rate";
        public const string Tax = "Tax";
        public const string Total = "Total";
    }
}
```
