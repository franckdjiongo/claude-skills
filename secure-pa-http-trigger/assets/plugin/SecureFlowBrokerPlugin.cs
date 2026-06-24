// Pattern B — Dataverse plug-in calling a broker API (your service) which
// then invokes the secured Power Automate HTTP-triggered flow. The plug-in
// does not call the flow directly. Use this when governance forbids the
// `[Inference]` on app-only acceptance for `Any user in my tenant`, or when
// you want centralised audit/policy in front of the flow.
//
// Target framework: .NET Framework 4.6.2.
// NuGet: Newtonsoft.Json (or DataContractJsonSerializer if you want zero deps).
//
// Configure:
//   - Sandbox isolation, signed assembly.
//   - Secure configuration:    TenantId=<>;ClientId=<>;ClientSecret=<>
//   - Unsecure configuration:  BrokerUrl=<>;Scope=api://<broker-app-id>/.default
//
// Pattern B's static HttpClient and token-cache fields are intentional — they
// assume the broker pattern's longer-lived caching benefits across invocations.

using Microsoft.Xrm.Sdk;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

namespace Contoso.Plugins
{
    public sealed class SecureFlowBrokerPlugin : IPlugin
    {
        private static readonly HttpClient Http = CreateHttpClient();
        private static readonly object TokenLock = new object();

        private static string _cachedAccessToken;
        private static DateTimeOffset _cachedAccessTokenExpiresUtc = DateTimeOffset.MinValue;

        private readonly IDictionary<string, string> _unsecure;
        private readonly IDictionary<string, string> _secure;

        public SecureFlowBrokerPlugin(string unsecure, string secure)
        {
            _unsecure = ParseConfig(unsecure);
            _secure = ParseConfig(secure);
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            var tracing = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

            var correlationId = context.CorrelationId.ToString();
            tracing.Trace("SecureFlowBrokerPlugin start. CorrelationId={0}", correlationId);

            var brokerUrl = GetRequired(_unsecure, "BrokerUrl");
            var tokenEndpoint = string.Format(
                CultureInfo.InvariantCulture,
                "https://login.microsoftonline.com/{0}/oauth2/v2.0/token",
                GetRequired(_secure, "TenantId"));

            var clientId = GetRequired(_secure, "ClientId");
            var clientSecret = GetRequired(_secure, "ClientSecret");
            var scope = GetRequired(_unsecure, "Scope");

            var payload = new BrokerRequest
            {
                MessageName = context.MessageName,
                PrimaryEntityName = context.PrimaryEntityName,
                PrimaryEntityId = context.PrimaryEntityId,
                CorrelationId = correlationId,
                InitiatingUserId = context.InitiatingUserId,
                UserId = context.UserId,
                OperationId = context.OperationId,
                TimestampUtc = DateTime.UtcNow
            };

            var brokerResponse = PostWithAuthRetry(
                tracing,
                brokerUrl,
                tokenEndpoint,
                clientId,
                clientSecret,
                scope,
                payload,
                correlationId);

            tracing.Trace(
                "Broker call completed. CorrelationId={0}, StatusCode={1}, BrokerReference={2}",
                correlationId,
                (int)brokerResponse.StatusCode,
                brokerResponse.ReferenceId ?? "(none)");
        }

        private static HttpClient CreateHttpClient()
        {
            var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.ConnectionClose = true;
            client.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
            return client;
        }

        private BrokerResponse PostWithAuthRetry(
            ITracingService tracing,
            string brokerUrl,
            string tokenEndpoint,
            string clientId,
            string clientSecret,
            string scope,
            BrokerRequest payload,
            string correlationId)
        {
            string token = GetAccessToken(tracing, tokenEndpoint, clientId, clientSecret, scope, false);

            var response = SendBrokerRequest(tracing, brokerUrl, token, payload, correlationId);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                tracing.Trace("401 from broker. Refreshing token and retrying once. CorrelationId={0}", correlationId);
                token = GetAccessToken(tracing, tokenEndpoint, clientId, clientSecret, scope, true);
                response = SendBrokerRequest(tracing, brokerUrl, token, payload, correlationId);
            }

            if (response.StatusCode == HttpStatusCode.Forbidden)
            {
                throw new InvalidPluginExecutionException(
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "Broker returned 403 Forbidden. CorrelationId={0}. Check broker role assignments, consent, or access policy.",
                        correlationId));
            }

