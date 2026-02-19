# Dataverse type mapping cheatsheet

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 311-333
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 7. Entity model patterns and the type conversion cheatsheet

---

### Dataverse type mapping cheatsheet

| Dataverse Column Type | C# SDK Type | Namespace | Safe Access Pattern |
|---|---|---|---|
| Lookup | `EntityReference` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<EntityReference>("field")?.Id` |
| Choice (Option Set) | `OptionSetValue` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<OptionSetValue>("field")?.Value` |
| Choices (Multi-Select) | `OptionSetValueCollection` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<OptionSetValueCollection>("field")` |
| Currency | `Money` | `Microsoft.Xrm.Sdk` | `entity.GetAttributeValue<Money>("field")?.Value` |
| Unique Identifier | `Guid` | `System` | `entity.Id` or `entity.GetAttributeValue<Guid>("field")` |
| Whole Number | `int` (`int?` early-bound) | `System` | `entity.GetAttributeValue<int>("field")` (returns 0 if missing) |
| Floating Point | `double` (`double?` early-bound) | `System` | `entity.GetAttributeValue<double>("field")` |
| Decimal | `decimal` (`decimal?` early-bound) | `System` | `entity.GetAttributeValue<decimal>("field")` |
| Two Options (Boolean) | `bool` (`bool?` early-bound) | `System` | `entity.GetAttributeValue<bool>("field")` |
| Date and Time | `DateTime` (`DateTime?` early-bound) | `System` | `entity.GetAttributeValue<DateTime?>("field")` — always UTC |
| Text / Memo | `string` | `System` | `entity.GetAttributeValue<string>("field")` |
| Aliased Value (joins) | `AliasedValue` | `Microsoft.Xrm.Sdk` | `((AliasedValue)entity["alias.field"]).Value` — cast inner value |
| Activity Party (To, CC) | `EntityCollection` | `Microsoft.Xrm.Sdk` | Contains `activityparty` entities with `partyid` (EntityReference) |
| Managed Property | `BooleanManagedProperty` | `Microsoft.Xrm.Sdk` | `.Value` (bool), `.CanBeChanged` (bool) |

**Critical null-safety rule:** `entity.GetAttributeValue<T>("name")` returns `default(T)` when the key is absent (null for reference types, 0 for value types). The indexer `entity["name"]` throws `KeyNotFoundException` if absent. Always prefer `GetAttributeValue<T>` or check `entity.Contains("name")` before using the indexer.

**FormattedValues** are server-generated display strings available only on retrieved entities: `entity.FormattedValues["statuscode"]` returns the label text (e.g., "Active"). Use `entity.FormattedValues.ContainsKey()` for safe access.
