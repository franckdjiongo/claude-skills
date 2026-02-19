using System;
using Microsoft.Xrm.Sdk;

namespace {{NAMESPACE}}
{
    public sealed class {{PLUGIN_NAME}} : IPlugin
    {
        private readonly string _unsecureConfig;
        private readonly string _secureConfig;

        public {{PLUGIN_NAME}}(string unsecureConfig, string secureConfig)
        {
            _unsecureConfig = unsecureConfig;
            _secureConfig = secureConfig;
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            if (serviceProvider == null)
            {
                throw new ArgumentNullException(nameof(serviceProvider));
            }

            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));

            if (context == null || serviceFactory == null)
            {
                throw new InvalidPluginExecutionException("Plugin runtime services are unavailable.");
            }

            if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity target))
            {
                return;
            }

            if (context.Depth > 1)
            {
                tracingService?.Trace("Skipping execution because depth > 1.");
                return;
            }

            var service = serviceFactory.CreateOrganizationService(context.UserId);
            tracingService?.Trace(
                "{0} start | Message={1} Stage={2} Mode={3} Correlation={4}",
                nameof({{PLUGIN_NAME}}),
                context.MessageName,
                context.Stage,
                context.Mode,
                context.CorrelationId
            );

            try
            {
                ExecuteCore(context, service, tracingService, target);
            }
            catch (InvalidPluginExecutionException)
            {
                throw;
            }
            catch (Exception ex)
            {
                tracingService?.Trace("{0} failed: {1}", nameof({{PLUGIN_NAME}}), ex);
                throw new InvalidPluginExecutionException("An unexpected plugin error occurred.", ex);
            }
        }

        private static void ExecuteCore(
            IPluginExecutionContext context,
            IOrganizationService service,
            ITracingService tracingService,
            Entity target)
        {
            // TODO: Replace with business logic.
            tracingService?.Trace("{{PLUGIN_NAME}} core logic executing for {0}", target.LogicalName);
        }
    }
}
