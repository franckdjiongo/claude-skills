---
name: test-driven-development
description: |
  Test-first implementation discipline for {{PROJECT_NAME}} features, bugfixes,
  refactors, and behavior changes. Drives RED → VERIFY RED → GREEN → VERIFY
  GREEN → REFACTOR cycle with project-specific test conventions and dispatch
  rules. Use whenever the user says: TDD, test-driven, write a test first, RED
  GREEN REFACTOR, "test-first", "do this with TDD". Also triggers proactively
  before any code change to a UI component, hook, repository, mutation, or
  business-rule-enforcing function. DISTINCT from `quality-gate` (post-merge
  audit) and `execute-plan` (orchestration) — this skill is the per-task
  TDD discipline that the implementer follows.
context: fork
agent: implementer
---

<!--
Template variables:
{{PROJECT_NAME}}
{{TEST_FRAMEWORK}} — Vitest, Jest, etc.
{{PACKAGE_MANAGER}} — bun, npm, pnpm
{{IF_STACK_REACT}} ... {{/IF}}
{{IF_STACK_HAS_DATA_LAYER}} ... {{/IF}}
{{IF_STACK_POWER_PLATFORM}} ... {{/IF}}
-->

# test-driven-development — {{PROJECT_NAME}}

Test-first discipline. Write the failing test, watch it fail, write the minimum code, watch it pass, refactor.

## When to use

Before any change to:
- UI components / hooks / pages
- Repositories / mutations / queries / actions
- Business rule enforcement (validation logic, state machines)
- Bug fixes (write a test that reproduces the bug FIRST)
- Refactors that change observable behavior

Skip TDD for:
- Pure formatting / dead code removal
- Documentation
- Configuration / build files

## Stop on deficient input

Before writing the RED test, re-read the plan's acceptance-criteria checkboxes. If they are ambiguous, silent, or insufficient to write a test that pins the behavior, **STOP and report the gap** — do not encode a guessed interpretation into the test. A guess baked into a green test is the most expensive defect class: it looks correct and passes review. If the AC don't resolve the question, surface the spec gap (`BLOCKED — spec gap`) rather than inventing an answer.

## The 5-stage cycle

### Stage 1: RED — Write the failing test

