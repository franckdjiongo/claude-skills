# Advanced Dataverse plug-in engineering for Power Platform model-driven apps

## Executive summary

A Claude Code agent maintaining Dataverse C# plug-ins must treat the plug-in “event framework” as a staged pipeline where multiple steps can run per message and where synchronous stages inside the database transaction can roll back the whole operation on exception. citeturn34view0 It must actively control step ordering (execution order/rank, lowest-to-highest) and treat same-rank ordering as non-deterministic, therefore never relying on accidental ordering. citeturn5view0turn3view1 It should use `SharedVariables` for intra-pipeline coordination, with strict serializability and `ParentContext.SharedVariables` nuances for certain PreValidation → Pre/Post access paths. citeturn8view0 Strong operational maturity requires a standard debugging toolkit: plug-in profiler capture/replay, attaching Visual Studio to `PluginRegistration.exe`, and systematic trace-log interpretation (sync + async). citeturn17view0turn16search0turn26search6 For ALM/CI, plug-ins must be solution-aware, deployed as managed to downstream environments, and versioned correctly (assembly version semantics + solution version strategy) to avoid orphaned steps and layering surprises. citeturn5view0turn23view0 Production reliability demands telemetry (Application Insights integration + optional in-plug-in custom telemetry) and failure alerting tied to `PluginTraceLog` and `AsyncOperation` (system jobs). citeturn25search0turn25search15turn26search0turn16search6

## Advanced plug-in patterns

### Pipeline mental model, chains, and deterministic ordering

Dataverse processes each message through pipeline stages (PreValidation, PreOperation, MainOperation [internal], PostOperation). citeturn34view0 You can register multiple plug-in steps on the same message and stage; Dataverse will execute them according to **Execution Order** (aka step rank), from **lowest to highest**. citeturn5view0turn3view1 If multiple plug-ins share the same Execution Order for the same stage/message/table, Microsoft explicitly warns the actual order “isn’t guaranteed and can be random”, so any dependency must be made explicit via ordering or via SharedVariables/contracts. citeturn5view0

Operational implications for a “plugin chain”:

* Prefer **one responsibility per step** (validation, enrichment, side effects) and pin them with a rank range convention (for example, 10–19 = validation, 20–39 = enrichment, 40–59 = orchestration, 90+ = integration) [Inference]. The key is that the **agent must enforce rank discipline** because order is a deployment-time property (`SdkMessageProcessingStep.rank`). citeturn3view1turn5view0  
* Place **data mutation** (changing the `Target` values) in **PreOperation** because it occurs within the transaction and is the recommended place to change values for an entity in the message. citeturn34view0turn8view0  
* Place **cancellation/validation** in **PreValidation** when possible. Microsoft explicitly warns that cancelling in PreOperation causes rollback and “significant performance impact”, and recommends throwing `InvalidPluginExecutionException` in PreValidation to cancel. citeturn34view0turn8view0  
* Treat **PostOperation** synchronous steps as “still in transaction”; avoid updating the same entity in the handler because this triggers a new Update event. citeturn34view0  
* Remember that plug-ins and workflows registered for **Update can be called twice in certain cases** (specialized update operations); robust chains must be idempotent. citeturn34view0  

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

### Rollback strategies in synchronous pipelines

Synchronous plug-ins registered in PreOperation/PostOperation can be **inside the database transaction**; Microsoft’s guidance explicitly states that an exception thrown at any synchronous stage within the transaction will roll back the entire transaction. citeturn34view0turn1search1 Additionally, PreValidation may be outside transaction for the initial operation, but can be in-transaction when called as a subsequent operation inside another customization path. citeturn1search10turn34view0

Agent-grade rollback strategies:

* Use **PreValidation** to detect “business veto” and throw `InvalidPluginExecutionException` early. citeturn34view0turn8view0  
* In **PreOperation/PostOperation (sync)**, treat *any* side effect that can’t be rolled back (HTTP calls, external writes) as dangerous; if necessary, move into async or use a business-event pattern. citeturn26search9turn14view0  
* Keep synchronous logic short to reduce lock duration. Microsoft notes synchronous extensions (plug-ins and synchronous workflows) extend transaction length and lock duration. citeturn1search1turn26search9  
* If PostOperation sync must create related records and you want rollback semantics, do it there; but avoid updating the same entity in message to prevent new Update triggers. citeturn34view0turn1search10  

