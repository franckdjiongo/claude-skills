# Dataverse Plugin A-to-Z Playbook

Use this sequence when the user asks for complete, end-to-end guidance.

## A. Align scope and constraints

- Confirm message(s), table(s), synchronous vs asynchronous requirements, latency budget, and rollback expectations.
- Confirm runtime constraints (Dataverse sandbox, .NET Framework 4.6.2 target, package strategy).
- Read first:
  - `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-reference/`
  - `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-driven-apps-for-early-2026/`

## B. Build project foundation

- Establish solution layout (`src`, `tests`, CI pipeline files).
- Choose package strategy for dependencies (plugin package/dependent assemblies over ILMerge).
- Reuse:
  - `assets/templates/canonical-plugin.cs.tpl`
  - `assets/templates/fake-xrmeasy-tests.cs.tpl`
  - `assets/templates/github-actions-plugin.yml.tpl`

## C. Choose pipeline stage and registration strategy

- Decide PreValidation vs PreOperation vs PostOperation (sync/async).
- Set filtering attributes for Update steps.
- Define image strategy (pre/post images with minimal columns).
- Read first:
  - `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-reference/`
  - `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model-driven-apps/`

## D. Develop plugin and custom API handlers

- Implement stateless plugin class and strict context guards.
- Use `ITracingService` early and consistently.
- Use `InvalidPluginExecutionException` for user-facing/business validation failures.
- Reuse:
  - `assets/templates/canonical-plugin.cs.tpl`
  - `assets/templates/custom-api-plugin.cs.tpl`
  - `assets/snippets/` for source-grounded examples.

## E. Add deterministic test coverage

- Add unit tests for happy path, validation failures, and depth/loop guards.
- Add integration tests for registration-critical behavior.
- Read first:
  - `references/source-chunks/power-platform-plugin-development-reference/`
  - `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-driven-apps-for-early-2026/`

## F. Harden performance and security

- Enforce filtering attributes and image use to reduce unnecessary invokes and retrieves.
- Validate privilege boundary (`UserId` vs `InitiatingUserId` and SYSTEM context use).
- Remove query anti-patterns (`ColumnSet(true)`, N+1 loops, unsafe query concatenation).
- Read:
  - `references/improvement-checklist.md`
  - `references/source-chunks/power-platform-plugin-development-reference/`

## G. Ship with ALM + CI/CD

- Treat steps and assemblies as solution components and keep deployment deterministic.
- Use managed deployment downstream and explicit version strategy.
- Reuse:
  - `assets/templates/github-actions-plugin.yml.tpl`
  - `assets/templates/azure-devops-plugin.yml.tpl`

## H. Observe and operate in production

- Correlate traces with operation/correlation IDs.
- Triage sync failures separately from async system-job failures.
- Use Application Insights/telemetry where available.
- Read:
  - `references/debugging-triage.md`
  - `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model-driven-apps/`

## I. Improve and refactor safely

- Run incremental refactors with regression tests between changes.
- Preserve behavior while reducing loop risk, contention, and over-fetching.
- Use `references/improvement-checklist.md` as release gate.
