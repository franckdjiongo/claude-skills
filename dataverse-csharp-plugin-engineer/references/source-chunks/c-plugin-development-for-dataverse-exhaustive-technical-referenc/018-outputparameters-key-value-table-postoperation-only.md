# OutputParameters key-value table (PostOperation only)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 234-247
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 5. Context objects reference — exact keys per message

---

### OutputParameters key-value table (PostOperation only)

**Critical:** Some OutputParameters keys **do not match** the SDK Response class property names.

| Message | Key in OutputParameters | Type | SDK Property Name |
|---|---|---|---|
| **Create** | `"id"` | `Guid` | `CreateResponse.id` |
| **Retrieve** | `"BusinessEntity"` | `Entity` | `RetrieveResponse.Entity` |
| **RetrieveMultiple** | `"BusinessEntityCollection"` | `EntityCollection` | `RetrieveMultipleResponse.EntityCollection` |
| **Update** | (none significant) | — | — |
| **Delete** | (none significant) | — | — |

The key name `"BusinessEntity"` (not `"Entity"`) and `"BusinessEntityCollection"` (not `"EntityCollection"`) are legacy naming conventions that persist in the pipeline.
