# CSS Side-Effects Playbook

When you change a structural CSS property, **assume something else broke** and verify it. This file lists the dangerous patterns and the regressions they typically cause, with the right alternative for each. Every entry comes from a real bug that took a back-and-forth to catch.

## How to use this file

After a CSS change, find the row that matches the property you touched. Read the "Common regression" column. Open the running app and verify the listed scenarios. If any apply, use the "Right alternative" column instead.

---

## Top layer — the modern fix for "dropdown behind the cards"

For **any** dropdown, tooltip, menu, combobox, or modal, the durable fix is to render it in the browser **top layer** instead of fighting `z-index` and `overflow`. The top layer sits above the entire page by construction — it is **immune to both overflow clipping and ancestor stacking contexts**, so the whole class of "popup clipped by an `overflow: hidden` parent" and "popup trapped behind a sibling because an ancestor is `isolate`/`transform`" bugs simply cannot occur. Reach for this **first**; keep manual z-index surgery only as a legacy fallback.

Two native mechanisms promote to the top layer:

- **`popover` + CSS anchor positioning** — for menus, tooltips, dropdowns.
- **`<dialog>` opened with `.showModal()`** — for modals.

```html
<!-- Anchor + popover: the menu is tethered to the button but lives in the top layer -->
<button popovertarget="menu" style="anchor-name: --menu-btn">Options</button>

<div id="menu" popover="auto" style="
  position: absolute;
  position-anchor: --menu-btn;
  /* pin the popover's top-left just under the button's bottom-left */
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 6px;
">
  <a href="#">Rename</a>
  <a href="#">Duplicate</a>
  <a href="#">Delete</a>
</div>
```

```css
/* Style the top-layer element and its backdrop */
[popover] { border: 1px solid var(--line); border-radius: var(--radius); padding: 6px; }
[popover]::backdrop { background: transparent; }

/* Progressive enhancement: only rely on anchor positioning where supported.
   Elsewhere, fall back to normal absolute positioning inside the trigger's
   nearest positioned ancestor. */
@supports not (anchor-name: --x) {
  #menu { position: absolute; top: 100%; left: 0; }  /* legacy fallback */
}
```

Because the popover is in the top layer, **you do not need** `z-index: 9999`, you do **not** need to portal it out of a clipped container, and no ancestor's `isolation`/`transform`/`overflow: hidden` can hide or clip it.

**Related — `overflow: clip` as a modern alternative to `hidden`:** when you only want to clip painting (e.g. to keep a decoration inside rounded corners) and you do **not** want to create a scroll container or a new formatting context, prefer `overflow: clip` (optionally with `overflow-clip-margin`) over `overflow: hidden`. `clip` doesn't make the element scrollable and doesn't establish a BFC the way `hidden` can — fewer surprising layout side-effects. (It still clips descendant paint, so a popup inside a `clip` box is still clipped — which is exactly why popups belong in the top layer, above.)

---

## Property-by-property side-effect matrix

### `overflow: hidden` (added or removed)

| Aspect | Detail |
|---|---|
| **Why people add it** | To clip descendants to the parent's rounded corners; to create a BFC; to hide a scrollbar |
| **What it actually clips** | Everything: pseudo-elements at the edge, dropdown popups, focus rings, tooltips, animations that extend beyond the box |
| **Common regression when adding** | Dropdown / tooltip / popup gets clipped at the bottom of a container; focus rings get cut; menu portals don't render |
| **Common regression when removing** | A pseudo-element decoration (e.g., a top brand rail, a decorative ribbon) now extends past the rounded corner of the parent; descendant absolute positioning that depended on the BFC behaves differently |
| **Right alternative — for clipping pseudo-elements to rounded corners only** | Use `clip-path: inset(0 round var(--radius))` (clips paint without affecting layout/overflow) OR move the decoration into `background-image` of the parent (backgrounds are naturally clipped to `border-radius`) |
| **Right alternative — for popup containers** | Don't use `overflow: hidden` on the parent. If you need rounded clipping, use `border-radius` + the `clip-path` trick, OR portal the popup outside the clipped container |

### `position: relative / absolute / fixed`

| Aspect | Detail |
|---|---|
| **Why people add it** | To position a pseudo-element / child absolutely; to create a containing block for descendants |
| **Common regression** | Absolutely positioned descendants now reference this parent instead of an ancestor — they may move; child `z-index` becomes scoped to a stacking context that didn't exist before |
| **Verify** | Walk through every `position: absolute` descendant. Does its anchor still make sense? Does its z-index still work relative to siblings? |

