# Workflow: UI polish — make it feel like it belongs on a Mac

## Purpose
Turn a functional but unrefined interface into one that reads as native, contemporary, and considered, without covering it in glass. The order is the method: structure and hierarchy first, typography and behavior next, materials and motion after that, then keyboard, accessibility, resizing, appearance, and finally verification in the running app. Skipping ahead to Liquid Glass produces the generic "stacked translucent cards" look this workflow exists to prevent. Read `references/macos-ux.md` and `references/liquid-glass.md` fully before stage 1; open `references/accessibility-localization.md` at stage 9.

## Inputs to establish first
- Environment: `bash scripts/doctor.sh`. If Apple agent skills are exportable, run `bash scripts/export-apple-skills.sh` and read the SwiftUI specialist skill; Apple's current guidance on glass and toolbar APIs outranks this file, and API signatures must be confirmed there or in current docs before use.
- Project facts: `bash scripts/project-info.sh` — deployment target (decides which material/glass APIs are available without `#available`), targets, test targets.
- Scope: which windows/screens are in scope, and what the user means by "better" (native, premium, calmer, denser). Ask for a screenshot or a description of what bothers them if unstated.
- The user's task hierarchy: from `docs/PRODUCT_BRIEF.md` if it exists, otherwise from the user in one sentence per job. Polish serves jobs, not aesthetics.
- Design tokens: `docs/DESIGN_SYSTEM.md` and `DesignSystem/` if present; otherwise seed them from `templates/DESIGN_SYSTEM.md` in stage 5.
- Baseline: build and launch the current app (`scripts/build.sh`, then `/run` where available). Capture before-observations for the polish report at the sizes in the resizing matrix.

## Pipeline

Work the stages in order. For each: look for the listed problems, change only what the stage covers, verify before moving on. Later stages assume earlier ones are done.

### 1. Inspect the current UI
Look for: window purpose, layout containers in use (split view, list, table, forms, custom stacks), hard-coded frames, custom colors/fonts, where AppKit is wrapped, how state flows into views. Read the view code, not just the screen.
Change: nothing yet. Write a one-page inventory: windows, top-level regions, controls per region, anything hard-coded, anything custom that duplicates a system control.
Verify: the inventory matches the running app at a normal laptop size.

### 2. Understand the user task hierarchy
Look for: the primary job per window, the secondary actions, what is read constantly vs occasionally, what is edited vs viewed. Compare with the brief.
Change: write the hierarchy as a ranked list per window. Anything the UI gives prominence to that ranks low is a hierarchy bug for stage 4.
Verify: user confirms the ranking when it was inferred.

### 3. Identify the native macOS structure
Look for: which system archetype the window is (sidebar + content + detail; single content + inspector; document window; menu-bar popover; settings window with tabs; utility panel) and where the current layout fights it (custom tab strips, nav bars imitating iOS, buttons where a toolbar belongs, modal sheets for non-modal work).
Change: pick the archetype and the container that implements it; move actions to menu bar, toolbar, context menu, or inspector per `references/macos-ux.md`. Settings go where Mac users expect. Replace custom reimplementations with system controls (or an AppKit wrap if SwiftUI lacks it).
Verify: window structure reads correctly with all styling stripped mentally: a sidebar is a sidebar, a table is a table.

### 4. Fix layout and information hierarchy
Look for: primary content competing with chrome; equal visual weight everywhere; content insets inconsistent between regions; cards used as decoration; hard-coded widths/heights; text that truncates at normal sizes; alignment drift between rows.
Change: one focal region per window; group with spacing and section headers before boxes; remove decorative containers; replace fixed frames with min/ideal/max and flexible layout; align on a consistent grid using spacing tokens.
Verify: squint test — the most important region is the most visually dominant; nothing important is truncated at laptop size.

### 5. Fix typography and spacing
Look for: point-size fonts, more than three text styles on a screen, secondary text as bright as primary, inconsistent gaps, custom line heights.
Change: map every text to a role in `DESIGN_SYSTEM.md` on system text styles; secondary/tertiary via semantic label colors; spacing only via tokens (`Spacing.compact/standard/section/page`); monospaced for paths, IDs, code. Seed the tokens file now if missing.
Verify: no numeric font sizes remain in views; increasing system text size reflows without truncation of primary content.

