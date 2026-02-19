# Source Index

Generated from the four authoritative source docs for `dataverse-csharp-plugin-engineer`.

- Generated at (UTC): `2026-02-19T04:46:03.734242+00:00`
- Total docs: `4`
- Total section chunks: `130`
- Total extracted code snippets: `26`

## Documents

| Doc ID | Source | Lines | SHA256 | Sections | Snippets |
|---|---|---:|---|---:|---:|
| advanced-dataverse-plug-in-engineering-for-power-platform-model | `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md` | 654 | `f37847eaa1b9e18ffd2f8185aa8056c07ac23f32b4b57330358bdbce13a41ecd` | 40 | 4 |
| c-plugin-development-for-dataverse-exhaustive-technical-referenc | `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md` | 469 | `2c74d2c5bb77bff550ea3100c35e444732f75a1ddd1cf3465c8f6546ffeb0ee3` | 33 | 7 |
| power-platform-plugin-development-reference | `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md` | 745 | `d912d3ae1d13425aa2428ba32d2b923a8a18388a54ccbff5143b0e36817af254` | 28 | 0 |
| practical-c-plugin-code-reference-for-power-platform-model-drive | `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md` | 1584 | `173e42351c7051fb12b60101d3352e4f691c2f2813d6490464577eafcb76e4fe` | 29 | 15 |

## Advanced Dataverse plug-in engineering for Power Platform model-driven apps

- Source: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Chunks directory: `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model`

