Guid Create(Entity entity);
Entity Retrieve(string entityName, Guid id, ColumnSet columnSet);
void Update(Entity entity);
void Delete(string entityName, Guid id);
void Associate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
void Disassociate(string entityName, Guid entityId, Relationship relationship, EntityReferenceCollection relatedEntities);
OrganizationResponse Execute(OrganizationRequest request);
EntityCollection RetrieveMultiple(QueryBase query);