## Custom API reference

### How Custom APIs differ from classic plug-in messages

A Custom API creates a **new Dataverse message** invokable via Web API or SDK for .NET, comparable to built-in messages (Create/Update/etc.). citeturn9view0turn34view0 The key differences versus classic “table event” messages:

* **Registration model**: You define the Custom API and its request/response metadata as Dataverse rows (`CustomAPI`, request parameters, response properties). citeturn9view0turn10view0  
* **Binding**: Custom API BindingType can be:
  * Global (unbound)
  * Entity (bound to a single record, implicit `Target` EntityReference created automatically)
  * EntityCollection (bound to a collection) citeturn9view0  
* **Function vs action**: Custom API can be an OData Function (`GET`, must return at least one response property) or Action (`POST`). The Dataverse connector for Power Automate “only enables performing actions”, so if Power Automate must call it, prefer an Action. citeturn9view0  
* **Privileges**: You can require an existing privilege by setting `ExecutePrivilegeName`, but Microsoft notes developers can’t create new privileges (outside Microsoft); use an existing one. citeturn9view0  
* **Extensibility policy**: `AllowedCustomProcessingStepType` controls whether other plug-ins can register on your custom API message (None, Async Only, Sync and Async). Microsoft recommends “Async Only” when using the business events pattern. citeturn9view0turn14view0  
* **Main operation handler**: You can attach a plug-in type as the main operation (`PluginTypeId`). The handler reads request parameters from `InputParameters` and writes response properties to `OutputParameters`. citeturn9view0turn8view0  
* **Debugging caveat**: Profiler debugging of the “main operation” plug-in for Custom API isn’t currently supported in the PRT; Microsoft documents a workaround: register the plug-in on PostOperation for the custom API message so the profiler can target a step. citeturn9view0turn17view0  

### Registration-to-implementation guide

**Design and registration options (primary paths)**

1. **Power Apps (maker portal)**: create Custom API, then add request parameters and response properties. Microsoft warns many fields can’t be changed after creation; breaking changes may require delete/recreate. citeturn35search18turn9view0  
2. **Plug-in Registration Tool (designer)**: PRT includes a Custom API designer. citeturn0search17turn9view0  
3. **Code-first** (SDK/Web API): create Custom API rows programmatically; Microsoft provides an end-to-end sample that creates Custom API + parameter + response property in one operation and associates it to a solution using `SolutionUniqueName`. citeturn10view0  

**Parameter matrix (agent-ready quick reference)**

| Topic | Setting | Options | What it changes | Operational guidance |
|---|---|---|---|---|
| Binding | `BindingType` | Global / Entity / EntityCollection citeturn9view0 | URL shape, implicit parameters (`Target` auto-created for Entity) citeturn9view0 | Use Entity when operation is “about one row”; Global for cross-table operations. |
| Invocation type | `IsFunction` | Function (`GET`) / Action (`POST`) citeturn9view0 | HTTP verb, metadata visibility; Functions require response property citeturn9view0 | Prefer Action if Power Automate must call it. citeturn9view0 |
| Extensibility | `AllowedCustomProcessingStepType` | None / Async Only / Sync and Async citeturn9view0 | Whether others can add steps; whether they can cancel/modify behavior | For “business event” design, follow Microsoft’s Async Only guidance. citeturn9view0turn14view0 |
| Security | `ExecutePrivilegeName` | Existing privilege name citeturn9view0 | Who may invoke | Use existing privileges; you can’t create new ones (outside Microsoft). citeturn9view0 |
| Public surface | `IsPrivate` | true/false citeturn9view0 | Appears in `$metadata`; code generation eligibility | Keep private until stable; publish as public when committed. citeturn9view0 |
| Managed customization | `IsCustomizable` | true/false citeturn9view0turn10view0 | Whether consumers can modify definition | Microsoft recommends shipping managed and setting IsCustomizable false to prevent breaking edits. citeturn9view0turn10view0 |

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

## Debugging workflow

### Standard prerequisites: enable tracing safely

Dataverse tracing is provided through `ITracingService` and written to the `PluginTraceLog` table when trace logging is enabled. citeturn16search0turn16search4turn33view0 Microsoft warns trace logging consumes storage and should be turned on for troubleshooting, then turned off. citeturn16search5turn16search0

