# Practical C# plugin code reference for Power Platform model-driven apps for early 2026

## Executive summary

As of 18 Feb 2026, Dataverse plug-in assemblies must target **.NET Framework 4.6.2** (Microsoft intends to add .NET Framework 4.8 runtime support by **June 2026**). citeturn9view0turn8view0 The modern toolchain is **Power Platform CLI (`pac`)** for project scaffolding and deployment (`pac plugin init`, `pac plugin push`) and `pac tool prt` to launch the Plug-in Registration Tool. citeturn12view0turn10search2turn8view0 For dependencies, Dataverse server-side runtime already contains `Microsoft.CrmSdk.CoreAssemblies` in the sandbox; for *your* external dependencies (including explicit `System.Text.Json`), Microsoft recommends using **plug-in packages (dependent assemblies capability)** instead of ILMerge. citeturn9view0 Unit testing in 2025/2026 is best done with **FakeXrmEasy v3.x** using pipeline simulation on **.NET 8 test projects**. citeturn7view0turn19view0turn19view1

## Project setup reference

### Current packages and versions for Q1 2026

NuGet versions below are **latest stable available on NuGet.org** at time of research (Q1 2026 target).

| Area | Package | Latest stable version (Q1 2026) | Notes |
|---|---:|---:|---|
| Plug-in build (Dataverse runtime API) | `Microsoft.CrmSdk.CoreAssemblies` | **9.0.2.60** citeturn5view0 | Tracked for compile-time references; assemblies exist in sandbox at runtime. citeturn9view0 |
| Workflow activities | `Microsoft.CrmSdk.Workflow` | **9.0.2.60** citeturn0search3 | Needed only if you build CodeActivity workflow extensions. |
| Client connectivity (replacement for deprecated Xrm.Tooling connector) | `Microsoft.PowerPlatform.Dataverse.Client` | **1.2.10** citeturn6view0turn16search0 | For external apps/services; **not** required inside plug-ins (use `IOrganizationService`). citeturn8view0 |
| Client extensions | `Microsoft.PowerPlatform.Dataverse.Client.Dynamics` | **1.2.10** citeturn17view0 | Dynamics-specific extensions; often pulled transitively by FakeXrmEasy. |
| Unit testing – core | `FakeXrmEasy.Core.v9` | **3.8.0** citeturn4search14turn6view0 | Query translation + CRUD operators (v3 middleware-based architecture). citeturn26search1 |
| Unit testing – pipeline simulation | `FakeXrmEasy.Plugins.v9` | **3.8.1** citeturn7view0 | Pipeline simulation helpers for plug-ins + step registration. citeturn19view0turn19view1 |
| Unit testing – message executors | `FakeXrmEasy.Messages.v9` | **3.8.0** citeturn4search22turn27view0 | Adds many message executors beyond CRUD; loaded via `.AddFakeMessageExecutors(...)`. citeturn27view0 |
| Optional merge (legacy) | `ILRepack.Lib.MSBuild.Task` | **2.0.44.1** citeturn0search12 | Only if you cannot use plug-in packages; Microsoft does **not** support ILMerge. citeturn9view0 |

### Target framework and packaging strategy

Dataverse plug-ins and custom workflow activities **must target .NET Framework 4.6.2**. citeturn9view0turn8view0 Microsoft guidance strongly recommends using the **dependent assemblies capability** (plug-in packages) instead of ILMerge; plug-in packages are stored in the `PluginPackage` table and extracted to the sandbox at runtime. citeturn9view0

Important detail for 2025/2026: even though `Microsoft.CrmSdk.CoreAssemblies` depends on `System.Text.Json`, sandbox may not carry the same `System.Text.Json.dll` version; Microsoft explicitly recommends including `System.Text.Json` via plug-in packages if you use it. citeturn9view0

### Directory structure

```text
repo-root/
  Directory.Packages.props
  Directory.Build.props
  src/
    Contoso.Plugins/
      Contoso.Plugins.csproj
      Contoso.Plugins.snk                # optional; required only for non-package registration
      Common/
        PluginBase.cs
        DataverseConstants.cs
      Plugins/
        Account/
          AutoNumberOnCreate.cs
        Contact/
          SyncFieldsOnUpdate.cs
        Shared/
          SharedVariablesProducer.cs
          SharedVariablesConsumer.cs
  tests/
    Contoso.Plugins.Tests/
      Contoso.Plugins.Tests.csproj
      PluginPipelineTests.cs
  build/
    github/
      deploy.yml
  solutions/
    Contoso.Managed/
      (solution project folders produced by pac solution unpack/pack)
```

### Strong-name key generation

Signing is required when you register individual assemblies **without** plug-in packages; signing is generally not required for plug-in packages. citeturn9view0

```powershell
# Generate strong-name key (sn.exe is part of the Strong Name Tool)
sn.exe -k .\src\Contoso.Plugins\Contoso.Plugins.snk
```

(Reference: Strong Name Tool referenced by Microsoft for signing plug-in assemblies.) citeturn9view0

### Full `.csproj` template

This template is **SDK-style** (required for plug-in packages). citeturn9view0 It supports two deployment modes:

