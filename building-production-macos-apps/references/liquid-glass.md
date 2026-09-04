# Liquid Glass and the app's design system

Liquid Glass is Apple's system-wide material for *controls and navigation that float above content*: toolbars, sidebars' chrome, buttons and segmented controls placed over scrolling or media content, sheets and popovers. It refracts and reflects what is beneath it, which is why it only reads well when there is meaningful content underneath. It is not web glassmorphism: no stacked translucent panels, no blurred cards inside blurred cards, no frosted content areas. An app "with Liquid Glass" is a native Mac app whose *system controls* carry glass; the content itself stays clear.

Every version-sensitive API in this file (glass effect modifiers, glass button styles, container effects, background-extension behavior) must be confirmed against the exported Apple SwiftUI skill (`scripts/export-apple-skills.sh`, then `.apple-skills/`) or current documentation before use, and guarded with `#available` when the deployment target predates it (`references/platform-baseline.md`). This file teaches placement and judgment; the exported skill owns the signatures.

## Where glass belongs

| Surface | Glass? | How |
|---|---|---|
| Window toolbar, `NavigationSplitView` chrome, tab bars, `.searchable` field | Yes, automatically | Use the native structures; do nothing. Custom `HStack` "toolbars" do not get it. |
| Buttons and control clusters floating over scrolling content, maps, images, canvases | Yes | Glass button styles (`.glass`, `.glassProminent` or current equivalents) on a native `Button`; group related controls in a glass container so they share one material. |
| A floating action bar or overlay palette over document content | Yes | One glass surface for the cluster, positioned with `safeAreaInset` or `overlay`, so scrolled content passes beneath it. |
| Sheets, popovers, menus | Yes, automatically | Native presentation. |
| Menu-bar-extra panels | System-decided | Native `MenuBarExtra`; do not paint your own glass panel. |

The test for "controls floating over content": if you scrolled the content, would it move underneath this element? If yes, glass is appropriate. If the element *is* the content, or sits beside content on the same plane, it is not.

## Where glass does not belong

- **Content areas.** Lists, tables, text, forms, editors, dashboards. There is nothing beneath them to refract, so glass becomes a grey haze that lowers contrast and hides hierarchy.
- **Cards.** Especially stacked cards. This is the AI-generated anti-pattern to reject on sight:

```text
┌────────────────────────────────────────┐
│ translucent card                      │
│ ┌──────────────────────────────────┐   │
│ │ another translucent card        │   │
│ │ ┌──────────────────────────────┐ │   │
│ │ │ another glass card          │ │   │
│ │ └──────────────────────────────┘ │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

  Each layer blurs the last; text ends up on three stacked tints; Reduce Transparency turns it into three flat grey boxes. It reads as a web dashboard theme, not a Mac app.
- **Window backgrounds**, except through the system's window material behavior.
- **Ordinary buttons in forms and inline in content.** Use the standard bordered styles; glass button styles are for controls over content.
- **Decoration.** Glass applied because the brief said "premium" rather than because a control floats. Premium on the Mac is hierarchy, typography, spacing, and correct behavior; glass is the finishing touch on the chrome.
- **Anywhere a raw glass effect is wrapped around a normal button** instead of using the glass button style; Apple provides the styles so interaction states, shapes, and accessibility variants are correct.

## Layering order

Build in this order and stop at the first layer the product does not need. Glass is near the end because it decorates structure that must already be right.

```text
1. Native window structure        Window/WindowGroup/Settings scenes, sizing, restoration (references/macos-ux.md)
        ↓
2. Clear content surface          system background; content on the window's own surface, opaque
        ↓
3. Native hierarchy               NavigationSplitView, List, Table, Form, inspector; sidebar style
        ↓
4. System toolbar and controls    .toolbar with placements, .searchable, standard button styles, SF Symbols
        ↓
5. Liquid Glass                   only where controls float above meaningful content (overlays, floating bars)
        ↓
6. Semantic accent / prominence   accent color and prominent styles only where hierarchy requires one primary action
```

If a design conversation starts at layer 5, walk it back to layer 1. `workflows/ui-polish.md` enforces this sequence: hierarchy, typography, spacing, native behaviors, then material, then interaction states.

## Materials vs glass

Materials (`.regularMaterial`, `.thinMaterial`, `.ultraThinMaterial`, `.bar`, sidebar materials) are translucent backgrounds that blur what is behind them without the refraction and highlight behavior of glass. Use them for the surfaces the system already uses them for: sidebar backgrounds, window-background regions, popover-like panels that belong to the window, a translucent status footer. They are calmer than glass and appropriate as *surfaces*; glass is appropriate as *controls*. Do not put material behind content text in the main area; content sits on the opaque system background.

Two consequences: a material never needs an explicit color behind it, and any material or glass must remain readable under the accessibility conditions below, which is why text on either surface uses system semantic text colors, never a hand-picked grey.

## Semantic design tokens

A design system for a Mac app is a small set of named roles built on system values, so that every screen agrees and every accessibility appearance is handled by the system. Record the tokens in `DESIGN_SYSTEM.md` (`templates/DESIGN_SYSTEM.md`) and implement them in `DesignSystem/`. The names below are conceptual; the project chooses its own.

```swift
// Conceptual token set — build on system values, not literals.
enum AppSpacing { static let compact: CGFloat = 4; static let standard: CGFloat = 8; static let section: CGFloat = 20 }