**Procedure (trace logging + trace viewer workflow)**  
1. Enable trace logging (per “View trace logs” from Microsoft’s logging/tracing guidance). citeturn16search5turn16search0  
2. Ensure your troubleshooting user has access to `PluginTraceLog` rows (tile appears only with privileges). citeturn16search0  
3. In plug-in code, emit trace lines with stable prefixes and include `CorrelationId` to correlate across steps and services. `CorrelationId` exists for tracking plug-in/workflow execution. citeturn7search0turn16search0  
4. For async failures, use the System Job record details; Microsoft states trace info is shown in the System Job form details for async plug-ins that throw exceptions. citeturn26search6  

### Plug-in profiler: capture + replay

Because online plug-ins execute on a remote server, you cannot attach a debugger to the server process; Microsoft’s supported approach is plug-in profiler capture + local replay. citeturn17view0turn16search5

**Capture**  
1. Install profiler (PRT or Power Platform Tools). Installing creates a managed solution named “Plug-in Profiler”. citeturn17view0  
2. In PRT, select the step and choose **Start Profiling**. citeturn17view0  
3. Trigger the event in the model-driven app; the profile is persisted as a “Plug-in Profile” row in Dataverse. citeturn17view0  

**Replay + debug**  
1. In PRT, choose **Debug** and select the captured profile. citeturn17view0  
2. Load your local assembly (the DLL you are debugging). citeturn17view0  
3. Set breakpoints in Visual Studio. citeturn17view0  
4. Start execution (see attachment methods below). citeturn17view0  

### Attaching Visual Studio debugger to Plugin Registration Tool

Microsoft documents attaching Visual Studio to the `PluginRegistration.exe` process during replay. citeturn17view0

**Procedure**  
1. In Visual Studio: Debug → Attach to Process. citeturn17view0  
2. Select `PluginRegistration.exe` and Attach. citeturn17view0  
3. In PRT replay dialog, click **Start Execution**; code should stop at your breakpoints. citeturn17view0  

### Remote debugging via captured logs / command prompt profiler mode

Microsoft describes running `PluginProfiler.Debugger.exe` from a Command Prompt with parameters to get a profile log (useful for customer environments), then replaying locally. citeturn17view0

**Procedure**  
1. On the machine with PRT tools, set working directory to `PluginRegistration.exe` folder. citeturn17view0  
2. Run `PluginProfiler.Debugger.exe /?` to view parameters and capture a profile. citeturn17view0  
3. Transfer the profile log to your dev machine and replay in PRT. citeturn17view0  

### Debugging asynchronous plug-ins

Asynchronous steps are queued and executed after the main operation completes. citeturn26search9 Dataverse serializes the context for async extensions and stores it in the System Job (`AsyncOperation`) table; the Async Service processes these jobs. citeturn26search0

**Agent procedure for async failures**  
1. Identify System Job:
   * Use `IExecutionContext.OperationId` (it corresponds to `AsyncOperationId`) when available to correlate. citeturn26search2  
   * Otherwise, query `AsyncOperation` (system jobs) for recent failures for the plug-in step. citeturn26search1turn26search0  
2. Extract details: for failed async plug-ins, tracing information appears in the System Job form details, and a log file can be downloaded. citeturn26search6  
3. Replay locally: if profiler-capture is feasible, capture the async step’s profile and replay. (Async steps still execute through the pipeline as synchronous operations when processed by the async service, but outside the original transaction.) citeturn26search0turn34view0  

## ALM and solution structure guide

### Solution-aware registration rules

When you register a plug-in assembly, it is stored in the `PluginAssembly` table; classes implementing `IPlugin` are registered. citeturn5view0turn33view0 Each assembly registration is added to the **Default Solution**, and you should add it to an unmanaged solution for distribution. citeturn5view0 Steps are not automatically added to the same unmanaged solution; you must add each step separately. citeturn5view0

Microsoft’s plug-in development guidance also includes: “Manage plug-ins in single solution” as a best practice. citeturn24view0

**Operational rule**: the agent should treat “solution membership” as part of plug-in correctness and verify that assemblies + steps belong to the expected solution before export/import [Inference], using the `SolutionId` fields on step records as needed. citeturn3view1turn2view0

### Managed vs unmanaged decision logic

