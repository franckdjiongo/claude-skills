# Dataverse Query Optimization Guide

## Critical Anti-Patterns to Avoid

### 1. Leading Wildcards in Filters ❌

**Problem:** Forces full table scan, cannot use indexes, heavily throttled by Dataverse.

**FetchXML Bad Example:**
```xml
<condition attribute='name' operator='like' value='%Smith' />
<condition attribute='accountnumber' operator='like' value='%123' />
```

**OData Bad Example:**
```
/accounts?$filter=endswith(name, 'Corp')
/contacts?$filter=contains(email, '@gmail.com')
```

**Error when throttled:**
- Code: `0x80048573`
- Name: `LeadingWildcardCauseTimeout`
- Code: `0x80048644` (when heavily throttled)

**Solutions:**
1. Use Dataverse Search instead
2. Redesign data model to avoid need for leading wildcards
3. Use trailing wildcards only: `name LIKE 'Smith%'`
4. Index data differently (e.g., reverse strings if searching by suffix)

### 2. Filtering on Calculated/Formula Columns ❌

**Problem:** Values calculated at runtime for every row, cannot use indexes.

**FetchXML Bad Example:**
```xml
<condition attribute='fullname' operator='eq' value='John Smith' />
```

**OData Bad Example:**
```
/contacts?$filter=fullname eq 'John Smith'
```

**Error when throttled:**
- Code: `0x80048574`
- Name: `ComputedColumnCauseTimeout`

**Solutions:**
1. Filter on source columns instead: `firstname eq 'John' and lastname eq 'Smith'`
2. Create regular (non-computed) columns for frequently filtered values
3. Move calculation logic to client side

### 3. Selecting All Columns ❌

**Problem:** Massive data transfer, performance degradation, timeout risk.

**FetchXML Bad Example:**
```xml
<all-attributes />
```

**OData Bad Example:**
```
GET /accounts
```

**Impact:**
- Network overhead
- Memory consumption
- Slow processing
- May exceed 80MB limit and fail

**Solutions:**
1. Always use `$select` (OData) or specific `<attribute>` elements (FetchXML)
2. Select only columns actually needed for the task
3. Review and remove unused columns regularly

### 4. Too Many Logical Columns ❌

**Problem:** Logical columns are stored across different database tables, requiring multiple joins.

**How to identify:** Check `AttributeMetadata.IsLogical` property.

**Common logical columns:**
- Lookup fields
- Polymorphic fields
- Some system fields

**Solutions:**
1. Minimize selection of lookup columns
2. Use `$expand` selectively (OData)
3. Consider separate queries for related data

### 5. Deep Nested Joins ❌

**Problem:** Complexity grows exponentially, high timeout risk.

**FetchXML Bad Example:**
```xml
<entity name='account'>
  <link-entity name='contact' from='parentcustomerid' to='accountid'>
    <link-entity name='incident' from='customerid' to='contactid'>
      <link-entity name='annotation' from='objectid' to='incidentid'>
        <link-entity name='systemuser' from='systemuserid' to='ownerid'>
        </link-entity>
      </link-entity>
    </link-entity>
  </link-entity>
</entity>
```

**Solutions:**
1. Denormalize data (add commonly accessed fields to main table)
2. Use multiple targeted queries
3. Limit join depth to 2-3 levels maximum
4. Consider using views or saved queries

### 6. Missing Pagination for Large Datasets ❌

**Problem:** 5000 record limit (standard tables) or 500 (elastic tables), timeouts.

**Impact:**
- Incomplete data
- Timeout errors
- Memory issues

**Solutions:**
1. Always implement pagination
2. Use paging-cookie (FetchXML) or @odata.nextLink (OData)
3. Set appropriate page size (100-500 recommended)

## Performance Best Practices

### 1. Always Use Column Selection ✅

**FetchXML:**
```xml
<fetch top='100'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <attribute name='revenue' />
  </entity>
</fetch>
```

**OData:**
```
/accounts?$select=name,accountnumber,revenue&$top=100
```

### 2. Filter on Indexed Columns ✅

**Automatically indexed columns:**
- Primary keys (`accountid`, `contactid`, etc.)
- Lookup fields (`ownerid`, `parentcustomerid`, etc.)
- `statecode`, `statuscode`
- `createdon`, `modifiedon`
- `createdby`, `modifiedby`

