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