Power Platform ALM documentation defines unmanaged solutions for development and managed solutions for distribution/testing/production. citeturn18search1 For Custom APIs specifically, Microsoft recommends shipping in a managed solution and setting the **Is Customizable** managed property to `false` to prevent consumers from altering or deleting the API definition, which could break dependent code. citeturn9view0turn10view0

**Decision tree (text)**  
If environment is dev (source of truth) → use unmanaged. citeturn18search1  
If environment is test/prod (downstream) → import managed, lock custom APIs (`IsCustomizable=false`) and avoid manual edits to plug-in registrations [Inference]. citeturn18search1turn9view0  

### Upgrade vs update strategy (solutions and plug-in assemblies)

For solutions, Microsoft provides explicit update/upgrade guidance (import options and version semantics). citeturn18search0turn23view0 For plug-in assemblies in managed solutions, Microsoft documents assembly version behavior:

* If only build or revision changes, importing updated solution performs an in-place upgrade: old assembly removed and steps updated to reference new version. citeturn5view0  
* If major or minor changes, Dataverse treats it as a different assembly; existing steps continue to reference the prior version until manually updated. citeturn5view0  

This is critical for autonomous agents: **a bump of major/minor without step migration is a production-breaking deployment** [Inference].

### Connection references and environment variables from plug-ins

Connection references are a solution component that allows apps/flows to bind to a connector connection reference rather than a direct connection. citeturn18search19turn18search3 Plug-in code typically doesn’t “use” a connection reference directly (it is a flow/app runtime concept), but plug-ins can support ALM by reading environment variables that store endpoints/keys used for outbound calls [Inference]. Environment variables are first-class solution components; Microsoft documents their use for ALM scenarios. citeturn19search0turn19search1turn19search6

Dataverse exposes environment variable definitions and values in `EnvironmentVariableDefinition` and `EnvironmentVariableValue` tables. citeturn19search6turn19search1 There is also a Web API function `RetrieveEnvironmentVariableValue` described as responsible for retrieving the corresponding value. citeturn20search0turn19search18

**Safe access pattern (in plug-ins): query tables** [Inference]
1. Query `EnvironmentVariableDefinition` by schema name/unique name. citeturn19search6  
2. Retrieve related `EnvironmentVariableValue` row(s) and use current value if present; fall back to default value stored on definition if absent. citeturn19search1turn19search6  

### Operational hardening: statelessness and shared instances

Microsoft explicitly states plug-in classes should be stateless because the platform caches and reuses plug-in instances and multiple threads can execute the same instance concurrently. citeturn33view0turn27search13 This affects how an agent refactors legacy code: any instance fields storing service/context across executions are correctness bugs, not stylistic issues. citeturn27search13turn24view0

## CI/CD pipeline reference

### Core deployment primitives (official tools only)

**Power Platform CLI (pac)** supplies:

* `pac plugin init` (create plug-in class library) and `pac plugin push` (import plug-in into Dataverse) citeturn21view0  
* `pac solution export/import/upgrade/version/create-settings` and `--stage-and-upgrade` and `--activate-plugins` flags. citeturn23view0  
* `pac solution create-settings` builds a deployment settings JSON for connection references + environment variables, and `pac solution import --settings-file` applies it. citeturn23view0turn19search3  

Power Platform GitHub Actions repository (official) provides reusable actions for solution export/build/deploy. citeturn22search1turn22search5 Azure DevOps Build Tools tasks are documented on Microsoft Learn. citeturn22search2turn19search3

### GitHub Actions YAML template (build, pack, deploy)

This template uses the official `microsoft/powerplatform-actions` approach suggested in Microsoft’s GitHub Actions ALM tutorial. citeturn22search5turn22search1

