# Accessibility and localization

Both topics are part of "done", not a pass after the fact, because retrofitting either means touching every view. Accessibility on the Mac is mostly obtained for free by using native controls and naming things; localization is mostly obtained by never hand-building a string. The work is in the exceptions: custom controls, icon-only buttons, glass surfaces, formatted values, and layouts that assumed English.

Contents: keyboard · VoiceOver · focus · contrast and color · appearance settings · text size · icon-only controls · tables and lists · tooling and audits · localization (String Catalogs, copy rules, plurals and formatting, pseudo-localization, RTL, a Quebec French example) · checklist.

## Keyboard navigation

Every action reachable by mouse is reachable by keyboard: Tab/⇧Tab through controls, arrows within lists, tables, segmented controls and radio groups, Space/Return to activate, Escape to cancel. Native controls do this; a custom control built from `Rectangle` and `onTapGesture` does none of it. When a custom control is unavoidable, add `.focusable()`, handle `onKeyPress` for the expected keys, and draw the focus ring. Turn on Full Keyboard Access in System Settings and walk each screen once; anything you cannot reach is a defect, not a nice-to-have (`references/macos-ux.md` has the shortcut conventions).

## VoiceOver naming, grouping, and traits

VoiceOver reads what the accessibility tree says, and the tree is built from what you declare:

- **Name**: every control has a concise `accessibilityLabel` that says what it *is* ("Delete project"), not what it looks like ("trash icon"). Text-bearing controls get their label automatically; icon-only ones do not.
- **Value**: stateful controls expose their state (`accessibilityValue` for a custom slider or progress).
- **Hint**: optional, short, tells the outcome ("Moves the item to Trash"); do not repeat the label.
- **Traits**: mark headings (`.accessibilityAddTraits(.isHeader)`) so users can jump between sections; mark custom buttons as buttons; mark selected items.
- **Grouping**: combine a row's pieces with `.accessibilityElement(children: .combine)` so a table row reads as one sentence instead of five stops; give containers a label when the grouping alone does not explain them.
- **Hidden decoration**: `.accessibilityHidden(true)` on purely decorative images and separators.
- **Live changes**: announce results of async actions (`AccessibilityNotification.Announcement`) when the visual result is off-screen or transient.

Test by turning VoiceOver on (⌘F5) and completing the feature's main task without looking at the screen.

## Focus visibility and order

Focus must be visible (system focus ring, never removed) and its order must follow reading order. After an action, move focus to the sensible next place with `@FocusState`: to the new row after "Add", back to the list after a sheet dismisses, to the first invalid field after a failed submit. Modal presentations trap focus inside them and return it afterwards; native sheets and alerts do; custom overlays must.

## Contrast and color-only meaning

Text and essential icons need adequate contrast against their surface in light, dark, and Increase Contrast. System semantic colors on system surfaces meet this by construction; custom colors are verified with Accessibility Inspector's color contrast calculator or the design tokens' asset variants (`references/liquid-glass.md`). Color never carries meaning alone: an error state has an icon and text, not only a red tint; a status dot has a label or symbol variation; chart series differ by shape or label as well as hue.

## Reduce Transparency, Increase Contrast, Reduce Motion

These three system settings change what your UI looks like without changing your code, so they are the first things to check on any custom surface:

| Setting | Effect | Verify |
|---|---|---|
| Reduce Transparency | Materials and glass become opaque | Text on every material/glass surface still contrasts; nothing needed the see-through to make sense |
| Increase Contrast | Stronger borders, darker tints, some semantic color shifts | Custom borders, separators, disabled states, and secondary text remain distinguishable; asset colors have high-contrast variants |
| Reduce Motion | System animations shorten; users expect yours to as well | Custom transitions check `accessibilityReduceMotion` and use a cross-fade or none; no state depends on an animation callback |

Read the environment values (`\.accessibilityReduceTransparency`, `\.colorSchemeContrast`, `\.accessibilityReduceMotion`) only in custom drawing; native styles already respond. Glass is evaluated under all three before a screen ships.

