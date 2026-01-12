# Package.json Scripts

## Complete Scripts Section

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky",
    "validate": "pnpm run typecheck && pnpm run lint && pnpm run test:run"
  }
}
```

## Script Explanations

| Script | When to Use |
|--------|-------------|
| `preinstall` | Prevents accidental npm/yarn usage |
| `dev` | Local development server |
| `build` | Production build (type checks first) |
| `preview` | Preview production build locally |
| `lint` | Check for linting errors |
| `lint:fix` | Auto-fix linting errors |
| `format` | Format all files with Prettier |
| `format:check` | Check formatting without modifying |
| `typecheck` | Run TypeScript type checking only |
| `test` | Run tests in watch mode |
| `test:run` | Run tests once (CI) |
| `test:coverage` | Run tests with coverage report |
| `prepare` | Auto-setup Husky on pnpm install |
| `validate` | Full validation (CI pipeline) |

## CI Pipeline (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm run validate
      - run: pnpm run build
```

## All DevDependencies

Complete list for copy-paste:

```bash
pnpm add -D \
  typescript \
  @types/react \
  @types/react-dom \
  eslint \
  @eslint/js \
  typescript-eslint \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh \
  eslint-config-prettier \
  globals \
  jiti \
  prettier \
  husky \
  lint-staged \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @vitest/coverage-v8
```

## .npmrc Configuration

Create `.npmrc` for pnpm settings:

```ini
# Use pnpm's strict mode (recommended)
strict-peer-dependencies=false
auto-install-peers=true

# Optional: if you have compatibility issues
# shamefully-hoist=true
```
