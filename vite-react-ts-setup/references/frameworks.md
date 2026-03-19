# Frameworks and advanced branches

## Table of contents

- React Router
- TanStack Router or TanStack Start
- Vike
- RedwoodSDK
- React Compiler
- React Server Components
- Guardrails

## React Router

React Router has three modes:
- **Declarative**: simplest `<BrowserRouter>` style client routing
- **Data**: `createBrowserRouter` and related data APIs
- **Framework**: Vite plugin plus route modules, type-safe route APIs, code splitting, and SPA/SSR/static rendering strategies

### Choose React Router framework mode when:

- the user explicitly asks for React Router framework mode
- the team wants route-module conventions
- SSR or static prerender is likely
- the repo is already a Remix v2 or React Router v7 style app
- the team wants more help than raw Vite but less platform lock-in than a bigger framework

### Choose Data or Declarative mode when:

- the repo is already structured that way
- the team wants to keep control over bundling and rendering architecture
- the app is a straightforward SPA and does not need framework mode conventions

### Guardrails for React Router

- For **new framework mode apps**, prefer `create-react-router` rather than raw Vite plus manual glue.
- If a repo already has `react-router.config.*`, route modules, server adapters, or generated framework files, do not flatten it into raw Vite.
- Do not replace its build scripts with `vite build` unless the user explicitly wants to abandon framework mode.
- Framework mode can run in SPA mode with `ssr: false`. Use that when the team wants React Router conventions without runtime SSR.

## TanStack Router or TanStack Start

Treat TanStack Router/Start as a framework-like branch with its own code generation and plugin expectations.

- Preserve generated route trees and starter structure.
- Keep the existing CLI-driven or starter-driven scripts.
- Do not rewrite it into a plain `react-router-dom` or raw Vite setup unless requested.

## Vike

Treat Vike as a framework-like branch.

- Preserve file conventions and server/client entry structure.
- Do not rewrite Vike apps into raw Vite during a tooling audit.
- Add lint/test/format/CI only in ways that do not fight the Vike structure.

## RedwoodSDK

Treat RedwoodSDK as a framework-like branch with its own runtime and project conventions.

- Preserve RedwoodSDK structure.
- Add missing quality tooling conservatively.
- Do not assume raw Vite build and deploy semantics apply.

## React Compiler

Use the compiler branch only when:
- the user explicitly wants it
- the repo is a new app and the team wants compiler-enabled templates
- the app has clear render hot paths and the team is ready to validate adoption

### Plain Vite integration

Use `@vitejs/plugin-react` and add the compiler Babel plugin there:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
})
```

### React Router integration

When the repo uses the React Router Vite plugin, add the compiler with `vite-plugin-babel` or an equivalent supported path. Do not assume the plain Vite config snippet above applies unchanged.

### Compiler adoption guardrails

- The compiler must run **first** in the Babel plugin pipeline.
- Do not mass-delete existing `useMemo`, `useCallback`, or `React.memo` from a legacy codebase. Keep them unless there is a measured cleanup plan.
- Use `eslint-plugin-react-hooks` to surface Rules of React and compiler diagnostics, but verify the package's current flat-config export shape before assuming a preset name.
- If the repo insists on the SWC plugin path, note that Babel-based compiler integration is no longer “drop-in”.

## React Server Components

Treat RSC as an advanced/high-risk branch.

Only use or recommend it when:
- the user explicitly asks for it
- the repo already uses it
- a framework/starter choice clearly depends on it

### Guardrails for RSC

- Verify patched React versions before proposing upgrades or saying a repo is safe.
- If the repo uses `@vitejs/plugin-rsc`, verify that it is on a patched line.
- If the user only wants SSR or a better SPA, do **not** suggest RSC by default.
- Keep server/client boundaries explicit and avoid ad hoc mixing.
- RSC guidance is security-sensitive and version-sensitive; always re-check current official advisories before giving exact upgrade guidance.

### React Router + RSC note

If the repo uses React Router's RSC path, remember that some framework config options are not supported there. Do not assume SPA mode is available in that branch.

## Guardrails

- Do not migrate between raw Vite and a framework branch unless the user explicitly wants that migration.
- Do not add Tailwind, Compiler, SSR, or RSC during a simple lint/test/config audit unless the repo already uses them or the user asked for them.
- When a framework starter has its own scripts, preserve them and add only missing `lint`, `typecheck`, `test`, `format`, or CI scripts around them.
