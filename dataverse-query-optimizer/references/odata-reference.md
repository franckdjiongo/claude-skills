# OData Reference Guide for Dataverse

## Overview

The Dataverse Web API implements OData v4.0, a REST-based protocol for querying and manipulating data. OData provides a standardized way to interact with Dataverse using HTTP requests.

## Base URL Structure

```
https://[org].crm.dynamics.com/api/data/v9.2/[entityset]
```

**Examples:**
- `https://contoso.crm.dynamics.com/api/data/v9.2/accounts`
- `https://contoso.crm.dynamics.com/api/data/v9.2/contacts`

**Note:** Use the EntitySetName (plural), not the LogicalName.

## Query Options

OData uses URL query parameters prefixed with `$` to filter, sort, and shape data.

### $select - Choose Columns

Returns only specified columns.

```
/accounts?$select=name,revenue,accountnumber
```

**Multiple columns:**
```
/contacts?$select=firstname,lastname,emailaddress1,telephone1
```

**Best Practice:** Always use `$select` to limit columns. Never fetch all columns unless absolutely necessary.

### $filter - Filter Results

Filters records based on conditions.

**Basic operators:**
- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `ge` - Greater than or equal
- `lt` - Less than
- `le` - Less than or equal

**Examples:**
```
/accounts?$filter=revenue gt 100000
/contacts?$filter=statecode eq 0
/opportunities?$filter=estimatedvalue ge 50000 and statecode eq 0
```

**String functions:**
- `contains(field, 'value')` - Contains substring
- `startswith(field, 'value')` - Starts with
- `endswith(field, 'value')` - Ends with

```
/accounts?$filter=contains(name, 'Contoso')
/contacts?$filter=startswith(firstname, 'John')
```

**⚠️ Warning:** `endswith()` and `contains()` without a starting prefix can cause performance issues similar to leading wildcards.

**Date functions:**
```
/opportunities?$filter=createdon ge 2025-01-01
/accounts?$filter=year(createdon) eq 2025
/contacts?$filter=month(createdon) eq 10
```

**Logical operators:**
```
/accounts?$filter=revenue gt 100000 or industrycode eq 1
/contacts?$filter=statecode eq 0 and (city eq 'Montreal' or city eq 'Quebec')
```

**Collection functions:**
```
/accounts?$filter=accountid eq 'guid-here'
/contacts?$filter=parentcustomerid eq 'account-guid'
```

### $orderby - Sort Results

Sorts results by one or more columns.

```
/accounts?$orderby=name
/accounts?$orderby=name desc
/accounts?$orderby=revenue desc,name asc
```

**Multiple columns:**
```
/contacts?$orderby=lastname asc,firstname asc
```

### $top - Limit Results

Limits number of records returned.

```
/accounts?$top=10
/contacts?$top=100&$orderby=createdon desc
```

**Default:** Without `$top`, Dataverse returns up to 5000 standard table rows or 500 elastic table rows.

**Best Practice:** Always use `$top` for predictable results.

### $expand - Include Related Data

Fetches related records in a single request (like SQL JOIN).

**Basic expand:**
```
/accounts?$select=name&$expand=primarycontactid($select=fullname,emailaddress1)
```

**Multiple expands:**
```
/opportunities?$select=name&$expand=customerid_account($select=name),ownerid($select=fullname)
```

**Nested expand (up to 10 levels):**
```
/contacts?$expand=parentcustomerid_account($expand=primarycontactid($select=fullname))
```

**⚠️ Performance Warning:** Deep expansions can cause significant performance degradation.

### $count - Count Records

Returns count of records matching the query.

```
/accounts?$count=true
/contacts?$filter=statecode eq 0&$count=true
```

**Get only the count:**
```
/accounts/$count
/contacts/$count?$filter=city eq 'Montreal'
```

### $skip - Skip Records

Skips specified number of records (pagination).

**⚠️ Not supported** by Dataverse Web API. Use pagination preference instead.

## Pagination

Use the `Prefer: odata.maxpagesize` header for pagination.

**Request:**
```http
GET /api/data/v9.2/accounts?$select=name
Prefer: odata.maxpagesize=100
```

**Response includes nextLink:**
```json
{
  "@odata.context": "...",
  "@odata.nextLink": "/api/data/v9.2/accounts?$select=name&$skiptoken=<token>",
  "value": [...]
}
```

**Follow nextLink for next page:**
```http
GET /api/data/v9.2/accounts?$select=name&$skiptoken=<token>
```

## Request Headers

### Standard Headers

```http
Accept: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
```

### Formatted Values

Include formatted choice/lookup values:

```http
Prefer: odata.include-annotations="OData.Community.Display.V1.FormattedValue"
```

**Response:**
```json
{
  "statuscode": 1,
  "statuscode@OData.Community.Display.V1.FormattedValue": "Active"
}
```

### Return Representation

Return created/updated record in response:

```http
Prefer: return=representation
```

## Common Query Patterns

### Pattern 1: Active Accounts with Revenue > $100K

```
/accounts?$select=name,revenue&$filter=statecode eq 0 and revenue gt 100000&$orderby=revenue desc
```

### Pattern 2: Contacts Created This Year

```
/contacts?$select=fullname,emailaddress1,createdon&$filter=year(createdon) eq 2025
```

### Pattern 3: Opportunities with Account Info

```
/opportunities?$select=name,estimatedvalue&$expand=customerid_account($select=name,accountnumber)&$filter=statecode eq 0
```

### Pattern 4: Search by Email

```
/contacts?$select=fullname,emailaddress1&$filter=emailaddress1 eq 'john@example.com'
```

### Pattern 5: Recent Records (Last 30 Days)