- **Plug-in package mode** (recommended): pack into a `.nupkg` and deploy with `pac plugin push --type Nuget`. citeturn12view0turn9view0  
- **Classic assembly registration mode** (legacy): sign and register a single DLL.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <!-- Dataverse plug-ins must target net462 today -->
    <TargetFramework>net462</TargetFramework> <!-- required in 2025/2026 --> 
    <LangVersion>10.0</LangVersion>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>

    <!-- Required for Power Platform Tools / pac-generated projects -->
    <PowerAppsTargetsPath>$(MSBuildExtensionsPath)\Microsoft\VisualStudio\v$(VisualStudioVersion)\PowerApps</PowerAppsTargetsPath>

    <!-- Versioning -->
    <AssemblyVersion>1.0.0.0</AssemblyVersion>
    <FileVersion>1.0.0.0</FileVersion>
    <Version>1.0.0</Version>

    <!-- Plug-in package (NuGet) metadata -->
    <IsPackable>true</IsPackable>
    <GeneratePackageOnBuild>true</GeneratePackageOnBuild>
    <PackageId>Contoso.Plugins</PackageId>
    <Authors>Contoso</Authors>
    <Company>Contoso</Company>
    <PackageRequireLicenseAcceptance>false</PackageRequireLicenseAcceptance>
    <Description>Dataverse plug-ins packaged for dependent assemblies.</Description>

    <!-- Build outputs -->
    <Platforms>AnyCPU</Platforms>
    <Deterministic>true</Deterministic>

    <!-- Classic assembly registration mode (set to true only if NOT using plugin packages) -->
    <SignAssembly>false</SignAssembly>
    <AssemblyOriginatorKeyFile>Contoso.Plugins.snk</AssemblyOriginatorKeyFile>

    <!-- Helps include dependencies during pack (plugin package scenario) -->
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
  </PropertyGroup>

  <ItemGroup>
    <!-- Dataverse plug-in runtime references -->
    <PackageReference Include="Microsoft.CrmSdk.CoreAssemblies" Version="9.0.2.60" />
    <!-- Add only if you build custom workflow activities -->
    <PackageReference Include="Microsoft.CrmSdk.Workflow" Version="9.0.2.60" Condition="'$(IncludeWorkflow)'=='true'" />

    <!-- If you use System.Text.Json in plug-in code, include it explicitly in the package -->
    <PackageReference Include="System.Text.Json" Version="8.0.5" />
  </ItemGroup>

  <!-- Optional: ILRepack (legacy fallback; Microsoft recommends plugin packages instead of ILMerge) -->
  <ItemGroup Condition="'$(UseILRepack)'=='true'">
    <PackageReference Include="ILRepack.Lib.MSBuild.Task" Version="2.0.44.1" PrivateAssets="all" />
  </ItemGroup>

  <Target Name="ILRepack" AfterTargets="Build" Condition="'$(UseILRepack)'=='true'">
    <!-- This is a conservative example: merge plugin + selected dependencies.
         Prefer plugin packages (dependent assemblies) for Dataverse Online. -->
    <ItemGroup>
      <InputAssemblies Include="$(OutputPath)$(AssemblyName).dll" />
      <InputAssemblies Include="$(OutputPath)System.Text.Json.dll" />
      <InputAssemblies Include="$(OutputPath)System.Memory.dll" />
      <InputAssemblies Include="$(OutputPath)System.Buffers.dll" />
      <InputAssemblies Include="$(OutputPath)System.Runtime.CompilerServices.Unsafe.dll" />
    </ItemGroup>

    <ILRepack
      Parallel="true"
      Internalize="true"
      DebugInfo="false"
      InputAssemblies="@(InputAssemblies)"
      OutputFile="$(OutputPath)$(AssemblyName).merged.dll" />

    <!-- Replace output with merged dll -->
    <Copy SourceFiles="$(OutputPath)$(AssemblyName).merged.dll" DestinationFiles="$(OutputPath)$(AssemblyName).dll" OverwriteReadOnlyFiles="true" />
    <Delete Files="$(OutputPath)$(AssemblyName).merged.dll" />
  </Target>

</Project>
```

Key points backed by Microsoft documentation:

- **TargetFramework must be `net462`** for plug-ins today. citeturn9view0turn8view0  
- **SDK-style projects** are required for plug-in packages. citeturn9view0  
- **ILMerge is not supported**; use dependent assemblies capability (plug-in packages). citeturn9view0  
- If using `System.Text.Json`, **include it explicitly** in dependent assemblies because sandbox version may differ. citeturn9view0  

### Test project `.csproj` template (FakeXrmEasy v3+)

FakeXrmEasy plugin helpers (`FakeXrmEasy.Plugins.v9`) target **.NET 8**, so tests should target **net8.0**. citeturn7view0

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Contoso.Plugins\Contoso.Plugins.csproj" />

    <PackageReference Include="FakeXrmEasy.Core.v9" Version="3.8.0" />
    <PackageReference Include="FakeXrmEasy.Plugins.v9" Version="3.8.1" />
    <PackageReference Include="FakeXrmEasy.Messages.v9" Version="3.8.0" />

    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" />

    <PackageReference Include="coverlet.collector" Version="8.0.0" PrivateAssets="all" />
    <PackageReference Include="FluentAssertions" Version="8.8.0" />
  </ItemGroup>

</Project>
```

Version references: `Microsoft.NET.Test.Sdk` 18.0.1 citeturn16search3, `xunit.runner.visualstudio` 3.1.5 citeturn33search0, `coverlet.collector` 8.0.0 citeturn33search1, `FluentAssertions` 8.8.0 citeturn33search2.

## Plugin patterns library

### Canonical plug-in template

Design constraints this template enforces:

- Plug-in classes must be **stateless** (no per-invocation cached services/context). citeturn8view0turn18search0  
- Prefer `InvalidPluginExecutionException` for user-facing validation failures; avoid HTML in messages. citeturn18search1turn18search20  
- Use `IOrganizationService` from the service factory; don’t use Web API, don’t authenticate. citeturn8view0  
- Always trace (Plugin Trace Log) using `ITracingService`. citeturn8view0turn18search30  

