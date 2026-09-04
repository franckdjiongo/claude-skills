# macOS UX: what "Mac-native" means

A Mac-native app is one whose windows, menus, keyboard, and files behave the way every other Mac app the user owns behaves, so that nothing has to be learned and expert workflows never require a mouse. Visual style comes after that (`references/liquid-glass.md`). The rule for everything in this file: **consider each item, implement what fits the product**. A menu-bar utility does not need undo; a document app cannot ship without it.

Contents: windows · resizing matrix · menu bar and keyboard · toolbars · navigation hierarchy · selection and sorting · context menus · drag and drop · Settings · undo/redo · file workflows · states · tooltips · evaluation table.

## Windows have a purpose

Ask this questionnaire for every window and scene before building it; write the answers in the feature's ADR or `ARCHITECTURE.md` when they are not obvious:

```text
Why does this window exist? (main workspace, inspector, auxiliary panel, document, utility, about)
Should it restore on relaunch?          Should it minimize?          Should it resize freely?
Does it need a toolbar?                 Does it need a sidebar?      Can more than one be open?
What is its minimum useful size?        Should it remember placement?
What happens on a small laptop display? What happens on a large external monitor?
```

Sizing and placement rules:

- Set a minimum size from the content that must remain usable (sidebar minimum + detail minimum), never a fixed size. Apple's guidance discourages hard-coded window dimensions; use `defaultSize`, `.windowResizability(.contentMinSize)`, and let the frame grow.
- Default placement: the system's centered placement for the main window; auxiliary windows near the content they inspect. Confirm current window-placement modifiers against the exported Apple skill before using them; they have changed across releases.
- Restoration: on by default for the main window and documents; off for transient windows (a one-shot importer, an auth prompt). `.restorationBehavior` and `.windowMinimizeBehavior` exist for this; verify signatures against the installed SDK.
- Secondary windows (inspectors, utilities) as separate `Window`/`WindowGroup` scenes with their own identity so `openWindow` can bring the existing one forward rather than spawning duplicates.
- Multi-display: never persist an absolute frame without validating it against the current visible screen region on restore; a window restored onto a disconnected monitor is invisible to the user. Prefer the system's restoration and only store custom placement when the product needs it.
- Full-screen and Stage Manager: content must survive arbitrary widths; nothing below depends on a specific aspect ratio.

## Resizing is designed, not patched

Exercise every main view in Xcode's resizable previews and in the running app at these configurations before calling a layout done (`workflows/ui-polish.md` requires it):

| Configuration | What usually breaks |
|---|---|
| Narrow window (at minimum width) | Toolbar items overflow, tables clip columns, text truncates without tooltips |
| Ordinary laptop window | Baseline; nothing should be tuned only for this |
| Large desktop window | Content stretches into unreadable line lengths; empty space with no hierarchy; fixed-width center columns |
| Very tall window | Vertical stacks with fixed spacing leave voids; lists that should fill do not |
| Very short window | Fixed-height panels overlap; footers vanish; scroll views missing |
| Sidebar shown / hidden | Detail minimum width assumed the sidebar; toolbar item placement jumps |
| Long localized strings (pseudo-localization, `references/accessibility-localization.md`) | Buttons clip, labels overlap, fixed frames |
| Light / dark | Hard-coded colors, custom shadows, images without dark variants |
| Active / inactive window | Custom selection colors that do not dim; accent used for non-focus states |

Fix by using flexible layout (`frame(minWidth:)`, `ViewThatFits`, `Layout` types, `layoutPriority`) and semantic sizing, never by adding a second fixed frame for a second window size.

## Menu bar commands

The menu bar is the app's command inventory and its discoverability surface: users read menus to learn what an app can do and to find shortcuts. Rules:

- Every meaningful action is in a menu, even if also in a toolbar or context menu. Use `.commands { }` with `CommandGroup(replacing:)` / `CommandGroup(after:)` for the standard menus and `CommandMenu` for app-specific ones. Keep menu placement conventional: file actions under File, editing under Edit, view/layout under View, window management under Window.
- Standard items (Undo, Redo, Cut/Copy/Paste, Select All, Close, Minimize, Zoom, Help) come from the system; do not re-create them. Provide the responders (`focusedSceneValue`, `@FocusedValue`, undo manager) so they enable correctly.
- Commands enable and disable based on state; a menu item that does nothing when chosen is a bug. Route state to commands through `@FocusedValue`/`@FocusedBinding` from the focused window.
- Menu-bar-extra apps (`MenuBarExtra`): the extra's menu is the whole UI for many users; it still needs keyboard access, a Settings item, and Quit.

