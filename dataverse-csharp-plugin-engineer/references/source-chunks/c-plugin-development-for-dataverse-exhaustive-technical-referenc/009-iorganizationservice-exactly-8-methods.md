# IOrganizationService — exactly 8 methods

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 110-124
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

### IOrganizationService — exactly 8 methods

```csharp
Guid Create(Entity entity);
Entity Retrieve(string entityName, Guid id, ColumnSet columnSet);
void Update(Entity entity);
void Delete(string entityName, Guid id);
void Associate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
void Disassociate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
OrganizationResponse Execute(OrganizationRequest request);
EntityCollection RetrieveMultiple(QueryBase query);
```

All seven convenience methods internally delegate to `Execute`. The `QueryBase` parameter for `RetrieveMultiple` accepts `QueryExpression`, `FetchExpression`, or `QueryByAttribute`.
