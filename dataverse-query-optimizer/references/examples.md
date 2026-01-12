# Query Examples - Natural Language to Optimized Queries

This document contains examples of translating natural language requests into optimized FetchXML and OData queries for Dataverse.

## Example 1: Find Active Contacts in Montreal Created This Year

### Natural Language
"Find all active contacts in Montreal created this year"

### Analysis
- Table: `contact`
- Filters: 
  - Active status (`statecode = 0`)
  - City = Montreal
  - Created this year
- Columns: Not specified, so choose relevant ones
- Optimization: All filters use indexed columns

### Optimized FetchXML
```xml
<fetch top='1000'>
  <entity name='contact'>
    <attribute name='fullname' />
    <attribute name='emailaddress1' />
    <attribute name='telephone1' />
    <attribute name='createdon' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition attribute='address1_city' operator='eq' value='Montreal' />
      <condition attribute='createdon' operator='this-year' />
    </filter>
    <order attribute='fullname' descending='false' />
  </entity>
</fetch>
```

### Optimized OData
```
/contacts?$select=fullname,emailaddress1,telephone1,createdon&$filter=statecode eq 0 and address1_city eq 'Montreal' and year(createdon) eq 2025&$orderby=fullname&$top=1000
```

### Why This is Optimized
- ✅ Specific column selection
- ✅ Filters on indexed columns (`statecode`, `createdon`)
- ✅ Limited results with `top`
- ✅ Clear sorting

---

## Example 2: Count Opportunities by Status

### Natural Language
"How many opportunities do we have in each status?"

### Analysis
- Table: `opportunity`
- Aggregation: Count by status
- No need to retrieve individual records
- Use GROUP BY

### Optimized FetchXML
```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='statuscode' groupby='true' alias='status' />
    <attribute name='opportunityid' aggregate='count' alias='count' />
  </entity>
</fetch>
```

### Optimized OData
```
/opportunities?$apply=groupby((statuscode),aggregate($count as count))
```

### Alternative OData (if $apply not supported)
Use multiple requests:
```
/opportunities/$count?$filter=statuscode eq 1
/opportunities/$count?$filter=statuscode eq 2
```

### Why This is Optimized
- ✅ Uses aggregation instead of retrieving all records
- ✅ Minimal data transfer
- ✅ Efficient server-side processing

---

## Example 3: Get Accounts with Their Primary Contacts

### Natural Language
"Show me all active accounts with their primary contact information"

### Analysis
- Table: `account` (main)
- Related: `contact` (via primarycontactid)
- Filters: Active accounts
- Join type: Outer (include accounts without primary contact)

### Optimized FetchXML
```xml
<fetch top='500'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='revenue' />
    <link-entity name='contact' from='contactid' to='primarycontactid' link-type='outer' alias='pc'>
      <attribute name='fullname' />
      <attribute name='emailaddress1' />
      <attribute name='telephone1' />
    </link-entity>
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
    <order attribute='name' descending='false' />
  </entity>
</fetch>
```

### Optimized OData
```
/accounts?$select=name,accountnumber,revenue&$expand=primarycontactid($select=fullname,emailaddress1,telephone1)&$filter=statecode eq 0&$orderby=name&$top=500
```

### Why This is Optimized
- ✅ Specific columns from both entities
- ✅ Outer join (includes accounts without contacts)
- ✅ Filter on indexed column
- ✅ Limited result set
- ✅ Single query instead of multiple requests

---

## Example 4: Find Customers Who Haven't Placed Orders Recently

### Natural Language
"Find customers who haven't placed an order in the last 90 days"

### Analysis
- Complex: NOT EXISTS pattern
- Tables: `account`, `salesorder`
- Better approach: Use left join with filter on null

### Optimized FetchXML
```xml
<fetch top='500'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='emailaddress1' />
    <link-entity name='salesorder' from='customerid' to='accountid' link-type='outer' alias='recent_orders'>
      <attribute name='salesorderid' />
      <filter type='and'>
        <condition attribute='createdon' operator='last-x-days' value='90' />
        <condition attribute='statecode' operator='eq' value='0' />
      </filter>
    </link-entity>
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition entityname='recent_orders' attribute='salesorderid' operator='null' />
    </filter>
  </entity>
</fetch>
```

### Alternative Approach (Better Performance)
Two separate queries:
1. Get accounts with recent orders
2. Exclude those from all active accounts client-side

```xml
<!-- Query 1: Accounts with recent orders -->
<fetch distinct='true'>
  <entity name='account'>
    <attribute name='accountid' />
    <link-entity name='salesorder' from='customerid' to='accountid' link-type='inner'>
      <filter type='and'>
        <condition attribute='createdon' operator='last-x-days' value='90' />
      </filter>
    </link-entity>
  </entity>
</fetch>

<!-- Query 2: All active accounts -->
<fetch top='1000'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
  </entity>
</fetch>

<!-- Then filter client-side to exclude Query 1 results -->
```