**FetchXML:**
```xml
<filter type='and'>
  <condition attribute='statecode' operator='eq' value='0' />
  <condition attribute='createdon' operator='last-x-days' value='30' />
</filter>
```

**OData:**
```
/accounts?$filter=statecode eq 0 and createdon ge 2025-09-19
```

### 3. Use Trailing Wildcards Only ✅

**FetchXML:**
```xml
<condition attribute='name' operator='like' value='Contoso%' />
```

**OData:**
```
/accounts?$filter=startswith(name, 'Contoso')
```

### 4. Limit Result Set Size ✅

**FetchXML:**
```xml
<fetch top='100'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

**OData:**
```
/accounts?$select=name&$top=100
```

**Prefer header:**
```http
Prefer: odata.maxpagesize=100
```

### 5. Optimize Joins ✅

**Use appropriate link-type:**
- `inner` - Only records with matching related records
- `outer` - Include records without matches (LEFT JOIN)

**FetchXML:**
```xml
<link-entity name='contact' from='contactid' to='primarycontactid' link-type='outer'>
  <attribute name='fullname' />
</link-entity>
```

**Keep joins shallow:**
- 1-2 levels: Optimal
- 3 levels: Acceptable
- 4+ levels: Review and simplify

### 6. Use Late Materialization (When Appropriate) ✅

**When to use:**
- Many joins (3+)
- Many lookup/computed columns
- Query performance issues

**FetchXML:**
```xml
<fetch latematerialize='true'>
  <entity name='account'>
    <attribute name='name' />
    <link-entity name='contact' from='parentcustomerid' to='accountid'>
      <attribute name='fullname' />
      <link-entity name='systemuser' from='systemuserid' to='ownerid'>
        <attribute name='fullname' />
      </link-entity>
    </link-entity>
  </entity>
</fetch>
```

**When NOT to use:**
- Simple queries (may slow them down)
- Single table queries
- Few columns selected

### 7. Implement Proper Pagination ✅

**FetchXML with cookie:**
```xml
<!-- First page -->
<fetch page='1' count='100'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>

<!-- Subsequent pages -->
<fetch page='2' count='100' paging-cookie='&lt;cookie page="1"&gt;...&lt;/cookie&gt;'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

**OData with nextLink:**
```http
GET /api/data/v9.2/accounts?$select=name
Prefer: odata.maxpagesize=100

<!-- Follow @odata.nextLink in response for next page -->
```

### 8. Use Aggregation for Counts and Sums ✅

**Instead of retrieving all records:**

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
/opportunities/$count?$filter=statecode eq 0
```

## Optimization Checklist

Before executing a query, verify:

- [ ] **Column selection**: Using `$select` or specific `<attribute>` elements?
- [ ] **Filters on indexed columns**: Filtering primarily on indexed fields?
- [ ] **No leading wildcards**: All LIKE patterns start with non-wildcard character?
- [ ] **No calculated column filters**: Avoiding filters on formula/computed columns?
- [ ] **Result limit**: Using `$top` or `top` attribute?
- [ ] **Pagination**: Implemented for datasets potentially > 100 records?
- [ ] **Join depth**: Limited to 2-3 levels maximum?
- [ ] **Logical columns**: Minimized selection of lookup/computed columns?

## Query Throttling

Dataverse actively throttles queries that:
1. Use anti-patterns (leading wildcards, computed column filters)
2. Consume excessive database resources
3. Run at high frequency

**Throttling errors:**
- `0x80048573` - LeadingWildcardCauseTimeout
- `0x80048574` - ComputedColumnCauseTimeout  
- `0x80048644` - DataEngineLeadingWildcardQueryThrottling
- `0x80048745` - DataEnginePerformanceValidationIssuesQueryThrottling

**If throttled:**
1. Review query against anti-patterns
2. Redesign query following best practices
3. Consider alternative approaches (Dataverse Search, denormalization)
4. Add delays between requests for batch operations

## Automatic Query Optimization

Dataverse automatically monitors and optimizes poorly performing queries:

- **Enabled by default** for all environments
- **No configuration needed**
- **Transparent to users**

**Result:** Slow queries may improve over time without changes.

**Note:** This is not a substitute for writing efficient queries from the start.

## Performance Testing

### 1. Use Query Diagnostics

Monitor query performance in:
- Power Apps Monitor
- Application Insights
- Dataverse event logs

### 2. Measure Key Metrics

- **Execution time**: < 1 second (optimal), < 5 seconds (acceptable)
- **Records returned**: Match expected dataset size
- **Network payload**: Minimize with column selection

### 3. Test at Scale

- Test with production-like data volumes
- Verify pagination works correctly
- Check performance with concurrent users

## Common Scenarios

### Scenario 1: Find Active Records Modified Recently

**Optimized FetchXML:**
```xml
<fetch top='500'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='modifiedon' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
      <condition attribute='modifiedon' operator='last-x-days' value='7' />
    </filter>
    <order attribute='modifiedon' descending='true' />
  </entity>
