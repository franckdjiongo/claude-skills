# Archetype Library

Eight complete design archetypes for BRIEF mode. Each gives a philosophy, reference products, and concrete type/color/spacing/motion/layout direction, followed by the exact prompt phrases to drop verbatim into a brief.

Reference values (Stripe weight-300 headlines, Linear acid-lime, Geist Sans/Mono, etc.) are illustrative of the principle — brands redesign. Brief the principle, not the exact hex/weight. Full numeric token values live in `references/design-system-reference.md`.

## Table of Contents
1. [Minimal / Editorial](#1-minimal--editorial)
2. [Developer / Technical](#2-developer--technical)
3. [Premium SaaS](#3-premium-saas)
4. [Warm / Approachable](#4-warm--approachable)
5. [Data-Dense / Professional](#5-data-dense--professional)
6. [Creative / Expressive](#6-creative--expressive)
7. [Consumer / E-commerce](#7-consumer--e-commerce)
8. [Community / Platform](#8-community--platform)
9. [Archetype Anti-Patterns](#archetype-anti-patterns)

---

## How to Use This Library

- Map the user's plain-language intent to an archetype using `references/intake-methodology.md`; this file owns only the archetypes themselves.
- For which archetype a given app category defaults to (dashboard, landing page, docs, e-commerce, etc.) and full worked brief transformations, see `references/application-templates.md`.
- Drop the bulleted prompt phrases straight into the Design Direction section of a brief; for the negative/anti-slop vocabulary that rides alongside them, see `references/anti-slop-rules.md` (do not re-list bans here).
- Compose at most one primary archetype per screen. Borrow a single dimension from a second archetype only with an explicit reason; see [Archetype Anti-Patterns](#archetype-anti-patterns).

---

## 1. Minimal / Editorial

**Reference products:** Notion, iA Writer, Medium.

**Philosophy:** Content is the interface; chrome recedes; whitespace is structure.

| Dimension | Direction |
|---|---|
| Type | Characterful serif or humanist sans for reading; comfortable measure (~65–75 chars); large line-height |
| Color | Near-monochrome, one quiet accent, paper-like backgrounds |
| Spacing | Generous; vertical rhythm dominant |
| Motion | Almost none — subtle fades only |
| Layout | Single column; strong typographic hierarchy; hairline dividers over boxes |

**Prompt phrases:**
- *"editorial, reading-first layout with generous whitespace"*
- *"let typography carry the hierarchy, not boxes or borders"*
- *"a calm near-monochrome palette with one restrained accent"*
- *"comfortable reading measure and line-height"*

---

## 2. Developer / Technical

**Reference products:** Linear, Vercel, Raycast.

**Philosophy:** An instrument for experts; precision, density, and speed signaled visually.

| Dimension | Direction |
|---|---|
| Type | Clean grotesque (Linear: Inter Variable at custom `510` weight; Vercel: Geist Sans + Geist Mono) plus a monospace for IDs, code, and shortcuts; tight negative tracking on display sizes |
| Color | Near-black canvas; narrow 4-step cool-gray surface ladder; a single rationed accent (Linear acid-lime `#e4f222` for one primary action per screen; Vercel stark `#171717`/white with one blue focus) |
| Spacing | Tight 4–8px grid; 80–120px between major sections |
| Motion | Fast, functional, demonstrating speed — Linear uses motion to *prove* the product is fast |
| Layout | Sidebar + dense content; cards earn elevation through `1px` inset borders and soft shadows, never fills |

**Prompt phrases:**
- *"developer-tool aesthetic with a near-black instrument-panel canvas"*
- *"a single rationed accent color used only for the one primary action per screen"*
- *"tabular/monospace numerals and IDs to signal a tool, not a marketing site"*
- *"depth from 1px borders and subtle shadows, never heavy fills"*
- *"tight, precise spacing on a small grid"*

---

## 3. Premium SaaS

**Reference products:** Stripe, Mercury, Ramp.

**Philosophy:** Authority through restraint; "financial infrastructure" calm.

| Dimension | Direction |
|---|---|
| Type | Refined grotesque at *light* weights — Stripe sets headlines at weight `300` with aggressive negative tracking (its single most recognizable choice); Mercury uses a light display weight around `360` for headlines |
| Color | Near-monochrome cool-white/deep-navy canvas; exactly one saturated accent (Stripe `#533afd` electric indigo for one CTA per band; Mercury `#5266eb` reserved exclusively for primary CTAs); decorative gradient meshes only as soft halos behind product art, never behind text |
| Spacing | 8px base grid; low corner radius (Stripe stays at `4–6px`) |
| Motion | Subtle, functional shadows that intensify on hover |
| Layout | Airy; product mockups as hero art; tabular figures wherever money appears |

**Prompt phrases:**
- *"premium fintech-grade restraint — near-monochrome canvas, light-weight headlines with tight tracking"*
- *"exactly one saturated accent color, used for a single primary action per section"*
- *"tabular figures for all numbers so columns align like an instrument"*
- *"low corner radius and flat surfaces; reserve any gradient as a soft halo behind imagery, never behind text"*

---

## 4. Warm / Approachable

**Reference products:** Slack, Notion, Headspace.

**Philosophy:** Human, reassuring, low-anxiety.

| Dimension | Direction |
|---|---|
| Type | Friendly humanist or rounded sans; comfortable sizes |
| Color | Warm earth tones or soft saturated hues; gentle gradients; higher color presence than the Premium SaaS archetype |
| Spacing | Relaxed; rounded corners; generous padding |
| Motion | Playful, rewarding micro-interactions (a celebratory moment on completion) |
| Layout | Rounded cards acceptable here; soft illustration; conversational copy |

**Prompt phrases:**
- *"warm and approachable, calm and reassuring tone"*
- *"soft, friendly palette of muted warm tones with gentle gradients"*
- *"rounded forms, generous padding, and a few delightful micro-interactions"*
- *"conversational, human copy"*

---

## 5. Data-Dense / Professional

**Reference products:** Bloomberg, Datadog, Grafana.

**Philosophy:** Maximize information per pixel; color encodes meaning, not decoration.

| Dimension | Direction |
|---|---|
| Type | Compact sans + heavy monospace use for metrics; small sizes legible at density |
| Color | Dark canvas; semantic color (red = error/bad, green = good) — Datadog explicitly maps semantic tags to consistent colors so red traces "bad" across every chart |
| Spacing | Tight, grid-packed, minimal padding |
| Motion | Minimal — real-time data updates, not decorative animation |
| Layout | Multi-panel dashboards; dense tables; charts as first-class citizens; configurable widgets |

**Prompt phrases:**
- *"high-density professional dashboard — maximize legible information per screen"*
- *"use color semantically (red for problems, green for healthy), with a consistent palette across all charts"*
- *"compact rows, tabular numerals, and tight spacing"*
- *"dark canvas with accessible high-contrast data colors"*

---

## 6. Creative / Expressive

**Reference products:** Figma, Framer, Pitch.

**Philosophy:** The canvas is the brand; confident, opinionated, a little playful.

| Dimension | Direction |
|---|---|
| Type | Distinctive display pairing; expressive scale jumps |
| Color | Bold, saturated, multi-hue but cohesive |
| Spacing | Dynamic, asymmetric, grid-breaking |
| Motion | Rich, choreographed, scroll-triggered moments |
| Layout | Overlap, diagonal flow, generous or intentionally dense — breaks the standard grid on purpose |

**Prompt phrases:**
- *"expressive and confident — take one real aesthetic risk and commit to it"*
- *"a distinctive display typeface paired with a clean body face, with dramatic size jumps"*
- *"asymmetry, overlap, and grid-breaking composition"*
- *"one well-orchestrated motion moment on load rather than scattered effects"*

---

## 7. Consumer / E-commerce

**Reference products:** Shopify, Apple Store.

**Philosophy:** The product is the hero; trust + desire; conversion-focused clarity.

| Dimension | Direction |
|---|---|
| Type | Clean, large product-name typography; legible pricing |
| Color | Mostly neutral to let product imagery carry color; one strong CTA color |
| Spacing | Airy around products; full-bleed imagery |
| Motion | Smooth, tactile, product-focused |
| Layout | Large imagery; clear price + CTA; social proof; generous galleries |

**Prompt phrases:**
- *"let high-quality product imagery be the hero on a calm neutral canvas"*
- *"one confident CTA color and crystal-clear pricing"*
- *"full-bleed media, generous galleries, and tactile hover states"*
- *"trust cues — reviews, guarantees — designed in, not buried"*

---

## 8. Community / Platform

**Reference products:** Discord, Reddit, GitHub.

**Philosophy:** Dense, navigable, identity-rich; many users' content coexisting.

| Dimension | Direction |
|---|---|
| Type | Compact, highly legible UI sans; monospace for code (GitHub) |
| Color | Strong brand accent; dark-mode friendly; role/status colors |
| Spacing | List-dense; persistent navigation rails |
| Motion | Light, responsive feedback |
| Layout | Multi-pane (server/channel rails, feeds, threads); avatars and identity markers; nested content (comments, threads) |

**Prompt phrases:**
- *"a multi-pane community layout with persistent navigation rails"*
- *"dense, scannable feeds and threaded content with clear identity markers"*
- *"a strong brand accent with status/role colors, dark-mode native"*
- *"compact list density with responsive hover and selection feedback"*

---

## Archetype Anti-Patterns

- **Do not blend incompatible archetypes.** Combining "editorial minimal" with "data-dense dashboard" in one screen produces the NN/g-named "Frankenstein layout." Pick one primary archetype per screen; borrow a single dimension from another only with an explicit reason.
- **Do not apply the developer-tool dark instrument aesthetic to a consumer wellness app.** The context mismatch reads as cold. Match the archetype to the audience and the app's emotional job — a wellness or warmth-driven product wants the Warm/Approachable direction, not a near-black instrument panel.
- **Premium means restraint, not heavy color.** Do not request "premium" and then ask for heavy, saturated color everywhere. Premium is *defined* by restraint: near-monochrome canvas, one rationed accent, light-weight headlines, considered spacing. Saturated color sprayed across the UI is the opposite of premium.
