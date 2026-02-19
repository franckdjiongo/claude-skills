# SharedVariables cross-stage behavior

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 248-255
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 5. Context objects reference — exact keys per message

---

### SharedVariables cross-stage behavior

SharedVariables (`ParameterCollection`) allow inter-plugin data passing within a single pipeline execution. All values must be serializable. For **Create, Update, Delete, and RetrieveExchangeRate** messages, PreValidation runs in a separate context from PreOperation/PostOperation. To access PreValidation SharedVariables from later stages, traverse `context.ParentContext.SharedVariables`. For all other messages, SharedVariables flow directly across stages.

The `"tag"` key is reserved: values set via `OrganizationRequest["tag"]` or the Web API `tag` query parameter are accessible as `context.SharedVariables["tag"]` and are **immutable** within plugin code.

---