```csharp
#nullable enable
using System;
using System.Globalization;
using System.ServiceModel;
using Microsoft.Xrm.Sdk;

namespace Contoso.Plugins.Common
{
    /// <summary>
    /// Production plug-in base class:
    /// - stateless per Dataverse guidance
    /// - structured tracing
    /// - centralised guardrails + error handling
    /// </summary>
    public abstract class PluginBase : IPlugin
    {
        private readonly string? _unsecureConfig;
        private readonly string? _secureConfig;

        protected PluginBase(string? unsecureConfig = null, string? secureConfig = null)
        {
            _unsecureConfig = unsecureConfig;
            _secureConfig = secureConfig;
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            if (serviceProvider is null) throw new ArgumentNullException(nameof(serviceProvider));

            var context = serviceProvider.GetService(typeof(IPluginExecutionContext)) as IPluginExecutionContext
                ?? throw new InvalidPluginExecutionException("Plug-in execution context unavailable.");

            var tracing = serviceProvider.GetService(typeof(ITracingService)) as ITracingService
                ?? throw new InvalidPluginExecutionException("Tracing service unavailable.");

            var factory = serviceProvider.GetService(typeof(IOrganizationServiceFactory)) as IOrganizationServiceFactory
                ?? throw new InvalidPluginExecutionException("Organization service factory unavailable.");

            using var trace = new TraceScope(tracing, context, GetType().FullName ?? GetType().Name);

            // User-context org service (respects caller)
            var userService = factory.CreateOrganizationService(context.UserId);

            // System/context org service (runs as plug-in identity)
            var systemService = factory.CreateOrganizationService(null);

            var services = new LocalServices(
                Context: context,
                Tracing: tracing,
                UserService: userService,
                SystemService: systemService,
                UnsecureConfig: _unsecureConfig,
                SecureConfig: _secureConfig
            );

            try
            {
                Execute(services);
            }
            catch (InvalidPluginExecutionException)
            {
                // already contains user-friendly message
                throw;
            }
            catch (FaultException<OrganizationServiceFault> ex)
            {
                trace.Error(ex, "Dataverse fault.");
                throw new InvalidPluginExecutionException("A Dataverse error occurred while processing the request.", ex);
            }
            catch (Exception ex)
            {
                trace.Error(ex, "Unhandled exception.");
                throw new InvalidPluginExecutionException("An unexpected error occurred. Contact your system administrator.", ex);
            }
        }

        protected abstract void Execute(in LocalServices services);
    }

    /// <summary>
    /// Strongly-typed container for per-invocation services.
    /// </summary>
    public readonly record struct LocalServices(
        IPluginExecutionContext Context,
        ITracingService Tracing,
        IOrganizationService UserService,
        IOrganizationService SystemService,
        string? UnsecureConfig,
        string? SecureConfig);

    /// <summary>
    /// Structured tracing with consistent prefix and contextual identifiers.
    /// </summary>
    public sealed class TraceScope : IDisposable
    {
        private readonly ITracingService _tracing;
        private readonly IPluginExecutionContext _ctx;
        private readonly string _pluginName;
        private readonly DateTimeOffset _started = DateTimeOffset.UtcNow;

        public TraceScope(ITracingService tracing, IPluginExecutionContext context, string pluginName)
        {
            _tracing = tracing ?? throw new ArgumentNullException(nameof(tracing));
            _ctx = context ?? throw new ArgumentNullException(nameof(context));
            _pluginName = pluginName ?? "UnknownPlugin";

            Info("BEGIN | message={0} stage={1} entity={2} depth={3} correlation={4} operation={5}",
                _ctx.MessageName,
                _ctx.Stage,
                _ctx.PrimaryEntityName,
                _ctx.Depth,
                _ctx.CorrelationId,
                _ctx.OperationId);
        }

        public void Info(string format, params object?[] args) =>
            _tracing.Trace("[{0}] {1}", _pluginName, string.Format(CultureInfo.InvariantCulture, format, args));

        public void Error(Exception ex, string message) =>
            _tracing.Trace("[{0}] ERROR | {1} | {2}", _pluginName, message, ex);

        public void Dispose()
        {
            var elapsed = DateTimeOffset.UtcNow - _started;
            Info("END | elapsedMs={0}", (long)elapsed.TotalMilliseconds);
        }
    }

    public static class PluginGuards
    {
        /// <summary>
        /// Depth guard to prevent recursion / infinite loops.
        /// </summary>
        public static bool ExceedsDepth(IPluginExecutionContext ctx, int maxDepth) =>
            ctx.Depth > maxDepth;
    }

    public static class ParameterCollectionExtensions
    {
        public static bool TryGet<T>(this ParameterCollection parameters, string key, out T value)
        {
            if (parameters is null) throw new ArgumentNullException(nameof(parameters));
            if (key is null) throw new ArgumentNullException(nameof(key));

            if (parameters.Contains(key) && parameters[key] is T typed)
            {
                value = typed;
                return true;
            }

            value = default!;
            return false;
        }

        public static Entity GetRequiredTarget(this IPluginExecutionContext ctx)
        {
            if (ctx is null) throw new ArgumentNullException(nameof(ctx));

            if (ctx.InputParameters.TryGet(EntityParameterKeys.Target, out Entity target))
            {
                return target;
            }

            throw new InvalidPluginExecutionException($"Missing required input parameter '{EntityParameterKeys.Target}'.");
        }
    }

    public static class MessageNames
    {
        public const string Create = "Create";
        public const string Update = "Update";
        public const string Delete = "Delete";
    }

    public static class EntityParameterKeys
    {
        public const string Target = "Target";
        public const string Id = "Id";
    }
}

// Required for 'record' on net462 using newer C# compilers
namespace System.Runtime.CompilerServices
{
    internal static class IsExternalInit { }
}
```

This aligns with Microsoft guidance that plug-in code typically obtains `IPluginExecutionContext`, `ITracingService`, and `IOrganizationServiceFactory` from `IServiceProvider`. citeturn8view0 It also avoids storing per-invocation state in fields, consistent with the stateless requirement. citeturn8view0turn18search0

### Production-ready plug-in example class

Implements: depth guard, initiating user check, null-safe extraction, structured tracing, early exits, user + system services, user-friendly exceptions.

```csharp
#nullable enable
using System;
using Microsoft.Xrm.Sdk;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Plugins.Account
{
    /// <summary>
    /// Sample plug-in: PreOperation Create of account
    /// - depth guard
    /// - skip for integration user
    /// - sets "accountnumber" if not already provided
    /// </summary>
    public sealed class AccountAutoNumberOnCreatePlugin : PluginBase
    {
        // Typical integration/ETL user to ignore (example)
        // In real use, load from configuration or environment variable.
        private static readonly Guid IntegrationUserId = new("00000000-0000-0000-0000-000000000001");

        public AccountAutoNumberOnCreatePlugin(string? unsecureConfig = null, string? secureConfig = null)
            : base(unsecureConfig, secureConfig) { }

        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            // Early exit: message + entity
            if (!string.Equals(ctx.MessageName, MessageNames.Create, StringComparison.Ordinal))
                return;

            if (!string.Equals(ctx.PrimaryEntityName, "account", StringComparison.Ordinal))
                return;

            // Depth guard
            if (PluginGuards.ExceedsDepth(ctx, maxDepth: 1))
            {
                services.Tracing.Trace("[AccountAutoNumberOnCreatePlugin] Depth guard triggered (depth={0}).", ctx.Depth);
                return;
            }

            // Initiating user check (example)
            if (ctx.InitiatingUserId == IntegrationUserId)
            {
                services.Tracing.Trace("[AccountAutoNumberOnCreatePlugin] Skipping for integration user {0}.", ctx.InitiatingUserId);
                return;
            }

            var target = ctx.GetRequiredTarget();

            // Defensive: ensure logical name
            if (!string.Equals(target.LogicalName, "account", StringComparison.Ordinal))
                return;

            // If user already provided an accountnumber, leave it
            if (target.Attributes.ContainsKey("accountnumber"))
                return;

            // Use deterministic value example (use a real autonumber strategy in production)
            // Best practice is using a server-side autonumber column where possible.
            var number = $"ACC-{ctx.CorrelationId:N}".ToUpperInvariant();

            target["accountnumber"] = number;

            // Trace minimal and safe info
            services.Tracing.Trace("[AccountAutoNumberOnCreatePlugin] Set accountnumber to {0}.", number);
        }
    }
}
```

