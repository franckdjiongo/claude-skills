# Permitted vs. blocked operations

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 274-288
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 6. Sandbox rules for Dataverse online plugins

---

### Permitted vs. blocked operations

| Category | Permitted | Blocked |
|---|---|---|
| **Dataverse access** | `IOrganizationService` (all 8 methods) | Dataverse Web API from plugin code |
| **Network calls** | `HttpClient`, `WebClient` over HTTP/HTTPS with DNS name resolution | Localhost/loopback, raw IP addresses, non-HTTP protocols |
| **Azure integration** | Azure Service Bus/Event Hub via `IServiceEndpointNotificationService` | Direct Azure SDK calls requiring blocked APIs |
| **File system** | ❌ Completely blocked | Read, write, enumerate—all blocked |
| **Registry** | ❌ Completely blocked | — |
| **Threading** | Single-threaded execution only | `Parallel.ForEach`, `Task.Run`, multi-threaded patterns—all unsupported |
| **AppDomain** | No event registration allowed | `AppDomain.CurrentDomain` events unreliable |
| **Reflection** | Limited (standard .NET reflection works) | Low-level Windows API interop blocked |
| **Data schema changes** | ❌ in synchronous plugins | Creating/modifying tables or columns |
| **Batch operations** | ❌ `ExecuteMultipleRequest` / `ExecuteTransactionRequest` not supported in plugin context | — |