### `z-index` (any value, including negative)

| Aspect | Detail |
|---|---|
| **Why people add it** | To put one element above/below another |
| **What's actually happening** | `z-index` only takes effect on positioned elements (or flex/grid items). Within a stacking context, only siblings compete; across stacking contexts, the parent's z-index is what matters. |
| **Common regression** | A descendant's `z-index: 100` no longer beats a sibling's `z-index: 50` because one of them is inside an isolated stacking context (see `isolation: isolate`, `transform`, `filter`, `will-change`, `position: fixed`) |
| **Verify** | If a popup/dropdown is supposed to be on top and isn't, check whether the popup's parent has any stacking-context-creating property. Either remove the parent's stacking context, or give the parent a higher z-index than its competing sibling. |
| **Avoid** | Hard-coded numeric z-index. Use design tokens (`--z-base`, `--z-raised`, `--z-card-overlay`, `--z-dropdown`, `--z-modal`, `--z-tooltip`) — most projects have a token stack |

### `isolation: isolate`

| Aspect | Detail |
|---|---|
| **Why people add it** | To create a stacking context without touching `z-index` or `position` |
| **What it actually does** | Creates a new stacking context. Descendants' `z-index` is now scoped to this parent. The parent itself competes with siblings using its own `z-index` (default `auto`, i.e., it stacks in DOM order with non-positioned siblings). |
| **Common regression** | A dropdown / popup inside the isolated parent renders behind a sibling of the parent. The popup's `z-index: var(--z-dropdown)` (e.g., 100) is scoped to the parent, but the parent stacks below a later DOM sibling. |
| **Right alternative** | Either (a) remove `isolation: isolate` from the parent, or (b) give the parent an explicit `z-index` higher than the competing sibling (e.g., `var(--z-sticky)` for a top-of-page bar that contains popups) |
| **Verify** | Click every popup, dropdown, menu, tooltip inside the isolated parent. Does it render in front of all relevant siblings? |

### `transform`, `filter`, `backdrop-filter`, `will-change`

| Aspect | Detail |
|---|---|
| **What they do** | Each creates a new stacking context (same risk profile as `isolation: isolate`) |
| **Bonus regression** | They also create a containing block for `position: fixed` descendants — meaning a child with `position: fixed` will be relative to this element, not the viewport. Surprising. |
| **Verify** | Same as `isolation: isolate` — exercise popups; also check any `position: fixed` descendant if you added these properties to an ancestor |

### `clip-path`

| Aspect | Detail |
|---|---|
| **What it does** | Clips the element's painted area to the specified shape. **Includes descendants.** Acts like `overflow: hidden` for paint purposes. |
| **Common regression** | Same as `overflow: hidden` — popups/tooltips/focus rings get clipped |
| **When to use it anyway** | When you need rounded-corner clipping for decoration WITHOUT affecting layout/overflow flow. But know that it still clips paint of descendants — so don't apply to a container that has popups inside. |
| **Right alternative for popup-containing parents** | Move the decoration into `background-image` instead of using `clip-path` on the parent |

### `background-attachment: fixed`

| Aspect | Detail |
|---|---|
| **What it does** | Anchors the background to the viewport, not the element. Background stays still while content scrolls. |
| **Common regression in iframes / scroll containers** | Doesn't work as expected. In an iframe (Power Apps, Salesforce embed, sandboxed preview), `fixed` may anchor to the iframe's viewport in ways that don't match the host page's scroll. In a custom scroll container (`overflow-y: auto` on a non-root element), `fixed` is anchored to the document viewport, NOT the scroll container — which is usually wrong. |
| **Right alternative for "background should always cover the visible area of a scrollable region"** | Put the background on the SCROLL PARENT (the element with `overflow: auto`), not the content child. The scroll parent's box equals the visible viewport at any scroll position; default `background-attachment: scroll` paints it on the visible area. |

### Background covering full scrolled height