</fetch>
```

**Why optimized:**
- Filters on indexed columns
- Limited columns
- Limited results
- Sorted efficiently

### Scenario 2: Count Records by Status

**Optimized FetchXML:**
```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='statuscode' groupby='true' alias='status' />
    <attribute name='opportunityid' aggregate='count' alias='total' />
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
  </entity>
</fetch>
```

**Why optimized:**
- Aggregation instead of retrieving all records
- Filter on indexed column
- Minimal data transfer

### Scenario 3: Get Related Records

**Optimized FetchXML:**
```xml
<fetch top='100'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountnumber' />
    <link-entity name='contact' from='parentcustomerid' to='accountid' link-type='outer'>
      <attribute name='fullname' />
      <attribute name='emailaddress1' />
      <filter type='and'>
        <condition attribute='statecode' operator='eq' value='0' />
      </filter>
    </link-entity>
    <filter type='and'>
      <condition attribute='statecode' operator='eq' value='0' />
    </filter>
  </entity>
</fetch>
```

**Why optimized:**
- Filters on both entities
- Specific columns only
- Outer join (includes accounts without contacts)
- Limited depth (one level)

## Tools for Optimization

### FetchXML Builder (XrmToolBox)

- Visual query builder
- Execute and test performance
- View execution plan
- Convert between FetchXML/OData/QueryExpression

### Dataverse Web API Playground

- Test OData queries without authentication setup
- Built into Dataverse Accelerator app
- Immediate feedback on syntax

### Application Insights

- Track query performance
- Identify slow queries
- Monitor throttling events

### Power Apps Monitor

- Real-time query monitoring
- Network performance
- Client-side performance

## Advanced Optimization Techniques

### 1. Query Hints (Use with Caution)

**Only apply when recommended by Microsoft support.**

**FetchXML:**
```xml
<fetch options='OptimizeForUnknown'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

**SQL Server query hints:**
- `OptimizeForUnknown`
- `Recompile`
- `LoopJoin`
- `MergeJoin`
- `HashJoin`

**Warning:** Incorrect use can damage performance.

### 2. Union Hint for OR Filters

Use when OR conditions span different tables.

**FetchXML:**
```xml
<filter type='or' hint='union'>
  <condition attribute='telephone1' operator='eq' value='555-1234' />
  <condition entityname='contact' attribute='emailaddress1' operator='eq' value='test@example.com' />
</filter>
```

**Restrictions:**
- Must use LogicalOperator.Or
- Only one union hint per query
- Maximum 3 levels deep

### 3. Denormalization for Performance

Add frequently accessed related data to main table:

**Example:**
- Add `accountname` column to `opportunity` table
- Keeps account name even if relationship changes
- Avoids join on every query

**Trade-offs:**
- Data duplication
- Synchronization overhead
- Increased storage

**When to use:**
- Frequently accessed relationships
- Read-heavy workloads
- Performance critical scenarios

## Summary

**Key Takeaways:**
1. **Always select specific columns**
2. **Filter on indexed columns**
3. **Avoid leading wildcards**
4. **Don't filter on calculated columns**
5. **Implement pagination**
6. **Limit join depth**
7. **Monitor and test performance**

**Remember:** Dataverse automatically optimizes queries over time, but starting with efficient queries is always better than relying on automatic optimization.