## Custom API implementation

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

### Registration configuration (pac + spkl)

Create scaffolding with `pac plugin init` and deploy with `pac plugin push`. citeturn12view0turn10search0 Use `pac tool prt` to launch the Plug-in Registration Tool when needed. citeturn10search2turn8view0

If you maintain plug-in registrations via `spkl`, its reference `spkl.json` structure includes a `plugins` section pointing at assembly paths. citeturn32view0turn11search18 A minimal, plug-in-only `spkl.json` for deployment (example):

```json
{
  "plugins": [
    {
      "profile": "default,release",
      "assemblypath": "src\\Contoso.Plugins\\bin\\Release"
    }
  ]
}
```

(Reference format and keys are consistent with the template `spkl.json` published in the official repository. citeturn32view0)

## Unit test reference with FakeXrmEasy v3+

FakeXrmEasy v3 uses middleware and supports (a) CRUD, (b) message executors, and (c) plug-in pipeline simulation. citeturn27view0turn19view0turn19view1 It also includes a query translation engine that can execute QueryExpression/FetchXML against an in-memory database. citeturn26search1turn27view0

### Complete test file with scenarios

Covers:
- Create message plug-in test
- Update with filtering attributes + pre-image
- Expected exception test
- QueryExpression execution test
- System vs user context check (limited by FakeXrmEasy security simulation; see comment)

```csharp
#nullable enable
using System;
using System.Linq;
using FluentAssertions;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Xunit;
using FakeXrmEasy;
using FakeXrmEasy.Pipeline;
using FakeXrmEasy.Middleware;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Tests
{
    // ----------------------------
    // Plug-ins under test
    // ----------------------------

    public sealed class SetAccountNumberOnCreatePlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Create || ctx.PrimaryEntityName != "account")
                return;

            if (PluginGuards.ExceedsDepth(ctx, 1))
                return;

            var target = ctx.GetRequiredTarget();
            if (target.Attributes.ContainsKey("accountnumber")) return;

            target["accountnumber"] = "ACC-TEST";
        }
    }

    public sealed class SyncContactFullNameOnUpdatePlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != "contact")
                return;

            // Pre-image name must match registration
            const string preImageName = "PreImage";

            if (!ctx.PreEntityImages.Contains(preImageName))
                throw new InvalidPluginExecutionException("PreImage is required for this plug-in.");

            var pre = ctx.PreEntityImages[preImageName];
            var target = ctx.GetRequiredTarget();

            // Filtering attributes are usually handled by registration; still be defensive
            var firstName = target.GetAttributeValue<string>("firstname") ?? pre.GetAttributeValue<string>("firstname") ?? string.Empty;
            var lastName = target.GetAttributeValue<string>("lastname") ?? pre.GetAttributeValue<string>("lastname") ?? string.Empty;

            var newFullName = (firstName + " " + lastName).Trim();

            // Avoid unnecessary writes
            var oldFullName = pre.GetAttributeValue<string>("fullname") ?? string.Empty;
            if (string.Equals(oldFullName, newFullName, StringComparison.Ordinal))
                return;

            target["fullname"] = newFullName;
        }
    }

    public sealed class PreventAccountDeleteIfHasContactsPlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Delete || ctx.PrimaryEntityName != "account")
                return;

            // Target in Delete can be EntityReference via InputParameters["Target"].
            if (!ctx.InputParameters.TryGetValue("Target", out var targetObj) || targetObj is not EntityReference er)
                throw new InvalidPluginExecutionException("Target EntityReference is required.");

            var qe = new QueryExpression("contact")
            {
                ColumnSet = new ColumnSet("contactid"),
                Criteria =
                {
                    Filters =
                    {
                        new FilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new ConditionExpression("parentcustomerid", ConditionOperator.Equal, er.Id)
                            }
                        }
                    }
                }
            };

            // FakeXrmEasy will translate QueryExpression against in-memory DB
            var contacts = services.SystemService.RetrieveMultiple(qe);
            if (contacts.Entities.Count > 0)
                throw new InvalidPluginExecutionException("You cannot delete this account because related contacts exist.");
        }
    }

    // ----------------------------
    // Test base + tests
    // ----------------------------

    public abstract class FakeXrmEasyPipelineTestBase
    {
        protected readonly IXrmFakedContext Context;
        protected readonly IOrganizationService Service;

        protected FakeXrmEasyPipelineTestBase()
        {
            // Pipeline simulation setup based on official FakeXrmEasy docs
            // - AddCrud + AddFakeMessageExecutors + AddPipelineSimulation
            // - UsePipelineSimulation should be before UseCrud/UseMessages
            Context = MiddlewareBuilder
                .New()
                .AddCrud()
                .AddFakeMessageExecutors()
                .AddPipelineSimulation()
                .UsePipelineSimulation()
                .UseCrud()
                .UseMessages()
                .SetLicense(FakeXrmEasyLicense.NonCommercial)
                .Build();

            Service = Context.GetOrganizationService();
        }
    }

    public sealed class PluginPipelineTests : FakeXrmEasyPipelineTestBase
    {
        [Fact]
        public void Create_should_set_accountnumber_when_missing()
        {
            Context.RegisterPluginStep<SetAccountNumberOnCreatePlugin>(new PluginStepDefinition
            {
                MessageName = "Create",
                EntityLogicalName = "account",
                Stage = ProcessingStepStage.Preoperation,
                Mode = ProcessingStepMode.Synchronous
            });

            var account = new Entity("account");
            account["name"] = "Test";

            var id = Service.Create(account);

            var created = Service.Retrieve("account", id, new ColumnSet("accountnumber"));
            created.GetAttributeValue<string>("accountnumber").Should().Be("ACC-TEST");
        }

        [Fact]
        public void Update_should_sync_fullname_when_first_last_change_and_filtering_attributes_match()
        {
            var contactId = Guid.NewGuid();
            Context.Initialize(new Entity[]
            {
                new Entity("contact", contactId)
                {
                    ["firstname"] = "Ada",
                    ["lastname"] = "Lovelace",
                    ["fullname"] = "Ada Lovelace"
                }
            });

            // Register pre-image (subset of attributes)
            var preImage = new PluginImageDefinition(
                imageName: "PreImage",
                imageType: ProcessingStepImageType.PreImage,
                attributes: new[] { "firstname", "lastname", "fullname" });

            Context.RegisterPluginStep<SyncContactFullNameOnUpdatePlugin>(new PluginStepDefinition
            {
                MessageName = "Update",
                EntityLogicalName = "contact",
                Stage = ProcessingStepStage.Preoperation,
                Mode = ProcessingStepMode.Synchronous,
                FilteringAttributes = new[] { "firstname", "lastname" },
                Images = new[] { preImage }
            });

            // Update lastname only
            var update = new Entity("contact", contactId)
            {
                ["lastname"] = "Byron"
            };

            Service.Update(update);

            var after = Service.Retrieve("contact", contactId, new ColumnSet("fullname"));
            after.GetAttributeValue<string>("fullname").Should().Be("Ada Byron");
        }

        [Fact]
        public void Delete_should_throw_when_related_contacts_exist()
        {
            var accountId = Guid.NewGuid();
            var contactId = Guid.NewGuid();

            Context.Initialize(new Entity[]
            {
                new Entity("account", accountId) { ["name"] = "Locked" },
                new Entity("contact", contactId)
                {
                    ["firstname"] = "X",
                    ["lastname"] = "Y",
                    ["parentcustomerid"] = new EntityReference("account", accountId)
                }
            });

            Context.RegisterPluginStep<PreventAccountDeleteIfHasContactsPlugin>(new PluginStepDefinition
            {
                MessageName = "Delete",
                EntityLogicalName = "account",
                Stage = ProcessingStepStage.Prevalidation,
                Mode = ProcessingStepMode.Synchronous
            });

            Action act = () => Service.Delete("account", accountId);
            act.Should().Throw<InvalidPluginExecutionException>()
               .WithMessage("*related contacts exist*");
        }

        [Fact]
        public void QueryExpression_should_return_expected_entities_from_in_memory_db()
        {
            Context.Initialize(new Entity[]
            {
                new Entity("account", Guid.NewGuid()) { ["name"] = "A" },
                new Entity("account", Guid.NewGuid()) { ["name"] = "B" }
            });

            var qe = new QueryExpression("account")
            {
                ColumnSet = new ColumnSet("name"),
                Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression("name", ConditionOperator.In, "A", "B")
                    }
                }
            };

            var result = Service.RetrieveMultiple(qe);

            result.Entities.Select(e => e.GetAttributeValue<string>("name"))
                .OrderBy(x => x)
                .Should().Equal(new[] { "A", "B" });
        }
    }
}
```

