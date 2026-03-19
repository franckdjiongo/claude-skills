# Husky and lint-staged

## Table of contents

- When to use local hooks
- Setup
- Suggested pre-commit config
- What not to run on every commit
- Monorepo note

## When to use local hooks

Use Husky and lint-staged when:
- the repo is a Git repo
- contributors benefit from fast local feedback
- the team wants lightweight guardrails before commits

Do **not** add Husky automatically in repos without Git, in generated temp repos, or when CI-only enforcement is clearly preferred.

## Setup

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

That creates a starter hook and adds or updates `prepare` in `package.json`.

## Suggested pre-commit hook

`.husky/pre-commit`

```bash
pnpm exec lint-staged
```

`package.json`

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,scss,html,yml,yaml}": ["prettier --write"]
  }
}
```

Keep staged-file checks small and fast.

## What not to run on every commit

Avoid running the full app test suite or full-project typecheck on every commit unless the repo is tiny.

Prefer these in CI instead:
- full typecheck
- full test suite
- build

If the team wants a stronger local gate, use `pre-push`, not `pre-commit`.

## Monorepo note

In monorepos, prefer one root `lint-staged` strategy that works on staged files across packages. Avoid hooks that assume only one app exists.
