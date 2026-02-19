# Passing data between steps via SharedVariables

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 21-85
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Advanced plug-in patterns

---

### Passing data between steps via SharedVariables

Microsoft defines `SharedVariables` as a `ParameterCollection` used to pass data from a plug-in (or API) to a later step, and provides sample code for PreOperation → PostOperation handoff. citeturn8view0 Key constraints:

* Anything stored must be **serializable** or execution fails. citeturn8view0  
* For PreOperation/PostOperation steps needing SharedVariables produced in **PreValidation** for certain messages (Create/Update/Delete/RetrieveExchangeRateRequest), you must read from `ParentContext.SharedVariables` rather than `context.SharedVariables`. citeturn8view0  
* An API caller can introduce a shared variable using the `tag` keyword; it appears in shared variables as key `tag` and is immutable. citeturn8view0  

**Template: “chain contract” with SharedVariables**

```csharp
using System;
using Microsoft.Xrm.Sdk;

public static class ChainContract
{
    // Keep SharedVariables keys stable. Names are part of your runtime contract.
    public const string CorrelationKey = "fg.chain.correlation";
    public const string ValidationPassedKey = "fg.chain.validationPassed";
    public const string EnrichmentSnapshotKey = "fg.chain.enrichmentSnapshotJson"; // serializable string
}

public sealed class PreValidation_Guard : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

        // Add a correlation id for downstream steps to use in tracing (string is serializable).
        context.SharedVariables[ChainContract.CorrelationKey] = context.CorrelationId.ToString();

        // Validate early (PreValidation recommended for cancellation scenarios).
        // If invalid:
        // throw new InvalidPluginExecutionException("Business rule violated: ...");  // cancels operation
        context.SharedVariables[ChainContract.ValidationPassedKey] = true;
    }
}

public sealed class PreOperation_Enrich : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

        // If this step needs variables set by PreValidation for Create/Update/Delete,
        // read ParentContext.SharedVariables per Microsoft guidance.
        var vars = context.ParentContext?.SharedVariables ?? context.SharedVariables;

        if (!(vars.Contains(ChainContract.ValidationPassedKey) && (bool)vars[ChainContract.ValidationPassedKey]))
        {
            // Fail fast; treat as contract violation in chain configuration.
            throw new InvalidPluginExecutionException("Pipeline contract violated: validation flag missing/false.");
        }

        // Enrich target safely here (PreOperation is in transaction).
        var target = (Entity)context.InputParameters["Target"];
        // ... mutate target attributes ...
        // Stash serializable snapshot for PostOperation
        vars[ChainContract.EnrichmentSnapshotKey] = "{ \"enriched\": true }";
    }
}
```

This pattern relies on Microsoft’s documented behavior for `SharedVariables` and `ParentContext`. citeturn8view0turn7search1