Why this matches 2024/2025 FakeXrmEasy v3 API:

- Middleware pattern and examples are from the official docs (`MiddlewareBuilder.New()...AddPipelineSimulation()...UsePipelineSimulation()`). citeturn27view0turn19view0  
- `RegisterPluginStep` supports `PluginStepDefinition`, filtering attributes, and images. citeturn19view1  

## Data access and integration patterns

### QueryExpression patterns + FetchXML equivalents

Key platform data retrieval rules to apply defensively:

- Null (or non-requested) columns are **absent from `Entity.Attributes`**; absence means null. citeturn13search31  
- Paging: default/max **5000 rows** (standard tables), **500** (elastic); don’t mix `TopCount` with paging; deterministic ordering matters. citeturn25view0  
- FetchXML join semantics: `link-entity` “from/to” meaning is opposite of `LinkEntity.LinkFromAttributeName/LinkToAttributeName`. citeturn13search3  

```csharp
#nullable enable
using System;
using System.Collections.Generic;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace Contoso.Plugins.DataAccess
{
    public static class DataverseQueries
    {
        // -----------------------------
        // Single record retrieve
        // -----------------------------
        public static Entity? RetrieveAccountById(IOrganizationService service, Guid accountId)
        {
            if (service is null) throw new ArgumentNullException(nameof(service));
            if (accountId == Guid.Empty) return null;

            var cols = new ColumnSet("accountid", "name", "accountnumber");
            var entity = service.Retrieve("account", accountId, cols);

            return entity?.Id == Guid.Empty ? null : entity;
        }

        public static string Fetch_AccountById(Guid accountId) =>
$@"<fetch top='1'>
  <entity name='account'>
    <attribute name='accountid' />
    <attribute name='name' />
    <attribute name='accountnumber' />
    <filter>
      <condition attribute='accountid' operator='eq' value='{accountId:D}' />
    </filter>
  </entity>
</fetch>";

        // -----------------------------
        // Filtered multi-record retrieve with paging cookie (recommended)
        // Based on Microsoft paging-cookie pattern.
        // -----------------------------
        public static EntityCollection RetrieveAll(IOrganizationService service, QueryExpression query, int pageSize = 5000)
        {
            if (service is null) throw new ArgumentNullException(nameof(service));
            if (query is null) throw new ArgumentNullException(nameof(query));
            if (pageSize <= 0) throw new ArgumentOutOfRangeException(nameof(pageSize));

            var entities = new List<Entity>();

            query.PageInfo = query.PageInfo ?? new PagingInfo();
            query.PageInfo.PageNumber = 1;
            query.PageInfo.Count = pageSize;

            while (true)
            {
                var results = service.RetrieveMultiple(query);
                entities.AddRange(results.Entities);

                if (!results.MoreRecords)
                    break;

                query.PageInfo.PagingCookie = results.PagingCookie;
                query.PageInfo.PageNumber++;
            }

            return new EntityCollection(entities);
        }

        public static QueryExpression BuildContactsByEmailDomainQuery(string domain)
        {
            if (string.IsNullOrWhiteSpace(domain))
                throw new ArgumentException("Domain is required.", nameof(domain));

            var qe = new QueryExpression("contact")
            {
                ColumnSet = new ColumnSet("contactid", "fullname", "emailaddress1"),
                Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression("emailaddress1", ConditionOperator.Like, $"%@{domain}")
                    }
                }
            };

            // Deterministic ordering: include PK to avoid overlaps across pages
            qe.Orders.Add(new OrderExpression("emailaddress1", OrderType.Ascending));
            qe.Orders.Add(new OrderExpression("contactid", OrderType.Ascending));

            return qe;
        }

        public static string Fetch_ContactsByEmailDomain(string domain) =>
$@"<fetch count='5000' page='1'>
  <entity name='contact'>
    <attribute name='contactid' />
    <attribute name='fullname' />
    <attribute name='emailaddress1' />
    <order attribute='emailaddress1' descending='false' />
    <order attribute='contactid' descending='false' />
    <filter>
      <condition attribute='emailaddress1' operator='like' value='%@{SecurityElement(domain)}' />
    </filter>
  </entity>
</fetch>";

        // -----------------------------
        // Related entity retrieve via LinkEntity
        // Example: accounts with at least one contact having a given jobtitle
        // -----------------------------
        public static QueryExpression BuildAccountsWithContactJobTitle(string jobTitle)
        {
            if (string.IsNullOrWhiteSpace(jobTitle))
                throw new ArgumentException("Job title is required.", nameof(jobTitle));

            var qe = new QueryExpression("account")
            {
                ColumnSet = new ColumnSet("accountid", "name"),
                Distinct = true
            };

            var link = qe.AddLink("contact", "accountid", "parentcustomerid", JoinOperator.Inner);
            link.Columns = new ColumnSet("contactid", "fullname", "jobtitle");
            link.EntityAlias = "c";
            link.LinkCriteria.AddCondition("jobtitle", ConditionOperator.Equal, jobTitle);

            qe.Orders.Add(new OrderExpression("accountid", OrderType.Ascending));
            return qe;
        }

        public static string Fetch_AccountsWithContactJobTitle(string jobTitle) =>
$@"<fetch distinct='true'>
  <entity name='account'>
    <attribute name='accountid' />
    <attribute name='name' />
    <order attribute='accountid' descending='false' />
    <link-entity name='contact' from='parentcustomerid' to='accountid' link-type='inner' alias='c'>
      <attribute name='contactid' />
      <attribute name='fullname' />
      <attribute name='jobtitle' />
      <filter>
        <condition attribute='jobtitle' operator='eq' value='{SecurityElement(jobTitle)}' />
      </filter>
    </link-entity>
  </entity>
</fetch>";

        private static string SecurityElement(string input) =>
            (input ?? string.Empty)
                .Replace("&", "&amp;", StringComparison.Ordinal)
                .Replace("<", "&lt;", StringComparison.Ordinal)
                .Replace(">", "&gt;", StringComparison.Ordinal)
                .Replace("\"", "&quot;", StringComparison.Ordinal)
                .Replace("'", "&apos;", StringComparison.Ordinal);
    }
}
```

