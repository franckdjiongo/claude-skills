# Canonical plug-in template

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 204-403
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > Plugin patterns library

---

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
