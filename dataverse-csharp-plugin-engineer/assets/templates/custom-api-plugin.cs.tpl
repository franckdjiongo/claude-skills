using System;
using Microsoft.Xrm.Sdk;

namespace {{NAMESPACE}}
{
    public sealed class {{CUSTOM_API_PLUGIN_NAME}} : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            if (serviceProvider == null)
            {
                throw new ArgumentNullException(nameof(serviceProvider));
            }

            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = serviceFactory.CreateOrganizationService(context.UserId);

            try
            {
                // TODO: Match parameter names with Custom API definition.
                var inputName = context.InputParameters.Contains("InputName")
                    ? context.InputParameters["InputName"] as string
                    : string.Empty;

                var result = ExecuteCustomOperation(service, tracingService, inputName ?? string.Empty);
                context.OutputParameters["Result"] = result;
            }
            catch (InvalidPluginExecutionException)
            {
                throw;
            }
            catch (Exception ex)
            {
                tracingService?.Trace("{{CUSTOM_API_PLUGIN_NAME}} failed: {0}", ex);
                throw new InvalidPluginExecutionException("Custom API execution failed.", ex);
            }
        }

        private static string ExecuteCustomOperation(
            IOrganizationService service,
            ITracingService tracingService,
            string input)
        {
            // TODO: Replace with operation logic.
            tracingService?.Trace("Processing Custom API input.");
            return $"Processed: {input}";
        }
    }
}