| Aspect | Detail |
|---|---|
| **Common bug** | A page with many cards has a beautiful gradient at the top, then drops off to flat color at the bottom. |
| **Root cause** | The background is on a content element (e.g., `.container` inside a scroll parent). Radial gradients with `background-size: auto` are sized to the element box — fine for first viewport, but their gradient stops fade to transparent before reaching the bottom of a tall element. |
| **Wrong fix** | Tile gradients vertically with `background-size: 100% Npx` and `background-repeat: repeat-y`. Works in theory; in iframes / scroll containers it's flaky. |
| **Right fix** | Move the background to the scroll parent (the element with `overflow: auto; height: 100%`). The scroll parent's box IS the visible viewport — `background-size: 100% 100%` always covers exactly the visible area, and as the user scrolls, the background stays put visually. The content child (e.g., `SiteSelector.container`) gets `background: transparent`. |

### `display` change (block ↔ flex ↔ grid)

| Aspect | Detail |
|---|---|
| **Common regression** | Child sizing changes: flex children with `min-width: 0` may now shrink below content; grid children may overflow their column; previously-block children may lose `vertical-align`; collapsing margins disappear |
| **Verify** | Long content overflow (text wraps where you don't want, ellipsizes where you don't want); narrow viewport layout (does the new display mode wrap responsibly?) |

### `gap` / `padding` / `margin` on flex/grid containers

| Aspect | Detail |
|---|---|
| **Subtle regression** | Changing `padding` on an `overflow: hidden` element can cause its content to clip differently. Changing `gap` between sticky elements can change scroll-anchored positions. |
| **Verify** | Total height of the element after the change. Does it now exceed the parent's viewport and trigger a scroll that wasn't there? Does it now fall under a `@media (max-width:)` breakpoint because the inner content fits differently? |

### `width` / `max-width` / `min-width`

| Aspect | Detail |
|---|---|
| **Common regression** | Content overflow (text doesn't fit, ellipsizes wrong); ancestor `@media` query newly fires because the layout's natural width crossed a breakpoint; sibling elements reflow |
| **Verify** | Resize the browser to ~720px and ~1080px. Does the layout cope? |

### `@media` queries — the silent regression

| Aspect | Detail |
|---|---|
| **What goes wrong** | You don't change a `@media` query, but your change to `padding` / `width` / `font-size` causes an ancestor to cross a breakpoint at the iframe's viewport width. Suddenly a responsive `@media (max-width: 1080px)` fires that you forgot about, and the layout looks broken at the user's iframe size but fine at desktop. |
| **Verify** | After any layout change, check the actual iframe / app viewport width with the browser MCP. If it's near a breakpoint defined in your CSS, test on both sides of the breakpoint. |

---

## The "what stacking context contains me" check

When a popup/dropdown isn't rendering above the right thing, run this:

1. **Find the popup element in DevTools (or read the served CSS).**
2. **Walk up the DOM from the popup.**
3. **At each ancestor, check if it creates a stacking context.** It does if it has any of:
   - `position` not `static` AND a numeric `z-index`
   - `opacity` < 1
   - `transform` not `none`
   - `filter` not `none`
   - `backdrop-filter` not `none`
   - `isolation: isolate`
   - `will-change: transform, opacity, filter`
   - `mix-blend-mode` not `normal`
   - `position: fixed` or `position: sticky`
   - It's a flex/grid item with `z-index` not `auto`
4. **The first such ancestor is the popup's stacking context.** The popup's `z-index` competes only inside that context. Outside it, the **stacking context's parent** is what stacks against external elements.
5. **To put the popup on top of an external element**, give the stacking context (the ancestor, not the popup) a high enough `z-index`.

This is exactly the diagnostic that should have been run when the dropdown rendered behind the cards in the session that motivated this skill.

---

## Project rules to respect

Before touching CSS, scan the project for:

- **Token files** — `tokens.css`, `_design-tokens.css`, `theme.ts`, etc. New colors / shadows / z-index values **must** be added there first, then referenced. Hardcoded `#hex`, `rgba()`, or numeric `z-index` values typically trip pre-commit hooks.
- **File-size budgets** — Some projects cap source files at ~300 lines. Big CSS rewrites can blow this budget. If the file is approaching the limit, split using the project's documented extraction pattern (often `Component.subname.module.css`).
- **CSS Modules cross-file cascade rules** — In CSS Modules, descendant selectors (`.a .b`) only work if both classes live in the same file. If you're moving a class across files, check whether any descendant selector is broken.
- **AppButton (or equivalent)-style override rules** — Some projects use a doubled selector trick (`.foo.foo`) to win specificity over component-internal styles. If your edit breaks this, hover/focus states for buttons may regress.

If the project has a `quality-gate` script, run it before declaring done. Failing CRITICAL or HIGH checks block the commit anyway.