### Why This Approach
- ✅ Simpler queries
- ✅ Better performance for large datasets
- ✅ Avoids complex joins
- ⚠️ Requires client-side processing

---

## Example 5: Search for Contacts by Email Domain

### Natural Language
"Find all contacts with email addresses from gmail.com"

### Analysis
- Pattern matching needed
- ⚠️ Avoid leading wildcard
- Use trailing wildcard or CONTAINS carefully

### ❌ Bad Approach (Leading Wildcard)
```xml
<condition attribute='emailaddress1' operator='like' value='%@gmail.com' />
```

### ✅ Better Approach (Trailing Wildcard if Possible)
If searching for specific user:
```xml
<condition attribute='emailaddress1' operator='like' value='john%@gmail.com' />
```

### ✅ Best Approach (Use Dataverse Search)
For domain-based search, use Dataverse Search API instead of standard query:
```
POST /api/data/v9.2/search
{
  "search": "@gmail.com",
  "entities": ["contact"],
  "searchMode": "all",
  "filter": "statecode eq 0"
}
```

### Optimized FetchXML (if you must use pattern)
```xml
<fetch top='500'>
  <entity name='contact'>
    <attribute name='fullname' />
    <attribute name='emailaddress1' />
    <filter type='and'>
      <condition attribute='emailaddress1' operator='not-null' />
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
  </entity>
</fetch>
<!-- Then filter '@gmail.com' client-side -->
```

### Why This Approach
- ✅ Avoids leading wildcard anti-pattern
- ✅ Uses indexed column filter
- ✅ Leverages Dataverse Search capabilities
- ⚠️ May require client-side filtering

---

## Example 6: Get Total Revenue by Industry

### Natural Language
"What's our total revenue by industry code?"

### Analysis
- Aggregation: SUM + GROUP BY
- Table: `account`
- Column: `revenue`
- Group by: `industrycode`

### Optimized FetchXML
```xml
<fetch aggregate='true'>
  <entity name='account'>
    <attribute name='industrycode' groupby='true' alias='industry' />
    <attribute name='revenue' aggregate='sum' alias='total_revenue' />
    <attribute name='accountid' aggregate='count' alias='count' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition attribute='revenue' operator='not-null' />
    </filter>
    <order alias='total_revenue' descending='true' />
  </entity>
</fetch>
```

### Optimized OData
```
/accounts?$apply=filter(statecode eq 0 and revenue ne null)/groupby((industrycode),aggregate(revenue with sum as total_revenue,$count as count))
```

### Why This is Optimized
- ✅ Server-side aggregation
- ✅ Filters before aggregation
- ✅ Includes count for context
- ✅ Sorted by revenue (most valuable industries first)

---

## Example 7: Recent High-Value Opportunities

### Natural Language
"Show me opportunities created in the last 30 days with estimated value over $50,000, sorted by value"

### Analysis
- Table: `opportunity`
- Filters: Recent + High value
- Both filters on indexed columns
- Sort by value descending

### Optimized FetchXML
```xml
<fetch top='100'>
  <entity name='opportunity'>
    <attribute name='name' />
    <attribute name='estimatedvalue' />
    <attribute name='estimatedclosedate' />
    <attribute name='createdon' />
    <link-entity name='account' from='accountid' to='customerid' link-type='outer' alias='acc'>
      <attribute name='name' />
    </link-entity>
    <filter type='and'>
      <condition attribute='createdon' operator='last-x-days' value='30' />
      <condition attribute='estimatedvalue' operator='ge' value='50000' />
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
    <order attribute='estimatedvalue' descending='true' />
  </entity>
</fetch>
```

### Optimized OData
```
/opportunities?$select=name,estimatedvalue,estimatedclosedate,createdon&$expand=customerid_account($select=name)&$filter=createdon ge 2025-09-19 and estimatedvalue ge 50000 and statecode eq 0&$orderby=estimatedvalue desc&$top=100
```

### Why This is Optimized
- ✅ All filters on indexed columns
- ✅ Limited columns
- ✅ Includes related account data
- ✅ Sorted for business value
- ✅ Limited results

---

## Example 8: Contacts Modified by Specific User

### Natural Language
"Show me all contacts modified by John Doe in the last week"

### Analysis
- Table: `contact`
- Filter: modifiedby (lookup to systemuser)
- Filter: modifiedon (date)
- Need to find user ID first

### Step 1: Find User ID
```xml
<fetch top='1'>
  <entity name='systemuser'>
    <attribute name='systemuserid' />
    <filter type='and'>
      <condition attribute='fullname' operator='eq' value='John Doe' />
    </filter>
  </entity>
</fetch>
```

### Step 2: Query Contacts
```xml
<fetch top='500'>
  <entity name='contact'>
    <attribute name='fullname' />
    <attribute name='emailaddress1' />
    <attribute name='modifiedon' />
    <link-entity name='systemuser' from='systemuserid' to='modifiedby' link-type='inner' alias='modifier'>
      <attribute name='fullname' />
    </link-entity>
    <filter type='and'>
      <condition attribute='modifiedby' operator='eq' value='USER-GUID-HERE' />
      <condition attribute='modifiedon' operator='last-x-days' value='7' />
    </filter>
    <order attribute='modifiedon' descending='true' />
  </entity>
</fetch>
```

