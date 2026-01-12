---
name: dataverse-query-optimizer
description: Analyzes natural language data requests and translates them into optimized FetchXML or OData queries for the Dataverse API. Applies performance best practices, avoids anti-patterns (leading wildcards, calculated column filters, excessive joins), and ensures efficient query structure. Use when the user needs to query Dataverse data, wants to optimize an existing query, or asks how to retrieve specific data from Dynamics 365/Power Apps/Dataverse.
---

# Dataverse Query Optimizer

Translate natural language data requests into optimized FetchXML or OData queries for Microsoft Dataverse.

## Overview

This skill helps create efficient Dataverse queries by:
1. Understanding the data request in natural language
2. Identifying the target table(s) and columns
3. Determining appropriate filters and joins
4. Generating optimized FetchXML and/or OData queries
5. Applying performance best practices
6. Avoiding known anti-patterns

## Workflow

### Step 1: Understand the Request

Parse the natural language request to identify:
- **Target table(s)**: Which Dataverse table(s) to query
- **Required columns**: Which fields to return
- **Filter criteria**: Conditions to filter records
- **Related data**: Joins to other tables needed
- **Aggregation**: COUNT, SUM, AVG, etc.
- **Sorting**: Order of results
- **Limit**: Number of records (pagination needed?)

**Example:**
Request: "Find all active contacts in Montreal created this year"
- Table: `contact`
- Columns: fullname, emailaddress1, telephone1, createdon (inferred)
- Filters: statecode=0, city=Montreal, createdon this year
- No joins needed
- Sort by fullname (inferred)
- Limit to reasonable number (e.g., 1000)

### Step 2: Validate Against Anti-Patterns

Before generating the query, check for anti-patterns:

❌ **Leading wildcards** - Pattern matching that starts with wildcard (e.g., `%Smith`)
- Solution: Use Dataverse Search or redesign

❌ **Filtering on calculated/formula columns** - Real-time computed values
- Solution: Filter on source columns instead

❌ **Selecting all columns** - Unnecessary data transfer
- Solution: Select only needed columns

❌ **Deep nested joins** - More than 3 levels
- Solution: Denormalize or use multiple queries

❌ **Missing pagination** - For large datasets
- Solution: Implement paging

See `references/query-optimization-guide.md` for complete anti-patterns list.

### Step 3: Generate Optimized Query

Generate both FetchXML and OData versions when possible.

**FetchXML characteristics:**
- XML-based syntax
- Used in Power Automate "List rows" action
- Supports advanced features (aggregation, pagination)
- Maximum 5000 records per request

**OData characteristics:**
- REST API query parameters
- Used with Web API
- URL-based syntax
- Better for programmatic access

### Step 4: Apply Performance Optimizations

**Always include:**
1. **Column selection** - Specific `<attribute>` elements (FetchXML) or `$select` (OData)
2. **Result limit** - `top` attribute (FetchXML) or `$top` (OData)
3. **Indexed column filters** - Filter on statecode, createdon, lookups, primary keys
4. **Appropriate sorting** - `<order>` (FetchXML) or `$orderby` (OData)

**Consider adding:**
1. **Late materialization** - For queries with many joins or lookup columns
2. **Pagination** - For datasets potentially > 500 records
3. **Aggregation** - Instead of retrieving all records for counts/sums

### Step 5: Provide Query and Explanation

Present the optimized query with:
1. **The query** - Both FetchXML and OData if applicable
2. **Explanation** - Why this structure was chosen
3. **Optimization notes** - What makes this query efficient
4. **Usage guidance** - How to execute (Power Automate, API, etc.)
5. **Warnings** - Any limitations or considerations

## Query Generation Guidelines

### Column Selection

**Always select specific columns:**

FetchXML:
```xml
<attribute name='name' />
<attribute name='accountnumber' />
<attribute name='revenue' />
```

OData:
```
$select=name,accountnumber,revenue
```

**Never use `<all-attributes />` unless explicitly requested for debugging.**

### Filtering

**Use indexed columns when possible:**
- Primary keys (accountid, contactid, etc.)
- Lookup fields (ownerid, parentcustomerid, etc.)
- statecode, statuscode
- createdon, modifiedon
- createdby, modifiedby

