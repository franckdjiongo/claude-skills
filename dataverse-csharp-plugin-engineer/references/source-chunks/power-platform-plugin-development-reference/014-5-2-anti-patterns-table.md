# 5.2 Anti-Patterns Table

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 302-310
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **5.2 Anti-Patterns Table**

| Anti-Pattern | Analysis | Correct Approach |
| :---- | :---- | :---- |
| **new ColumnSet(true)** | Retrieves **all** columns. Wastes memory, bandwidth, and SQL I/O. Increases payload size, potentially hitting sandbox limits. | Explicitly list columns: new ColumnSet("firstname", "lastname").2 |
| **N+1 Query Problem** | Iterating through a result set and performing a separate Retrieve for each record. Causes exponential database load (1000 records \= 1001 queries). | Use LinkEntity (Joins) to retrieve related data in a single query.29 |
| **Leading Wildcards** | Queries like "%Criteria". Prevents SQL index usage, forcing full table scans on the database. | Use StartsWith ("Criteria%") or Dataverse Search.28 |
| **Retrieving Target** | Performing a service.Retrieve on the entity ID currently being processed. | Use the **Target** InputParameter or **Pre-Entity Images** to get data without a DB call.2 |