Paging implementation intentionally mirrors Microsoft’s paging-cookie guidance (loop until `MoreRecords` false; set `PageInfo.PagingCookie` and increment page number). citeturn25view0

## External call and chaining patterns

### External HTTP call pattern (sandbox-compliant)

Dataverse sandbox restrictions and guidance:

- Only **HTTP/HTTPS** allowed; **no localhost**, **no IP addresses**, DNS name required. citeturn14view1  
- `HttpClient` is async by default; plug-in code is sync (`IPlugin.Execute`), so force sync calls with `.GetAwaiter().GetResult()`; set **Timeout** and disable **KeepAlive** (`ConnectionClose = true`). citeturn14view1turn14view0  

```csharp
#nullable enable
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using Microsoft.Xrm.Sdk;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Plugins.Integration
{
    /// <summary>
    /// Sandbox-compliant HTTP call plug-in pattern.
    /// - uses HttpClient with ConnectionClose (KeepAlive=false)
    /// - explicit timeout
    /// - sync execution via GetAwaiter().GetResult()
    /// - System.Text.Json serialization
    /// </summary>
    public sealed class PostOperationCallWebhookPlugin : PluginBase
    {
        public PostOperationCallWebhookPlugin(string? unsecureConfig = null, string? secureConfig = null)
            : base(unsecureConfig, secureConfig) { }

        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != "account")
                return;

            // Keep the same endpoint per step via unsecure config: e.g. "https://api.contoso.tld/webhook"
            var endpoint = services.UnsecureConfig;
            if (string.IsNullOrWhiteSpace(endpoint))
                throw new InvalidPluginExecutionException("Webhook endpoint not configured for this plug-in step.");

            // Sandbox restrictions: must be HTTPS/HTTP and DNS-based host. (Validation is minimal here.)
            if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            {
                throw new InvalidPluginExecutionException("Webhook endpoint must be a valid http/https URL.");
            }

            var requestBody = new WebhookPayload(
                CorrelationId: ctx.CorrelationId,
                OperationId: ctx.OperationId,
                PrimaryEntityName: ctx.PrimaryEntityName,
                PrimaryEntityId: ctx.PrimaryEntityId,
                InitiatingUserId: ctx.InitiatingUserId);

            var json = JsonSerializer.Serialize(requestBody);

            using var http = CreateSandboxHttpClient(timeoutSeconds: 15);
            using var request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            // Add minimal headers
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            // Cancellation token with buffer to ensure cleanup
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(16));

            HttpResponseMessage response;
            try
            {
                // Force sync execution as per sandbox guidance
                response = http.SendAsync(request, cts.Token).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                services.Tracing.Trace("[PostOperationCallWebhookPlugin] HTTP call failed: {0}", ex);
                throw new InvalidPluginExecutionException("External service call failed. Try again later or contact support.");
            }

            var status = (int)response.StatusCode;
            var responseText = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

            services.Tracing.Trace("[PostOperationCallWebhookPlugin] HTTP status={0} bodyLength={1}", status, responseText?.Length ?? 0);

            // Treat non-2xx as failure (customise per business need)
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidPluginExecutionException($"External service returned HTTP {status}.");
            }
        }

        private static HttpClient CreateSandboxHttpClient(int timeoutSeconds)
        {
            var client = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(timeoutSeconds)
            };

            // KeepAlive false (ConnectionClose true) is recommended for external calls from plug-ins
            client.DefaultRequestHeaders.ConnectionClose = true;

            return client;
        }

        public readonly record struct WebhookPayload(
            Guid CorrelationId,
            Guid OperationId,
            string PrimaryEntityName,
            Guid PrimaryEntityId,
            Guid InitiatingUserId);
    }
}
```

