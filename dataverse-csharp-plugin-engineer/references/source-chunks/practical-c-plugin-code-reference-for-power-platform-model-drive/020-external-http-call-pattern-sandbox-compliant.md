# External HTTP call pattern (sandbox-compliant)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 1028-1148
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > External call and chaining patterns

---

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