| # | Heading | Level | Lines | Chunk | Snippets |
|---:|---|---:|---|---|---:|
| 1 | Executive summary | 2 | 3-6 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/001-executive-summary.md` | 0 |
| 2 | Advanced plug-in patterns | 2 | 7-8 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/002-advanced-plug-in-patterns.md` | 0 |
| 3 | Pipeline mental model, chains, and deterministic ordering | 3 | 9-20 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/003-pipeline-mental-model-chains-and-deterministic-ordering.md` | 0 |
| 4 | Passing data between steps via SharedVariables | 3 | 21-85 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/004-passing-data-between-steps-via-sharedvariables.md` | 1 |
| 5 | Deep-clone pattern for entity manipulation | 3 | 86-147 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/005-deep-clone-pattern-for-entity-manipulation.md` | 1 |
| 6 | Rollback strategies in synchronous pipelines | 3 | 148-158 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/006-rollback-strategies-in-synchronous-pipelines.md` | 0 |
| 7 | Custom API reference | 2 | 159-160 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/007-custom-api-reference.md` | 0 |
| 8 | How Custom APIs differ from classic plug-in messages | 3 | 161-175 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/008-how-custom-apis-differ-from-classic-plug-in-messages.md` | 0 |
| 9 | Registration-to-implementation guide | 3 | 176-194 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/009-registration-to-implementation-guide.md` | 0 |
| 10 | Full SDK pattern for implementing a Custom API handler | 3 | 195-265 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/010-full-sdk-pattern-for-implementing-a-custom-api-handler.md` | 1 |
| 11 | Debugging workflow | 2 | 266-267 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/011-debugging-workflow.md` | 0 |
| 12 | Standard prerequisites: enable tracing safely | 3 | 268-277 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/012-standard-prerequisites-enable-tracing-safely.md` | 0 |
| 13 | Plug-in profiler: capture + replay | 3 | 278-292 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/013-plug-in-profiler-capture-replay.md` | 0 |
| 14 | Attaching Visual Studio debugger to Plugin Registration Tool | 3 | 293-301 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/014-attaching-visual-studio-debugger-to-plugin-registration-tool.md` | 0 |
| 15 | Remote debugging via captured logs / command prompt profiler mode | 3 | 302-310 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/015-remote-debugging-via-captured-logs-command-prompt-profiler-mode.md` | 0 |
| 16 | Debugging asynchronous plug-ins | 3 | 311-321 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/016-debugging-asynchronous-plug-ins.md` | 0 |
| 17 | ALM and solution structure guide | 2 | 322-323 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/017-alm-and-solution-structure-guide.md` | 0 |
| 18 | Solution-aware registration rules | 3 | 324-331 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/018-solution-aware-registration-rules.md` | 0 |
| 19 | Managed vs unmanaged decision logic | 3 | 332-339 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/019-managed-vs-unmanaged-decision-logic.md` | 0 |
| 20 | Upgrade vs update strategy (solutions and plug-in assemblies) | 3 | 340-348 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/020-upgrade-vs-update-strategy-solutions-and-plug-in-assemblies.md` | 0 |
| 21 | Connection references and environment variables from plug-ins | 3 | 349-358 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/021-connection-references-and-environment-variables-from-plug-ins.md` | 0 |
| 22 | Operational hardening: statelessness and shared instances | 3 | 359-362 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/022-operational-hardening-statelessness-and-shared-instances.md` | 0 |
| 23 | CI/CD pipeline reference | 2 | 363-364 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/023-ci-cd-pipeline-reference.md` | 0 |
| 24 | Core deployment primitives (official tools only) | 3 | 365-374 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/024-core-deployment-primitives-official-tools-only.md` | 0 |
| 25 | GitHub Actions YAML template (build, pack, deploy) | 3 | 375-464 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/025-github-actions-yaml-template-build-pack-deploy.md` | 1 |
| 26 | Azure DevOps pipeline template (Build Tools tasks) | 3 | 465-478 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/026-azure-devops-pipeline-template-build-tools-tasks.md` | 0 |
| 27 | Versioning strategies compatible with solution layering | 3 | 513-517 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/027-versioning-strategies-compatible-with-solution-layering.md` | 0 |
| 28 | Legacy code refactoring guide | 2 | 518-519 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/028-legacy-code-refactoring-guide.md` | 0 |
| 29 | Anti-pattern checklist (Microsoft-sourced items first) | 3 | 520-533 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/029-anti-pattern-checklist-microsoft-sourced-items-first.md` | 0 |
| 30 | Safe refactoring sequence (agent-operational) | 3 | 534-542 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/030-safe-refactoring-sequence-agent-operational.md` | 0 |
| 31 | Regression testing strategy without third-party frameworks | 3 | 543-549 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/031-regression-testing-strategy-without-third-party-frameworks.md` | 0 |
| 32 | Production monitoring guide | 2 | 550-551 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/032-production-monitoring-guide.md` | 0 |
| 33 | Telemetry with Application Insights and plug-in custom telemetry | 3 | 552-562 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/033-telemetry-with-application-insights-and-plug-in-custom-telemetry.md` | 0 |
| 34 | Plug-in failure alerting via Power Automate | 3 | 563-573 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/034-plug-in-failure-alerting-via-power-automate.md` | 0 |
| 35 | Async failure triage and recovery | 3 | 574-583 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/035-async-failure-triage-and-recovery.md` | 0 |
| 36 | SLA impact analysis for synchronous failures | 3 | 584-587 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/036-sla-impact-analysis-for-synchronous-failures.md` | 0 |
| 37 | Breaking changes log for 2022–2025 and advanced troubleshooting decision tree | 2 | 588-589 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/037-breaking-changes-log-for-2022-2025-and-advanced-troubleshooting.md` | 0 |
| 38 | Breaking changes log for 2022–2025 | 3 | 590-602 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/038-breaking-changes-log-for-2022-2025.md` | 0 |
| 39 | Advanced troubleshooting decision tree | 3 | 603-636 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/039-advanced-troubleshooting-decision-tree.md` | 0 |
| 40 | Cited sources | 3 | 637-654 | `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model/040-cited-sources.md` | 0 |

## C# plugin development for Dataverse: exhaustive technical reference

- Source: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Chunks directory: `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc`

| # | Heading | Level | Lines | Chunk | Snippets |
|---:|---|---:|---|---|---:|
| 1 | 1. Executive summary | 2 | 3-8 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/001-1-executive-summary.md` | 0 |
| 2 | 2. The plugin execution pipeline processes every Dataverse operation in four stages | 2 | 9-54 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/002-2-the-plugin-execution-pipeline-processes-every-dataverse-operat.md` | 1 |
| 3 | Stage-by-stage data availability matrix | 3 | 55-69 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/003-stage-by-stage-data-availability-matrix.md` | 0 |
| 4 | Transaction boundary rules | 3 | 70-75 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/004-transaction-boundary-rules.md` | 0 |
| 5 | 3. Core interfaces reference | 2 | 76-77 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/005-3-core-interfaces-reference.md` | 0 |
| 6 | IPlugin — the sole entry point | 3 | 78-89 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/006-iplugin-the-sole-entry-point.md` | 1 |
| 7 | Services available from IServiceProvider | 3 | 90-101 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/007-services-available-from-iserviceprovider.md` | 0 |
| 8 | IOrganizationServiceFactory.CreateOrganizationService behavior | 3 | 102-109 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/008-iorganizationservicefactory-createorganizationservice-behavior.md` | 0 |
| 9 | IOrganizationService — exactly 8 methods | 3 | 110-124 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/009-iorganizationservice-exactly-8-methods.md` | 1 |
| 10 | IPluginExecutionContext version progression (v1–v7) | 3 | 125-138 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/010-ipluginexecutioncontext-version-progression-v1-v7.md` | 0 |
| 11 | Complete IPluginExecutionContext property table (v1 base) | 3 | 139-170 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/011-complete-ipluginexecutioncontext-property-table-v1-base.md` | 0 |
| 12 | 4. Plugin registration reference | 2 | 171-172 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/012-4-plugin-registration-reference.md` | 0 |
| 13 | Step registration parameter matrix | 3 | 173-186 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/013-step-registration-parameter-matrix.md` | 0 |
| 14 | Entity image registration rules | 3 | 187-199 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/014-entity-image-registration-rules.md` | 0 |
| 15 | Secure vs. unsecure configuration | 3 | 200-210 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/015-secure-vs-unsecure-configuration.md` | 0 |
| 16 | 5. Context objects reference — exact keys per message | 2 | 211-212 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/016-5-context-objects-reference-exact-keys-per-message.md` | 0 |
| 17 | InputParameters key-value table | 3 | 213-233 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/017-inputparameters-key-value-table.md` | 0 |
| 18 | OutputParameters key-value table (PostOperation only) | 3 | 234-247 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/018-outputparameters-key-value-table-postoperation-only.md` | 0 |
| 19 | SharedVariables cross-stage behavior | 3 | 248-255 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/019-sharedvariables-cross-stage-behavior.md` | 0 |
| 20 | 6. Sandbox rules for Dataverse online plugins | 2 | 256-259 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/020-6-sandbox-rules-for-dataverse-online-plugins.md` | 0 |
| 21 | Hard resource constraints | 3 | 260-273 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/021-hard-resource-constraints.md` | 0 |
| 22 | Permitted vs. blocked operations | 3 | 274-288 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/022-permitted-vs-blocked-operations.md` | 0 |
| 23 | External web call requirements | 3 | 289-294 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/023-external-web-call-requirements.md` | 0 |
| 24 | 7. Entity model patterns and the type conversion cheatsheet | 2 | 295-296 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/024-7-entity-model-patterns-and-the-type-conversion-cheatsheet.md` | 0 |
| 25 | Late-bound vs. early-bound decision tree | 3 | 297-310 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/025-late-bound-vs-early-bound-decision-tree.md` | 1 |
| 26 | Dataverse type mapping cheatsheet | 3 | 311-333 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/026-dataverse-type-mapping-cheatsheet.md` | 0 |
| 27 | Assembly versioning and plugin packages | 3 | 334-348 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/027-assembly-versioning-and-plugin-packages.md` | 0 |
| 28 | 8. Architectural decision trees | 2 | 349-350 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/028-8-architectural-decision-trees.md` | 0 |
| 29 | Sync vs. async execution mode | 3 | 351-367 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/029-sync-vs-async-execution-mode.md` | 1 |
| 30 | Pre vs. post operation stage selection | 3 | 368-385 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/030-pre-vs-post-operation-stage-selection.md` | 1 |
| 31 | Filtering attributes usage decision | 3 | 386-398 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/031-filtering-attributes-usage-decision.md` | 1 |
| 32 | 9. Ten common architectural mistakes with root causes | 2 | 399-422 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/032-9-ten-common-architectural-mistakes-with-root-causes.md` | 0 |
| 33 | 10. Cited sources | 2 | 423-469 | `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-referenc/033-10-cited-sources.md` | 0 |

## Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps

- Source: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Chunks directory: `references/source-chunks/power-platform-plugin-development-reference`

| # | Heading | Level | Lines | Chunk | Snippets |
|---:|---|---:|---|---|---:|
| 1 | 1\. Executive Summary | 2 | 3-16 | `references/source-chunks/power-platform-plugin-development-reference/001-1-executive-summary.md` | 0 |
| 2 | 2.1 The Stateless Paradigm and Class Design | 3 | 23-28 | `references/source-chunks/power-platform-plugin-development-reference/002-2-1-the-stateless-paradigm-and-class-design.md` | 0 |
| 3 | Constructor Restrictions | 4 | 29-35 | `references/source-chunks/power-platform-plugin-development-reference/003-constructor-restrictions.md` | 0 |
| 4 | 2.2 The Service Provider and Context | 3 | 36-44 | `references/source-chunks/power-platform-plugin-development-reference/004-2-2-the-service-provider-and-context.md` | 0 |
| 5 | 2.3 Context Validation | 3 | 45-52 | `references/source-chunks/power-platform-plugin-development-reference/005-2-3-context-validation.md` | 0 |
| 6 | 2.4 Canonical Code Template | 3 | 53-181 | `references/source-chunks/power-platform-plugin-development-reference/006-2-4-canonical-code-template.md` | 0 |
| 7 | 3.1 Exception Type Matrix | 3 | 188-197 | `references/source-chunks/power-platform-plugin-development-reference/007-3-1-exception-type-matrix.md` | 0 |
| 8 | 3.2 Stage-by-Stage Propagation Rules | 3 | 198-214 | `references/source-chunks/power-platform-plugin-development-reference/008-3-2-stage-by-stage-propagation-rules.md` | 0 |
| 9 | 3.3 Tracing Strategy and ITracingService | 3 | 215-238 | `references/source-chunks/power-platform-plugin-development-reference/009-3-3-tracing-strategy-and-itracingservice.md` | 0 |
| 10 | 4.1 Running Context: SYSTEM vs. Calling User | 3 | 245-263 | `references/source-chunks/power-platform-plugin-development-reference/010-4-1-running-context-system-vs-calling-user.md` | 0 |
| 11 | 4.2 Injection Risks | 3 | 264-277 | `references/source-chunks/power-platform-plugin-development-reference/011-4-2-injection-risks.md` | 0 |
| 12 | 4.3 Handling Sensitive Data | 3 | 278-282 | `references/source-chunks/power-platform-plugin-development-reference/012-4-3-handling-sensitive-data.md` | 0 |
| 13 | 5.1 Comparison: QueryExpression vs. FetchXML vs. LINQ | 3 | 289-301 | `references/source-chunks/power-platform-plugin-development-reference/013-5-1-comparison-queryexpression-vs-fetchxml-vs-linq.md` | 0 |
| 14 | 5.2 Anti-Patterns Table | 3 | 302-310 | `references/source-chunks/power-platform-plugin-development-reference/014-5-2-anti-patterns-table.md` | 0 |
| 15 | 5.3 Code Example: QueryExpression with Joins (Solving N+1) | 3 | 311-343 | `references/source-chunks/power-platform-plugin-development-reference/015-5-3-code-example-queryexpression-with-joins-solving-n-1.md` | 0 |
| 16 | 6.1 Optimization Hierarchy (Ordered by Impact) | 3 | 350-366 | `references/source-chunks/power-platform-plugin-development-reference/016-6-1-optimization-hierarchy-ordered-by-impact.md` | 0 |
| 17 | 6.2 Before/After Code Snippet | 3 | 367-407 | `references/source-chunks/power-platform-plugin-development-reference/017-6-2-before-after-code-snippet.md` | 0 |
| 18 | 7.1 Unit Testing with FakeXrmEasy | 3 | 414-468 | `references/source-chunks/power-platform-plugin-development-reference/018-7-1-unit-testing-with-fakexrmeasy.md` | 0 |
| 19 | 7.2 Integration Testing with Dataverse.Client | 3 | 469-484 | `references/source-chunks/power-platform-plugin-development-reference/019-7-2-integration-testing-with-dataverse-client.md` | 0 |
| 20 | 8.1 Sandbox Constraints | 3 | 491-497 | `references/source-chunks/power-platform-plugin-development-reference/020-8-1-sandbox-constraints.md` | 0 |
| 21 | 8.2 HttpClient Pattern (Synchronous) | 3 | 498-538 | `references/source-chunks/power-platform-plugin-development-reference/021-8-2-httpclient-pattern-synchronous.md` | 0 |
| 22 | 8.3 Fallback to Messaging | 3 | 539-545 | `references/source-chunks/power-platform-plugin-development-reference/022-8-3-fallback-to-messaging.md` | 0 |
| 23 | 9.1 Legacy: ILMerge | 3 | 552-558 | `references/source-chunks/power-platform-plugin-development-reference/023-9-1-legacy-ilmerge.md` | 0 |
| 24 | 9.2 Modern: Dependent Assemblies | 3 | 559-569 | `references/source-chunks/power-platform-plugin-development-reference/024-9-2-modern-dependent-assemblies.md` | 0 |
| 25 | 10.1 Money and Multi-Currency | 3 | 576-583 | `references/source-chunks/power-platform-plugin-development-reference/025-10-1-money-and-multi-currency.md` | 0 |
| 26 | 10.2 Timezone Handling | 3 | 584-593 | `references/source-chunks/power-platform-plugin-development-reference/026-10-2-timezone-handling.md` | 0 |
| 27 | 11.1 Azure Application Insights Integration | 3 | 600-607 | `references/source-chunks/power-platform-plugin-development-reference/027-11-1-azure-application-insights-integration.md` | 0 |
| 28 | Works cited | 4 | 691-745 | `references/source-chunks/power-platform-plugin-development-reference/028-works-cited.md` | 0 |

## Practical C# plugin code reference for Power Platform model-driven apps for early 2026

- Source: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Chunks directory: `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive`

| # | Heading | Level | Lines | Chunk | Snippets |
|---:|---|---:|---|---|---:|
| 1 | Executive summary | 2 | 3-6 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/001-executive-summary.md` | 0 |
| 2 | Project setup reference | 2 | 7-8 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/002-project-setup-reference.md` | 0 |
| 3 | Current packages and versions for Q1 2026 | 3 | 9-23 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/003-current-packages-and-versions-for-q1-2026.md` | 0 |
| 4 | Target framework and packaging strategy | 3 | 24-29 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/004-target-framework-and-packaging-strategy.md` | 0 |
| 5 | Directory structure | 3 | 30-62 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/005-directory-structure.md` | 1 |
| 6 | Strong-name key generation | 3 | 63-67 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/006-strong-name-key-generation.md` | 0 |
| 7 | Full .csproj template | 3 | 74-167 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/007-full-csproj-template.md` | 1 |
| 8 | Test project .csproj template (FakeXrmEasy v3+) | 3 | 168-201 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/008-test-project-csproj-template-fakexrmeasy-v3.md` | 1 |
| 9 | Plugin patterns library | 2 | 202-203 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/009-plugin-patterns-library.md` | 0 |
| 10 | Canonical plug-in template | 3 | 204-403 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/010-canonical-plug-in-template.md` | 1 |
| 11 | Production-ready plug-in example class | 3 | 404-478 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/011-production-ready-plug-in-example-class.md` | 1 |
| 12 | Custom API implementation | 2 | 479-480 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/012-custom-api-implementation.md` | 0 |
| 13 | Custom API plug-in class (end-to-end) | 3 | 481-555 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/013-custom-api-plug-in-class-end-to-end.md` | 1 |
| 14 | Registration configuration (pac + spkl) | 3 | 556-574 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/014-registration-configuration-pac-spkl.md` | 1 |
| 15 | Unit test reference with FakeXrmEasy v3+ | 2 | 575-578 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/015-unit-test-reference-with-fakexrmeasy-v3.md` | 0 |
| 16 | Complete test file with scenarios | 3 | 579-855 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/016-complete-test-file-with-scenarios.md` | 1 |
| 17 | Data access and integration patterns | 2 | 856-857 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/017-data-access-and-integration-patterns.md` | 0 |
| 18 | QueryExpression patterns + FetchXML equivalents | 3 | 858-1025 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/018-queryexpression-patterns-fetchxml-equivalents.md` | 1 |
| 19 | External call and chaining patterns | 2 | 1026-1027 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/019-external-call-and-chaining-patterns.md` | 0 |
| 20 | External HTTP call pattern (sandbox-compliant) | 3 | 1028-1148 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/020-external-http-call-pattern-sandbox-compliant.md` | 1 |
| 21 | Shared variables plug-in chain (producer + consumer) | 3 | 1149-1227 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/021-shared-variables-plug-in-chain-producer-consumer.md` | 1 |
| 22 | CI/CD code reference | 2 | 1228-1229 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/022-ci-cd-code-reference.md` | 0 |
| 23 | Tooling primitives | 3 | 1230-1235 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/023-tooling-primitives.md` | 0 |
| 24 | GitHub Actions workflow (build → test → solution import → plug-in push) | 3 | 1236-1313 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/024-github-actions-workflow-build-test-solution-import-plug-in-push.md` | 1 |
| 25 | spkl configuration (reference) | 3 | 1314-1317 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/025-spkl-configuration-reference.md` | 0 |
| 26 | Real-world scenario implementations | 2 | 1318-1522 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/026-real-world-scenario-implementations.md` | 1 |
| 27 | Coding standards cheatsheet and cited sources | 2 | 1523-1524 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/027-coding-standards-cheatsheet-and-cited-sources.md` | 0 |
| 28 | Dataverse plug-in coding standards for 2025/2026 | 3 | 1525-1550 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/028-dataverse-plug-in-coding-standards-for-2025-2026.md` | 1 |
| 29 | Cited sources | 3 | 1551-1584 | `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-drive/029-cited-sources.md` | 1 |