enum AppSurface {                       // ShapeStyle-typed so views write .background(AppSurface.elevated)
    static var background: some ShapeStyle { .background }          // window/content surface
    static var elevated: some ShapeStyle { .regularMaterial }       // panels that sit above content
}

enum AppText {
    static let primary: Color = .primary
    static let secondary: Color = .secondary
}

enum AppShape {
    static let control = RoundedRectangle(cornerRadius: 6, style: .continuous)
    static let panel = RoundedRectangle(cornerRadius: 12, style: .continuous)
}
```

Rules behind the tokens:

- **Colors** come from system semantic colors (`.primary`, `.secondary`, `Color(nsColor: .controlBackgroundColor)`, `.accentColor`) and asset-catalog colors with light/dark and high-contrast variants. A literal `Color(red:green:blue:)` in a view is a review finding.
- **Typography** uses the system text styles (`.largeTitle` … `.caption2`) so Dynamic Type and accessibility text sizes work; custom fonts only via `Font.custom` with `relativeTo:`.
- **Materials and glass** are used through the tokens so a global change (or an accessibility override) happens in one file.
- **Iconography** is SF Symbols with rendering modes and weights matched to the text style; custom symbols only where no SF Symbol communicates the concept.
- **Spacing** is a three- or four-step scale; a value outside the scale needs a reason in the review.
- **Shapes** use continuous corners and two or three radii; controls and panels do not each invent their own.

Tokens are not a theming engine. Do not build a "light/dark palette switcher"; the system already switches, and the tokens simply forward to it.

## Behavior under accessibility appearance settings

Glass and materials are the parts of a design most likely to fail an accessibility setting, so every glass or material surface is verified under each of these (`references/accessibility-localization.md` has the full audit):

| Setting | What the system does | What you must check |
|---|---|---|
| Reduce Transparency | Materials and glass become opaque, near-solid surfaces | Text still has contrast; nothing relied on seeing content through the surface (a floating bar that hides content it once revealed still makes sense); no custom blur remains translucent |
| Increase Contrast | Borders and separators strengthen; some tints darken | Custom borders and low-contrast secondary text meet contrast; controls drawn without system styles still show edges |
| Reduce Motion | Glass morph/transition animations shorten or stop | Custom transitions respect `accessibilityReduceMotion`; no layout depends on an animation completing |
| Dark mode | Glass and material tints invert with the surface | Any custom shadow, highlight, or asset has a dark variant |
| Inactive window | Glass dims with window state | Custom overlays do not remain bright over a dimmed window |

Read these through the environment (`\.accessibilityReduceTransparency`, `\.accessibilityReduceMotion`, `\.colorSchemeContrast`) only when a custom surface needs to adapt; system styles adapt on their own, which is one more reason to use them.

## Verify before using glass APIs

Glass APIs are recent and may differ between the stable SDK, the beta SDK, and what this file remembers. Before writing any glass code:

1. Run `bash scripts/doctor.sh`; note the SDK and whether Apple skills export is supported.
2. Run `bash scripts/export-apple-skills.sh` when supported and read the SwiftUI specialist and "what's new" material in `.apple-skills/` for the exact modifier names, button styles, and container APIs.
3. Check the deployment target; wrap glass in `#available` with the standard bordered/material equivalent as the fallback.
4. Build, run, and look at the actual window in light, dark, and Reduce Transparency before declaring it done.

Do not fossilize a signature seen in a beta into a project; if the API is beta-only, keep it behind a single adapter in `DesignSystem/` so a rename touches one file.

## Review checklist

Use during `workflows/ui-polish.md` and feature reviews. Every "no" needs either a fix or a written reason.

- [ ] Native window, navigation, toolbar, and presentation structures are used; no hand-built chrome.
- [ ] Content areas sit on the opaque system background; no material or glass behind lists, tables, text, or forms.
- [ ] No stacked translucent containers anywhere.
- [ ] Glass appears only on controls that float above scrolling or media content, via glass button styles or one shared glass container per control cluster.
- [ ] Materials appear only on sidebar/background/panel surfaces the system would also use them on.
- [ ] Every color, font, spacing, and shape in the feature comes from the design tokens; no literal colors in views.
- [ ] Accent color and prominent button style appear at most once per view as the primary action.
- [ ] Icons are SF Symbols sized to the text style; icon-only controls have labels and help text.
- [ ] Verified in the running app: light, dark, active, inactive, Reduce Transparency, Increase Contrast, Reduce Motion.
- [ ] Verified across the resizing matrix in `references/macos-ux.md`; floating controls never cover the content they act on at minimum size.
- [ ] Glass and material APIs were confirmed against the exported Apple skill or current docs; deployment-target fallbacks exist and were run.
- [ ] `DESIGN_SYSTEM.md` reflects any token added or changed.