## Large and accessibility text sizes

Use system text styles so the text-size setting in System Settings → Accessibility applies. Verify the layout at the largest size: labels wrap instead of truncating, fixed-height rows grow, horizontal stacks of label + value switch to vertical with `ViewThatFits` or `@Environment(\.dynamicTypeSize)`, icons scale with `.imageScale` or symbol text-style sizing. Tables tolerate row-height growth; if a design cannot, that is a design problem.

## Icon-only controls and tooltips

Every icon-only control has three things: `.accessibilityLabel`, `.help` (tooltip), and, where a `Label` is used, a title that the toolbar or menu may show. The tooltip serves sighted users discovering the control; the label serves VoiceOver; the title serves menus and customization. A toolbar button with only an SF Symbol and none of the above fails all three audiences.

## Table and list semantics

Native `List` and `Table` expose rows, columns, selection, and sort state to assistive technologies. Keep them native. For each row, make sure the combined reading makes sense ("Invoice 1042, Acme, overdue, 3 days"), that selection state is announced, that column headers have labels, and that an empty table reads its `ContentUnavailableView` message rather than silence. Custom row layouts inside `List` still inherit the row semantics; a `ScrollView` of `HStack`s does not, and needs the grouping and traits added by hand.

## Tooling and automated audits

- **Accessibility Inspector** (Xcode → Open Developer Tool): inspect any element's label/value/traits, run the audit on a window, and check color contrast. Run it on every new screen and attach findings to the ui-polish report.
- **Automated audits in UI tests**: XCUITest can perform an accessibility audit on the current screen (`XCUIApplication().performAccessibilityAudit()`; confirm the current API and audit categories against the installed SDK). Add one audit test per main screen to the UI test target so regressions fail `scripts/test.sh`. Exclude known, justified issues explicitly with an issue handler rather than disabling the audit.
- **Manual pass** remains required for VoiceOver flow and keyboard completeness; audits catch missing labels and contrast, not confusing order.

Log audit results in the `.xcresult` (`references/testing-quality.md`) so the release workflow can cite them.

## Localization: String Catalogs

Use a String Catalog (`Localizable.xcstrings`) from the first commit. Xcode extracts strings from `Text`, `Label`, `Button` titles, `LocalizedStringKey`, and `String(localized:)` automatically at build time, so the catalog stays complete without a manual step. Rules:

- UI copy goes through `LocalizedStringKey` or `String(localized: "…", comment: "…")`. Add comments describing context ("Toolbar button; deletes selected projects"); translators and future you need them.
- No hard-coded UI strings in views, models, alerts, menu titles, or accessibility labels. `.accessibilityLabel(Text("…"))` and `.help("…")` are localizable when given literals; keep them literals, not interpolated variables holding English.
- Non-UI strings (log messages, identifiers, URLs, `UserDefaults` keys) are *not* localized; do not run them through the catalog.
- Keep one catalog per target unless a package genuinely owns its own strings; then it needs `Bundle.module` and its own catalog.

Enable "Use Compiler to Extract Swift Strings" and treat a build warning about missing localizations as a defect before release.

## No sentence concatenation; plurals and formatting via Foundation

Word order, agreement, and pluralization differ by language, so a sentence is always one string with placeholders, never fragments joined with `+`:

```swift
// Wrong: "Deleted " + count + " items" — breaks in every language including French, where the noun and adjective agree.
// Right: one localized string with interpolation; plural handled in the catalog.
Text("Deleted \(count) items")              // catalog entry gets "one"/"other" variants per locale
Text("\(project.name) was exported to \(destination.lastPathComponent)")
```

