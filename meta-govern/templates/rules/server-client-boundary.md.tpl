---
description: Server-default with thin route boundaries; 'use client' at the smallest leaf.
paths:
  - src/app/**/*.tsx
  - src/app/**/route.ts
  - src/server/**/*.ts
---

# Server / client boundary

The server runs first. The client runs only what it must.

## `route.ts` discipline (Next.js)
A route handler does four things, in order:
1. Parse and validate input (Zod against the route's schema).
2. Authorize (call auth helper; reject early).
3. Call a feature service in `src/features/<feature>/services/` or `src/server/<area>/`.
4. Respond.

A `route.ts` file does **not**:
- Read or write the database directly
- Compose business rules
- Format output beyond the response wrapper
- Exceed ~80 lines

If it grows, extract to `src/server/<area>/<name>.ts` or the feature's service folder.

## `'use client'` discipline
- Default to Server Components.
- Mark a leaf component `'use client'` only when it needs interactivity (event handlers, browser APIs, state).
- Do not put `'use client'` at the top of a page or layout — the entire subtree becomes client and ships to the browser.
- A pattern: server-render the page, render a small client island for the interactive bit, pass server data as props.

## Server-only modules
Logic in `src/server/**` runs on the server only. Importing it from a client component fails at build time. Use this to:
- Hold database access
- Hold secret-using code
- Hold business logic that should never reach the browser bundle

## Common mistakes
- Reading `localStorage` or `window` in a Server Component → undefined → runtime crash. Move to client component.
- Calling a database client from a Server Component without an auth check → security bug. Always authorize first.
- Marking a layout `'use client'` to "fix" one button → the whole tree becomes client. Extract the button.
- Using `unstable_noStore()` / `cache: 'no-store'` everywhere → no caching at all. Use only for genuinely dynamic data.

## SvelteKit equivalent
Apply the same discipline:
- `+server.ts` route handlers stay thin.
- `$lib/server/` for server-only code; SvelteKit's framework prevents leaks at build time.
- `+page.svelte` server-side `load` is preferred over client-side fetching when data isn't user-interactive.
