# Improvement Checklist

Use this list before claiming a plugin is production-ready.

## Architecture and lifecycle

- Plugin class is stateless (no mutable request data in instance fields).
- Stage selection is explicit and justified (PreValidation/PreOperation/PostOperation sync or async).
- Registration rank/order is intentional; no reliance on same-rank randomness.

## Data access and performance

- Update steps use filtering attributes.
- Entity images are configured with only needed columns.
- No `ColumnSet(true)` in hot paths without strict justification.
- No avoidable N+1 retrieval loops.
- Sync handler work is bounded and low-latency.

## Security and correctness

- User-context choice is explicit (`UserId`, `InitiatingUserId`, or SYSTEM only when required).
- Query construction avoids injection-prone concatenation.
- Sensitive data handling/logging is controlled.
- Exception handling uses clear user-facing failures where needed.

## Reliability and loop prevention

- Depth/re-entry guard is present where self-trigger risk exists.
- SharedVariables usage is explicit and serializable.
- Async operations are idempotent or safely retryable.

## Testing

- Unit tests cover happy path + failure path + guard clauses.
- Integration tests cover critical registration/context behavior.
- Regression tests exist for previously observed production bugs.

## Operations

- Tracing includes message, stage, depth, and correlation identifiers.
- Alerting/monitoring path exists for sync and async failures.
- Deployment/versioning strategy is documented in release notes or pipeline config.

## Source-backed references

- Pipeline matrices and sandbox constraints:
  - `references/source-chunks/c-plugin-development-for-dataverse-exhaustive-technical-reference/`
- Security/performance anti-patterns:
  - `references/source-chunks/power-platform-plugin-development-reference/`
- ALM, CI/CD, monitoring, and advanced troubleshooting:
  - `references/source-chunks/advanced-dataverse-plug-in-engineering-for-power-platform-model-driven-apps/`
- Practical code/pipeline examples:
  - `references/source-chunks/practical-c-plugin-code-reference-for-power-platform-model-driven-apps-for-early-2026/`