```yaml
name: build-and-deploy-solution-with-plugins

on:
  workflow_dispatch:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: checkout
        uses: actions/checkout@v4

      # Install PAC + dependencies using official Power Platform actions tooling.
      - name: install power platform tools
        uses: microsoft/powerplatform-actions/actions/install@v1

      # Authenticate to Dataverse (use service principal / federated creds in real pipelines).
      - name: whoami
        uses: microsoft/powerplatform-actions/actions/who-am-i@v1
        with:
          environment-url: ${{ secrets.DATAVERSE_URL }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          app-id: ${{ secrets.AZURE_CLIENT_ID }}
          client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}

      # Build plug-in .dll (plug-ins target .NET Framework 4.6.2). citeturn33view0
      - name: build plugin
        shell: pwsh
        run: |
          dotnet --info
          msbuild .\src\Plugins\Plugins.csproj /t:Build /p:Configuration=Release

      # Export solution from dev as unmanaged, then pack as managed for deployment.
      - name: export unmanaged solution
        uses: microsoft/powerplatform-actions/actions/export-solution@v1
        with:
          environment-url: ${{ secrets.DATAVERSE_URL }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          app-id: ${{ secrets.AZURE_CLIENT_ID }}
          client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
          solution-name: "contoso_core"
          solution-output-file: "${{ github.workspace }}\\out\\contoso_core_unmanaged.zip"
          managed: false

      - name: pack managed solution
        uses: microsoft/powerplatform-actions/actions/pack-solution@v1
        with:
          solution-file: "${{ github.workspace }}\\out\\contoso_core_unmanaged.zip"
          solution-folder: "${{ github.workspace }}\\out\\contoso_core"
          solution-type: "Managed"
          output-file: "${{ github.workspace }}\\out\\contoso_core_managed.zip"

      - name: upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: contoso_core_managed
          path: "${{ github.workspace }}\\out\\contoso_core_managed.zip"

  deploy:
    needs: build
    runs-on: windows-latest
    environment: production
    steps:
      - name: download artifact
        uses: actions/download-artifact@v4
        with:
          name: contoso_core_managed
          path: .\drop

      - name: install power platform tools
        uses: microsoft/powerplatform-actions/actions/install@v1

      - name: import managed solution
        uses: microsoft/powerplatform-actions/actions/import-solution@v1
        with:
          environment-url: ${{ secrets.PROD_DATAVERSE_URL }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          app-id: ${{ secrets.AZURE_CLIENT_ID }}
          client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
          solution-file: ".\\drop\\contoso_core_managed.zip"
          activate-plugins: true  # aligns with pac solution import --activate-plugins citeturn23view0
```

### Azure DevOps pipeline template (Build Tools tasks)

Microsoft’s Build Tools tasks include an installer task and import/export tasks; deployment settings files can pre-populate connection references and environment variables. citeturn22search2turn19search3 The Build Tools import-solution task supports “Activate Plugins” and “Stage and Upgrade”. citeturn22search6turn23view0

```yaml
trigger:
- main

pool:
  vmImage: 'windows-latest'

steps:
- checkout: self

# Install Power Platform Build Tools (required once before tasks). citeturn22search2
- task: PowerPlatformToolInstaller@2
  displayName: 'install power platform tools'

# Build plug-in project (target .NET Framework 4.6.2). citeturn33view0
- task: VSBuild@1
  displayName: 'build plugins'
  inputs:
    solution: 'src/Plugins/Plugins.sln'
    msbuildArgs: '/p:Configuration=Release'

# Export solution from dev
- task: PowerPlatformExportSolution@2
  displayName: 'export unmanaged from dev'
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'svc-connection-dev'
    SolutionName: 'contoso_core'
    SolutionOutputFile: '$(Build.ArtifactStagingDirectory)\contoso_core_unmanaged.zip'
    Managed: false

# Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6
- task: PowerPlatformImportSolution@2
  displayName: 'import managed to prod'
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'svc-connection-prod'
    SolutionInputFile: '$(Build.ArtifactStagingDirectory)\contoso_core_managed.zip'
    UseDeploymentSettingsFile: true
    DeploymentSettingsFile: 'deploy/prod.deploymentSettings.json'
    ActivatePlugins: true
    StageAndUpgrade: true
```

### Versioning strategies compatible with solution layering

* Use `pac solution version --strategy GitTags` (or other) to align solution build version with Git history; PAC CLI notes GitTags strategy uses `PacCli.PAT` token. citeturn23view0  
* For plug-in assemblies in managed solutions, treat assembly version as a deployment behavior switch: build/revision is an in-place upgrade; major/minor creates parallel assemblies and leaves existing steps pointing at the old one until updated. citeturn5view0  

## Legacy code refactoring guide

### Anti-pattern checklist (Microsoft-sourced items first)

The following are explicit Microsoft best-practice violations that an agent should detect and prioritise:

