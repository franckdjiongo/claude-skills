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
