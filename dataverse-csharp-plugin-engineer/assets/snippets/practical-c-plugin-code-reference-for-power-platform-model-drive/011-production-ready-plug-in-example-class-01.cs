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
