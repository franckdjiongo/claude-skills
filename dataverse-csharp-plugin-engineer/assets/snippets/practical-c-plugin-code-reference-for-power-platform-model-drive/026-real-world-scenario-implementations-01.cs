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