* Stateful `IPlugin` implementations: storing service/context in instance fields; risky because Dataverse caches plug-in instances and may run them concurrently. citeturn33view0turn27search13turn24view0  
* Duplicate plug-in step registration causing multiple executions on the same event. citeturn24view0turn5view0  
* Missing filtering attributes on Update steps, causing plug-in to execute on every Update and harm performance. citeturn5view0turn24view0  
* Registering heavy synchronous logic on Retrieve/RetrieveMultiple, causing slowness. citeturn24view0  
* Multi-threading/parallel execution inside plug-ins: not supported. citeturn24view0  
* Use of batch request types (`ExecuteMultipleRequest`, `ExecuteTransactionRequest`) inside plug-ins/workflow activities: explicitly discouraged. citeturn24view0  
* Writing code that depends on `Depth` or other loop-prevention internals; Microsoft states Depth is for platform loop prevention and business logic must not depend on a specific Depth value. citeturn6search0  
* Replacing `InputParameters["Target"]` with early-bound entity instances (causes serialization issues). citeturn33view0  
* Use of Web API from plug-ins: not supported; use Organization service (SDK for .NET). citeturn33view0  

### Safe refactoring sequence (agent-operational)

1. **Stabilise observability**: add structured `ITracingService` logging at start/end, include `CorrelationId`, and log key decisions (validation outcomes, branching). citeturn33view0turn16search0turn7search0  
2. **Reproduce with profiler**: capture failing or confusing scenarios and create a local replay harness; keep captured profiles as regression artefacts. citeturn17view0  
3. **Idempotence hardening**: remove implicit ordering dependencies; enforce execution order ranks and use `SharedVariables` contracts when multiple steps must coordinate. citeturn5view0turn8view0  
4. **Extract pure business logic**: isolate side-effect-free rule evaluation from Dataverse I/O. This aligns with statelessness requirements and makes replay/testing feasible [Inference]. citeturn27search13turn24view0  
5. **Performance gates**: add filtering attributes and reduce data retrieval to minimum required. citeturn5view0turn24view0  
6. **Deploy safely**: when publishing updated managed solutions, apply assembly-version semantics correctly (avoid unintended major/minor bumps without step migration). citeturn5view0  

### Regression testing strategy without third-party frameworks

Microsoft acknowledges community testing tools but does not provide a first-party unit-test harness; for agent-driven autonomy in production-like correctness, prefer **integration tests** in a dedicated environment [Inference], driven by Dataverse SDK for .NET patterns and environment isolation practices:

* Use a pipeline to import a test solution, execute deterministic API operations, then assert results via SDK queries (Organization service). This is consistent with Microsoft-only tooling constraints and avoids unsupported libraries [Inference]. citeturn23view0turn22search5turn33view0  
* Validate async behaviour by inspecting `AsyncOperation` status, since async actions are stored as system jobs. citeturn26search0turn26search1  

## Production monitoring guide

### Telemetry with Application Insights and plug-in custom telemetry

Microsoft supports exporting Dataverse and model-driven app telemetry to Application Insights with no code changes; you “subscribe to receive telemetry about operations” to diagnose issues. citeturn25search0turn25search9 The integration overview highlights dashboards, proactive monitoring via Smart Detection, and alerts. citeturn25search1

For plug-in code-level signals, Microsoft documents emitting custom telemetry from plug-ins using `Microsoft.Xrm.Sdk.PluginTelemetry.ILogger` to write directly to your Application Insights resource (preview). citeturn25search15turn25search2

**Operational setup (agent procedure)**  
1. Create an Application Insights resource and configure data export/integration in Power Platform admin center (per Microsoft setup guide). citeturn25search9turn25search0  
2. Validate that Dataverse telemetry flows (events include identifiers mapping, such as request IDs and operation IDs used for troubleshooting). citeturn25search6  
3. Add custom plug-in telemetry (`ILogger`) for high-value events (business failures, external dependency timeouts, contract violations). citeturn25search15turn25search2  

### Plug-in failure alerting via Power Automate

Power Automate provides a Dataverse trigger “When a row is added, modified or deleted” with a configurable trigger condition. citeturn15search0turn15search1 Combine this with Dataverse tables for plug-in observability:

* `PluginTraceLog` records trace and exception information generated by plug-ins/workflow activities. citeturn16search6turn16search0  
* `AsyncOperation` (System Job) tracks asynchronous operations; Dataverse stores async extension context in this table. citeturn26search0turn26search1  

