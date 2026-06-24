# Session Lessons — 2026-05-04 Premium Home-Screen Polish

This file captures the concrete bugs that surfaced during the multi-iteration session that birthed this skill. Each entry has the **symptom**, the **root cause**, the **diagnostic that should have been run earlier**, and the **fix that worked**. Read this to ground the abstract checklist in real examples.

---

## Bug 1 — `Période configurée` value silently disappeared

### Symptom
The period bar showed the eyebrow label `PÉRIODE CONFIGURÉE` but the value below it (e.g., `19 avril — 26 avril — P17`) was missing. The user noticed before Claude did.

### Root cause
`overflow: hidden` was set on the bar surface to clip the brand accent rail to the rounded corners. Combined with insufficient internal padding, the surface's flex column was shorter than the controls row's natural height, and the value text — which lived in a column-flex sub-container vertically centered within the row — got clipped at the bottom of the visible bar.

### Diagnostic that should have been run earlier
**Section 7 of the visual QA checklist** (read every label/value pair). After any change that affects bar height, padding, or `overflow`, the read-through was: "Period bar contains tabs / dropdown / **PÉRIODE CONFIGURÉE label / value** / refresh / timestamp". Walking through it visually would have caught the value's absence immediately.

Also: a high-zoom screenshot of the column where the value should render would have revealed empty space below the label.

### Fix that worked
Removed `overflow: hidden` from the surface. Replaced the `::before` brand rail with a `background-image` linear-gradient on the surface itself — backgrounds are naturally clipped to `border-radius` without needing overflow.

### Generalized takeaway
**Removing `overflow: hidden` is often the fix, not adding it.** When you find yourself adding `overflow: hidden` to clip a decoration to rounded corners, ask first: "Can I move this decoration into a `background-image`, where it'll be clipped by `border-radius` without affecting layout/overflow flow?"

---

## Bug 2 — Brand rail overflowed past rounded corners

### Symptom
After fixing Bug 1 (removing `overflow: hidden`), the red+navy brand accent rail at the top of the bar extended past the bar's rounded corners. The corners showed a visual seam where the rail's straight edge clipped into the curve.

### Root cause
The rail was a `::before` pseudo-element with `position: absolute; top: 0; left: 0; right: 0; height: 2px;`. Without `overflow: hidden` or `clip-path` on the parent, absolutely-positioned children (including pseudos) are not clipped to the parent's `border-radius`.

### Diagnostic that should have been run earlier
**Section 4 of the visual QA checklist** (zoom on every touched element). After removing `overflow: hidden`, the corners of the bar were directly affected. A zoom on the top-left or top-right corner would have shown the bug instantly. The user had to explicitly say "regarde les coins du bar" before Claude zoomed in.

### Fix that worked
Replaced the `::before` pseudo with a layered `background-image` on the surface:

```css
background:
  linear-gradient(90deg, accent 0%, accent 12%, primary 12%, primary 22%, transparent 22%)
    top left / 100% 2px no-repeat,
  linear-gradient(180deg, white 0%, blue-tint 100%);
```

The brand rail is now a 2px-tall background layer at the top of the surface. Backgrounds are naturally clipped to `border-radius`, so the rail terminates exactly at the rounded edge.

### Generalized takeaway
**For decorative elements at the edge of a rounded container, prefer `background-image` over absolutely-positioned pseudo-elements.** The CSS background painting respects `border-radius`. Pseudo-elements positioned absolutely do not, unless the parent uses `overflow: hidden` or `clip-path` (which then break popup overflow).

---

## Bug 3 — Searchable dropdown rendered behind the card grid

### Symptom
Clicking the period dropdown opened the popup, but the popup rendered BEHIND the cards below the bar instead of in front of them. The user clicked it and noticed; Claude had not exercised the click state.

### Root cause
The bar surface had `isolation: isolate` (added during a previous iteration to layer the brand rail correctly with surface content). `isolation: isolate` creates a new stacking context. The dropdown popup inside the bar had `z-index: var(--z-dropdown)` (= 100), but that was scoped to the bar's stacking context. The bar itself competed with sibling cards in the page's stacking context — and since cards came later in the DOM, they rendered on top.

### Diagnostic that should have been run earlier
**Section 5 of the visual QA checklist** (exercise interactive states). Clicking the dropdown is the very first action a real user takes — and would have surfaced the bug before the user did.

Once clicked, the right next step is the **stacking-context walk-up** in `references/css-side-effects.md`: from the popup, walk up the DOM, find the first ancestor that creates a stacking context (here: the bar with `isolation: isolate`), and recognize that the popup's `z-index` is scoped there. The bar itself needs a higher `z-index` to win against sibling cards.

