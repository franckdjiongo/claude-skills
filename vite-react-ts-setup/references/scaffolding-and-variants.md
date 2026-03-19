# Scaffolding and variants

## Table of contents

- Raw Vite vs framework-first
- Raw Vite starters
- React plugin choice
- TypeScript paths and aliases
- Node and version-sensitive notes
- Low-level SSR caution

## Raw Vite vs framework-first

Use **raw Vite** when the request is clearly for a client-side SPA, internal tool, component playground, or a team that wants minimal conventions and owns its routing/data architecture.

Use a **framework or framework-like starter** when the request mentions or strongly implies:
- SSR
- static prerender
- route modules
- loaders/actions or server mutations
- server functions
- likely future server rendering
- file-based routing or framework conventions

If the request only says “set up React with Vite” and nothing suggests server features, default to raw Vite.

## Raw Vite starters

Prefer the official React + TypeScript Vite starter for a plain client app.

Typical pnpm command:

```bash
pnpm create vite my-app --template react-ts
```

If the user explicitly wants React Compiler from day one, use the compiler-enabled starter when available instead of bolting it on later:

```bash
pnpm create vite my-app --template react-compiler-ts
```

Current `create-vite` also exposes or links to React-oriented advanced branches such as React Router, TanStack Router, Vike, RedwoodSDK, and an RSC starter. Treat those as separate branches with their own conventions rather than as “raw Vite plus a few extra files”.

When exact interactive menu choices matter, re-check the current `create-vite` docs or source because the menu evolves.

## React plugin choice

### Prefer `@vitejs/plugin-react` when:

- using React Compiler
- using Babel plugins
- you want the safest official default for React + Vite
- compatibility matters more than squeezing out a bit more raw speed

### Prefer `@vitejs/plugin-react-swc` when:

- the repo does not need Babel-based transforms
- the user explicitly wants the SWC path
- compiler integration is not required

Do not switch a working repo from one plugin to the other unless there is a clear reason.

## Official starter assumptions to keep in mind

The official React + TypeScript starter is intentionally minimal. It is a good base, not a finished production standard. For production-ish apps, add or verify:
- explicit typecheck script
- stronger linting if justified
- tests
- CI
- formatting and hook strategy

The plain React + TypeScript starter does **not** enable React Compiler by default. If the user wants compiler adoption, treat it as an explicit branch.

## TypeScript paths and aliases

For single-package apps, the least surprising option is often an explicit alias in `vite.config.ts` and matching TS paths only if needed.

Example:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

Vite can also resolve `tsconfig.json` `paths` directly via `resolve.tsconfigPaths: true`. Use that only when the repo actually wants tsconfig-driven path resolution. It has a performance cost and can blur package boundaries in larger repos.

For monorepos, prefer real workspace packages and package exports over broad path-alias webs.

## Node and version-sensitive notes

Do not hardcode exact package versions unless the task requires it and you have verified them.

For current Vite guidance, always re-check:
- the current supported Vite line
- the current Node floor
- whether a starter or framework has its own stricter runtime requirement

When a repo uses ESLint 9 as well, choose a Node line that satisfies **both** Vite and ESLint instead of only Vite.

## Low-level SSR caution

Vite does support SSR primitives, but the SSR docs are low-level and are aimed more at framework authors and advanced teams. If the user wants app-level SSR, streaming, route modules, or server rendering with a normal product team workflow, prefer a framework/starter branch instead of hand-rolling SSR on raw Vite.
