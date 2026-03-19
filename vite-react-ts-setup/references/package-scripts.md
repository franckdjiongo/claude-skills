# Package scripts

## Table of contents

- Raw Vite single-package app
- Framework starters
- Monorepo root scripts
- Optional manager enforcement

## Raw Vite single-package app

Use this as the default script shape for a plain Vite React app:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "check": "pnpm lint && pnpm typecheck && pnpm test:run"
  }
}
```

If Husky is used, add:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

## Framework starters

For React Router framework mode, TanStack Start, Vike, RedwoodSDK, and similar starters:
- preserve the generated `dev`, `build`, and framework-specific scripts
- add only missing `lint`, `typecheck`, `test`, `format`, or `check` scripts
- do not replace the starter's build command with `vite build` unless the user explicitly wants to abandon that starter

## Monorepo root scripts

Use root scripts only as orchestration layers:

```json
{
  "scripts": {
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test:run": "pnpm -r --if-present test:run",
    "build": "pnpm -r --if-present build",
    "check": "pnpm -r --if-present lint && pnpm -r --if-present typecheck && pnpm -r --if-present test:run"
  }
}
```

Use `--filter` for app-specific tasks when the user is focused on one package.

## Optional manager enforcement

Only add `preinstall` manager enforcement if the team explicitly wants it.

Do not add it by default in mixed environments or during a migration that is not finished.
