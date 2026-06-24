---
description: Hard cap of 300 lines per source file with extraction via dot-notation siblings; warn at 250
paths:
  - {{SOURCE_GLOB}}
---

# File size budget

Loaded when touching any source file. Generated outputs (`node_modules`, `dist`, build artifacts, codegen) are exempt.

## Hard cap — 300 lines

A file over 300 lines is rejected at review. Plan extraction the moment a file crosses 250 (warning zone). The cap is a forcing function for clear responsibilities — a 400-line component is almost always doing two things, and splitting reveals what they are.

## Extraction pattern — dot-notation siblings

Extract sub-components as flat sibling files prefixed with the parent's name:

```
{{COMPONENT_DIR}}/layout/
  Header.tsx              # orchestrator
  Header.LogoBrand.tsx
  Header.MobileMenu.tsx
```

Why dot-notation, not folders: file search shows the relationship at a glance, no `index.ts` re-export ceremony, imports stay flat (`import { Item } from './CartDrawer.Item'`).

## Justified extraction

Extract when responsibilities have clearly diverged (orchestrator + leaf views), when a sub-block repeats 3+ times, or when size has crossed the warning zone. A coherent 200-line page is fine; six 30-line files chained by props is harder to read.

## DRY threshold — three is the rule

Two near-identical blocks: leave them. Three: extract. Applies to JSX, class strings, animation prop sets, query patterns. Don't deduplicate by stuffing everything into a mega-component with twelve flags — extract a shared shell, keep distinct components.

## Naturally long files — exempt

Stylesheets, lockfiles, generated codegen output, fixture files. Type files split by domain (`types/cart.ts`) once they cross 200.

## Process when crossing 300

1. Stop adding to the file.
2. Identify a clear seam (sub-component, sub-section, sub-flow).
3. Extract via dot-notation.
4. Run `{{PACKAGE_MANAGER}} run typecheck` to catch import drift.
5. Commit the extraction separately (`refactor: extract Header.MobileMenu`) — apart from the feature work that triggered it.

The separate commit matters: a feature PR that also restructures three files is a review nightmare. Land the refactor first, the feature on top.
