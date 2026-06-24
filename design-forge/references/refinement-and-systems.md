# Refinement & Systems (BRIEF mode)

Reference anchoring, design-system bootstrapping, and iterative refinement — the three levers that turn a one-shot brief into a consistent, premium, production-ready build. All guidance here is **natural language** — never CSS, hex, or px (the model picks values; supplying defaults hands it the slop). For the slop bans this references, see `references/anti-slop-rules.md`. For brief ordering, length, and multi-LLM file conventions, see `references/prompt-structure.md`. For the brief→audit handoff, see `references/prompt-structure.md`.

## Table of Contents
- [Part A — Reference Product Anchoring](#part-a--reference-product-anchoring)
  - [Inspired-by vs looks-like](#inspired-by-vs-looks-like)
  - [Which products steer best](#which-products-steer-best)
  - [Combining 2-3 references (one dimension each)](#combining-23-references-one-dimension-each)
  - [References as a quality floor, then free one axis](#references-as-a-quality-floor-then-free-one-axis)
  - [IP guardrail language to bake into every brief](#ip-guardrail-language-to-bake-into-every-brief)
  - [Reference anti-patterns](#reference-anti-patterns)
- [Part B — Design-System Bootstrapping](#part-b--design-system-bootstrapping)
  - [Token foundation (semantic naming)](#token-foundation-semantic-naming)
  - [Reusable components with variants & states](#reusable-components-with-variants--states)
  - [Theme architecture (light + dark from one token set)](#theme-architecture-light--dark-from-one-token-set)
  - [Responsive foundation](#responsive-foundation)
  - [Accessibility baseline](#accessibility-baseline)
  - [Phrase as requirements, not technical demands](#phrase-as-requirements-not-technical-demands)
  - [Bootstrapping anti-patterns](#bootstrapping-anti-patterns)
- [Part C — Iterative Refinement](#part-c--iterative-refinement)
  - [First-pass evaluation (structure before surface)](#first-pass-evaluation-structure-before-surface)
  - [Single-dimension refinement prompts (paste-ready)](#single-dimension-refinement-prompts-paste-ready)
  - [The escalation pattern (broad → family → micro)](#the-escalation-pattern-broad--family--micro)
  - [Using visual feedback](#using-visual-feedback)
  - [How to know it is done](#how-to-know-it-is-done)
  - [Refinement anti-patterns](#refinement-anti-patterns)

---

## Part A — Reference Product Anchoring

Reference products are the **single highest-leverage steering tool**: the model has seen Linear, Stripe, and Vercel thousands of times, so they are dense, reliable points in its training distribution. Borrow **principles**, never clone trademarks/hex/logos.

### Inspired-by vs looks-like

| Phrasing | What it does | Verdict |
|---|---|---|
| "inspired by Linear" / "in the spirit of Stripe" / "with the keyboard-first feel of Linear" | Steers toward the **principles** — density, restraint, rationed accent, light headline weights | USE |
| "looks like Linear" / "clone Stripe" / "make it match Vercel exactly" | Invites copying trademarked logos, exact brand hex, and proprietary patterns | BAN |

Rule: always phrase as principle-borrowing. Write *"with the information density and keyboard-first feel of Linear,"* not *"make it look like Linear."*

### Which products steer best

These have heavy, consistent training-data presence and reliably evoke a coherent aesthetic. Obscure or rapidly-changing products produce weaker, less predictable steering.

| Product | The principle it reliably evokes |
|---|---|
| **Linear** | Information density + visual calm coexisting; keyboard-first; rationed accent; depth from thin borders |
| **Vercel / Geist** | Stark monochrome precision; motion subtlety; clean grotesque + mono |
| **Stripe** | Typographic restraint; light-weight headlines with tight tracking; one saturated accent per band |
| **Notion** | Editorial, content-first calm; chrome recedes |
| **Figma** | Creative, confident, opinionated canvas-as-brand |
| **GitHub** | Dense, navigable, identity-rich; monospace for code |
| **Discord** | Multi-pane community layout; persistent nav rails; dark-mode native |
| **Raycast** | Command-palette-first developer-tool precision |
| **Mercury** | Premium fintech restraint; light display weights; near-monochrome |
| **Apple** | Considered spacing; refined micro-detail; restraint |

> **Reverse-engineered design-system tokens drift** (Linear's acid-lime accent, Stripe's weight-300 headlines, Vercel's mono-headings, Mercury's light-display details are accurate to recent snapshots; brands redesign). Treat any specific hex/weight as **illustrative of the principle**, not fixed truth — and brief the principle, not the exact value, regardless.

### Combining 2-3 references (one dimension each)

Powerful when **each reference contributes exactly one dimension** — this composes a distinctive direction that is a copy of none. Keep it to **2-3 references max** and assign each a specific role, or the model averages them into mush.

Paste-ready pattern:
> "Compose the visual direction from three references, each contributing one dimension: the **information density** of Linear, the **typographic restraint** of Stripe (light-weight headlines, tight tracking), and the **motion subtlety** of Vercel (one quiet, fast transition rather than scattered effects). Do not reproduce any one of them wholesale — borrow only the named dimension from each, and do not copy their logos, brand names, or exact brand colors."

### References as a quality floor, then free one axis

Use references to establish a **floor** of quality and a shared vocabulary, then explicitly free one axis so the output is not derivative.

Paste-ready pattern (floor + freed axis):
> "Use Linear and Stripe as a quality floor for density, restraint, and consistency — match that level of polish. But free **one axis**: use a noticeably **warmer palette** than either of them, drawn from [the product's domain — e.g. warm terracotta and cream for a cooking app]. Everything else stays at the disciplined Linear/Stripe level; only the color temperature departs."

For genuinely novel briefs with no good reference fit, describe the aesthetic that does not exist yet through a **visual thesis**: one sentence naming mood, material, and energy (e.g. "warm matte paper, unhurried, with a single ember-orange spark of action") rather than forcing a reference.

### IP guardrail language to bake into every brief

Append this verbatim whenever any reference product is named:
> "Take inspiration from these products' design **principles only** — do not reproduce their logos, brand names, exact brand colors, or proprietary iconography. Generate an original identity."

Rationale to keep in mind: public reference libraries are curated starting points inspired by publicly observable patterns; downstream use carries trademark/brand responsibility. When in doubt, use a reference as inspiration for an original system rather than a 1:1 clone.

### Reference anti-patterns

- **No 5+ references** — stacking many references averages back to generic. Cap at 2-3, each with a named role.
- **No contradictory reference** — never anchor with a product whose aesthetic fights the brief (e.g. Bloomberg's instrument-panel density for a calm wellness app reads as cold; Discord's identity-rich chrome for a minimal editorial reader).
- **No requesting exact brand colors or logos** — that is the IP line; brief the principle and demand an original identity.

---

## Part B — Design-System Bootstrapping

The biggest cause of multi-component inconsistency is the model **inventing fresh values per component** — by component five, nothing matches and no amount of "make it professional" afterward can fix it. The cure: request a token-based system in the **FIRST prompt**, framed as a natural requirement, not a technical spec.

### Token foundation (semantic naming)

Request the foundation before any screens, and demand **semantic** token names (roles), not raw-value names.

Paste-ready pattern:
> "Before building any screens, define a small, deliberate set of design tokens — colors, spacing steps, a type scale, corner radius, and elevation — and use those tokens everywhere instead of hardcoding values. Every color, size, and space must come from the system. **Name colors by role** — `surface`, `elevated-surface`, `primary-action`, `muted-text`, `border` — **not by raw value** (no `primary-500`, no `gray-900`, no direct `text-white` / `bg-white`). Pick the actual values yourself; I am specifying the structure, not the numbers."

### Reusable components with variants & states

Specify the variants and states you care about so the model produces a real component, not a one-off snowflake per screen.

Paste-ready pattern:
> "Build reusable components — button, input, card, badge, table row — with defined variants and states, and compose every screen from them; never one-off styling. For buttons, include `primary` / `secondary` / `ghost` variants and `default` / `hover` / `focus` / `disabled` / `loading` states. For inputs, include `default` / `hover` / `focus` / `error` / `disabled`. Derive every interactive state from the tokens, not from new hardcoded values."

### Theme architecture (light + dark from one token set)

Request theming in the first prompt to avoid a painful retrofit. Dark mode must be **real surface elevation**, not an inverted light theme.

Paste-ready pattern:
> "Set up theming from the first prompt: a light theme and a dark theme driven by **the same semantic tokens**, with room for brand theming later. **Dark mode must use real surface elevation** — a near-black base with a few progressively lighter elevated surfaces for panels, cards, and modals, so depth reads through lightness. Do **not** simply invert the light theme to a flat dark one. Derive hover, active, and focus states from the tokens in both themes."

### Responsive foundation

Paste-ready pattern:
> "Make the layout responsive from the start, mobile-first, **adapting behavior** sensibly per device rather than just shrinking — collapse navigation, restack columns, and move primary actions into reach on small screens; do not squeeze the desktop layout onto a phone."

### Accessibility baseline

Request accessibility as a baseline, not a later pass. (For thresholds and the WCAG ratios these map to, see `references/scoring-and-report.md` and `references/design-system-reference.md`.)

Paste-ready pattern:
> "Treat accessibility as a baseline, not a later pass: meet WCAG AA contrast on all text and UI, give every interactive element a **visible focus state** and a hover state, add an `aria-label` to every icon-only button, use **semantic HTML before ARIA**, and ensure full keyboard navigation with a logical tab order."

### Phrase as requirements, not technical demands

The natural framing produces the same token-based result without sounding like a spec — and a non-designer can own it.

| Say this (requirement framing) | Not this (spec framing) |
|---|---|
| "everything should feel consistent because it's built from one small system of reusable pieces" | "implement a three-tier token architecture with primitive and semantic layers" |
| "name colors by what they do — surface, primary action, muted text" | "expose a `--color-primary-500` ramp from 50 to 950" |
| "set up light and dark from the same small set of colors" | "implement a CSS-variable theming layer with `prefers-color-scheme` media queries" |

### Bootstrapping anti-patterns

- **Do not defer the system** — never accept "we'll clean up styles later." Inconsistency compounds per component and cannot be retrofitted by a "make it professional" pass.
- **Semantic, not raw-value token names** — reject `primary-500` / `gray-900` chaos; require role names (`surface`, `primary-action`, `muted-text`).
- **Do not skip theme/dark-mode setup** if dark mode is wanted at all later — retrofitting a flat inverted dark theme into a system that did not plan for elevation is the painful path.

---

## Part C — Iterative Refinement

The first generation establishes **structure**; elevation comes from targeted, **single-dimension** refinement passes. Fix structure before surface, surface before polish. Escalate broad → component family → micro-detail.

### First-pass evaluation (structure before surface)

Evaluate in this order; do not touch color/type/spacing/motion until structure passes:
1. Is the overall **structure and hierarchy** right?
2. Does it **commit to a clear aesthetic direction**, or has it drifted to the median (Inter / indigo / three rounded cards — see `references/anti-slop-rules.md`)?
3. Are **tokens actually used consistently**, or are there stray hardcoded values?

Only after structure is right do you refine surface dimensions.

### Single-dimension refinement prompts (paste-ready)

Run **one dimension per pass**. Each prompt below is standalone — name the symptom, the desired outcome, the constraint, and the negative.

**Typography refinement**
> "The type feels generic and flat. Commit to a more **distinctive display face** paired with a refined body face, **increase the contrast in the type scale** with bigger jumps between heading and body, and **tighten letter-spacing on the large headings**. Keep everything driven by the type tokens. Do not use Inter, Roboto, or system defaults — and do not fall back to Space Grotesk."

**Color refinement**
> "The palette is timid and evenly spread. Commit to **one dominant color with a single sharp accent**, **ration the accent to primary actions and active states only**, and make sure all text meets strong contrast. Keep colors as semantic tokens. No purple/indigo-to-blue gradients, no default Tailwind indigo."

**Spacing refinement**
> "Spacing feels inconsistent and cramped. Apply a **consistent 8px rhythm**, **add more breathing room between major sections**, and **tighten spacing inside components** so the density feels deliberate rather than accidental. Drive all spacing from the spacing tokens."

**Animation refinement**
> "Replace the scattered fade-ins with **one orchestrated entrance on page load using staggered reveals**, and add subtle, purposeful **hover and focus feedback** on interactive elements. Motion must clarify hierarchy or demonstrate speed, never decorate. **Respect `prefers-reduced-motion`.**"

**Polish refinement**
> "Do a final polish pass: **align everything to the grid**, perfect the spacing, **refine all interaction states** (hover, focus, active, disabled, loading), and make sure **empty and error states** are considered, not blank. Do not change the established aesthetic direction, type, or color — polish only."

### The escalation pattern (broad → family → micro)

Working one altitude per pass prevents the model from regenerating everything and losing prior wins.

1. **Broad** — lock the aesthetic direction and overall structure.
2. **Component family** — refine one family at a time (navigation, then tables, then forms).
3. **Micro-detail** — interaction states, optical alignment, motion timing.

### Using visual feedback

When the tool supports it, screenshot the result and feed it back with **specific spatial** instructions — this outperforms abstract instructions.

Paste-ready pattern:
> "Here's the current state [screenshot attached]. The **KPI row is too heavy and competes with the table** below it. Make the stat tiles **quieter** — smaller numbers, lighter weight, less contrast — and let the **table be the visual focus** of the screen. Keep everything else as is."

### How to know it is done

Done / production-ready when **all** hold:
- The aesthetic direction is **unmistakable and consistent** across every screen.
- **Tokens are used everywhere** — no stray hardcoded values.
- **All interaction states exist** (hover, focus, active, disabled, loading).
- **Dark mode reads as real elevation**, not a flat inversion.
- It passes **AA contrast** and full **keyboard navigation**.
- It **no longer resembles the slop fingerprint** (see `references/anti-slop-rules.md`).

Litmus test: if you can't tell which AI made it, and it could be mistaken for a real product team's work, it's ready. Then lock the decisions into the persistent design file rather than iterating forever.

### Refinement anti-patterns

- **Never "make it better"** — vague instructions pull the output back to the median. Always name the dimension, the symptom, and the target.
- **Never refine 5 dimensions at once** — bundling dimensions makes the model regenerate the whole thing and lose prior gains. One dimension per pass.
- **Don't iterate forever** — diminishing returns set in; once a decision is right, persist it in the design file and stop refining that axis.
