# Design Specification Language

How to express design intent to a development LLM in **natural language only** — no hex, no px, no CSS, no flexbox/grid syntax. This is the BRIEF mode's core craft. Two halves:

- **Half 1 — Design dimensions.** Express color, type, spacing, motion, layout, dark mode, and responsive behavior in prose a senior designer would brief a developer with.
- **Half 2 — Component vocabulary.** Generic phrasing vs premium phrasing for every component family.

**Why no hex/px/CSS.** Per the documented "recipe for slop," handing the model exact values strips its room to make good decisions and feeds it the very defaults it would have picked anyway. Describe *intent and relationships*; let the model commit to specific values inside a system. (The persistent design file may later pin tokens — see `references/refinement-and-systems.md` — but the brief itself stays prose.)

**Boundaries (link, never reproduce here):**
- Negative anti-slop vocabulary (the "no Inter / no purple gradient" list and premium alternatives) → `references/anti-slop-rules.md`.
- The 8 design archetypes and their bundled prompt phrases → `references/archetype-library.md`.
- Neutral term → CSS property definitions (what "tracking" or "elevation" *means*) → `references/design-vocabulary.md`.
- Concrete per-brand reference numbers (Linear acid-lime hex, Stripe weight-300, 8px grids) → `references/design-system-reference.md`. Cite those as *illustrative of the principle*, not fixed truth; brands redesign.
- 6-part brief ordering and where each dimension goes → `references/prompt-structure.md`.

---