## Keyboard shortcuts and focus

Expert Mac users expect to complete common workflows without the mouse.

- Assign `.keyboardShortcut` to primary actions using platform conventions (⌘N new, ⌘, settings, ⌘F find, ⌘⇧ for related variants); do not override system shortcuts (⌘Q, ⌘W, ⌘H, ⌘Tab).
- Tab order follows visual order; use `@FocusState` to move focus intentionally (to a new item's name field after creation, to the search field on ⌘F). Focus must be visible: keep the system focus ring; do not draw custom controls without one.
- Return activates the default button (`.defaultAction`), Escape cancels (`.cancelAction`), Space toggles, arrow keys move selection in lists and tables, and typing in a focused list selects by prefix; these come free from native controls and are lost with custom ones.
- Full Keyboard Access (System Settings → Keyboard) must reach every control; test it once per screen (`references/accessibility-localization.md`).

## Toolbars

A toolbar holds the primary actions of *this window* and navigation/search, nothing else. Use `.toolbar { ToolbarItem(placement:) }` with system placements so items land where the platform puts them and customization works. Prefer SF Symbols with labels (`Label`); the system decides whether to show text. Overflow, customization, and Liquid Glass treatment come automatically from the native toolbar; a custom `HStack` of buttons at the top of the view gets none of them. Search belongs in the toolbar via `.searchable`.

## Sidebar / list / table / detail hierarchy

Structure content with `NavigationSplitView` (sidebar + content + detail) for browse-and-edit apps. The sidebar lists top-level containers (projects, mailboxes, tags) with `.listStyle(.sidebar)`; the content column lists items; the detail edits one item. Collapse is user-controlled and remembered by the system. Inspectors use `.inspector`. Do not reproduce this with hand-rolled `HStack`s; the native version handles resizing, collapse, toolbar splitting, and glass.

Use `Table` when there are multiple comparable attributes and desktop-style sorting is expected; use `List` for single-attribute, hierarchical, or card-like items. Tables need sensible default column widths, resizable columns, and a persisted sort order.

## Selection and sorting

- Multi-selection with ⌘-click and ⇧-click is expected in any list of user content; bind `selection:` to a `Set` of stable identifiers, never to indices.
- Selection persists across view refreshes and, for the main list, across relaunch where sensible.
- Sorting: `Table` `sortOrder` bound to state; persist it in `UserDefaults` via `@AppStorage` or a typed preferences store; apply the sort to the model, not inside `body`.
- Inactive-window selection appearance is handled by native lists; custom row backgrounds must reproduce the active/inactive distinction.

## Context menus

Right-click reveals secondary actions on the item under the pointer: rename, duplicate, delete, reveal, copy identifier. Attach `.contextMenu` to rows and `.contextMenu(forSelectionType:)` on lists so a right-click on an unselected item acts on it, and on a selected group acts on all of them. Keep the menu short and consistent with the menu bar: every context-menu action also exists in a menu with a shortcut. A context menu is never the *only* way to do something.

## Drag and drop

Implement drag and drop when it would make a workflow materially faster: reordering, moving items between containers, importing files by dropping them on a window, dragging content out to Finder or other apps. Use `Transferable` with `.draggable`/`.dropDestination` and standard UTTypes so other apps interoperate. Provide keyboard equivalents for anything drag-only (Move to…, Reorder via ⌥↑/↓) because drag is not accessible to everyone. Do not add drag to lists that never reorder or exchange data; the affordance without the behavior confuses.

## Settings scene

Configuration lives in the Settings scene (`Settings { }`), opened by ⌘, and the app menu item. Use tabs (`TabView`) for more than one group: General, then product-specific tabs, then Advanced. Use `Form` with `.formStyle(.grouped)`; changes apply immediately, no Save button. Settings the user rarely changes stay here; per-document or per-window options go in the window, in a View menu, or an inspector. Bind to a typed preferences store (`@AppStorage` for simple values) and never store secrets here (`references/data-network-security.md`).

## Undo/redo

Any user-created or editable content needs undo, and the system provides most of it: register changes with the environment's `undoManager` (or the document's), and the Edit menu, ⌘Z/⇧⌘Z, and "Undo <Action Name>" work. Name actions (`setActionName`) so the menu reads "Undo Rename". Group rapid changes (typing, dragging) into one undo step. Persistence must not fight undo: do not autosave in a way that makes an undone change reappear. Apps without editable content (a monitor, a launcher) skip this.