### Fix that worked
Removed `isolation: isolate` from the surface (the brand rail is now a `background-image`, so isolation is no longer needed for layering). Added `z-index: var(--z-sticky)` (= 200) to the surface so the bar lifts above the card grid. The popup inside the bar now renders in the bar's stacking context, which is above the cards.

### Generalized takeaway
**When you add a stacking-context-creating property (`isolation`, `transform`, `filter`, `backdrop-filter`, `position` + `z-index`), exercise every popup, dropdown, tooltip, and menu inside that element.** They may now render behind external siblings.

Also: **always click before declaring done.** Static screenshots cannot show you that the popup is behind the cards because it's hidden until you click.

---

## Bug 4 — Background canvas dropped off at the bottom of long pages

### Symptom
Top of page: rich atmospheric mesh (radial gradients + hairline grid). Bottom of page (after scrolling past several rows of cards): flat near-white. The pattern visibly stopped partway down the page.

### Root cause
The background was on `SiteSelector.container` — a content element whose height grows with the cards inside. The radial gradients (with `background-size: auto`) were sized to the element's full height. Their gradient stops faded to transparent before reaching the bottom of a tall element, so anywhere below ~1100 px of content, the user only saw the surface-alt fallback color.

### Diagnostic that should have been run earlier
**Section 3 of the visual QA checklist** (multi-position screenshots). A screenshot at the bottom of the page would have shown the falloff immediately. Claude's first three attempts at "fixing" this took screenshots only at default scroll position and declared done — the user had to scroll down each time and complain.

### Failed attempts
1. **Tile gradients vertically** with `background-size: 100% 720px; background-repeat: repeat-y`. Worked partially, but in iframes the tiling was uneven and there were still visible falloffs.
2. **`background-attachment: fixed`** on the radial gradients. In an iframe context, `fixed` doesn't behave reliably — the user still saw white at the bottom.

### Fix that worked
**Move the background to the scroll parent**, not the content. `HomeScreen.container` has `overflow-y: auto; height: 100%` — its box equals the visible viewport at any scroll position. With `background-size: 100% 100%; no-repeat` and default `background-attachment: scroll`, the background paints exactly the visible viewport, and as the user scrolls inside, the background stays put visually.

The content child (`SiteSelector.container`) gets `background: transparent` so the parent's canvas shows through.

### Generalized takeaway
**For "background should always cover the visible area of a scrollable region", put the background on the SCROLL PARENT, not on the content.** This is more reliable than `background-attachment: fixed` (which is quirky in iframes) and more correct than tiled gradients (which look uneven and have visible seams).

This is one of those cases where the right answer requires understanding the rendering pipeline — `overflow: auto` containers paint their background on their box (not on their content), and their box is the visible viewport. So put the canvas there.

---

## Meta-lesson — why these bugs all needed the user's prompting

In every case above, Claude had:
- The browser MCP and screenshot capability
- The technical knowledge to diagnose the bug
- The CSS reference manual access (or knew enough)

What was missing was the **discipline to actually look** before declaring done. Specifically:

1. **Single default screenshot** is not enough. Scroll up AND down, every time.
2. **No interactive states tested** is not enough. Click everything, hover everything.
3. **No element zoom** is not enough. Zoom on every edge of every touched element.
4. **No label/value walk-through** is not enough. Read every pair before saying "looks good."
5. **Trusting that the obvious side-effect didn't happen** is not enough. Every CSS structural property has a side-effect matrix; check it.

This skill exists to make the discipline non-negotiable. The visual-qa-inspector sub-agent exists for the cases where context fatigue makes the discipline hard for the parent agent to maintain.

---

## Pattern recognition — apply these to future sessions

When you see any of the below symptoms in a future session, jump directly to the linked diagnostic instead of guessing.

| Symptom | Diagnostic |
|---|---|
| "It works in dev but the dropdown is hidden" | Stacking context walk-up; check `isolation: isolate` and other context-creating properties on ancestors |
| "Background covers the top but not the bottom" | Move background to scroll parent; check `overflow: auto` ancestors |
| "Decoration at the edge gets cut off after rounded corners" | Replace pseudo-element with `background-image`; backgrounds respect `border-radius` |
| "The label is there but the value isn't" | Container is too short; usually `overflow: hidden` is clipping; remove it or grow the container |
| "Looks fine in my screenshot but the user says it's broken" | You took ONE screenshot at default scroll; take three (top/mid/bottom) and zoom edges |
| "The user clicked something and it broke" | You didn't exercise interactive states; click every popup, hover every card |
