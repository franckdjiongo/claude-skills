# Design system — <App name>

<!-- Semantic roles, not literal values. Everything here maps onto system-provided colors, fonts, materials, and SF Symbols so the app inherits dark mode, Increase Contrast, Reduce Transparency, and Dynamic Type behavior for free. Add a role only when two or more places need it. Implementation lives in DesignSystem/. Guidance: references/macos-ux.md, references/liquid-glass.md, references/accessibility-localization.md. -->

Last updated: <YYYY-MM-DD> · Reviewed against exported Apple skills: <yes/no, date>

## Principles
1. Native window structure first (sidebar / content / detail / inspector), then styling.
2. System semantics over custom constants; a custom value needs a comment saying why.
3. Glass is for controls floating over content, never for stacking content cards.

## Spacing tokens
<!-- Name by intent. Suggested scale is a starting point; adjust to the product, then never hard-code numbers in views. -->
| Token | Value | Use |
|---|---|---|
| `Spacing.compact` | <4> | Inside controls, icon–label gaps |
| `Spacing.standard` | <8> | Between related controls |
| `Spacing.section` | <16> | Between groups within a view |
| `Spacing.page` | <20–24> | Content inset from window/pane edge |

## Surfaces
| Token | Backed by | Use |
|---|---|---|
| `Surface.window` | window background (system) | Default content ground |
| `Surface.content` | text/list background (system) | Editable or scrolling content |
| `Surface.elevated` | <system control background / material> | Popovers, inspectors, sheets |
| `Surface.sidebar` | sidebar material (system) | Navigation sidebar only |

## Text roles
| Token | System style | Use |
|---|---|---|
| `Text.title` | `.title2` / `.title3` | Section headers, detail titles |
| `Text.body` | `.body` | Default |
| `Text.secondary` | `.body` + secondary color | Metadata, captions |
| `Text.mono` | `.body.monospaced()` | Paths, IDs, code |
<!-- Never fix font sizes in points; roles scale with system text settings. -->

## Shapes
| Token | Use |
|---|---|
| `Shape.control` | Buttons, fields (prefer system control styles) |
| `Shape.panel` | Grouped content containers, cards when truly needed |

## Color roles
<!-- All on system semantic colors so they adapt to appearance and contrast settings. The accent is the one custom color; use it for the primary action and selection only. -->
| Role | Value | Notes |
|---|---|---|
| Accent | <asset-catalog accent or system accent> | Primary action, selection |
| Primary text | system primary label | |
| Secondary text | system secondary label | |
| Destructive | system red | Never the only signal; pair with a label |
| Status | <system colors + symbol + text> | Color is never the sole carrier of meaning |

## Materials and glass policy
- Allowed: system toolbar/sidebar treatment (automatic); glass-style buttons for controls floating over content; materials behind floating overlays.
- Not allowed: translucent cards inside content areas; glass on static text panels; nested glass.
- Every glass surface must remain readable with Reduce Transparency and Increase Contrast enabled (see matrix below). Confirm glass API signatures against the exported Apple skill or current docs before use.

## Iconography
- SF Symbols only, matched to text style and weight; custom symbols only for brand/unique concepts.
- Icon-only controls require a label for accessibility and a tooltip (`.help`).
- Symbol per action: <e.g. `plus` = create, `trash` = delete, `square.and.arrow.up` = share/export>

## Motion policy
- Purpose: show state change or spatial relationship; no decorative motion.
- Durations: system defaults; respect Reduce Motion by swapping movement for fades.
- Never animate layout that would fight window resizing.

## Accessibility appearance matrix
<!-- Every new screen is checked in these before it is "done". Record the last check date. -->
| Setting | Expected behavior | Last checked |
|---|---|---|
| Dark / Light | No custom colors break; images have both variants where needed | <date> |
| Increase Contrast | Borders and separators visible; glass gains opaque fallback | <date> |
| Reduce Transparency | Materials become opaque; text stays readable | <date> |
| Larger text | Layout reflows, no truncation of primary content | <date> |
| Reduce Motion | Transitions become fades; nothing depends on motion | <date> |
| Keyboard only | Every control reachable, focus ring visible | <date> |
| VoiceOver | Controls labeled, groups sensible, no "button, button" | <date> |