### 6. Fix toolbar, sidebar, table, and list behavior
Look for: toolbars with too many equal items; missing sidebar collapse; lists without selection or keyboard navigation; tables without sortable columns or with fixed columns that cannot resize; missing context menus; icon-only items without labels; no Search where lists exceed a screen; missing empty/loading/error states.
Change: primary window action in the toolbar, rest in overflow or menus; sidebar collapsible with state persisted; `List`/`Table` with selection, sort descriptors, column resizing, context menus for item actions; drag-and-drop where it materially speeds a workflow; empty state that teaches the next action; loading that keeps the window responsive; errors with a recovery action. Menu bar exposes every toolbar action with a shortcut.
Verify: sort a column, multi-select with Shift/Cmd, right-click an item, collapse the sidebar, open the empty state, trigger one error. All by keyboard where applicable.

### 7. Add purposeful material and Liquid Glass
Rule: glass happens here, after hierarchy, and only where controls float over meaningful content. System toolbars and sidebars already receive the right treatment; do not restyle them. Use glass-specific button styles for floating controls rather than applying a raw glass effect to an ordinary button. Materials behind overlays (floating panels, HUDs, popovers) are appropriate; glass on static text panels is not. Confirm the exact modifiers and styles against the exported Apple skill or current docs, and guard with `#available` if the deployment target predates them.
Look for: any translucent container inside the content area; nested glass; glass on backgrounds with nothing to refract; custom blur that ignores Reduce Transparency.
Change: remove content-area glass and nested glass; keep or add glass only for floating controls over content (e.g. an overlay control cluster above a map, canvas, media, or long document); keep the content surface clear and opaque.
Reject the result when: two or more stacked translucent cards exist in a content region, when text sits directly on glass over busy content, or when glass appears with nothing underneath.
Verify: with Reduce Transparency on, every remaining glass surface becomes opaque and readable; with it off, each one visibly floats over content that moves beneath it.

### 8. Add interaction states and animation
Look for: buttons with no hover/pressed differentiation beyond system defaults that were overridden; selection that is invisible in inactive windows; state changes that snap (sidebar collapse, detail swaps, inline editing) or that animate with no informational purpose; custom springs everywhere.
Change: rely on system control styles for hover/pressed/disabled; make selection use the system selection appearance including inactive-window styling; animate only transitions that show a spatial or state relationship, with system default timing; swap movement for fade under Reduce Motion.
Verify: click, hover, press, disable each control; switch to another app and check inactive selection; toggle Reduce Motion and confirm nothing depends on movement.

### 9. Keyboard and focus review
Look for: controls unreachable by Tab; focus ring hidden by custom styling; primary action without a shortcut; Return/Escape not bound in sheets and dialogs; arrow keys not moving list/table selection; focus jumping on data refresh; text fields without sensible initial focus.
Change: define focus order and initial focus per window; add shortcuts for primary actions and menu items; ensure default/cancel buttons in dialogs; keep focus stable across refreshes.
Verify: complete the primary job with the mouse unplugged (conceptually): Tab, arrows, Return, Escape, Cmd-shortcuts only.

### 10. Accessibility review
Open `references/accessibility-localization.md`. Look for: icon-only controls without labels; groups VoiceOver reads as "button, button, button"; color-only status; contrast failures on secondary text over materials; custom controls without accessibility traits; missing `.help` tooltips; hard-coded strings that defeat localization and long-string testing.
Change: labels and values on every control; group related controls; add a symbol or text to every color-coded state; ensure semantic colors so Increase Contrast applies; move strings to the String Catalog.
Verify: run an accessibility audit test if the project has one (`references/testing-quality.md`), and Accessibility Inspector on the running window; walk the primary job with VoiceOver.

