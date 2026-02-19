# Plugin Debugging Triage

Use this decision flow for incident response.

## 1. Classify the failure path

- Sync pipeline error (user sees immediate failure).
- Async pipeline/system job failure (background processing).
- Intermittent or chain-order issue (race/order/shared-variable contract).

## 2. Capture minimal reproducible evidence

- Message name, primary entity name/id, stage, mode, depth.
- Correlation/operation identifiers.
- Registration details (step rank, filtering attributes, images).
- Trace evidence and recent deployment/version change.

## 3. Route by symptom

1. User-visible validation/business error
- Verify exception type and stage behavior.
- Ensure `InvalidPluginExecutionException` carries actionable message.

2. Timeout/performance degradation
- Check unnecessary triggers (missing filtering attributes).
- Check excessive retrieves / `ColumnSet(true)` / N+1 query loops.
- Verify sync work is minimal and external work is offloaded when appropriate.

3. Infinite loop/depth growth
- Verify update logic does not re-trigger same step unintentionally.
- Add/verify depth guards and explicit re-entry contracts.
- Confirm shared-variable chain contract across stages.

4. Async-only failure
- Inspect async system-job payload and trace.
- Replay with profiler when possible.
- Validate retry-safe behavior and idempotency.

5. Security/permission faults
- Validate user context choice (`UserId` vs elevated/SYSTEM).
- Verify role/privilege assumptions and record ownership state.

## 4. Choose diagnostic source quickly

- Pipeline stage and context keys: `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-reference/`
- Exception, tracing, and security patterns: `references/source-chunks/power-platform-plugin-development-reference/`
- Profiler + replay + async triage + monitoring: `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model-driven-apps/`
- Practical code-level fixes: `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-driven-apps-for-early-2026/`

## 5. Exit criteria for “fixed”

- Root cause identified with source-grounded evidence.
- Code or registration change implemented.
- Regression test added/updated.
- Post-fix monitoring query/checklist prepared.