            if ((int)response.StatusCode >= 400)
            {
                throw new InvalidPluginExecutionException(
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "Broker returned HTTP {0}. CorrelationId={1}. Body={2}",
                        (int)response.StatusCode,
                        correlationId,
                        response.RawBody ?? "(empty)"));
            }

            return response;
        }

        private BrokerResponse SendBrokerRequest(
            ITracingService tracing,
            string brokerUrl,
            string accessToken,
            BrokerRequest payload,
            string correlationId)
        {
            using (var request = new HttpRequestMessage(HttpMethod.Post, brokerUrl))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.Add("x-correlation-id", correlationId);
                request.Content = new StringContent(
                    JsonConvert.SerializeObject(payload),
                    Encoding.UTF8,
                    "application/json");

                using (var response = Http.SendAsync(request).GetAwaiter().GetResult())
                {
                    var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    tracing.Trace("Broker raw response. StatusCode={0}, CorrelationId={1}", (int)response.StatusCode, correlationId);

                    BrokerResponse typed = null;
                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        try { typed = JsonConvert.DeserializeObject<BrokerResponse>(body); }
                        catch { /* keep raw body for diagnostics */ }
                    }

                    return new BrokerResponse
                    {
                        StatusCode = response.StatusCode,
                        ReferenceId = typed != null ? typed.ReferenceId : null,
                        Result = typed != null ? typed.Result : null,
                        RawBody = body
                    };
                }
            }
        }

        private static string GetAccessToken(
            ITracingService tracing,
            string tokenEndpoint,
            string clientId,
            string clientSecret,
            string scope,
            bool forceRefresh)
        {
            lock (TokenLock)
            {
                if (!forceRefresh &&
                    !string.IsNullOrWhiteSpace(_cachedAccessToken) &&
                    DateTimeOffset.UtcNow < _cachedAccessTokenExpiresUtc.AddMinutes(-5))
                {
                    return _cachedAccessToken;
                }

                using (var request = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint))
                {
                    request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        { "client_id", clientId },
                        { "client_secret", clientSecret },
                        { "scope", scope },
                        { "grant_type", "client_credentials" }
                    });

                    using (var response = Http.SendAsync(request).GetAwaiter().GetResult())
                    {
                        var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                        if (!response.IsSuccessStatusCode)
                        {
                            throw new InvalidPluginExecutionException(
                                "Token acquisition failed for broker API. Status=" +
                                (int)response.StatusCode + "; Body=" + body);
                        }

                        var json = JObject.Parse(body);
                        _cachedAccessToken = (string)json["access_token"];
                        var expiresInSeconds = (int?)json["expires_in"] ?? 3599;
                        _cachedAccessTokenExpiresUtc = DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds);

                        tracing.Trace("Broker access token acquired/refreshed.");
                        return _cachedAccessToken;
                    }
                }
            }
        }

        private static IDictionary<string, string> ParseConfig(string input)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (string.IsNullOrWhiteSpace(input))
                return dict;

            var pairs = input.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var pair in pairs)
            {
                var i = pair.IndexOf('=');
                if (i <= 0) continue;

                var key = pair.Substring(0, i).Trim();
                var value = pair.Substring(i + 1).Trim();
                if (!string.IsNullOrWhiteSpace(key))
                {
                    dict[key] = value;
                }
            }

            return dict;
        }

        private static string GetRequired(IDictionary<string, string> config, string key)
        {
            string value;
            if (!config.TryGetValue(key, out value) || string.IsNullOrWhiteSpace(value))
                throw new InvalidPluginExecutionException("Missing required plug-in configuration value: " + key);
            return value;
        }

        private sealed class BrokerRequest
        {
            public string MessageName { get; set; }
            public string PrimaryEntityName { get; set; }
            public Guid PrimaryEntityId { get; set; }
            public Guid InitiatingUserId { get; set; }
            public Guid UserId { get; set; }
            public Guid OperationId { get; set; }
            public string CorrelationId { get; set; }
            public DateTime TimestampUtc { get; set; }
        }

        private sealed class BrokerResponse
        {
            [JsonIgnore]
            public HttpStatusCode StatusCode { get; set; }

            public string ReferenceId { get; set; }
            public string Result { get; set; }

            [JsonIgnore]
            public string RawBody { get; set; }
        }
    }
}
