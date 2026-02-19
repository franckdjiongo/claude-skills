# Source Navigation

Use this map to quickly choose which generated source chunks to read first.

## Primary source strengths

1. `advanced-dataverse-plug-in-engineering-for-power-platform-model-driven-apps`
- Best for advanced patterns, chain contracts with `SharedVariables`, debugger/profiler workflows, ALM rules, CI/CD templates, monitoring, and troubleshooting trees.

2. `c-plugin-development-for-dataverse-exhaustive-technical-reference`
- Best for pipeline stages, context key tables, registration matrices, sandbox constraints, type conversion cheatsheets, and architecture decision trees.

3. `power-platform-plugin-development-reference`
- Best for canonical plugin structure, security hardening, data-access anti-patterns, error handling strategy, testing patterns, and observability basics.

4. `practical-c-plugin-code-reference-for-power-platform-model-driven-apps-for-early-2026`
- Best for practical templates, package/version guidance, complete sample code, external call patterns, FakeXrmEasy examples, and CI/CD code references.

## Task-to-source routing

- New plugin from scratch:
  - Start with `practical-...-early-2026`
  - Cross-check pipeline decisions in `c-plugin-development-...-exhaustive-technical-reference`

- Debugging failing plugin:
  - Start with `advanced-dataverse-...`
  - Cross-check exception semantics in `power-platform-plugin-development-reference`

- Security/performance improvement:
  - Start with `power-platform-plugin-development-reference`
  - Cross-check sandbox/limits in `c-plugin-development-...-exhaustive-technical-reference`

- ALM/CI-CD/deployment:
  - Start with `advanced-dataverse-...`
  - Cross-check practical templates in `practical-...-early-2026`

## Generated artifacts

- Heading and chunk map: `references/source-index.md`
- Hash/source-of-truth metadata: `references/source-manifest.json`
- Extracted snippets: `assets/snippets/snippets-manifest.json`
