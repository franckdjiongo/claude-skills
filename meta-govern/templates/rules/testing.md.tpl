---
description: TDD-light, Testing Library only, no snapshots, no querySelector, unique fixtures, async via findBy*
paths:
  - tests/**/*.test.*
  - '**/*.test.{ts,tsx,js,jsx}'
  - '**/*.spec.{ts,tsx,js,jsx}'
---

# Testing — {{TEST_FRAMEWORK}}

## Component tests — Testing Library only

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
render(<MyComponent />);
await user.click(screen.getByRole('button', { name: /add to cart/i }));
expect(await screen.findByText(/added/i)).toBeInTheDocument();
```

Avoided patterns:
- `container.querySelector` / `getElementById` / imperative DOM walks — use `getByRole` / `findByText`.
- `.toMatchSnapshot()` — freezes incidental markup, fails silently when stale; assert behavior instead.
- `act()` wrappers around `userEvent` calls (already wrapped).

## Test data is unique per file

The same string twice means `getByText('Add')` matches multiple nodes and tests pass for the wrong reason. Use distinct fixtures: `Add to cart — Velvet Armchair` vs `Add to cart — Gold Lantern`.

## Async — `findBy*` and awaited userEvent

`findBy*` has built-in retry; prefer it over `waitFor(() => getByText(...))`. `userEvent.setup()` calls always use `await`.

## TDD discipline (light)

RED → GREEN → REFACTOR. Minimum bar: new component = render + interaction; new hook = happy + error path; pure utility = one test per branch; bug fix = failing test first. Visual / render correctness is NOT covered by jsdom — a UI change is not done on unit-green alone (see the ui-implementer visual-QA gate). A regression test for an async race is proven by stashing the fix and confirming it goes red (`git stash` → test fails → `git stash pop`) — a timing-dependent test can pass against the bug by accident.

## Setup file — global mocks once

The setup imports `@testing-library/jest-dom` and configures global mocks (matchMedia, ResizeObserver, storage cleanup). Individual files don't import jest-dom or define globals.

## Avoided patterns

{{IF_STACK_HAS_I18N}}- Mocking the i18n hook — render with the real provider.
{{/IF}}- Skipping a flaky test with `.skip` — file a fix or leave `// TODO(test-flake-XXX)`.
- Testing implementation details — assert what the user sees.
- Live network / live backend — stub at the client boundary for unit tests. BUT a green mock suite is not proof of integration: where the stack supports it, keep at least one real-boundary/integration test on the real shape. "Tests green on idealized mocks while the real backend is broken" is the failure this guards against.