## Table of Contents
- [Half 1 — Expressing Design Dimensions in Natural Language](#half-1--expressing-design-dimensions-in-natural-language)
  - [Color](#color)
  - [Typography](#typography)
  - [Spacing](#spacing)
  - [Animation](#animation)
  - [Layout](#layout)
  - [Dark Mode](#dark-mode)
  - [Responsive Behavior](#responsive-behavior)
  - [Cross-Dimension Anti-Patterns](#cross-dimension-anti-patterns)
- [Half 2 — Component Vocabulary: Generic vs Premium](#half-2--component-vocabulary-generic-vs-premium)
  - [Navigation](#navigation)
  - [Data Display](#data-display)
  - [Forms](#forms)
  - [Feedback](#feedback)
  - [Overlays](#overlays)
  - [Content](#content)
  - [Universal Component Rule](#universal-component-rule)

---

# Half 1 — Expressing Design Dimensions in Natural Language

For each dimension: the **levers to describe**, **phrasing that works**, and the **anti-pattern** that loses control of the output.

## Color

**Describe four levers: role, temperature, saturation, and rationing — and ALWAYS name the accent's job.**

| Lever | What to specify | Phrasing examples |
|---|---|---|
| Role | What each color is *for*, by name | "a canvas color, deep text, muted secondary text, one accent" |
| Temperature | Warm vs cool, per surface | "a cool near-white canvas," "warm earthy terracotta" |
| Saturation | Muted vs saturated, where | "a muted institutional palette with one saturated accent" |
| Rationing | How sparingly the accent appears | "the accent reserved for the single most important action per screen" |

**The non-negotiable: name the accent's job.** An accent without a stated job gets sprayed everywhere. Always bind it to specific uses so the model rations it:
> "One accent color, used sparingly for primary actions and active states only — everything else lives in the neutral scale."

**Use evocative-but-bounded language.** Vivid enough to commit the model to a direction, bounded enough to stay coherent: `"warm earthy terracotta"`, `"a single acid-lime status color"`, `"a cool near-white canvas with deep navy text (never pure black)"`, `"muted institutional palette"`. Avoid pure black for text — specify "deep navy" or "near-black ink" so the result reads designed rather than default.

**Paste-ready example.** *Current:* a flat brief that just says "use blue." *Fix prompt:*
> "Build the palette as: a cool near-white canvas, deep navy-ink body text (never pure black), muted gray secondary text, and exactly one saturated electric-blue accent. Ration the accent to the single primary button and active/selected states per screen. Do not introduce a second accent hue, gradients behind text, or color on decorative elements."

**Anti-pattern:** supplying hex codes. It removes the model's room to pick a distinctive, context-fit palette and hands it the median. Describe role/temperature/saturation/rationing instead. (For the specific colors to ban, link `references/anti-slop-rules.md`.)

## Typography

**Describe four levers: personality, pairing, weight contrast, and scale relationships.** Describe the *category* and let the model pick distinctively — name a specific font only if one is genuinely required.

| Lever | What to specify | Phrasing examples |
|---|---|---|
| Personality | The character/voice of the face | "a characterful display typeface," "a refined, quiet body face" |
| Pairing | Display face vs body face roles | "a distinctive display face paired with a clean, refined body face" |
| Weight contrast | The *gap* between weights, not values | "headlines in a light weight, body in a regular weight — a clear contrast" |
| Scale relationships | The *jump* between sizes, not px | "dramatic jumps between heading and body size; a confident type scale" |

**Phrasing that works:**
> "A characterful display typeface with a clean, refined body face; headlines in a light weight with tight letter-spacing for quiet authority; dramatic jumps between heading and body size; a monospace for any numbers, IDs, or code."

**Weight contrast = extremes, not the middle.** Brief the *contrast* explicitly ("light headlines against regular body") rather than naming weights; describing extremes (light vs bold) beats the default mid-weight sameness. The principle of light-weight headlines with tight tracking is illustrated by Stripe — cite as illustrative, see `references/design-system-reference.md`.

**Paste-ready example.** *Current:* type that "feels generic and flat." *Fix prompt:*
> "Pair a distinctive display typeface for headings with a clean, refined body face. Set headings in a light weight with tight letter-spacing; keep body at a comfortable regular weight. Make the type scale confident — large, clear jumps between H1, H2, and body, not incremental steps. Use a monospace only for numeric data and code. Drive everything from the type tokens; do not introduce a third typeface."

**Anti-pattern:** naming pixel sizes or a single font with no pairing/weight guidance — yields uniform mid-weight text with no hierarchy. (For fonts to explicitly exclude, link `references/anti-slop-rules.md`.)

## Spacing

**Describe two levers: rhythm and density.** Spacing is invisible when right and corrosive when wrong; the goal is a *steady, consistent scale*.

| Lever | What to specify | Phrasing examples |
|---|---|---|
| Rhythm | A consistent scale everything aligns to | "a consistent spacing scale so everything aligns to a steady rhythm" |
| Density | Tight vs airy, and *where* | "compact, information-dense rows" vs "airy and uncluttered" |

**The phrase that triggers token-based spacing.** Saying `"a consistent spacing scale / steady rhythm"` reliably pushes the model toward a spacing token system instead of arbitrary per-component values:
> "Use a consistent spacing scale so everything aligns to a steady rhythm; keep generous breathing room between major sections and tighter, deliberate spacing inside components."

**Density is a choice — state it.** "Compact, information-dense rows" and "airy and uncluttered" pull in opposite directions; pick one per surface and say so. Let hierarchy come from scale and space, not from drawing borders around everything.

**Paste-ready example.** *Current:* "spacing feels inconsistent and cramped." *Fix prompt:*
> "Apply a single consistent spacing scale across the whole UI. Add generous breathing room between major page sections; keep spacing inside components tighter and deliberate so density feels intentional rather than accidental. Derive all padding and gaps from spacing tokens — no one-off pixel values. Hierarchy should come from scale and whitespace, not from adding borders or boxes."

**Anti-pattern:** specifying px values, or asking for "more spacing" with no rhythm/density framing — produces inconsistent, ad-hoc gaps.

## Animation

**Describe three levers: purpose, restraint, and the one big moment — and always include reduced-motion.**

| Lever | What to specify | Phrasing examples |
|---|---|---|
| Purpose | What the motion is *for* | "motion should clarify hierarchy or demonstrate speed, never decorate" |
| Restraint | What stays still | "subtle, responsive feedback only on interactive elements" |
| The one big moment | A single orchestrated entrance | "one orchestrated entrance on page load with elements revealing in sequence" |
| Reduced-motion | Always required | "respect reduced-motion preferences" |

**Phrasing that works:**
> "One orchestrated entrance on page load with elements revealing in sequence; subtle, responsive hover and focus feedback on interactive elements; motion should clarify hierarchy or demonstrate speed, never decorate. Respect reduced-motion preferences."

**One choreographed moment beats scattered effects.** A single well-judged load animation with staggered reveals delights more than fade-ins on every element. For developer/tool contexts, frame motion as *proof of speed* — fast functional transitions that make the product feel fast.

**Always brief reduced-motion.** Without it the model ships motion that ignores the OS preference. Treat it as part of the spec, not an afterthought.

**Paste-ready example.** *Current:* "scattered fade-ins on every element." *Fix prompt:*
> "Remove the per-element fade-ins. Replace them with one orchestrated entrance on initial page load: key elements reveal in a short staggered sequence. Keep all other motion to subtle, responsive hover and focus feedback on interactive elements only. Motion must clarify hierarchy or signal speed — never decorate. Honor `prefers-reduced-motion` by disabling the entrance and reducing transitions to instant."

**Anti-pattern:** describing CSS syntax (cubic-beziers, durations) in a brief, or omitting reduced-motion. Describe purpose/restraint/the-one-moment instead. (Concrete easing curves/durations live in `references/design-system-reference.md` for AUDIT/TEST reference — not for the prose brief; and note Apple publishes no numeric motion duration, so never cite a millisecond value as an HIG standard.)

## Layout

**Describe two things: structure (the spatial relationships) and composition intent (the personality of the arrangement).** No flexbox/grid/CSS syntax.

**Structure — name the regions and their relationships:**
- "A persistent left sidebar for navigation with a dense content area to the right."
- "A single reading column centered with a comfortable measure."
- "A multi-pane layout with rails on both sides."

**Composition intent — name the personality:**
- "Asymmetric and grid-breaking" vs "a strict, aligned grid."
- "Generous whitespace" vs "intentional density."

**Phrasing that works:**
> "A persistent left sidebar for navigation with a dense content area to the right; a strict, aligned grid; hierarchy from type and spacing rather than from boxes."

**Paste-ready example.** *Current:* "an app made of stacked cards instead of a real layout." *Fix prompt:*
> "Replace the stack of cards with a deliberate layout: a persistent compact left sidebar for navigation and a dense primary content area to the right, aligned to a strict grid. Use real layout regions and whitespace to create hierarchy — do not wrap each section in its own card. Reserve cards only for content that genuinely groups together."

**Anti-pattern:** writing grid/flexbox/CSS in the brief, or leaving structure unstated so the model defaults to a centered single column of cards. Describe regions, relationships, and composition intent.

## Dark Mode

**The failure mode to prevent: a flat inverted light theme.** Real dark mode is a *surface elevation system*, not `color: invert`.

**Brief it as elevation through lightness:**
> "Design dark mode as a real surface system — a near-black base with a few progressively lighter elevated surfaces for panels, cards, and modals, so depth reads through lightness. Do not simply invert the light theme."

**Make it countable for later audit.** Phrase the requirement so AUDIT can verify it (e.g., "at least three distinct elevation surfaces"). Score/format per `references/scoring-and-report.md`.

**Paste-ready example.** *Current:* a dark theme that "just inverts the light colors and looks flat." *Fix prompt:*
> "Rebuild dark mode as a real elevation system, not an inversion. Start from a near-black base surface; define at least three progressively lighter elevated surfaces for panels, cards, and modals so that depth reads through increasing lightness rather than through shadows. Keep text high-contrast against each surface. Do not invert the light palette or reuse light-theme surface values."

**Anti-pattern:** "add dark mode" with no surface-elevation guidance — yields a flat inverted theme. (The reference elevation-ladder approach, e.g. Linear's perceptually-spaced surfaces, is illustrative — link `references/design-system-reference.md`; reverse-engineered tokens drift, so treat as illustrative of the principle.)

## Responsive Behavior

**Describe behavior by device intent — NOT pixel breakpoints.** Naming breakpoints forces brittle, arbitrary values; describing what should *happen* on each device produces sensible, layout-aware adaptation.

**Brief the behavioral transformation per device:**
> "On phones, collapse the sidebar into a bottom navigation, stack cards into a single column, and move primary actions into the thumb zone; on desktop, use the full multi-column layout. Reduce section padding and step heading sizes down on small screens."

**The framing that outperforms breakpoints:** `"mobile-first, and adapt the layout sensibly at each size"` plus concrete device-behavior descriptions.

**Paste-ready example.** *Current:* "make it responsive" (no behavior specified). *Fix prompt:*
> "Make the layout mobile-first and adapt behavior sensibly per device, not just by shrinking. On phones: collapse the left sidebar into a bottom navigation bar, stack any multi-column content into a single column, move the primary action into the thumb zone, reduce section padding, and step heading sizes down. On tablet: a condensed two-column layout. On desktop: the full multi-column layout with the persistent sidebar. Do not hard-code pixel breakpoints in the brief logic — choose sensible breakpoints that serve these behaviors."

**Anti-pattern:** the bare phrase "make it responsive" with no behavioral guidance — the model shrinks the desktop layout onto a phone instead of rethinking it.

## Cross-Dimension Anti-Patterns

Three brief-killers that span all dimensions:

| Anti-pattern | Why it fails | Do instead |
|---|---|---|
| Supplying hex / px / CSS | Strips the model's decision room; feeds it the median defaults | Describe role, relationship, rhythm, intent |
| "Make it responsive" (no behavior) | Produces a shrunk desktop layout | Describe per-device behavioral transformation |
| "Add dark mode" (no elevation) | Produces a flat inverted theme | Describe a near-black base + progressively lighter elevated surfaces |

---

# Half 2 — Component Vocabulary: Generic vs Premium

For each component, the **generic** phrasing returns the median (rounded, soft shadow, default accent). The **premium** phrasing pairs the component noun with its *role, density, states, and the archetype it belongs to* — which is what produces a distinctive, considered result. Archetype names referenced below are defined in `references/archetype-library.md`.

## Navigation

| Component | Generic | Premium |
|---|---|---|
| Sidebar | "add a sidebar with links" | "a persistent, compact left sidebar with clear sections, subtle active-state highlighting, and collapsible groups; quiet until hovered" |
| Top nav | "a navbar" | "a slim top bar with the brand mark, primary nav, and a single clear CTA; it should recede, not dominate" |
| Breadcrumbs | "breadcrumbs" | "breadcrumbs that encode real hierarchy, with the current page de-emphasized" |
| Command palette (⌘K) | "a search box" | "a keyboard-first command palette (⌘K) with fuzzy search, recent items, and grouped actions — the primary way power users navigate" (strong signal toward the developer archetype) |
| Bottom mobile nav | "a mobile menu" | "a bottom navigation bar with 3–5 primary destinations in the thumb zone, with a clear active state" |

## Data Display

| Component | Generic | Premium |
|---|---|---|
| Tables | "a table of data" | "a dense data grid with aligned tabular numerals, sticky header, sortable columns, quiet row separation, and a clear hover/selected state" |
| Cards | "cards for each item" | "use cards only where grouping genuinely helps; give them presence through a thin border and restrained elevation, not a heavy shadow — and avoid wrapping every list row in a card" |
| Stats / KPIs | "show some stats" | "KPI tiles with a large tabular number, a small label, and a subtle trend indicator (green up / red down), aligned on a grid" |
| Charts | "add a chart" | "charts with a semantic, consistent color palette across the dashboard, minimal chrome, and legible small-size labels" |
| Timelines | "a timeline" | "a timeline where order genuinely carries meaning, with clear date anchors" |

## Forms

| Component | Generic | Premium |
|---|---|---|
| Layout | "a form" | "a single-column form with labels above inputs, logical grouping, and generous spacing; one clear primary action" |
| Inputs | "input fields" | "inputs with visible focus states, helpful placeholders that show an example, and proper autocomplete; never block paste" |
| Validation UX | "show errors" | "inline validation next to each field, errors that explain the fix not just the problem, and focus moved to the first error on submit" |
| Multi-step wizards | "a multi-step form" | "a multi-step flow with a clear progress indicator, the ability to go back without losing data, and one action per step" |

**Form non-negotiables to carry into every brief:** labels above inputs, generous spacing, never block paste, keep submit enabled until submit, errors inline next to fields. (Aligns with Vercel's interface guidelines — illustrative; see `references/design-system-reference.md`.)

## Feedback

| Component | Generic | Premium |
|---|---|---|
| Toasts | "a notification" | "transient toasts that announce results politely (accessible live region), auto-dismiss, and never block the UI" |
| Alert banners | "an alert" | "a banner reserved for genuinely important, persistent messages, color-coded by severity" |
| Progress | "a loading spinner" | "a spinner only after the request starts; skeleton states for content loads" |
| Empty states | (omitted — blank screen) | "considered empty states with a short explanation and a clear next action, not a blank screen" |
| Error states | "an error message" | "human error messages with a recovery path" |
| Success | "a success message" | "a quiet success confirmation; for warm/consumer apps, one delightful celebratory moment on completion" |

## Overlays

| Component | Generic | Premium |
|---|---|---|
| Modals | "a popup" | "a focused modal for a single decision, with a clear title, primary/secondary actions, contained scroll, and a calm backdrop; confirm destructive actions or offer undo" |
| Drawers | "a side panel" | "a side drawer for contextual detail or editing without leaving the page" |
| Popovers | "a tooltip" | "lightweight popovers for quick actions, anchored to their trigger" |
| Bottom sheets | "a mobile popup" | "on mobile, bottom sheets for actions and pickers, reachable by thumb" |

## Content

| Component | Generic | Premium |
|---|---|---|
| Text containers | "a text block" | "a comfortable reading measure with strong typographic hierarchy" |
| Markdown renderers | "render markdown" | "a clean prose style with clear heading scale, styled code, and breathing room" |
| Code blocks | "a code block" | "monospace code blocks with a copy affordance, language label, and subtle syntax contrast" |
| Media galleries | "an image grid" | "edge-to-edge or generously gridded media with tasteful cropping and tactile hover" |
| Comment threads | "comments" | "nested threads with clear identity markers, collapse controls, and scannable density" |

## Universal Component Rule

**Never brief a bare component noun.** "Make a nice button / table / card" returns the median component — rounded, soft shadow, default accent. **Always pair the noun with four things:**

> **component + role + density + states + the archetype it belongs to.**

Example transformation of a bare request:
- *Generic:* "add a button."
- *Premium:* "a primary action button — high-contrast in the rationed accent color, comfortable touch target, with explicit hover, focus, active, disabled, and loading states; secondary actions get a quiet ghost variant. It belongs to the developer-tool archetype, so keep the radius restrained and depth from a thin border, not a heavy shadow."

For the negative constraints that keep every component off the slop defaults (uniform radius, glassmorphism, identical low-opacity shadows), link `references/anti-slop-rules.md`. Score and format any component-level finding per `references/scoring-and-report.md`.
