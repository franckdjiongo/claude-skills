# Audit checklist

## Table of contents

- Classify the repo
- Runtime and package manager
- Core config health
- Quality tooling
- Framework and advanced branches
- CI and workflows
- Red flags
- Audit output template

## Classify the repo

Determine first:
- raw Vite SPA or framework/starter branch
- single package or workspace
- current package manager
- likely migration vs small hardening task

## Runtime and package manager

Check:
- lockfiles
- `packageManager`
- Node pinning (`.nvmrc`, `.node-version`, Volta, CI)
- whether the chosen Node line satisfies Vite **and** ESLint 9

## Core config health

Check for:
- `vite.config.*`
- `tsconfig*.json`
- `eslint.config.*`
- `vitest.config.*`
- root scripts that match the actual architecture

## Quality tooling

Check whether the repo has or intentionally lacks:
- Prettier and EditorConfig
- Husky and lint-staged
- typecheck script
- tests
- coverage
- CI verification workflow

## Framework and advanced branches

If the repo uses React Router framework mode, Vike, RedwoodSDK, TanStack Router/Start, React Compiler, or RSC, check that the audit respects that branch instead of trying to normalize it into raw Vite.

## CI and workflows

Check:
- explicit Node version in GitHub Actions
- pnpm caching configured explicitly when pnpm is used
- `cache-dependency-path` when needed
- lockfile committed
- build/typecheck/test commands aligned with the repo's actual scripts

## Red flags

Treat these as high-signal issues:
- `react-scripts` or CRA leftovers in a repo that claims to be on Vite
- multiple competing lockfiles
- Node line that satisfies Vite but not ESLint 9
- `eslint.config.ts` without the runtime/setup to support it
- deprecated Vitest workspace config
- raw Vite build scripts inside a framework repo
- RSC packages on unpatched lines
- path-alias sprawl where real workspace packages should exist
- manager enforcement scripts added before a migration is fully complete

## Audit output template

Use this shape for audits:

```text
Detected
- ...

Missing or risky
- ...

Recommended next changes
1. ...
2. ...
3. ...

Verification
- ...
```

Prioritize install/build/security issues above style preferences.
