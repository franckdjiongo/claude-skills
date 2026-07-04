---
description: UI component governance — {{IF_STACK_HAS_I18N}}i18n strings, {{/IF}}design tokens, a11y, brand palette, in-app routing
paths:
  - {{COMPONENT_DIR}}/**/*.{ts,tsx,jsx}
  - pages/**/*.{ts,tsx,jsx}
  - '**/*.css'
---

# UI components

{{IF_STACK_HAS_I18N}}
## User-facing strings — through the content layer

Every visible string lives in a typed content store as `LocalizedString { en, fr, ... }` and is read through a hook (e.g. `useContent()`). Inline JSX literals and `language === 'en' ? ... : ...` ternaries bypass the store. Exceptions: brand proper nouns, decorative glyphs, and `aria-label` when no key exists yet. Mismatched language entries are a critical violation.
{{/IF}}

## Colors — design tokens only

Brand tokens live in the design-system config and CSS variables. Reference tokens, not raw hex/rgba.

```tsx
className="text-brand-primary dark:text-brand-primary-light"  // correct
<div className="bg-[#0066cc]" />                              // incorrect
```

New colors go into the token file first, then get referenced.

## Dark mode — `dark:` variants, never JS branching

Use the framework's variant system. Reading theme via JS to pick a color reintroduces the problem tokens were meant to solve.

## Accessibility — non-negotiable

- Every interactive element has an accessible name (`aria-label` on icon-only, visible text otherwise).
- Every `<img>` has meaningful `alt` (`alt=""` only when decorative).
- Focus-visible styles stay; no stripping the ring without a replacement.
- Touch targets ≥ 44×44px (≥ 36px for explicit dense variants).
- Honor `prefers-reduced-motion` for non-essential animation.
- Heading order is hierarchical (one `<h1>` per page).

## State — no `useEffect + setState` for prop sync

Derive with `useMemo` or lift state up. The prop-mirror anti-pattern duplicates the source of truth and goes stale.

## Routing — framework primitives

Use `<Link>` / `<NavLink>` for in-app routes — never `<a href="/route">` for internal navigation. Hash anchors for in-page sections are fine; hash routes are not.

A new visible component cross-references the catalog entry (e.g. `C-NN`). A visible component without a catalog entry is a delta concern — see `spec-protocol`.
