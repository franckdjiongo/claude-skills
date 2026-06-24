// Pattern A — Dataverse plug-in calling a secured Power Automate HTTP-triggered
// flow via Power Platform Managed Identity (FIC, GA 2025-06-15).
//
// Sandbox notes:
//   - .NET Framework 4.6.2 (4.8 planned Q4 2026).
//   - 15 s outbound HTTP cap; we use Timeout = 13 s to keep a 2 s budget.
//   - HttpClient is per-Execute. Sandbox AppDomain recycles; no static caches.
//   - DefaultRequestHeaders.ConnectionClose = true (Microsoft guidance for
//     external-host calls).
//   - Force synchronous via .GetAwaiter().GetResult().
//
// Configure:
//   - Sandbox isolation, signed assembly.
//   - Managed Identity FIC subject:
//       component:pluginassembly,thumbprint:<thumbprint>,environment:<envid>
//     and issuer:
//       https://<env-prefix>.<env-suffix>.environment.api.powerplatform.com/sts
//   - Provision the Dataverse `managedidentities` record with credentialsource:2,
//     subjectscope:1.
//   - Unsecure config example:
//       {"FlowUrl":"https://prod-XX.westeurope.logic.azure.com/...","Resource":"https://service.flow.microsoft.com//.default"}
//       (note: DOUBLE slash before `.default` — Entra v2 strips one trailing
//        slash; without doubling, `aud` lacks the slash and Power Automate
//        rejects with 403 MisMatchingOAuthClaims. See references/11.)
//     For sovereign clouds substitute the cloud-specific audience (see
//     references/01-protocol-and-claims.md).

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Xrm.Sdk;

namespace Contoso.Dataverse.Plugins
{
    /// <summary>
    /// Stage: PostOperation (40), Synchronous, Isolation: Sandbox.
    /// </summary>
    public sealed class InvokeFlowPlugin : IPlugin
    {
        private readonly Uri _flowUrl;
        private readonly string _resource;

        public InvokeFlowPlugin(string unsecureConfig, string secureConfig)
        {
            if (string.IsNullOrWhiteSpace(unsecureConfig))
                throw new InvalidPluginExecutionException("Unsecure configuration must contain FlowUrl and Resource.");

            var cfg = ParseSimpleJson(unsecureConfig);
            if (!cfg.TryGetValue("FlowUrl", out var url) || string.IsNullOrWhiteSpace(url))
                throw new InvalidPluginExecutionException("FlowUrl missing in unsecure configuration.");

            _flowUrl = new Uri(url, UriKind.Absolute);
            _resource = cfg.TryGetValue("Resource", out var r) && !string.IsNullOrWhiteSpace(r)
                ? r
                // Double slash on the Public-cloud audience: Entra v2 strips
                // the trailing slash from the resource URI, producing a token
                // whose `aud` claim has no slash, which Power Automate rejects
                // with 403 MisMatchingOAuthClaims. Doubling the slash makes
                // Entra trim one and leaves the required slash in `aud`.
                // See references/11-known-bugs-and-workarounds.md.
                : "https://service.flow.microsoft.com//.default";

            if (_flowUrl.Scheme != Uri.UriSchemeHttps)
                throw new InvalidPluginExecutionException("FlowUrl must be HTTPS — sandbox prohibits HTTP.");
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            var trace = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var ctx = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var miSvc = (IManagedIdentityService)serviceProvider.GetService(typeof(IManagedIdentityService));

            if (miSvc == null)
                throw new InvalidPluginExecutionException(
                    "IManagedIdentityService not available. Confirm Managed Identity is configured for the assembly.");

            string token;
            try
            {
                token = miSvc.AcquireToken(new[] { _resource });
                if (string.IsNullOrEmpty(token))
                    throw new InvalidPluginExecutionException("AcquireToken returned an empty token.");
            }
            catch (Exception ex)
            {
                trace.Trace("Token acquisition failed: {0}", ex);
                throw new InvalidPluginExecutionException("Failed to acquire managed identity token.", ex);
            }

            var payload = BuildPayload(ctx);

            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(13);
                client.DefaultRequestHeaders.ConnectionClose = true;
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                using (var content = new StringContent(payload, Encoding.UTF8, "application/json"))
                {
                    HttpResponseMessage response;
                    try
                    {
                        response = client.PostAsync(_flowUrl, content).GetAwaiter().GetResult();
                    }
                    catch (AggregateException aex)
                    {
                        foreach (var inner in aex.InnerExceptions)
                            trace.Trace("Inner: {0}", inner);
                        throw new InvalidPluginExecutionException("HTTP transport failure invoking flow.", aex);
                    }

                    var body = response.Content?.ReadAsStringAsync().GetAwaiter().GetResult() ?? string.Empty;
                    trace.Trace("Flow response: HTTP {0} — {1}", (int)response.StatusCode, body);

                    if (response.StatusCode == HttpStatusCode.Unauthorized)
                        throw new InvalidPluginExecutionException(
                            "401 from flow — verify aud=https://service.flow.microsoft.com/, tid matches, "
                            + "and FIC subject is component:pluginassembly,thumbprint:<>,environment:<>.");

                    if (!response.IsSuccessStatusCode)
                        throw new InvalidPluginExecutionException(string.Format(
                            CultureInfo.InvariantCulture,
                            "Flow returned non-success: HTTP {0}: {1}",
                            (int)response.StatusCode, body));
                }
            }
        }

        private static string BuildPayload(IPluginExecutionContext ctx)
        {
            var sb = new StringBuilder(256);
            sb.Append("{\"messageName\":\"").Append(Escape(ctx.MessageName)).Append("\",")
              .Append("\"primaryEntityName\":\"").Append(Escape(ctx.PrimaryEntityName)).Append("\",")
              .Append("\"primaryEntityId\":\"").Append(ctx.PrimaryEntityId).Append("\",")
              .Append("\"correlationId\":\"").Append(ctx.CorrelationId).Append("\",")
              .Append("\"userId\":\"").Append(ctx.UserId).Append("\"}");
            return sb.ToString();
        }

        private static string Escape(string s) =>
            (s ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");

        private static Dictionary<string, string> ParseSimpleJson(string json)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            using (var sr = new StringReader(json))
            {
                var raw = sr.ReadToEnd().Trim().TrimStart('{').TrimEnd('}');
                foreach (var pair in raw.Split(','))
                {
                    var kv = pair.Split(new[] { ':' }, 2);
                    if (kv.Length != 2) continue;
                    dict[kv[0].Trim().Trim('"')] = kv[1].Trim().Trim('"');
                }
            }
            return dict;
        }
    }
}
