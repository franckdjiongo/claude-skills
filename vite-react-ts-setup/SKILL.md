---
name: vite-react-ts-setup
description: Setup and audit tooling for Vite + React + TypeScript projects using pnpm. Use when (1) scaffolding a new Vite/React/TS project with proper tooling, (2) auditing an existing project for missing configurations, (3) migrating a project from npm to pnpm, (4) adding ESLint, Prettier, TypeScript strict mode, Husky, lint-staged, Vitest, or EditorConfig, (5) user asks about web app setup best practices, or (6) user mentions linting, type checking, pre-commit hooks, or code quality tooling for React/Vite projects.
---

# Vite + React + TypeScript Project Setup

Setup production-quality tooling for Vite + React + TypeScript projects using pnpm.

## Core Tooling Checklist

| Tool | Purpose | Config File |
|------|---------|-------------|
| pnpm | Package manager | `pnpm-lock.yaml`, `.npmrc` |
| TypeScript | Type safety | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` |
| ESLint 9 | Code quality | `eslint.config.ts` (flat config with defineConfig) |
| Prettier | Formatting | `.prettierrc` |
| Husky | Git hooks | `.husky/` |
| lint-staged | Pre-commit checks | `package.json` |
| EditorConfig | Editor consistency | `.editorconfig` |
| Vitest | Unit testing | `vitest.config.ts` |

## Workflow

### 1. Audit Existing Project

```bash
# Check package manager
ls -la pnpm-lock.yaml package-lock.json yarn.lock 2>/dev/null

# Check configs
ls -la tsconfig.json eslint.config.ts .prettierrc .editorconfig .husky 2>/dev/null

# Check dependencies
cat package.json | grep -E '"(husky|lint-staged|vitest|eslint|prettier)"'
```

### 2. Migrate npm to pnpm (if needed)

See `references/npm-to-pnpm-migration.md` for complete migration guide.

Quick steps:
```bash
# Remove npm artifacts
rm -rf node_modules package-lock.json

# Import existing lockfile (optional, for consistency)
pnpm import

# Install with pnpm
pnpm install

# Prevent accidental npm usage
# Add to package.json scripts: "preinstall": "npx only-allow pnpm"
```

### 3. Setup Commands

```bash
# Core dependencies
pnpm add -D typescript @types/react @types/react-dom

# ESLint 9 (flat config with defineConfig)
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals jiti

# Prettier
pnpm add -D prettier eslint-config-prettier

# Pre-commit hooks
pnpm add -D husky lint-staged
pnpm exec husky init

# Testing
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

### 4. Configuration Files

See `references/` for complete config templates:

- `references/tsconfig.md` - TypeScript configurations
- `references/eslint.md` - ESLint 9 flat config with defineConfig
- `references/prettier.md` - Prettier + EditorConfig
- `references/husky.md` - Husky + lint-staged setup (pnpm)
- `references/vitest.md` - Vitest configuration
- `references/package-scripts.md` - Required pnpm scripts
- `references/npm-to-pnpm-migration.md` - Migration guide

### 5. Package.json Scripts

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "prepare": "husky"
  }
}
```

### 6. Pre-commit Hook

Create `.husky/pre-commit`:
```bash
pnpm exec lint-staged
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

## Output

When setting up a project:
1. Check if npm artifacts exist → offer migration to pnpm
2. Create all missing configuration files
3. Install dependencies with pnpm

When auditing:
1. Report which configs are missing or outdated
2. Flag if project uses npm instead of pnpm
3. Suggest specific fixes