**Alert flow pattern (two flows)**  
Flow A (sync failure signal): Trigger on new `PluginTraceLog` rows filtered to exceptions or specific plug-in type [Inference]. Use trigger conditions to avoid noise and to prevent loops. citeturn15search1turn16search6  
Flow B (async failure signal): Trigger on updates to `AsyncOperation` where status changes to Failed; include `OperationId` correlation when available. citeturn26search2turn26search0turn15search0  

### Async failure triage and recovery

Dataverse async extensions are queued; execution order is not strictly CreatedOn-ordered because different operation types require different resources. citeturn26search0 Practical triage steps:

1. Locate the system job (`AsyncOperation`) and read error details. citeturn26search1turn26search6  
2. If traces were enabled, use trace info in job details and download log file. citeturn26search6turn16search0  
3. Decide recovery:
   * If idempotent, retry may be safe [Inference].
   * If external call failed, fix endpoint/certificate chain issues; Microsoft warns incomplete TLS certificate chains can break sandbox HTTPS negotiation. citeturn31search1  

### SLA impact analysis for synchronous failures

Microsoft states synchronous plug-ins cause the operation to wait until the plug-in completes and directly impact end-user perceived performance; synchronous plug-ins must execute quickly. citeturn26search9turn33view0 Slow plug-ins or too many synchronous plug-ins can make the UI nonresponsive or cause timeouts with pipeline rollback. citeturn33view0turn34view0 From a service continuity perspective, synchronous plug-in failures are “front-door failures” (user-visible, transaction-aborting), whereas async failures are typically recoverable out-of-band but may accumulate backlog and delay downstream automations [Inference]. citeturn26search0turn26search9  

## Breaking changes log for 2022–2025 and advanced troubleshooting decision tree

### Breaking changes log for 2022–2025

| Date | Change | Impact on plug-in development | Migration action |
|---|---|---|---|
| 27 July 2022 | Dependent Assemblies for plug-ins announced (preview) to avoid ILMerge and package dependencies into a NuGet package. citeturn32search1 | Enables supported multi-assembly dependency delivery; reduces need for ILMerge (which Microsoft does not support). citeturn32search0 | Move from ILMerge to plug-in packages (NuGet) containing plug-in + dependencies; store resources (e.g., JSON, localized strings) if needed. citeturn32search0turn32search1 |
| 2023–2025 (docs updated) | Virtual table custom data providers run in MainOperation stage 30 and are registered differently (no specific step); configured via `EntityDataProvider`. citeturn36view0 | Agents must not attempt to “register steps” for provider plug-ins; debugging and lifecycle differs from ordinary plug-ins. citeturn36view0 | Use the provider tables + PRT provider registration model; implement CRUD plug-ins per provider pattern. citeturn36view0 |
| 2023–2025 (documented) | Execution order is explicitly lowest-to-highest; same value ordering is not guaranteed and can be random. citeturn5view0 | Undocumented or incidental ordering dependencies break unpredictably after imports/updates. citeturn5view0 | Enforce rank discipline; use SharedVariables contracts rather than relying on same-rank ordering. citeturn5view0turn8view0 |
| 2023–2025 (documented) | Post-operation stage value 50 is marked deprecated (SDK stage guidance). citeturn2view0turn32search16 | Legacy registrations may use a deprecated stage enumeration; future platform evolution risk. citeturn32search16 | Use supported stages (10/20/40); re-register steps accordingly. citeturn32search16turn34view0 |
| 2023–2025 (documented) | Solution/assembly versioning behaviour: build/revision change = in-place; major/minor change = treated as different assembly; existing steps continue to reference old assembly. citeturn5view0 | Plug-in updates can silently not apply if version bump strategy is wrong; orphaned behaviour in prod. citeturn5view0 | Use build/revision increments for compatible updates; if major/minor must change, update step registrations to point to new plugin type before exporting/importing. citeturn5view0 |
| 2025 (ALM docs) | Solution concepts emphasise managed vs unmanaged lifecycle and dependencies. citeturn18search1 | Production drift and layering issues if unmanaged edits are made downstream. citeturn18search1 | Treat dev as source of truth; deploy managed downstream; avoid direct edits in prod. citeturn18search1turn23view0 |

Note: Some operational changes (for example, restrictions on unregistering/disabling Microsoft out-of-box system plug-ins) are described in current Microsoft documentation but are not reliably dated to 2022–2025 in the accessible source metadata; apply as current-state constraints when automating remediation. citeturn5view0

