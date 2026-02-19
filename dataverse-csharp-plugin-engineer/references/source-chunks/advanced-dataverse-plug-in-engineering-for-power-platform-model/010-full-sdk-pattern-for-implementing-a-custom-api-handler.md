# Full SDK pattern for implementing a Custom API handler

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 195-265
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Custom API reference

---

### Full SDK pattern for implementing a Custom API handler

The handler is a standard `IPlugin` implementation reading from `InputParameters` and writing to `OutputParameters`, as Microsoft describes. citeturn9view0turn8view0turn33view0

Below is an agent-grade template that supports Global or Entity-bound APIs, includes strict parameter validation, and emits trace logs.

```csharp
using System;
using System.ServiceModel;
using Microsoft.Xrm.Sdk;

public sealed class CustomApi_Handler : IPlugin
{
    // Contract constants should match Custom API parameter unique names.
    private const string Param_Target = "Target";            // implicit when BindingType=Entity
    private const string Param_Input = "InputParameter";     // example request parameter
    private const string Out_Result = "Result";              // example response property

    public void Execute(IServiceProvider serviceProvider)
    {
        var ctx = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
        var trace = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

        // Note: Don’t authenticate; Dataverse preauthenticates plug-in execution. citeturn33view0
        var svcFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
        var svc = svcFactory.CreateOrganizationService(ctx.UserId);

        try
        {
            trace.Trace("CustomApi_Handler start. Message={0}, CorrelationId={1}", ctx.MessageName, ctx.CorrelationId);

            // Inputs come via InputParameters. citeturn9view0turn8view0
            // Example: optional EntityReference target for entity-bound API
            EntityReference? target = null;
            if (ctx.InputParameters.Contains(Param_Target))
            {
                target = ctx.InputParameters[Param_Target] as EntityReference;
            }

            var input = ctx.InputParameters.Contains(Param_Input) ? (string?)ctx.InputParameters[Param_Input] : null;
            if (string.IsNullOrWhiteSpace(input))
                throw new InvalidPluginExecutionException("InputParameter is required.");

            // Business logic [placeholder]
            var output = $"Echo({input.Trim()})";

            // Output values are returned via OutputParameters. citeturn9view0turn8view0
            ctx.OutputParameters[Out_Result] = output;

            trace.Trace("CustomApi_Handler success. Target={0}, ResultLength={1}",
                target?.Id.ToString() ?? "<none>", output.Length);
        }
        catch (FaultException<OrganizationServiceFault> ex)
        {
            trace.Trace("CustomApi_Handler OrgServiceFault: {0}", ex.ToString());
            throw new InvalidPluginExecutionException("Dataverse service fault in Custom API.", ex);
        }
        catch (InvalidPluginExecutionException)
        {
            // Preserve intended user-facing messages.
            throw;
        }
        catch (Exception ex)
        {
            trace.Trace("CustomApi_Handler unexpected error: {0}", ex.ToString());
            throw;
        }
    }
}
```
