# External web call requirements

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 289-294
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 6. Sandbox rules for Dataverse online plugins

---

### External web call requirements

External HTTP/HTTPS calls must target named web addresses (not IP addresses), set `Timeout` explicitly (recommended: 15 seconds), and set `ConnectionClose = true` (KeepAlive false). The target server must support current TLS and cipher suites and accept connections from the `PowerPlatformPlex` service tag IP ranges. Force synchronous execution using `.GetAwaiter().GetResult()` instead of `await`.

---