### Advanced troubleshooting decision tree

Text flowchart: **symptom → diagnosis → resolution**

**User sees immediate error on save / create / update**  
→ Check if step is **synchronous** (PreValidation/PreOperation/PostOperation). Synchronous exceptions roll back transaction. citeturn34view0turn1search1  
→ If yes: query `PluginTraceLog` for latest exception with matching `CorrelationId`. citeturn16search0turn7search0  
→ If trace indicates validation: ensure it throws `InvalidPluginExecutionException` in PreValidation (preferred) and message is user-safe. citeturn34view0turn8view0  
→ If trace indicates timeout/performance: add filtering attributes, reduce queries, split side effects to async/business event pattern. citeturn5view0turn26search9turn14view0  

**Logic executes twice unexpectedly**  
→ Confirm message is Update and whether specialized update operations can call plug-ins twice. citeturn34view0  
→ Enforce idempotence: guard using detected changed attributes, Pre/Post images, and ensure step filtering attributes are set. citeturn5view0turn8view0turn24view0  

**Two plug-ins on same message behave non-deterministically**  
→ Inspect step **Execution Order**; if equal, ordering is not guaranteed. citeturn5view0  
→ Fix: assign explicit ranks (lowest-to-highest) and pass shared data via `SharedVariables` (serializable). citeturn5view0turn8view0turn3view1  

**Async automation missing / delayed**  
→ Identify whether logic is async plug-in or flow. Async plug-ins are stored as `AsyncOperation` (system jobs). citeturn26search0turn26search1  
→ Check system job failure/queue backlog; remember execution is queued and not strictly CreatedOn-order. citeturn26search0  
→ If failed: open log details; tracing appears in system job details for async plug-ins that throw exceptions. citeturn26search6  

**Power Automate loop triggered by plug-in-driven updates**  
→ Use Dataverse trigger conditions to prevent runs when “updated-by-flow/plugin” marker is present (for example, a status flag). Trigger conditions prevent flow from running unnecessarily. citeturn15search1turn15search0  
→ Consider moving cross-system orchestration to business events (custom API + “When an action is performed” trigger) to reduce coupling and simplify plug-in sync logic. citeturn14view0turn9view0  

**Custom API works but cannot be profiled**  
→ If main-operation handler attached via Custom API `PluginTypeId`, profiler step selection may not be available; Microsoft documents workaround: register plug-in type on PostOperation stage for the custom API message to profile/debug. citeturn9view0turn17view0  

**Virtual table provider returns wrong data or errors**  
→ Confirm provider plug-ins are registered as virtual table data providers (not ordinary steps) and run in stage 30; ensure query translation handles `QueryExpression` in RetrieveMultiple. citeturn36view0  
→ Throw correct provider exceptions (authentication, invalid query, timeout) for predictable caller behaviour. citeturn36view0  

### Cited sources

Primary/official sources referenced throughout (citations inline above):

* Microsoft Dataverse event framework and pipeline stages citeturn34view0  
* Plug-in registration (execution order semantics, assembly versioning behaviour, system plug-in constraints) citeturn5view0  
* Execution context and SharedVariables patterns (including ParentContext and serializability) citeturn8view0  
* Custom APIs: design, binding types, privileges, extensibility types, debugging limitations citeturn9view0  
* Custom API creation with code (solution association, parameter/response creation) citeturn10view0  
* Plug-in debugging tutorial (profiler capture/replay, attach to `PluginRegistration.exe`) citeturn17view0  
* Logging/tracing and `PluginTraceLog` table usage citeturn16search0turn16search6  
* Asynchronous service and System Jobs (`AsyncOperation`) citeturn26search0turn26search1  
* Power Platform CLI references for plug-in and solution commands (including stage-and-upgrade, activate-plugins, version strategy) citeturn21view0turn23view0  
* GitHub Actions and Build Tools official references citeturn22search1turn22search5turn22search2turn19search3  
* Application Insights integration and plug-in custom telemetry citeturn25search0turn25search1turn25search2turn25search15  
* Virtual tables custom provider model (stage 30, provider tables, query translation) citeturn36view0  
* Dataverse specialised columns (formula/calculated/rollup are read-only; rollup calculation behaviour) citeturn13view0  
* Dataverse for Teams vs Dataverse (plug-ins not supported, API access differences, capacity/security gaps) citeturn28view0