### Optimized OData
```
/contacts?$select=fullname,emailaddress1,modifiedon&$expand=modifiedby($select=fullname)&$filter=modifiedby/systemuserid eq 'USER-GUID' and modifiedon ge 2025-10-12&$orderby=modifiedon desc&$top=500
```

### Why This is Optimized
- ✅ Two-step approach (find user, then query)
- ✅ Filters on indexed columns
- ✅ Specific column selection
- ✅ Sorted by relevance

---

## Example 9: Accounts Without Any Contacts

### Natural Language
"Find all accounts that don't have any contacts"

### Analysis
- NOT EXISTS pattern
- Use outer join + null filter
- Alternative: Use $count endpoint

### Optimized FetchXML
```xml
<fetch top='500'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='createdon' />
    <link-entity name='contact' from='parentcustomerid' to='accountid' link-type='outer' alias='contacts'>
      <attribute name='contactid' />
    </link-entity>
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition entityname='contacts' attribute='contactid' operator='null' />
    </filter>
  </entity>
</fetch>
```

### Alternative: Two-Query Approach
More efficient for large datasets:

1. Get all active accounts
2. For each account, check contact count
3. Filter client-side

### Why This Approach
- ✅ Efficient for smaller datasets
- ✅ Single query
- ⚠️ May be slow for very large tables
- Consider two-query approach for better performance at scale

---

## Example 10: Paginated Query for All Active Accounts

### Natural Language
"Get all active accounts (could be thousands)"

### Analysis
- Pagination required
- Process in batches of 500
- Track paging cookie

### Optimized FetchXML - Initial Request
```xml
<fetch page='1' count='500'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='revenue' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
    <order attribute='name' descending='false' />
  </entity>
</fetch>
```

### Subsequent Requests (with cookie)
```xml
<fetch page='2' count='500' paging-cookie='ENCODED-COOKIE-FROM-PREVIOUS-RESPONSE'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='revenue' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
    <order attribute='name' descending='false' />
  </entity>
</fetch>
```

### Optimized OData
```http
GET /api/data/v9.2/accounts?$select=name,accountnumber,revenue&$filter=statecode eq 0&$orderby=name
Prefer: odata.maxpagesize=500

<!-- Response includes @odata.nextLink - follow it for next page -->
GET /api/data/v9.2/accounts?$select=name,accountnumber,revenue&$filter=statecode eq 0&$orderby=name&$skiptoken=TOKEN
```

### Implementation Pattern (Power Automate)
1. Initialize variable for cookie/nextLink
2. Do-Until loop: moreRecords = false
3. Execute query with current cookie
4. Process results
5. Update cookie from response
6. Check moreRecords flag

### Why This is Optimized
- ✅ Handles unlimited records
- ✅ Consistent page size
- ✅ Proper cookie-based pagination
- ✅ Efficient memory usage

---

## Common Transformation Patterns

### Pattern 1: "Find records WHERE..."
→ Use `<filter><condition>` (FetchXML) or `$filter` (OData)

### Pattern 2: "Show me X and Y columns"
→ Use specific `<attribute>` (FetchXML) or `$select` (OData)

### Pattern 3: "Include related Z data"
→ Use `<link-entity>` (FetchXML) or `$expand` (OData)

### Pattern 4: "Count/Sum/Average by category"
→ Use `<fetch aggregate='true'>` with groupby

### Pattern 5: "Find records WITHOUT related data"
→ Use outer join + null filter

### Pattern 6: "Get top N records"
→ Use `top` attribute (FetchXML) or `$top` (OData)

### Pattern 7: "Sort by X"
→ Use `<order>` (FetchXML) or `$orderby` (OData)

### Pattern 8: "Search for text containing X"
→ Use trailing wildcard or Dataverse Search (avoid leading wildcards)

---

## Quick Reference: Natural Language Keywords → Query Elements

| Natural Language | FetchXML | OData |
|------------------|----------|-------|
| "find", "get", "show" | `<fetch>` | GET request |
| "active", "status = X" | `<condition attribute='statecode'>` | `$filter=statecode eq X` |
| "created this year" | `<condition operator='this-year'>` | `$filter=year(createdon) eq 2025` |
| "in the last X days" | `<condition operator='last-x-days'>` | `$filter=createdon ge DATE` |
| "top N" | `top='N'` | `$top=N` |
| "including related X" | `<link-entity>` | `$expand` |
| "count", "total" | `aggregate='count'` | `$count` or `$apply` |
| "sort by X" | `<order attribute='X'>` | `$orderby=X` |
| "where X > Y" | `<condition operator='gt'>` | `$filter=X gt Y` |
| "containing text" | `<condition operator='like'>` | `$filter=contains()` or `startswith()` |
