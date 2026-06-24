---
description: UI component governance — i18n strings, design tokens, a11y, Svelte 5 runes, SvelteKit routing
paths:
  - src/lib/**/*.svelte
  - src/routes/**/*.svelte
  - src/lib/**/*.svelte.ts
  - src/**/*.css
  - messages/*.json
---

# UI components

## User-facing strings — through Paraglide

Every visible string comes from `import * as m from '$lib/paraglide/messages'` and is read as `m.key()`. Add the key to BOTH locale files under `messages/` (e.g. `messages/en.json` and `messages/fr.json`) — a key present in one locale and absent in the other is a critical violation. Don't hard-code text literals in markup or use `locale === 'fr' ? … : …` ternaries. Exceptions: brand proper nouns and decorative glyphs.

## Colors — design tokens only

Brand tokens live in the tokens stylesheet (e.g. `src/lib/styles/tokens.css`) and the Tailwind `@theme` block. Reference them, never raw hex/rgba in components.

```svelte
<div class="bg-navy-700 text-paper">…</div>        <!-- correct -->
<div class="text-[color:var(--accent)]">…</div>    <!-- correct (token var) -->
<div style="background:#1e3a5f">…</div>            <!-- incorrect -->
```

A new color goes into the tokens stylesheet (+ `@theme`) first, then gets referenced.

## Glass & motion — restrained, tasteful

Glassmorphism uses the `.glass` primitive (or its tokens), applied sparingly (nav, feature cards over imagery) — not on everything. All non-essential motion honors `prefers-reduced-motion` (the `--dur-*` tokens already collapse to 0ms there). Easing via `--ease-out`. Keep 3D/parallax performant (GPU transforms, no layout thrash).

## State — Svelte 5 runes only

Use `$state` / `$derived` / `$effect` / `$props()`. Derive computed values with `$derived`, never an `$effect` that mirrors a prop into local state (stale duplicate source of truth). No Svelte 4 idioms (`export let`, `$:`), no React patterns (`useEffect`, `useState`).

## Routing — SvelteKit primitives

Internal navigation uses `<a href="/route">` (SvelteKit preloads via `data-sveltekit-preload-data`) or `goto()` from `$app/navigation` — never `window.location` for internal links. Locale-aware links go through `localizeHref()` from `$lib/paraglide/runtime`. In-page section jumps use hash anchors (`#services`); hash *routes* are not allowed.

## Accessibility — non-negotiable

- Every interactive element has an accessible name (visible text, or `aria-label` on icon-only controls).
- Every `<img>` has meaningful `alt` (`alt=""` only when decorative).
- Keep focus-visible styles; don't strip the ring without a replacement.
- Touch targets ≥ 44×44px (≥ 36px only for explicit dense variants).
- Hierarchical headings, exactly one `<h1>` per page.

A new visible component cross-references its catalog entry (`C-NN` in `{{CATALOG_DOC}}`). A visible component with no catalog entry is a delta concern — see `spec-protocol`.
