# TypeScript configuration

## Table of contents

- Default shape for raw Vite apps
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- Optional stricter flags
- Aliases and paths
- Guardrails

## Default shape for raw Vite apps

For a single-package Vite React app, prefer the modern split config shape:
- root `tsconfig.json` with project references
- `tsconfig.app.json` for browser code
- `tsconfig.node.json` for Vite/Vitest/config-side code

Do not force this exact shape onto framework starters that already have a working TS layout.

## `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

## `tsconfig.app.json`

Use a modern Vite-style baseline and extend only where the repo needs it.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

## `tsconfig.node.json`

Keep Vite/Vitest/config-side code in a separate TS config.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

If the repo uses `eslint.config.ts` or other TS-based config files intentionally, add them to the include list.

## Optional stricter flags

Add these only when the team wants stricter domain modeling and is ready for the noise:

```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

These are useful, but they are not the default Vite starter baseline.

## Aliases and paths

### Safe default

Keep alias setup explicit in Vite config and mirror it in TS only if needed.

### Vite-managed path resolution

Vite can resolve TS `paths` directly. Use that only when the repo truly wants tsconfig-driven resolution and you understand the performance tradeoff.

### Monorepo note

Prefer actual workspace packages and package exports over broad alias maps across package boundaries.

## Guardrails

- Do not use app-centric `noEmit` TS configs for shared UI libraries that must emit declarations.
- Do not assume `tsc --noEmit` is the best typecheck command when the root config uses project references. `tsc -b` is often the better match.
- Do not move framework-managed TS settings into a raw Vite structure unless the user explicitly wants that migration.
