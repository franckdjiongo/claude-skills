# GitHub Actions CI

## Table of contents

- Single-package pnpm app
- Key rules
- Monorepo notes
- Matrix note

## Single-package pnpm app

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10
          # omit version if packageManager is already pinned in package.json

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:run
      - run: pnpm build
```

## Key rules

- Always pin `node-version` explicitly.
- For pnpm, set `cache: 'pnpm'` explicitly. Do not assume npm-style auto-caching applies.
- `actions/setup-node` caches package data, **not** `node_modules`.
- Prefer an explicit install step instead of relying on `pnpm/action-setup` `run_install` unless there is a real reason.

## Monorepo notes

Use `cache-dependency-path` when dependency files are not in the root or when multiple lockfiles exist.

Example:

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: 'pnpm'
    cache-dependency-path: |
      pnpm-lock.yaml
```

For a normal pnpm workspace with one root lockfile, the root lockfile is usually enough.

## Matrix note

Use a Node matrix only when the repo actually supports multiple runtime lines, such as a library or internal platform package.

For product apps, prefer one deployed runtime line unless there is a clear support requirement.
