# Migrations

## Table of contents

- Create React App to Vite
- Older Vite to current Vite
- ESLint legacy config to flat config
- Vitest workspace to projects
- Package manager migration note

## Create React App to Vite

Use this migration when the repo still depends on `react-scripts` or CRA-era assumptions.

### High-signal steps

1. Remove `react-scripts` and CRA-only scripts.
2. Add root `index.html` for Vite.
3. Replace `REACT_APP_` env usage with `VITE_` env usage.
4. Replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*`.
5. Move or verify public assets and static paths.
6. Add `vite/client` types.
7. Replace Jest-specific setup with Vitest if the target stack uses Vitest.
8. Configure SPA rewrites on static hosting if needed.

### Common gotchas

- CRA hides `index.html`; Vite expects it at the project root.
- CRA env naming does not map directly to Vite.
- Jest globals and setup files often need small changes for Vitest.
- Old webpack alias or proxy config needs explicit translation.

## Older Vite to current Vite

When upgrading an older Vite repo:
- verify the current supported Vite line before pinning a target version
- verify the Node floor before touching CI or local runtime docs
- review plugin compatibility before removing or replacing plugins
- reevaluate whether `vite-tsconfig-paths` is still needed or whether built-in `resolve.tsconfigPaths` is the better fit
- keep an eye on framework starters that may have their own Vite constraints

Do not assume every plugin or starter is immediately ready for the newest major.

## ESLint legacy config to flat config

Typical migration:

1. Replace `.eslintrc*` with `eslint.config.js`.
2. Move from string-based plugin naming to imported plugin objects.
3. Bring over only the rules/configs that still matter.
4. Add `eslint-config-prettier` if formatting remains separate.
5. Add typed linting only if it is justified.

Use `references/eslint.md` for the target shape.

## Vitest workspace to projects

If the repo still uses `vitest.workspace.*` or older workspace terminology:
- move to `test.projects`
- keep package-local configs small
- let the root config orchestrate where possible

Do not preserve the deprecated workspace path for new work.

## Package manager migration note

For npm, Yarn, or Bun to pnpm migration strategy, use `references/runtime-and-package-managers.md`.