- **Plurals**: use the String Catalog's plural variants (Vary by Plural) on the key, not `count == 1 ? "item" : "items"`.
- **Numbers, currency, percent, units**: `Text(value, format: .number)`, `.currency(code:)`, `.percent`, `Measurement` formatting. Never `String(format:)` for user-visible numbers.
- **Dates and times**: `Text(date, format: .dateTime.day().month().year())` or `.formatted(date: .abbreviated, time: .shortened)`, `RelativeDateTimeFormatter` for "3 days ago". Never assemble month names or reorder components by hand.
- **Lists of things**: `ListFormatStyle` ("A, B, and C" vs "A, B et C").
- **Names, addresses**: `PersonNameComponentsFormatter`; do not assume given-name-first.
- **Sorting and comparison**: `localizedStandardCompare` or `String.Comparator` with the current locale, never `<` on strings for user-visible order.

## Pseudo-localization and long-string testing

Xcode's scheme options include running with a pseudo-language (Double-Length, Accented, Right-to-Left, Bounded) and specific locale overrides. Add a "Pseudo-Localized" scheme or run configuration and exercise the resizing matrix in `references/macos-ux.md` with Double-Length text: it exposes fixed frames, clipped buttons, truncated labels without tooltips, and toolbars that overflow. Bounded pseudo-localization reveals where text is silently truncated. Fixed-width labels are the usual finding; the fix is flexible layout, not shorter English.

## RTL awareness

Even an app shipping only left-to-right languages should not break in a right-to-left environment, because leading/trailing is also what makes layouts adapt correctly. Use `.leading`/`.trailing` (never `.left`/`.right`), `HStack` ordering as written (it mirrors automatically), `padding(.leading)`, and `Image` with `.flipsForRightToLeftLayoutDirection(true)` for directional glyphs (SF Symbols that indicate direction mirror on their own). Run the Right-to-Left pseudo-language once per screen to confirm nothing is anchored with absolute coordinates.

## Example locale: Canadian French (`fr_CA`)

A Quebec user expects the app to respect French Canadian conventions, and the point of the Foundation formatters is that they do this without any French-specific code:

```swift
let locale = Locale(identifier: "fr_CA")   // in tests; in the app, use the user's locale implicitly
let amount = 1234.56
amount.formatted(.currency(code: "CAD").locale(locale))     // expect a comma decimal, symbol after the number
Date.now.formatted(.dateTime.day().month().year().locale(locale))  // expect day-month-year, month name in French, lowercase
(0.256).formatted(.percent.locale(locale))                  // expect a space before the % sign
```

Verify the exact output by running the snippet under the installed SDK rather than assuming it; the formatting rules come from ICU data that ships with the OS and evolves. What must be true in your code: no hard-coded `$`, `%`, or `/` separators, no `"\(day)/\(month)/\(year)"`, no AM/PM assumptions (24-hour clock is common), no thousand separators typed as commas. Add one unit test per formatter in the app's `Domain` or `Data` tests that formats a known value under `fr_CA` and under `en_US`, asserting only stable properties (contains the digits in order, differs between locales) so the test does not fossilize ICU output.

Quebec users also switch keyboard layouts (Canadian French, CSA) frequently; shortcuts that rely on characters not on those layouts (`⌘[`, `⌘]`, `⌘\``) should have menu equivalents that remain reachable.

## Checklist

Run during `workflows/ui-polish.md` and before release. Every unchecked box needs a fix or a written reason.

- [ ] Every screen completes its main task with keyboard only (Full Keyboard Access on).
- [ ] VoiceOver reads a sensible label, value, and trait for every control; rows read as one unit; headings are marked.
- [ ] Focus is visible and moves predictably after actions and presentations.
- [ ] Contrast verified for custom colors; no color-only meaning.
- [ ] Reduce Transparency, Increase Contrast, and Reduce Motion checked on every material or glass surface and custom animation.
- [ ] Largest accessibility text size: no clipping, rows and stacks grow.
- [ ] Icon-only controls have label, help, and title.
- [ ] Accessibility Inspector audit clean, and an audit UI test exists per main screen.
- [ ] All UI strings are in the String Catalog with comments; no concatenated sentences; plurals in the catalog.
- [ ] Numbers, dates, currencies, lists, names formatted via Foundation; a locale test exists.
- [ ] Double-Length and Right-to-Left pseudo-localization exercised across the resizing matrix.