### 11. Resizable-window review
Look for: fixed window sizes; content that clips or overlaps at narrow widths; toolbars that overflow badly; sidebars that do not collapse; detail panes that stretch text lines uncomfortably wide; layouts that fail when very short; nothing that remembers window placement; poor behavior on a small laptop display or a large external display.
Change: minimum useful size per window; ideal size; flexible layouts with sensible max content width; sidebar/inspector collapse thresholds; restoration and placement per window purpose (`references/macos-ux.md`).
Verify: the full resizing matrix below.

### 12. Dark/light review
Look for: custom colors that do not adapt; images without dark variants; borders that vanish in one mode; glass that looks fine in one appearance and muddy in the other; shadows that disappear in dark.
Change: semantic colors everywhere; asset-catalog variants for images; separators from system colors.
Verify: toggle appearance while the app runs at laptop and large sizes; compare the active and inactive window.

### 13. Run the actual app
Build with `scripts/build.sh`, run `scripts/test.sh` (UI tests included if present), then launch and walk the primary job end to end. Use `/run` and `/verify` where available; otherwise drive the app manually and describe what you saw.

### 14. Visual verification
Execute the two matrices, capture after-observations (screenshots where tooling permits, precise written observations otherwise), and compare against the before-baseline. Fix regressions before reporting.

## Resizing matrix
Check every in-scope window at each row; note clipping, overlap, truncation, overflow, and awkward whitespace.

| Case | Also with |
|---|---|
| Narrow (near minimum width) | sidebar visible, sidebar hidden |
| Ordinary laptop window (~13–14" display) | light, dark |
| Large desktop window (external display) | light, dark |
| Very tall, very short | — |
| Long localized strings (pseudo-localize or double-length strings) | narrow |
| Active window vs inactive window | selection visible? |
| Multiple displays / window moved between displays | restore position sane? |

## Accessibility-appearance matrix
| Setting | Pass condition |
|---|---|
| Reduce Transparency | Every material/glass surface becomes opaque; text and controls remain readable; no layout shift |
| Increase Contrast | Borders, separators, and focus rings visible; secondary text passes contrast on all surfaces |
| Larger / accessibility text | Layout reflows; primary content never truncates; controls stay reachable |
| Reduce Motion | Transitions are fades; nothing informational depends on motion |
| Dark mode + Increase Contrast | Glass fallbacks and custom shapes remain legible |
| Keyboard only | Focus ring visible on every focusable control |
| VoiceOver | Meaningful labels, sensible grouping and order |

## Polish report format
```
Window: <name / purpose>
Before: <observations at laptop size: hierarchy, chrome, glass misuse, truncation, keyboard gaps>
Changed: <stage-by-stage: structure, hierarchy, typography, behavior, materials, states, keyboard, a11y, resize, appearance>
After: <observations at the same sizes; what now reads as primary; what glass remains and why>
Matrices: <resizing rows passed/failed; accessibility-appearance rows passed/failed>
Glass rule: <"no glass in content areas; N floating control surfaces remain" or "rejected: reason">
Remaining: <deferred items with reason>
```

## Done when
- [ ] Each window maps to a native archetype; actions live in menu bar / toolbar / context menu / inspector appropriately.
- [ ] No hard-coded frames, point-size fonts, or literal colors remain in in-scope views; tokens in `DesignSystem/` and `DESIGN_SYSTEM.md` are used.
- [ ] Tables/lists support selection, sorting, context menus, keyboard navigation; empty/loading/error states exist.
- [ ] Glass only on controls floating over content; zero stacked translucent cards in content areas; Reduce Transparency fallback verified.
- [ ] Primary job completable by keyboard alone; focus visible and stable.
- [ ] Accessibility audit / Inspector shows no unlabeled controls; VoiceOver walk of the primary job is coherent.
- [ ] Resizing matrix and accessibility-appearance matrix executed and recorded.
- [ ] `scripts/build.sh` and `scripts/test.sh` green; app launched and verified after the last change.
- [ ] Polish report written with before/after observations.

## End-of-task report
SKILL.md format with the polish report embedded under **Verified**. Under **Not done / needs you**: items that need a design decision, screens out of scope, and any glass API guarded by `#available` because of the deployment target.
