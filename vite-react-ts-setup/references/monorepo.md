# Monorepos and pnpm workspaces

## Table of contents

- Workspace basics
- Local dependency strategy
- Root vs package configs
- Filtered commands
- Vitest and TS notes
- Guardrails

## Workspace basics

A pnpm workspace should have a root `pnpm-workspace.yaml`.

Example:

```yaml
packages:
  - apps/*
  - packages/*
```

Keep one shared lockfile unless there is a strong reason not to. pnpm's shared workspace lockfile behavior is usually the right default.

## Local dependency strategy

Use the `workspace:` protocol for internal packages when you want guaranteed local resolution.

Example:

```json
{
  "dependencies": {
    "@acme/ui": "workspace:*"
  }
}
```

This is safer than relying on compatible semver ranges to happen to resolve locally.

## Root vs package configs

Keep orchestration at the root, and package-specific behavior in each package.

Good root-level candidates:
- `packageManager`
- shared lockfile
- orchestration scripts
- shared CI
- shared base lint/test config when helpful

Good package-level candidates:
- app-specific build commands
- framework-specific config
- package-specific TS output and exports

Do not blindly centralize everything.

## Filtered commands

Use filtering when the user is working on one app or package.

Examples:

```bash
pnpm --filter web dev
pnpm --filter @acme/web build
pnpm --filter ./apps/web test --run
```

## Vitest and TS notes

- Use Vitest `projects`, not the deprecated workspace config.
- Prefer real workspace packages and package exports over giant TS alias maps between packages.
- For shared UI libraries, use library-appropriate TS configs and declaration output. Do not copy the app's `noEmit` config into a library package.

## Guardrails

- Do not assume one app owns the root scripts.
- Do not use alias tricks to bypass proper package boundaries.
- Do not flatten multiple framework apps into one root config just for aesthetics.
- Do not recommend multiple lockfiles inside one pnpm workspace unless there is a very specific reason.