Write a {{TEST_FRAMEWORK}} test that:
- Asserts the desired BEHAVIOR (not implementation)
- Uses domain language (matching the spec's vocabulary)
- Is the smallest test that would prove the change works

For a new feature: test the user-visible AC.
For a bug fix: test that reproduces the bug.
For a refactor: test that pins existing behavior (will pass before AND after).

### Stage 2: VERIFY RED — Confirm the test fails

Run:
```bash
{{PACKAGE_MANAGER}} run test -- <test-file>
```

The test MUST fail. If it passes:
- The test is wrong (not asserting the right thing)
- OR the behavior already exists (skip implementation; just commit the test)

A passing test pre-implementation is a SIGNAL — investigate.

For a regression test guarding an async race or an ordering bug, mental deletion is not enough — the failure is timing-dependent and a test can pass against the buggy code by accident (a late `setError(null)` erasing the evidence). Prove it empirically: `git stash` the fix, run the test — it MUST fail — then `git stash pop`. A race regression test that stays green with the fix stashed is testing nothing.

### Stage 3: GREEN — Make it pass

Write the MINIMUM code that makes the test pass:
- Don't generalize ("this might be useful later")
- Don't add unrelated improvements ("while I'm here")
- The simplest implementation that satisfies the test

If the test requires a lot of code → the test is too coarse. Split into smaller tests.

### Stage 4: VERIFY GREEN — Confirm tests pass

Preflight typecheck first — type-only errors leak past the test runner to `validate` otherwise:

```bash
npx tsc -b --noEmit
{{PACKAGE_MANAGER}} run test
```

The new test MUST pass.
ALL existing tests MUST still pass (no regressions).

If existing tests fail:
- Either the new code broke them (bug — fix before continuing)
- Or those tests were testing implementation details (acceptable to update them, but document why)

### Stage 5: REFACTOR — Clean up

Now that tests are green, improve the code:
- Apply Clean Code (DRY threshold-of-three, KISS, YAGNI, SOLID, SINE)
- Meaningful names
- Small functions
- Comments explain WHY (the surprise, the constraint)
- Fail fast (validate early, error explicitly)
- Boy Scout Rule (leave file cleaner)

After refactor: run tests again. Still green? You're done.

## Test conventions

### What to test
- Behavior visible to the caller (the API surface)
- Edge cases at boundaries (empty, null, max, min)
- Error paths (the WHY behind error codes)

### What NOT to test
- Implementation details (private functions, internal state)
- Library code (you don't test React, Convex, etc.)
- Compile-time guarantees (TypeScript catches them)

### Test framework idioms

{{IF_STACK_REACT}}
For React components:
- Use {{TEST_FRAMEWORK}} + `@testing-library/react`
- Query by ROLE first, then by TEXT, then by TEST-ID (last resort)
- Forbidden: `container.querySelector` — fragile to DOM structure
- Forbidden: `.toMatchSnapshot()` — brittle, hides intent
- Async assertions: `findBy*` (returns a Promise; auto-waits)
- Don't `waitFor(() => getBy*())` — use `findBy*` instead
{{/IF}}

{{IF_STACK_HAS_DATA_LAYER}}
For repositories / mutations / queries:
- Use {{TEST_FRAMEWORK}} + in-memory test harness or test DB
- Mock external services with format fidelity — and prove it: assert the mock's shape against the boundary's own manifest/schema (OpenAPI, generated types, metadata) in a real test, so the mock goes red the day the real shape moves. Prose that says "matches the real shape" drifts silently.
- Test the cache invalidation contract (which queries are invalidated by which mutations)
{{IF_STACK_POWER_PLATFORM}}
- For Dataverse: assert mock fidelity structurally (`@odata.bind`, GUID case, FormattedValue exclusion) against the entity metadata, not by eyeballing a fixture
{{/IF}}
{{/IF}}

### Unique fixtures per file
Each test file has its own fixtures. Don't share factories across files (cross-file coupling). Define what you need, where you need it.

## Async leak prevention

```bash
{{PACKAGE_MANAGER}} run test -- --detect-async-leaks
```

If async leaks reported → unfinished promises, hanging timers, unmocked services. Fix before merging.

## Commit discipline

A TDD cycle produces clean commits:
1. Commit the failing test (`test: red — <test name>`)
2. Commit the implementation (`feat: green — <feature>`)
3. Commit the refactor if separate (`refactor: <what>`)

Or single combined commit if small (`feat: <feature> + tests`).

## Pre-completion check

Before marking the task complete, re-read the AC checklist:
- [ ] Each AC has a test that would FAIL if that criterion were removed from the code (prove it — delete the behavior mentally and confirm the test goes red). A test that still passes after the behavior is gone is testing the wrong thing.
- [ ] For any "before X" / ordering behavior, the test asserts the SEQUENCE, not just the final state (a criterion like "render X before Y" verified only by final state passes incorrectly).
- [ ] Pure calculation functions carry a property-based check (fast-check, pinned seed) for their invariants — sum-preservation, idempotence, bounds — not only hand-picked examples.
- [ ] Complex business outputs (rendered document, exported ledger) have a golden/approval test, and a witness mutation confirms the golden can actually go red.
- [ ] All tests pass; changed lines clear the diff-coverage floor (≥85% of added/modified src lines executed)
- [ ] {{PACKAGE_MANAGER}} run validate succeeds (quality + size-guard + docs guards + typecheck + coverage + tests)
- [ ] No new TODO / FIXME without DEFERRED-XXX entry
- [ ] No `console.log` in production paths

If any unchecked → not complete.

## Cross-references

- `~/.claude/skills/meta-govern/references/engineering-principles.html` — DRY/KISS/YAGNI/SOLID/SINE/Boy Scout
- `.claude/agents/implementer.md` — uses this skill via `agent:` frontmatter
- `.claude/agents/ui-implementer.md` — uses this skill plus `ship-polished-ui` (its design doctrine)
- `.claude/skills/quality-gate/SKILL.md` — post-merge audit (different concern)

## Gotchas

- "Test passes pre-implementation" is a SIGNAL, not a victory. Investigate.
- Don't write 5 tests at once. One at a time. RED → GREEN → REFACTOR. Repeat.
- Refactor BEFORE moving on. Tech debt compounds.
- For bug fixes: ALWAYS write a reproducer test first. Otherwise the bug returns.
- Don't test private functions. Test through the public API.
- {{IF_STACK_REACT}}Don't use `act()` manually. Testing Library handles it.{{/IF}}
- Async tests need explicit `await` or `findBy*`. `getBy*` immediately + missing element = false fail.