## File workflows

Decide which of these the product needs; documents and exports are contractual obligations to users (`references/data-network-security.md`):

- **Open / New / Save**: `DocumentGroup` with `FileDocument`/`ReferenceFileDocument` for document apps gives Open Recent, versions, autosave, iCloud, and the correct title bar.
- **Import**: `.fileImporter` with explicit `allowedContentTypes`; validate before mutating the model; report what was imported and what was skipped.
- **Export**: `.fileExporter` or `NSSavePanel` with a default name and a suggested location; export formats are stable, documented, and re-importable when the data is the user's.
- **Reveal in Finder**, **Open With**, drag out to Finder: cheap and expected for any file the app manages.
- Sandbox: files chosen by the user are accessible through their security-scoped URLs; persist access with bookmarks only when the product genuinely needs it later (`references/data-network-security.md`).

## Error, empty, and loading states

- **Errors** are recoverable and specific: say what failed, what the user can do, and offer the action ("Retry", "Choose another folder", "Open Settings"). Use `.alert` for blocking decisions and inline messages for local failures. No raw error descriptions, no codes without context; log the details with `Logger` (`references/debugging-observability.md`).
- **Empty states** teach the next action: `ContentUnavailableView` with a title, a sentence, and a button that starts the workflow. Distinguish "nothing yet" from "no results for this search" from "no access".
- **Loading** keeps the interface responsive: show existing data while refreshing, use `ProgressView` for indeterminate waits longer than a moment, never block the main actor (`references/performance.md`). Cancel loads when the view goes away (`.task` does this).

## Tooltips

Every icon-only control gets `.help("…")`; every truncated label gets its full text as help. Tooltips also serve VoiceOver as a fallback description, but set `.accessibilityLabel` explicitly on icon-only controls anyway (`references/accessibility-localization.md`).

## Evaluation table

Run through this table for every screen during `workflows/feature.md` and `workflows/ui-polish.md`. Answer each question; implement what the answer requires, skip what the product does not need, and say which in the report.

| Area | Questions it should ask |
|---|---|
| Menu bar | Are important commands represented? Are they in the conventional menu? Do they enable and disable correctly? |
| Keyboard | Can common expert workflows avoid the mouse? Are shortcuts conventional and non-conflicting? |
| Toolbar | Are primary window actions located appropriately? Is search in the toolbar? Does overflow work at narrow widths? |
| Settings | Is configuration in an expected Mac location (⌘,)? Do changes apply immediately? |
| Tables/lists | Are selection and sorting appropriate to desktop use? Are identifiers stable? Do columns resize? |
| Context menus | Are useful secondary actions available without clutter? Does right-click on an unselected item act on it? |
| Drag and drop | Would it make the workflow materially faster? Is there a keyboard equivalent? |
| Windows | Does each window have an explicit purpose, minimum size, restoration policy, and multi-display behavior? |
| Focus | Is keyboard focus predictable and visible? Does focus move to the right place after actions? |
| Undo/redo | Does user-created or editable content require it? Are actions named and grouped? |
| File workflows | Should the app support import/export/open/reveal? Are formats stable and re-importable? |
| Error handling | Can users recover without cryptic alerts? Is there an action in every error? |
| Empty states | Does an empty screen teach the next action? Are "empty", "no results", and "no access" distinct? |
| Loading | Does the interface remain responsive? Is stale data shown while refreshing? |
| Tooltips | Do unfamiliar icon-only controls explain themselves? |
| Resizing | Does every configuration in the resizing matrix hold? |
| Appearance | Light, dark, active, inactive all correct with system colors and materials? |

A screen passes when every applicable row has been verified in the running app, not in a screenshot at one size.
