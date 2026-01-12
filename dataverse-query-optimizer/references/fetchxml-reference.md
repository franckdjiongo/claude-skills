# FetchXML Reference Guide

## Overview

FetchXML is a proprietary XML-based query language used in Microsoft Dataverse to retrieve data. It provides a powerful way to construct complex queries with joins, filters, aggregations, and sorting.

## Basic Structure

```xml
<fetch top='5' distinct='false'>
  <entity name='account'>
    <attribute name='name' />
    <attribute name='accountid' />
  </entity>
</fetch>
```

## Core Elements

### `<fetch>` Element

Root element of every FetchXML query.

**Attributes:**
- `top` - Limits number of results (e.g., `top='10'`)
- `distinct` - Returns only distinct results (`true`/`false`)
- `count` - Returns record count instead of records
- `page` - Page number for pagination (starts at 1)
- `paging-cookie` - Cookie for pagination (from previous result)
- `aggregate` - Enables aggregation mode (`true`/`false`)
- `latematerialize` - Performance optimization for many lookups (`true`/`false`)
- `options` - SQL query hints for advanced optimization

**Important:** Maximum of 5000 records per query. Use pagination for larger datasets.

### `<entity>` Element

Specifies the table to query.

**Attributes:**
- `name` - Logical name of the table (required)

```xml
<entity name='contact'>
```

### `<attribute>` Element

Selects specific columns to return.

```xml
<attribute name='firstname' />
<attribute name='lastname' />
<attribute name='emailaddress1' />
```

**Best practice:** Always specify only the columns you need. Never select all columns unless absolutely necessary.

### `<all-attributes />` Element

Selects all columns (use sparingly).

```xml
<all-attributes />
```

**⚠️ Warning:** This is an anti-pattern that can cause severe performance issues. Only use for debugging.

## Filtering

### `<filter>` Element

Groups conditions with AND/OR logic.

**Attributes:**
- `type` - `and` (default) or `or`

```xml
<filter type='and'>
  <condition attribute='statecode' operator='eq' value='0' />
  <condition attribute='createdon' operator='last-x-days' value='30' />
</filter>
```

### `<condition>` Element

Defines filter criteria.

**Common Operators:**
- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `ge` - Greater than or equal
- `lt` - Less than
- `le` - Less than or equal
- `like` - Pattern matching (use carefully)
- `not-like` - Negative pattern matching
- `in` - In list
- `not-in` - Not in list
- `null` - Is null
- `not-null` - Is not null
- `yesterday`, `today`, `tomorrow`
- `last-x-days`, `next-x-days`
- `last-x-months`, `next-x-months`
- `last-x-years`, `next-x-years`
- `this-year`, `last-year`, `next-year`

```xml
<condition attribute='revenue' operator='gt' value='100000' />
<condition attribute='name' operator='like' value='%Contoso%' />
<condition attribute='statecode' operator='in'>
  <value>0</value>
  <value>1</value>
</condition>
```

**⚠️ Critical Anti-Pattern:** Avoid leading wildcards in `like` operators (e.g., `%name`). This forces full table scans and is heavily throttled.

## Joining Tables

### `<link-entity>` Element

Joins related tables.

**Attributes:**
- `name` - Logical name of related table
- `from` - Column in related table
- `to` - Column in primary table
- `link-type` - `inner` (default), `outer`, `any`, `not any`, `all`, `not all`
- `alias` - Alias for the linked entity (optional)

```xml
<entity name='opportunity'>
  <attribute name='name' />
  <link-entity name='account' from='accountid' to='parentaccountid' link-type='inner' alias='acc'>
    <attribute name='name' />
    <attribute name='revenue' />
  </link-entity>
</entity>
```

**Nested Joins:**

```xml
<entity name='opportunity'>
  <attribute name='name' />
  <link-entity name='account' from='accountid' to='parentaccountid' alias='acc'>
    <attribute name='name' />
    <link-entity name='contact' from='parentcustomerid' to='accountid' alias='con'>
      <attribute name='fullname' />
    </link-entity>
  </link-entity>
</entity>
```

## Ordering

### `<order>` Element

Sorts results.

**Attributes:**
- `attribute` - Column to sort by
- `descending` - `true` for descending, `false` for ascending (default)
- `alias` - Use when sorting by linked entity column

```xml
<order attribute='name' descending='false' />
<order attribute='createdon' descending='true' />
```

## Aggregation

Enable aggregation mode with `<fetch aggregate='true'>`.

### Aggregate Functions

- `count` - Count records
- `countcolumn` - Count non-null values
- `sum` - Sum numeric values
- `avg` - Average numeric values
- `min` - Minimum value
- `max` - Maximum value

```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='estimatedvalue' aggregate='sum' alias='total_value' />
    <attribute name='estimatedvalue' aggregate='avg' alias='avg_value' />
    <attribute name='opportunityid' aggregate='count' alias='count_opps' />
  </entity>
</fetch>
```

### Grouping