**FetchXML:**
```xml
<filter type='and'>
  <condition attribute='statecode' operator='eq' value='0' />
  <condition attribute='createdon' operator='last-x-days' value='30' />
</filter>
```

**OData:**
```
$filter=statecode eq 0 and createdon ge 2025-09-19
```

### Joining Tables

**Use appropriate link types:**
- `inner` - Only matching records
- `outer` - Include records without matches (LEFT JOIN)

**FetchXML:**
```xml
<link-entity name='contact' from='contactid' to='primarycontactid' link-type='outer'>
  <attribute name='fullname' />
  <attribute name='emailaddress1' />
</link-entity>
```

**OData:**
```
$expand=primarycontactid($select=fullname,emailaddress1)
```

**Keep joins shallow (1-3 levels maximum).**

### Aggregation

For counts, sums, averages - use aggregation instead of retrieving all records.

**FetchXML:**
```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='estimatedvalue' aggregate='sum' alias='total' />
    <attribute name='opportunityid' aggregate='count' alias='count' />
  </entity>
</fetch>
```

**OData:**
```
/opportunities/$count
```

### Pagination

For large datasets (potentially > 500 records), implement pagination.

**FetchXML:**
```xml
<fetch page='1' count='500'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

**OData:**
```http
GET /accounts?$select=name
Prefer: odata.maxpagesize=500
```

Then follow `@odata.nextLink` or use paging-cookie for subsequent pages.

## Reference Documentation

Load these references as needed for detailed syntax and patterns:

### Core References

- **`references/fetchxml-reference.md`** - Complete FetchXML syntax, elements, attributes, and patterns
- **`references/odata-reference.md`** - OData query syntax, operators, and Web API usage
- **`references/query-optimization-guide.md`** - Performance best practices and anti-patterns to avoid
- **`references/examples.md`** - Natural language to query transformations with explanations

### When to Read Each Reference

**Read `fetchxml-reference.md` when:**
- Need FetchXML-specific syntax (aggregation, late materialization, etc.)
- Building complex joins in FetchXML
- Implementing pagination with paging-cookie
- Need to understand FetchXML-specific optimizations

**Read `odata-reference.md` when:**
- Building Web API queries
- Need OData-specific operators or functions
- Understanding $expand syntax
- Working with REST API directly

**Read `query-optimization-guide.md` when:**
- Query performance is a concern
- Need to validate against anti-patterns
- Implementing advanced optimizations
- Troubleshooting slow queries

**Read `examples.md` when:**
- Need inspiration for query patterns
- Want to see natural language → query transformations
- Looking for similar use cases
- Need quick reference for common patterns

## Common Table Names

| Business Entity | Logical Name | Entity Set Name |
|----------------|--------------|-----------------|
| Accounts | account | accounts |
| Contacts | contact | contacts |
| Leads | lead | leads |
| Opportunities | opportunity | opportunities |
| Cases | incident | incidents |
| Activities | activitypointer | activitypointers |
| Users | systemuser | systemusers |
| Teams | team | teams |
| Business Units | businessunit | businessunits |

**Note:** FetchXML uses LogicalName, OData uses EntitySetName (plural).

## Output Format

When presenting a query, use this structure:

```markdown
### [Query Purpose]

**FetchXML:**
```xml
[Full FetchXML query]
```

**OData:**
```
[Full OData query URL]
```

**Explanation:**
- [What the query does]
- [Why this structure was chosen]
- [Key optimizations applied]

**Usage:**
- Power Automate: Use in "List rows" action, "FetchXml Query" parameter
- Web API: Use as URL for GET request
- [Other usage instructions as needed]

**Performance Notes:**
- [Why this is optimized]
- [Any trade-offs or considerations]