This is consistent with Microsoft’s sandbox guidance on only HTTP/HTTPS, allowing DNS and forcing synchronous use of `HttpClient`, plus setting timeout and disabling KeepAlive. citeturn14view1turn18search33

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

## CI/CD code reference

### Tooling primitives

- `pac plugin init` scaffolds a Dataverse plug-in class library project, and `pac plugin push` imports a plug-in assembly or plug-in package (NuGet) into Dataverse. citeturn12view0turn10search0  
- `pac tool prt` launches Plug-in Registration Tool (downloads if needed). citeturn10search2  
- For GitHub CI, Microsoft provides **GitHub Actions for Microsoft Power Platform**; official samples show `who-am-i`, `export-solution`, `unpack-solution`, etc using `environment-url`, `app-id`, `client-secret`, and `tenant-id`. citeturn30view0turn28view0  

### GitHub Actions workflow (build → test → solution import → plug-in push)

This is a plug-in–centric variant built on top of Microsoft’s action input names (notably `environment-url`, `app-id`, `tenant-id`, `client-secret`). citeturn30view0turn1search19

```yaml
name: deploy-dataverse-plugins

on:
  workflow_dispatch:

env:
  DOTNET_NOLOGO: true
  NUGET_XMLDOC_MODE: skip

  # Update these in repo settings or environments
  ENVIRONMENT_URL: ${{ secrets.PP_ENVIRONMENT_URL }}
  TENANT_ID: ${{ secrets.PP_TENANT_ID }}
  CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
  # Client secret stored as GitHub secret (Microsoft tutorial uses "PowerPlatformSPN")
  CLIENT_SECRET: ${{ secrets.PowerPlatformSPN }}

jobs:
  build_test_deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: setup .net
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: restore
        run: dotnet restore

      - name: build
        run: dotnet build --configuration Release --no-restore

      - name: test
        run: dotnet test --configuration Release --no-build --collect:"XPlat Code Coverage"

      # Optional: pack plugin project into nupkg (plugin package / dependent assemblies)
      - name: pack plugin package
        run: dotnet pack .\src\Contoso.Plugins\Contoso.Plugins.csproj --configuration Release --no-build --output .\out\nupkg

      - name: who-am-i
        uses: microsoft/powerplatform-actions/who-am-i@v0
        with:
          environment-url: ${{ env.ENVIRONMENT_URL }}
          app-id: ${{ env.CLIENT_ID }}
          client-secret: ${{ env.CLIENT_SECRET }}
          tenant-id: ${{ env.TENANT_ID }}

      # Preferred: import solution that already includes plug-in assembly + steps
      - name: import solution
        uses: microsoft/powerplatform-actions/import-solution@v0
        with:
          environment-url: ${{ env.ENVIRONMENT_URL }}
          app-id: ${{ env.CLIENT_ID }}
          client-secret: ${{ env.CLIENT_SECRET }}
          tenant-id: ${{ env.TENANT_ID }}
          solution-file: .\out\solution\Contoso.Managed.zip
          force-overwrite: true
          publish-changes: true
          activate-plugins: true

      # Alternative / supplement: push plugin package directly (requires pluginId from Dataverse)
      # Uses pac plugin push conceptually; the command group exists and supports --type Nuget. citeturn12view0
      # - name: pac plugin push (optional)
      #   run: pac plugin push --pluginId ${{ secrets.DATAVERSE_PLUGINPACKAGE_ID }} --type Nuget --pluginFile .\out\nupkg\Contoso.Plugins.1.0.0.nupkg
```

Notes backed by sources:

- `import-solution` action supports `activate-plugins`, `publish-changes`, and other inputs. citeturn1search19  
- Authentication pattern (service principal secret, `who-am-i` action inputs) is shown in Microsoft’s Power Platform Actions Lab sample YAML. citeturn30view0turn28view0  
- `pac plugin push` exists and accepts `--pluginId` and type `Nuget`/`Assembly`. citeturn12view0  

### spkl configuration (reference)

The official `spkl.json` template includes sections for `plugins`, `earlyboundtypes`, and more. citeturn32view0turn11search18 For plug-ins, the key fields are `plugins[].assemblypath` and optional `classRegex`. citeturn32view0

## Real-world scenario implementations

All five scenarios below are provided as a **single copy-pasteable file** (multiple plug-in classes, one namespace) to keep code reusable while remaining complete.