```
/accounts?$select=name,createdon&$filter=createdon ge 2025-09-19&$orderby=createdon desc
```

## Lookup Column Names

Lookup columns use different naming:

**In filters:** Use navigation property name (usually ends in `_account`, `_contact`, etc.)
```
/opportunities?$filter=customerid_account/accountid eq 'guid'
```

**In expand:** Use relationship name
```
/opportunities?$expand=customerid_account($select=name)
```

**Finding the correct name:**
1. Check table metadata at `/$metadata`
2. Use relationship definitions endpoint
3. Use FetchXML Builder or similar tools

**Common patterns:**
- `primarycontactid` → expands contact
- `ownerid` → expands systemuser or team
- `parentaccountid` → expands account
- `customerid_account` → filter/expand account
- `customerid_contact` → filter/expand contact

## Field Name Conventions

### Logical Name vs Schema Name

- **Logical names:** lowercase, underscores (e.g., `emailaddress1`)
- **Schema names:** PascalCase (e.g., `EmailAddress1`)

**Use logical names** in OData queries.

**Special cases:**
- Some navigation properties use SchemaName casing
- Check `RelationshipDefinitions` for exact names

### Finding Field Names

1. **Metadata endpoint:**
```
/api/data/v9.2/$metadata
```

2. **Entity definition:**
```
/api/data/v9.2/EntityDefinitions(LogicalName='account')
```

3. **Attributes:**
```
/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes
```

## Performance Optimization

### 1. Use Indexed Columns in Filters

Dataverse automatically indexes:
- Primary keys
- Lookup fields
- Common system fields (`statecode`, `createdon`, etc.)

**Fast:**
```
/accounts?$filter=accountid eq 'guid'
/contacts?$filter=parentcustomerid eq 'guid'
```

**Slow (non-indexed):**
```
/accounts?$filter=description contains 'consulting'
```

### 2. Minimize $expand Usage

Each `$expand` is an additional join.

**Avoid:**
```
/accounts?$expand=contact_customer_accounts($expand=incident_customer_contacts($expand=ownerid))
```

**Better:** Make separate targeted queries.

### 3. Use $select Always

Reduces payload size and processing time.

**Don't:**
```
/accounts
```

**Do:**
```
/accounts?$select=name,accountnumber,revenue
```

### 4. Avoid Computed Columns in Filters

Computed/formula columns are calculated at runtime.

**Slow:**
```
/contacts?$filter=fullname eq 'John Smith'
```

**Fast:**
```
/contacts?$filter=firstname eq 'John' and lastname eq 'Smith'
```

## Anti-Patterns

### ❌ 1. Fetching All Columns

```
GET /accounts
```

**Solution:** Always use `$select`

### ❌ 2. Missing Field Names

Using schema names instead of logical names in filters.

**Wrong:**
```
/contacts?$filter=EmailAddress1 eq 'test@test.com'
```

**Correct:**
```
/contacts?$filter=emailaddress1 eq 'test@test.com'
```

### ❌ 3. Deep Expansions

```
/accounts?$expand=contact_customer_accounts($expand=incident_customer_contacts($expand=ownerid))
```

**Solution:** Use separate targeted queries or FetchXML.

### ❌ 4. String Operations Without Prefix

```
/accounts?$filter=endswith(name, 'Corp')
```

**Solution:** Redesign query or use Dataverse Search.

### ❌ 5. No Pagination

**Solution:** Always set page size with Prefer header.

### ❌ 6. Not Checking for nextLink

**Solution:** Implement loop to follow `@odata.nextLink` for complete results.

## URL Encoding

Special characters must be URL-encoded:

```
Space: %20
@: %40
#: %23
$: %24
&: %26
```

**Example:**
```
/contacts?$filter=emailaddress1 eq 'test%40example.com'
```

## Batch Requests

Execute multiple operations in single HTTP request.

**Advantages:**
- Reduces network calls
- Supports larger URLs (up to 64KB)
- Transactional support

**Use case:** When FetchXML query exceeds URL limit.

```http
POST /api/data/v9.2/$batch
Content-Type: multipart/mixed;boundary=batch_request

--batch_request
Content-Type: application/http
Content-Transfer-Encoding: binary

GET /api/data/v9.2/accounts?$select=name HTTP/1.1
Accept: application/json

--batch_request--
```

## Error Codes

Common HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success, no response body
- `400 Bad Request` - Invalid query syntax
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Insufficient privileges
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Query Throttling

Dataverse throttles inefficient queries:

- **Leading wildcard patterns**
- **Computed column filters**
- **Excessive joins**
- **High-frequency queries**

**Error codes:**
- `0x80048573` - Leading wildcard timeout
- `0x80048574` - Computed column timeout
- `0x80048745` - Performance validation issues

**Solution:** Redesign query following best practices.

## Testing Queries

### Browser

Paste URL directly in browser (must be logged in):
```
https://yourorg.crm.dynamics.com/api/data/v9.2/accounts?$select=name&$top=5
```

### Postman/Bruno

1. Set authentication (OAuth 2.0)
2. Add standard headers
3. Build query with visual interface

### PowerShell

```powershell
$response = Invoke-RestMethod -Uri "https://org.crm.dynamics.com/api/data/v9.2/accounts?$select=name" `
  -Headers @{
    "Accept" = "application/json"
    "OData-MaxVersion" = "4.0"
    "OData-Version" = "4.0"
  }
```

### Dataverse Web API Playground

Built-in tool in Dataverse Accelerator app for testing without authentication setup.

## Resources

- [Microsoft Learn - OData Query](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/overview)
- [OData v4.0 Specification](https://www.odata.org/documentation/)
- [Dataverse Web API Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/about)
