# Query patterns, example interaction and advanced scenarios

Moved out of SKILL.md. The rules stay in SKILL.md, the syntax blocks live here.

## Query generation guidelines

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