**Limitations:**
- [Any limitations to be aware of]
- [Pagination needed if > 5000 records]
```

## Best Practices

1. **Ask clarifying questions** if the request is ambiguous:
   - Which table/entity?
   - What columns are needed?
   - What defines "active" in this context?
   - How many records are expected?

2. **Provide both FetchXML and OData** when possible for flexibility

3. **Explain optimizations** so the user understands why the query is structured this way

4. **Include usage instructions** for Power Automate, Web API, or other contexts

5. **Warn about anti-patterns** if the natural language request would lead to inefficient query

6. **Suggest alternatives** if the requested query would be inefficient

## Example Interaction

**User:** "How do I get all contacts created in the last 30 days in Montreal?"

**Response:**

I'll create an optimized query to retrieve active contacts from Montreal created in the last 30 days.

### Active Montreal Contacts (Last 30 Days)

**FetchXML:**
```xml
<fetch top='500'>
  <entity name='contact'>
    <attribute name='fullname' />
    <attribute name='emailaddress1' />
    <attribute name='telephone1' />
    <attribute name='address1_city' />
    <attribute name='createdon' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition attribute='address1_city' operator='eq' value='Montreal' />
      <condition attribute='createdon' operator='last-x-days' value='30' />
    </filter>
    <order attribute='createdon' descending='true' />
  </entity>
</fetch>
```

**OData:**
```
/contacts?$select=fullname,emailaddress1,telephone1,address1_city,createdon&$filter=statecode eq 0 and address1_city eq 'Montreal' and createdon ge 2025-09-19&$orderby=createdon desc&$top=500
```

**Explanation:**
- Queries the `contact` table for Montreal-based contacts
- Filters by active status (statecode=0), city, and creation date
- Returns only essential contact fields
- Sorted by creation date (newest first)
- Limited to 500 records for performance

**Usage in Power Automate:**
1. Add "List rows" action (Microsoft Dataverse connector)
2. Select "contacts" table
3. Paste FetchXML in "Fetch Xml Query" field

**Performance Notes:**
- ✅ All filters use indexed columns (statecode, createdon)
- ✅ Specific column selection minimizes data transfer
- ✅ Limited result set with `top='500'`
- ✅ Sorted efficiently

**Limitations:**
- Returns maximum 500 records. If you expect more contacts, implement pagination using the paging-cookie pattern.

---

**User:** "Actually, I need all of them, not just 500"

**Response:**

Since you need all contacts (potentially more than 500), I'll add pagination to retrieve the complete dataset.

[Provide paginated version with explanation of how to implement the loop in Power Automate]

## Advanced Scenarios

### Scenario 1: Complex Filters

When multiple OR conditions are needed across different columns:

**Use filter nesting:**
```xml
<filter type='or'>
  <condition attribute='city' operator='eq' value='Montreal' />
  <condition attribute='city' operator='eq' value='Quebec' />
  <condition attribute='city' operator='eq' value='Laval' />
</filter>
```

### Scenario 2: NOT EXISTS Patterns

When finding records without related data:

**Use outer join + null filter:**
```xml
<link-entity name='contact' from='parentcustomerid' to='accountid' link-type='outer' alias='contacts'>
  <attribute name='contactid' />
</link-entity>
<filter>
  <condition entityname='contacts' attribute='contactid' operator='null' />
</filter>
```

### Scenario 3: Query Performance Issues

If a query is slow:
1. Check for anti-patterns using `query-optimization-guide.md`
2. Verify indexed columns are used in filters
3. Consider using `latematerialize='true'` for complex joins
4. Break into multiple simpler queries if needed

## Tools and Resources

- **FetchXML Builder (XrmToolBox)** - Visual query builder and testing tool
- **Dataverse Web API Playground** - Test OData queries without authentication
- **Power Apps Monitor** - Debug and analyze query performance
- **Advanced Find** - Built-in Dynamics 365 tool for creating FetchXML

## Important Reminders

- FetchXML maximum: 5000 records per request
- OData maximum: 5000 standard table rows, 500 elastic table rows (without pagination)
- Always implement pagination for large datasets
- Test queries with production-like data volumes
- Monitor query performance over time
- Dataverse automatically optimizes queries, but start with efficient queries

## Error Handling

If the user receives query errors:

**LeadingWildcardCauseTimeout (0x80048573):**
- Remove leading wildcards from LIKE conditions
- Use Dataverse Search instead

**ComputedColumnCauseTimeout (0x80048574):**
- Remove filters on calculated/formula columns
- Filter on source columns instead

**Query throttling errors:**
- Review query against anti-patterns
- Simplify query structure
- Add delays for batch operations

See `query-optimization-guide.md` for complete error reference.
