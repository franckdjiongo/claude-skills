# ESLint 9 flat config

## Table of contents

- Safe default config file choice
- Base flat config
- Typed linting branch
- TypeScript config file caveat
- Compiler-aware linting
- Optional extra React rules

## Safe default config file choice

Prefer `eslint.config.js` or `eslint.config.mjs` as the default.

Why:
- it works without extra TypeScript config-loader setup
- it matches the current official Vite React TypeScript starter shape
- it avoids Node and ESLint flag edge cases around TS-based config loading

Use `eslint.config.ts` only when the repo intentionally wants it and the runtime/setup supports it.

## Base flat config

Dependencies:

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier globals
```

Suggested safe baseline:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  prettier,
])
```

Use this when the repo wants a clean, low-friction starting point.

## Typed linting branch

Use typed linting for production-ish apps, shared UI packages, or codebases where the extra feedback is worth the slower run time.

Suggested upgrade:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettier,
])
```

Guardrails:
- typed linting is slower; do not force it blindly in every prototype or very large monorepo
- prefer typed linting in CI or in a stricter script when local feedback loops matter
- `typescript-eslint` recommends ESLint core's `defineConfig(...)`; do not use `tseslint.config(...)` for new work

## TypeScript config file caveat

If the repo intentionally wants `eslint.config.ts`:
- Node-based ESLint setups may need `jiti`
- native TS config loading in Node also has version and flag requirements
- only choose this path when the repo truly benefits from a TS config file

For most projects, JavaScript config files are simpler and more robust.

## Compiler-aware linting

`eslint-plugin-react-hooks` is also where React Compiler diagnostics surface.

When enabling or preparing for React Compiler:
- keep the standard hooks rules in place
- verify the currently installed package's flat-config export shape before assuming a preset name such as `recommended-latest`
- if the package export shape is awkward in the installed version, fall back to explicit plugin registration and rules rather than guessing

Do not block adoption on making every compiler diagnostic disappear immediately. Address them incrementally.

## Optional extra React rules

The official Vite template notes that React-specific rules can be expanded further with plugins such as `eslint-plugin-react-x` and `eslint-plugin-react-dom`.

Add them only when the team wants deeper React lint coverage. Do not over-tool a small app by default.
