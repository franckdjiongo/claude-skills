# InputParameters key-value table

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 213-233
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 5. Context objects reference — exact keys per message

---

### InputParameters key-value table

| Message | Key | Type | Notes |
|---|---|---|---|
| **Create** | `"Target"` | `Entity` | Contains only attributes being set |
| **Update** | `"Target"` | `Entity` | Contains **only changed attributes** + primary key |
| **Delete** | `"Target"` | `EntityReference` | Reference to record being deleted |
| **Retrieve** | `"Target"` | `EntityReference` | Reference to record |
| **Retrieve** | `"ColumnSet"` | `ColumnSet` | Requested columns |
| **Retrieve** | `"RelatedEntitiesQuery"` | `RelationshipQueryCollection` | Optional related entity queries |
| **RetrieveMultiple** | `"Query"` | `QueryBase` | `QueryExpression`, `FetchExpression`, or `QueryByAttribute` |
| **Associate** | `"Target"` | `EntityReference` | Primary record |
| **Associate** | `"Relationship"` | `Relationship` | Relationship schema name |
| **Associate** | `"RelatedEntities"` | `EntityReferenceCollection` | Records to associate |
| **Disassociate** | `"Target"` | `EntityReference` | Primary record |
| **Disassociate** | `"Relationship"` | `Relationship` | Relationship schema name |
| **Disassociate** | `"RelatedEntities"` | `EntityReferenceCollection` | Records to disassociate |
| **SetState** | `"EntityMoniker"` | `EntityReference` | Target entity |
| **SetState** | `"State"` | `OptionSetValue` | State value |
| **SetState** | `"Status"` | `OptionSetValue` | Status value |
