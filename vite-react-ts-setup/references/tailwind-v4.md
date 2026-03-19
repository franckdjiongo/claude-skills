# Tailwind CSS 4 with Vite

## Table of contents

- When to use this branch
- Install
- Vite config
- CSS entry
- Guardrails

## When to use this branch

Only use Tailwind setup when:
- the user explicitly asks for Tailwind
- the repo already uses Tailwind and needs modernization
- the chosen starter/framework expects or includes Tailwind

Do not add Tailwind during an unrelated tooling audit.

## Install

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

## Vite config

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

## CSS entry

In your main CSS file:

```css
@import "tailwindcss";
```

Then import that CSS file from the app entrypoint as usual.

## Guardrails

- For framework starters, keep their expected CSS file locations instead of forcing a raw Vite file layout.
- Do not assume old PostCSS-era setup files are still needed for the basic Vite plugin path.
- If the repo already has Tailwind, upgrade conservatively rather than recreating everything from scratch.
