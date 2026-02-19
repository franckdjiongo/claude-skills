# 5.1 Comparison: QueryExpression vs. FetchXML vs. LINQ

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 289-301
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **5.1 Comparison: QueryExpression vs. FetchXML vs. LINQ**

| Feature | QueryExpression | FetchXML | LINQ |
| :---- | :---- | :---- | :---- |
| **Primary Use Case** | Dynamic, strongly-typed queries in plugins. | Complex reporting, aggregates, hierarchical queries. | Rapid prototyping, simple static queries. |
| **Performance** | **High**. Native SDK object model. No parsing overhead. | **Medium**. Requires XML parsing and conversion. | **Low**. Abstraction layer adds overhead; converts to QueryExpression internally. |
| **Aggregates** | No (Limited). | **Yes**. Full support for Group By, Sum, Count, Avg. | No (Limitations in provider). |
| **Joins** | Yes (LinkEntity). | Yes (link-entity). | Yes (join), but can produce inefficient query plans. |
| **Safety** | **Injection Safe**. | **Injection Risk** (String manipulation). | **Safe** (Compiler verified). |
| **Recommendation** | **Default for Plugins.** | Use for **Aggregates** or complex hierarchical views. | Avoid in high-performance paths. |

22