```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='name' groupby='true' alias='opportunity_name' />
    <attribute name='estimatedvalue' aggregate='sum' alias='total' />
  </entity>
</fetch>
```

## Pagination

FetchXML returns maximum 5000 records. For larger datasets, use pagination.

### Page-based Pagination

```xml
<fetch page='1' count='100'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

### Cookie-based Pagination (Recommended)

1. First request without paging-cookie
2. Response includes `<morerecords>1</morerecords>` and `<cookie>...</cookie>`
3. Use cookie in next request:

```xml
<fetch page='2' count='100' paging-cookie='&lt;cookie page="1"&gt;...&lt;/cookie&gt;'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

## Performance Optimization

### 1. Late Materialization

Use when query has many joins or lookup/computed columns:

```xml
<fetch latematerialize='true'>
  <entity name='account'>
    <attribute name='name' />
    <link-entity name='contact' from='parentcustomerid' to='accountid'>
      <attribute name='fullname' />
    </link-entity>
  </entity>
</fetch>
```

**When to use:** Many joins, many lookup/computed columns, slow queries
**When NOT to use:** Simple queries (may slow them down)

### 2. Query Hints

Advanced SQL Server query hints (use only when recommended by Microsoft support):

```xml
<fetch options='OptimizeForUnknown'>
  <entity name='account'>
    <attribute name='name' />
  </entity>
</fetch>
```

### 3. Union Hint

For OR conditions on different tables:

```xml
<filter type='or' hint='union'>
  <condition attribute='telephone1' operator='eq' value='555-1234' />
  <condition attribute='emailaddress1' operator='eq' value='test@example.com' />
</filter>
```

## Anti-Patterns to Avoid

### ❌ 1. Selecting All Columns

```xml
<!-- DON'T DO THIS -->
<all-attributes />
```

**Why:** Huge performance impact, network overhead, unnecessary data transfer

**Solution:** Select only needed columns

### ❌ 2. Leading Wildcards

```xml
<!-- DON'T DO THIS -->
<condition attribute='name' operator='like' value='%Smith' />
```

**Why:** Forces full table scan, cannot use indexes, heavily throttled

**Solution:** Redesign query or use Dataverse Search

### ❌ 3. Filtering on Calculated/Formula Columns

```xml
<!-- AVOID IF POSSIBLE -->
<condition attribute='fullname' operator='eq' value='John Smith' />
```

**Why:** Calculated in real-time, cannot use indexes, slow queries

**Solution:** Filter on source columns instead

### ❌ 4. Too Many Logical Columns

Logical columns are stored across different database tables.

**Why:** Requires multiple table joins, slow performance

**Solution:** Review which columns are truly needed

### ❌ 5. No Pagination for Large Datasets

**Why:** 5000 record limit, timeout errors

**Solution:** Implement pagination

### ❌ 6. Deep Nested Joins

```xml
<!-- AVOID -->
<entity name='a'>
  <link-entity name='b' from='x' to='y'>
    <link-entity name='c' from='x' to='y'>
      <link-entity name='d' from='x' to='y'>
        <link-entity name='e' from='x' to='y'>
        </link-entity>
      </link-entity>
    </link-entity>
  </link-entity>
</entity>
```

**Why:** Complexity increases exponentially, timeout risk

**Solution:** Denormalize data or use multiple queries

## Common Patterns

### Pattern 1: Active Records Only

```xml
<filter type='and'>
  <condition attribute='statecode' operator='eq' value='0' />
</filter>
```

### Pattern 2: Records Created This Year

```xml
<filter type='and'>
  <condition attribute='createdon' operator='this-year' />
</filter>
```

### Pattern 3: Lookup Related Records

```xml
<link-entity name='account' from='accountid' to='parentaccountid' link-type='inner'>
  <filter type='and'>
    <condition attribute='statecode' operator='eq' value='0' />
  </filter>
</link-entity>
```

### Pattern 4: Count by Category

```xml
<fetch aggregate='true'>
  <entity name='opportunity'>
    <attribute name='statuscode' groupby='true' alias='status' />
    <attribute name='opportunityid' aggregate='count' alias='count' />
  </entity>
</fetch>
```

## Tools

### FetchXML Builder (XrmToolBox)

Free community tool for building and testing FetchXML queries visually.

**Features:**
- Visual query builder
- Execute and preview results
- Convert to OData/QueryExpression
- Export/import queries

### Advanced Find (Dynamics 365)

Built-in tool for creating basic FetchXML queries.

**How to access:**
1. Open Advanced Find
2. Build query visually
3. Download FetchXML

## Metadata Reference

### Common Table Logical Names

- `account` - Accounts
- `contact` - Contacts
- `lead` - Leads
- `opportunity` - Opportunities
- `systemuser` - Users
- `team` - Teams
- `businessunit` - Business Units

### Check Column Names

Use `$metadata` endpoint:
```
https://[org].crm.dynamics.com/api/data/v9.2/$metadata
```

Or query EntityDefinition table.
