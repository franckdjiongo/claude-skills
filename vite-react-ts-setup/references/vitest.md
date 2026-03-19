# Vitest 4

## Table of contents

- Default React setup
- Setup file
- Browser Mode
- Coverage
- Monorepos and projects
- Guardrails

## Default React setup

For a raw Vite React app, start with jsdom and Testing Library.

Dependencies:

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

Suggested config:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

If the repo already has a `vite.config.ts`, you can keep tests there for single-app repos instead of splitting a separate `vitest.config.ts`.

## Setup file

`src/test/setup.ts`

```ts
import '@testing-library/jest-dom/vitest'
```

If the repo uses Vitest globals, also expose the types in TS where needed.

## Browser Mode

Use Browser Mode when jsdom is not faithful enough for the feature being tested.

Good triggers:
- focus, layout, viewport, or navigation behavior
- browser-only APIs
- visual regression or real interaction fidelity

Quick setup path:

```bash
pnpx vitest init browser
```

Guidance:
- `preview` is fine for a local preview of browser tests
- for CI, prefer a real provider such as Playwright or WebdriverIO
- if the repo does not already use one of them, Playwright is usually the easier default

## Coverage

Prefer the V8 coverage provider unless the repo already uses a different one for a reason.

```bash
pnpm vitest run --coverage
```

## Monorepos and projects

Do **not** use deprecated `workspace` config for new work.

Use `test.projects` instead:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
  },
})
```

For bigger repos, keep package-local configs small and let the root config orchestrate.

## Guardrails

- Do not assume jsdom is always enough.
- Do not assume Browser Mode can mock everything the same way Node mode does.
- In Browser Mode, module export spying works differently; use the documented browser-safe mocking patterns.
- Preserve framework-specific test helpers when auditing React Router, Vike, or other framework branches.
