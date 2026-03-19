# Runtime and package managers

## Table of contents

- Detection
- Default strategy
- Corepack and packageManager pinning
- Node line selection
- pnpm runtime pinning
- Migration to pnpm
- Escape hatches

## Detection

Use the repo state before proposing migration.

Common signals:
- `pnpm-lock.yaml` -> pnpm
- `package-lock.json` or `npm-shrinkwrap.json` -> npm
- `yarn.lock` -> Yarn
- `bun.lockb` or `bun.lock` -> Bun
- `packageManager` in `package.json` should be treated as a strong signal

If lockfiles and `packageManager` disagree, inspect CI, docs, and recent commits before choosing a side.

## Default strategy

- Prefer **pnpm** for new repos.
- Preserve the current package manager for existing repos unless the user explicitly wants migration or the repo is inconsistent.
- Prefer one pinned Node line for applications. Use a matrix only when the repo truly supports multiple runtime lines.

## Corepack and `packageManager` pinning

For new pnpm repos, prefer Corepack and a pinned `packageManager` field.

```bash
npm install --global corepack@latest
corepack enable pnpm
corepack use pnpm@latest-10
```

This writes a `packageManager` field into `package.json` and keeps contributors on the same pnpm line.

## Node line selection

Choose a Node line that satisfies the whole toolchain, not only Vite.

### Practical default for new repos

Use **Node 24** unless the team has a reason to stay on 22.

Why:
- it comfortably satisfies current Vite and ESLint floors
- it avoids the small but real `22.12` vs `22.13` mismatch between some tools
- it reduces ambiguity when CI, editors, and contributors differ

### If the team wants Node 22

Use **22.13+**, not only 22.12+, when ESLint 9 is part of the stack.

## pnpm runtime pinning

pnpm can pin runtime information in `package.json`.

Example:

```json
{
  "packageManager": "pnpm@10",
  "devEngines": {
    "runtime": {
      "name": "node",
      "version": "^24.0.0",
      "onFail": "download"
    }
  }
}
```

Use this only when the team wants pnpm to participate in runtime enforcement. Otherwise, `.nvmrc`, `.node-version`, Volta, or CI pinning may already be enough.

## Migration to pnpm

Use migration only when the user wants it or the repo needs standardization.

### Typical ordered migration

1. Pin pnpm with Corepack.
2. Remove `node_modules`.
3. Import the old lockfile if helpful.
4. Install with pnpm.
5. Update CI, docs, and local scripts.
6. Add explicit missing dependencies exposed by pnpm's stricter resolution.

Example flow:

```bash
rm -rf node_modules
pnpm import
pnpm install
```

If the old lockfile should not be preserved, skip `pnpm import` and do a fresh install.

### Optional enforcement

Only add a `preinstall` manager guard if the team explicitly wants strict enforcement.

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

Do not add this by default in repos where CI, containers, or external contributors may still rely on another package manager.

## Escape hatches

Use these only when you have a concrete compatibility problem.

### Missing dependencies after migration

pnpm often exposes phantom dependency bugs. Fix them by declaring the missing dependency explicitly instead of weakening the resolver.

### Hoisting options

Treat `.npmrc` hoisting options as last-resort compatibility tools, not defaults.

Examples of last-resort settings:

```ini
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

Avoid broad `shamefully-hoist=true` unless the repo truly cannot work without it.

## Workspace note

If the repo is a pnpm workspace, also consult `references/monorepo.md` before proposing root scripts or dependency moves.