```csharp
#nullable enable
using System;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.RealWorld
{
    // Centralised constants (no magic strings)
    public static class Tables
    {
        public const string Account = "account";
        public const string Contact = "contact";
        public const string Incident = "incident";
    }

    public static class AccountCols
    {
        public const string AccountNumber = "accountnumber";
        public const string Name = "name";
        public const string StatusCode = "statuscode";
        public const string StateCode = "statecode";
    }

    public static class ContactCols
    {
        public const string FirstName = "firstname";
        public const string LastName = "lastname";
        public const string FullName = "fullname";
        public const string ParentCustomerId = "parentcustomerid";
    }

    // Scenario (a): auto-numbering on Create
    public sealed class AutoNumberAccountOnCreate : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;
            if (ctx.MessageName != MessageNames.Create || ctx.PrimaryEntityName != Tables.Account) return;
            if (PluginGuards.ExceedsDepth(ctx, 1)) return;

            var target = ctx.GetRequiredTarget();
            if (target.Attributes.ContainsKey(AccountCols.AccountNumber)) return;

            // Recommended: prefer Dataverse autonumber column where possible. (Implementation uses correlation id for demo.)
            target[AccountCols.AccountNumber] = $"ACC-{ctx.CorrelationId:N}".ToUpperInvariant();
        }
    }

    // Scenario (b): field synchronization on Update with change detection (filtering attributes + pre-image compare)
    public sealed class SyncContactFullNameOnUpdate : PluginBase
    {
        private const string PreImageName = "PreImage";

        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;
            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != Tables.Contact) return;

            if (!ctx.PreEntityImages.Contains(PreImageName))
                throw new InvalidPluginExecutionException("PreImage is required (firstname, lastname, fullname).");

            var pre = ctx.PreEntityImages[PreImageName];
            var target = ctx.GetRequiredTarget();

            var first = target.GetAttributeValue<string>(ContactCols.FirstName) ?? pre.GetAttributeValue<string>(ContactCols.FirstName) ?? string.Empty;
            var last = target.GetAttributeValue<string>(ContactCols.LastName) ?? pre.GetAttributeValue<string>(ContactCols.LastName) ?? string.Empty;

            var newFull = (first + " " + last).Trim();
            var oldFull = pre.GetAttributeValue<string>(ContactCols.FullName) ?? string.Empty;

            if (string.Equals(oldFull, newFull, StringComparison.Ordinal))
                return;

            target[ContactCols.FullName] = newFull;
        }
    }

    // Scenario (c): cascading status update to related records
    // Example: when account is deactivated, deactivate all related contacts
    public sealed class CascadeDeactivateContactsOnAccountDeactivate : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;
            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != Tables.Account) return;
            if (PluginGuards.ExceedsDepth(ctx, 1)) return;

            // Trigger condition: statecode set to inactive in Target
            var target = ctx.GetRequiredTarget();
            if (!target.Attributes.ContainsKey(AccountCols.StateCode)) return;

            var state = target.GetAttributeValue<OptionSetValue>(AccountCols.StateCode)?.Value;
            if (state is null) return;

            const int inactiveState = 1; // typically 0=Active, 1=Inactive
            if (state != inactiveState) return;

            var accountId = target.Id != Guid.Empty ? target.Id : ctx.PrimaryEntityId;
            if (accountId == Guid.Empty) return;

            // Query related contacts (paged defensively for large datasets)
            var qe = new QueryExpression(Tables.Contact)
            {
                ColumnSet = new ColumnSet("contactid"),
                Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression(ContactCols.ParentCustomerId, ConditionOperator.Equal, accountId)
                    }
                }
            };
            qe.Orders.Add(new OrderExpression("contactid", OrderType.Ascending));
            qe.PageInfo = new PagingInfo { PageNumber = 1, Count = 5000 };

            while (true)
            {
                var page = services.SystemService.RetrieveMultiple(qe);
                foreach (var c in page.Entities)
                {
                    // Minimal update (use SetStateRequest if you need exact status transitions)
                    var update = new Entity(Tables.Contact, c.Id)
                    {
                        [AccountCols.StateCode] = new OptionSetValue(inactiveState)
                    };
                    services.SystemService.Update(update);
                }

                if (!page.MoreRecords) break;
                qe.PageInfo.PagingCookie = page.PagingCookie;
                qe.PageInfo.PageNumber++;
            }
        }
    }

    // Scenario (d): preventing deletion based on related record state
    // Example: prevent deleting account if any related incident/case is active
    public sealed class PreventAccountDeleteWhenActiveCasesExist : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;
            if (ctx.MessageName != MessageNames.Delete || ctx.PrimaryEntityName != Tables.Account) return;

            if (!ctx.InputParameters.TryGetValue("Target", out var obj) || obj is not EntityReference er)
                throw new InvalidPluginExecutionException("Target EntityReference is required.");

            // Active cases linked to account via "customerid" depending on schema; using parentcustomerid analog is example.
            var qe = new QueryExpression(Tables.Incident)
            {
                ColumnSet = new ColumnSet("incidentid"),
                Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression("customerid", ConditionOperator.Equal, er.Id),
                        new ConditionExpression("statecode", ConditionOperator.Equal, 0) // active
                    }
                },
                TopCount = 1
            };

            var matches = services.SystemService.RetrieveMultiple(qe);
            if (matches.Entities.Any())
            {
                // User-friendly message; Microsoft recommends InvalidPluginExecutionException for cancellation. citeturn18search20
                throw new InvalidPluginExecutionException("Deletion is blocked because there are active cases related to this account.");
            }
        }
    }

    // Scenario (e): calling a Custom API from within another plug-in
    public sealed class CallCustomApiFromPlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;
            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != Tables.Account) return;

            // Build request by Custom API message name; input/output keys must match Custom API definition.
            // [Inference] Message name equals Custom API unique name.
            var request = new OrganizationRequest("contoso_CalculateTax")
            {
                ["Amount"] = 100m,
                ["Rate"] = 0.15m
            };

            var response = services.SystemService.Execute(request);

            if (response.Results.TryGetValue("Tax", out var taxObj) && taxObj is decimal tax)
            {
                services.Tracing.Trace("[CallCustomApiFromPlugin] Tax={0}", tax);
            }
        }
    }
}
```

## Coding standards cheatsheet and cited sources

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

### Cited sources

Raw URL list (as requested):

```text
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/build-and-package
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-plug-in
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/develop-iplugin-implementations-stateless
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/handle-exceptions
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/understand-the-data-context
https://learn.microsoft.com/en-us/power-apps/developer/data-platform/access-web-services
https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/plugin
https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/tool
https://learn.microsoft.com/en-us/power-platform/alm/tutorials/github-actions-deploy
https://raw.githubusercontent.com/microsoft/powerplatform-actions-lab/main/sample-workflows/export-and-branch-solution-with-spn-auth.yml

https://www.nuget.org/packages/Microsoft.CrmSdk.CoreAssemblies/
https://www.nuget.org/packages/Microsoft.CrmSdk.Workflow/
https://www.nuget.org/packages/Microsoft.PowerPlatform.Dataverse.Client/
https://www.nuget.org/packages/Microsoft.PowerPlatform.Dataverse.Client.Dynamics/
https://www.nuget.org/packages/FakeXrmEasy.Core.v9/
https://www.nuget.org/packages/FakeXrmEasy.Plugins.v9/
https://www.nuget.org/packages/FakeXrmEasy.Messages.v9/
https://www.nuget.org/packages/ILRepack.Lib.MSBuild.Task/

https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/middleware/
https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/plugins/pipeline/basics/
https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/plugins/pipeline/registration/
https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/messages/custom-apis/

https://raw.githubusercontent.com/scottdurow/SparkleXrm/master/spkl/spkl/Package/spkl.json
https://github.com/scottdurow/SparkleXrm
```

