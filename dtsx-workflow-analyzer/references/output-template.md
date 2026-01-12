# DTSX Workflow Analysis Template

Use this exact structure for all DTSX workflow analysis documents.

---

# Workflow Analysis: [Package Name]

**Generated**: [Date]
**Package Version**: [VersionBuild]
**Last Modified**: [LastModifiedProductVersion]

## 1. Overview

### Package Information
- **Name**: [DTS:ObjectName]
- **Created**: [CreationDate]
- **Creator**: [CreatorName]
- **Purpose**: [High-level description of what this integration accomplishes]

### Status
- **Active/Disabled**: [Note if package or any tasks are disabled]

## 2. Connections

| Connection Name | Type | Target System | Notes |
|----------------|------|---------------|-------|
| [Name] | [KingswaySoft CRM / OLE DB / ADO.NET] | [Server/Instance] | [Purpose] |

## 3. Control Flow

### Task Sequence

1. **[Task Name]** ([Type])
   - Status: [Active/Disabled]
   - Purpose: [What this task does]
   - Depends on: [Previous task if any]

### Precedence Constraints
- [Task A] → [Task B]: [Constraint type: Success/Failure/Completion]

## 4. Data Flow: [Flow Name]

### 4.1 Source

- **Component**: [Component name]
- **Type**: [KingswaySoft CRM Source / OLE DB Source / etc.]
- **Connection**: [Connection manager name]
- **Entity/Table**: [Source entity or table name]
- **Query/Filter**: [FetchXML, SQL query, or filter conditions if any]

### 4.2 Transformations

#### [Transformation Name] ([Type])
- **Purpose**: [What this transformation accomplishes]
- **Logic**:
  ```
  [Expression or transformation logic]
  ```
- **Input Columns**: [Columns used]
- **Output Columns**: [Columns produced]

### 4.3 Destination

- **Component**: [Component name]
- **Type**: [KingswaySoft CRM Destination / OLE DB Destination / etc.]
- **Connection**: [Connection manager name]
- **Entity/Table**: [Destination entity or table name]
- **Action**: [Create / Update / Upsert / Delete]
- **Batch Size**: [Number]
- **Concurrent Threads**: [Number]

### 4.4 Column Mappings

| # | Source Column | Source Type | Destination Column | Dest Type | Transformation |
|---|--------------|-------------|-------------------|-----------|----------------|
| 1 | [column] | [type] | [column] | [type] | [None / Derived / Lookup] |

## 5. Table Relationships

### Implied Foreign Keys

Based on lookup transformations and reference fields:

| Child Entity | FK Column | Parent Entity | PK Column | Relationship |
|-------------|-----------|---------------|-----------|--------------|
| [Entity] | [Column] | [Entity] | [Column] | [1:N / N:1] |

### Data Dependencies

- [Destination Entity] depends on [Source Entity] for: [reason]

## 6. Business Logic

### Validation Rules
- [Any validation logic identified]

### Conditional Processing
- [Any conditional splits or routing logic]

### Calculated Fields
- [Any derived columns or expressions]

## 7. Error Handling

- **Error Row Disposition**: [FailComponent / RedirectRow / IgnoreFailure]
- **Error Output**: [Where errors are routed]

## 8. Configuration Notes

### KingswaySoft-Specific Settings

| Setting | Value | Description |
|---------|-------|-------------|
| ActionType | [0-5] | 0=Create, 1=Update, 2=Delete, 5=Upsert |
| RecordMatchingCriteria | [value] | How records are matched |
| IgnoreNullValuedFields | [true/false] | Skip nulls on update |
| IgnoreUnchangedFields | [true/false] | Skip unchanged fields |
| BatchSize | [number] | Records per API call |
| ConcurrentWritingThreads | [number] | Parallel execution |

## 9. Migration Considerations

### For Power Automate Migration

- **Complexity**: [Low / Medium / High]
- **Recommended Approach**: [Dataflows / Cloud Flows / Custom Connector]
- **Key Challenges**:
  - [Challenge 1]
  - [Challenge 2]

### Column Prefix Changes

If migrating between Dynamics versions, note schema prefix changes:

| Source Prefix | Destination Prefix | Example |
|--------------|-------------------|---------|
| new_ | pav_ | new_firmid → pav_firmid |

## 10. Summary

### What This Package Does
[2-3 sentence summary of the complete workflow]

### Key Entities
- Source: [Entity name]
- Destination: [Entity name]

### Record Count Estimate
- [If available from testing or documentation]

---

## Appendix: Raw Component Details

<details>
<summary>Click to expand full component JSON</summary>

```json
[Paste parser output here for reference]
```

</details>
