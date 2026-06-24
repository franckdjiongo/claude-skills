# Anti-Slop Rules — Detection Catalog & Prompt Vocabulary

The single source of truth for (1) detecting "AI slop" — the generic LLM-default aesthetic — and (2) the exact negative+positive prompt vocabulary that steers a development LLM away from it. Used by AUDIT/TEST to flag tells and by BRIEF to write constraints.

**Root cause (durable).** During sampling, models predict tokens from statistical patterns in training data; safe, universal, offend-no-one choices dominate that data. Absent explicit direction, the model samples from this high-probability center. Slop is a *defaults problem, not a capability gap*. The fix: force a committed aesthetic direction + anti-defaults + a reference anchor *before* generation, which weakens the median pull and produces variance.

**THE DURABLE CAVEAT.** The specific tells below reflect the 2024–2026 LLM-default aesthetic (2022 was purple + glassmorphism + neon; 2026 is Inter + serif-italic hero + cream surfaces + side-tab cards). Treat the **CATEGORY — convergence to the training-data median** — as permanent and the **specific tokens** (font names, hex ranges) as a moving target to re-audit periodically. When in doubt, flag the *pattern*, not the literal font.

---

## Table of Contents
- [How to use this file](#how-to-use-this-file)
- [Quick Slop-Rejection Checklist](#quick-slop-rejection-checklist) — fast 10-flag scan
- [Slop Catalog](#slop-catalog)
  - [Fonts](#1-fonts)
  - [Color](#2-color)
  - [Layout](#3-layout)
  - [Components](#4-components)
  - [Animation](#5-animation)
- [Anti-Slop Prompt Vocabulary](#anti-slop-prompt-vocabulary)
  - [The pairing rule](#the-pairing-rule-non-negotiable)
  - [Negative constraints by category](#negative-constraints-by-category)
  - [Positive steering by category](#positive-steering-by-category)
  - [Worked example: bans inside a direction](#worked-example-wrap-bans-inside-an-affirmative-direction)
  - [Paste-ready negative-constraint block](#paste-ready-negative-constraint-block)
- [Reference: official anti-slop directives](#reference-official-anti-slop-directives)

---

## How to use this file
- **AUDIT/TEST:** run the [Quick Slop-Rejection Checklist](#quick-slop-rejection-checklist) on every artifact during the squint/first pass; for each flag, look up the matching catalog entry for the fingerprint and the fix prompt. Severity weights and report formatting live in `references/scoring-and-report.md` — do not assign weights here.
- **BRIEF:** pull from [Negative constraints](#negative-constraints-by-category) + [Positive steering](#positive-steering-by-category) and combine them per [the pairing rule](#the-pairing-rule-non-negotiable).
- Exact design-system token *values* (radius scales, shadow tokens, type scales) are NOT reproduced here — this file only *names* the slop (e.g. "uniform border-radius"). For correct target values, see `references/design-system-reference.md`.

---

## Quick Slop-Rejection Checklist
Run on every screen. Each is a yes/no flag; any YES → emit a correction prompt (anatomy in `references/scoring-and-report.md`) using the catalog entry + the [negative-constraint block](#paste-ready-negative-constraint-block).

1. Font is Inter / Roboto / Open Sans / Arial / Geist / Space Grotesk as the *only* face? → FLAG
2. Purple / indigo / violet gradient, or gradient text on headings/metrics? → FLAG
3. Glassmorphism, colored glow shadows (dark mode), or side-tab accent borders? → FLAG
4. Uniform border-radius on every element? → FLAG
5. 3-column icon-card grid, or hero-metric block (big number + 3 stats)? → FLAG
6. Oversized italic serif hero / uppercase eyebrow label / `01·02·03` numbered markers? → FLAG
7. Type hierarchy steps under a 1.25 ratio (heading barely larger than body)? → FLAG
8. Uniform 300ms fade-in-up on everything, or bounce/elastic easing on UI chrome? → FLAG
9. Pure-black (`#000`) dark mode with pure-white (`#fff`) text? → FLAG
10. Cream/beige "tasteful" default surface? → FLAG

---

## Slop Catalog
Per pattern: **Fingerprint** (what it looks like) → **Why it is slop** → **Premium alternative** → **Prompt vocabulary** (paste-ready). Catalog draws on the impeccable.style 46-pattern AI-slop rule set and Anthropic's published frontend-aesthetics guidance.

### 1. Fonts

#### Inter / Roboto / Open Sans / Arial / Geist / Space Grotesk / Instrument Serif as the sole typeface
- **Fingerprint:** one neutral grotesque (or `system-ui`) carries the entire UI; no display/body pairing.
- **Why slop:** the LLM-default — "the Helvetica of the LLM era"; signals zero typographic intent.
- **Premium:** a distinctive display face + a separate refined body face; weight extremes (100/200 vs 800/900); 3×+ size jumps; variable fonts.
- **Prompt:** *"Do NOT use Inter, Roboto, Open Sans, or Arial — and do NOT fall back to Space Grotesk. Choose a distinctive display typeface and a separate refined body typeface, and state both font choices before writing any code. Use weight extremes (e.g. 800 headings against 400 body) and a 1.33+ type scale."*

#### Single font for everything / flat hierarchy
- **Fingerprint:** one weight and near-one size; heading barely distinguishable from body (e.g. 16px body next to 18px heading).
- **Why slop:** no hierarchy = no editorial intent; reads as a wireframe.
- **Premium:** display+body pairing with a clear modular step.
- **Prompt:** *"Pair a display font with a separate body font and create a clear hierarchy with at least a 1.25 size ratio between steps; use weight contrast (e.g. 300 vs 800), not 400 vs 600."*

#### Oversized italic serif hero headline
- **Fingerprint:** giant italic serif headline centered in the first viewport — the universal 2026 AI-startup hero.
- **Why slop:** a single recognizable template applied without context.
- **Premium:** set the headline roman in a distinctive display face; let the type choice fit the product, not the trend.
- **Prompt:** *"Avoid the oversized italic-serif hero cliché. Set the hero headline roman (not italic) in a distinctive display face chosen for this product's context; do not center everything by default."*

### 2. Color

#### Purple→blue / indigo→violet gradients; "VibeCode purple" lavender accents
- **Fingerprint:** indigo/violet gradient hero or buttons; lavender accents. Tailwind ranges that signal the default: `indigo-*`, `violet-*`, `purple-*` (e.g. `#6366f1` indigo-500, `#8b5cf6` violet-500).
- **Why slop:** the single most recognizable AI tell. (Adam Wathan, Tailwind creator, publicly "apologized for making every button `bg-indigo-500`… leading to every AI-generated UI on earth also being indigo.")
- **Premium:** an intentional palette with a point of view — warm earth tones; high-contrast mono + one bright; disciplined grey-and-indigo (Stripe-style) where the accent is *rationed*, not sprayed. Draw the palette from the product's context.
- **Prompt:** *"Do NOT use purple-to-blue or indigo-to-violet gradients or lavender accents, and do NOT use the default Tailwind indigo. Commit to one dominant color with a single sharp accent, drawn from this product's context; reserve the accent for the single most important action per screen. No gradient text."*

#### Gradient text on headings/metrics
- **Fingerprint:** headline or KPI number filled with a color gradient.
- **Why slop:** kills scannability and legibility; decorative, not communicative.
- **Premium:** solid text color; let weight and size carry emphasis.
- **Prompt:** *"Use solid colors for all text — no gradient fills on any headline, metric, or label. Carry emphasis through weight and size instead."*

#### Cream / beige "tasteful" default surface
- **Fingerprint:** warm cream/beige page background presented as the "premium" neutral.
- **Why slop:** a 2026 default substituted for a real palette decision.
- **Premium:** choose the background from a deliberate palette with a stated rationale.
- **Prompt:** *"Avoid the default warm cream/beige surface. Choose a page background from a deliberate palette defined as a semantic `surface` token, justified by the product's tone."*

#### Dark mode with glowing colored box-shadows (cyberpunk default)
- **Fingerprint:** neon/colored glow `box-shadow` around cards and buttons on a dark canvas.
- **Why slop:** the default "dark = cyberpunk" move; reads as a theme, not a product.
- **Premium:** convey elevation through *lighter surfaces*, not glow (dark-mode surface system owned by `references/design-system-reference.md`).
- **Prompt:** *"No colored glow shadows on the dark theme. Convey elevation with progressively lighter surfaces and subtle neutral borders; reserve shadow for genuine overlays only."*

### 3. Layout

#### 3-column feature-card grid (icon + heading + text), repeated
- **Fingerprint:** identical row of three (or four) rounded cards, each an icon above a heading above a line of text.
- **Why slop:** the most common LLM landing-page filler; "generic SaaS card grid as the first impression" (OpenAI's named failure).
- **Premium:** vary card sizes; editorial asymmetry; real product screenshots/artifacts instead of icon tiles.
- **Prompt:** *"Do NOT use the identical 3-column icon-card grid. Build an asymmetric, editorial layout with varied emphasis and real product imagery/screenshots; no row of equal rounded feature cards."*

#### Hero-metric block (big number + 3 supporting stats + gradient)
- **Fingerprint:** one huge metric flanked by three smaller stats, often over a gradient.
- **Why slop:** a canned template, rarely tied to a real narrative.
- **Premium:** show metrics only where they carry meaning; tie each to context.
- **Prompt:** *"Avoid the generic hero-metric block (one giant number plus three supporting stats over a gradient). Present metrics only where they earn their place, with real context, not as decorative hero filler."*

#### Hero eyebrow/pill chip + oversized headline; uppercase section kickers; `01/02/03` markers
- **Fingerprint:** a small uppercase pill/eyebrow above a big headline; repeated uppercase section labels; numbered `01·02·03` section markers.
- **Why slop:** decorative scaffolding standing in for real structural hierarchy.
- **Premium:** stronger structural hierarchy from type scale and spacing; drop the ornamental labels.
- **Prompt:** *"Drop the uppercase eyebrow/pill labels above headlines and the numbered `01/02/03` section markers. Build section hierarchy from a stronger type scale and spacing instead of ornamental kickers."*

#### Centered-everything hero with badge / testimonial carousel
- **Fingerprint:** centered hero with a vague headline ("Build the future of work") + badge; a center testimonial carousel with no narrative reason.
- **Why slop:** default composition; "carousel with no narrative purpose" (OpenAI's named failure).
- **Premium:** a poster-like, composed first viewport; testimonials only where they advance a narrative.
- **Prompt:** *"Do not default to a centered hero with a badge or a center testimonial carousel. Compose the first viewport like a poster with a clear focal point and one primary action; include testimonials only if they serve a narrative."*

### 4. Components

#### Glassmorphism everywhere
- **Fingerprint:** frosted blur/glass/glow used as decoration across cards, navs, modals.
- **Why slop:** decorative effect substituting for a real elevation system.
- **Premium:** solid surfaces and a genuine elevation hierarchy.
- **Prompt:** *"Remove decorative glassmorphism (blur/glass/glow) from cards and panels. Use solid surfaces and a real, progressive elevation hierarchy; reserve backdrop blur for a single justified overlay if at all."*

#### Uniform 8/12/16px border-radius on everything
- **Fingerprint:** one radius value applied to cards, inputs, buttons, pills, images alike.
- **Why slop:** no role differentiation; the shadcn/Tailwind default look.
- **Premium:** differentiate radius by component role (cards vs inputs vs pills) — exact scale in `references/design-system-reference.md`.
- **Prompt:** *"Do not apply one uniform border-radius to everything. Differentiate radius by component role — cards, inputs, and pills should each have a distinct radius from the defined radius scale, not a single shared value."*

#### Identical shadow depths
- **Fingerprint:** the same `box-shadow` on every element regardless of elevation; or a hairline border + wide diffuse shadow combined on everything.
- **Why slop:** flattens the elevation hierarchy; everything floats equally.
- **Premium:** a progressive elevation scale where shadow depth maps to real stacking order.
- **Prompt:** *"Do not apply the same shadow to every element. Build a progressive elevation scale and map shadow depth to each element's real elevation (resting card < raised panel < overlay)."*

#### Side-tab accent border (thick colored stripe on one side of a rounded card)
- **Fingerprint:** a thick colored stripe on the left (or top) edge of a rounded card.
- **Why slop:** "almost as reliable a sign of AI-generated design as em-dashes are for AI-generated text."
- **Premium:** convey state/category through a subtle badge, icon, or restrained fill — not a stripe.
- **Prompt:** *"Remove the thick colored accent stripe on the side of cards. If a card needs categorization or status, use a small badge or icon, not a colored left/top border."*

#### Gradient buttons
- **Fingerprint:** primary buttons filled with a color gradient.
- **Why slop:** a default decorative move that dates quickly and weakens affordance.
- **Premium:** solid button fills; gradients only as atmospheric background, with a solid fallback.
- **Prompt:** *"Use solid fills for all buttons. Reserve gradients for atmospheric backgrounds only, behind imagery never behind text, and always provide a solid fallback."*

#### Icon tile stacked above heading (rounded-square icon container)
- **Fingerprint:** a rounded-square colored tile holding an icon, stacked directly above each heading.
- **Why slop:** the canned feature-card template unit.
- **Premium:** place the icon inline with the heading or in the content flow; drop the tile.
- **Prompt:** *"Avoid the rounded-square icon-tile-above-heading template. Place icons inline with their heading or within the content flow, without a colored square container."*

### 5. Animation

#### Generic fade-in-up on scroll; uniform 300ms transitions; no easing personality
- **Fingerprint:** every element fades up on scroll with the same 300ms duration and a generic curve.
- **Why slop:** motion without meaning; one timing for all elements regardless of size/role.
- **Premium:** one well-orchestrated page-load moment with staggered reveals (`animation-delay`), durations that vary by element size/distance, `ease-out` for entrances.
- **Prompt:** *"Do not apply a uniform 300ms fade-in-up to every element. Use one orchestrated page-load entrance with staggered `animation-delay` (e.g. 0/80/160ms), durations that scale with element size, and an `ease-out` curve for entrances; animate only `transform` and `opacity`, and wrap in `@media (prefers-reduced-motion: no-preference)`."*

#### Bounce / elastic easing on UI chrome
- **Fingerprint:** dialogs, menus, toasts that spring in and overshoot.
- **Why slop:** feels dated; spring physics applied where nothing physical is happening.
- **Premium:** ease interface motion out smoothly; reserve spring physics for genuinely physical interactions (drag, swipe).
- **Prompt:** *"Ease interface chrome (dialogs, menus, toasts) out smoothly with an ease-out curve — no bounce or elastic overshoot. Reserve spring physics only for genuinely physical interactions like drag or swipe."*

---

## Anti-Slop Prompt Vocabulary
Source-of-truth phrase bank for BRIEF. The same content works across Claude Code, Codex CLI, and Gemini CLI because it targets shared training-data biases.

### The pairing rule (non-negotiable)
**Always pair every negative with a positive.** Negative constraints de-bias and measurably shift output, but a ban alone causes a *secondary convergence* — banning Inter alone makes the model default to Space Grotesk; banning purple alone makes it pick the next safe accent. A negative without a committed positive direction just relocates the median. Never ship "no Inter, no purple" without a committed direction beside it.

### Negative constraints by category
- **Fonts:** *"Do not use Inter, Roboto, Open Sans, Lato, or default system fonts — and don't fall back to Space Grotesk either."*
- **Color:** *"Avoid purple/indigo-to-blue gradients, violet accents, and the default Tailwind indigo. No timid evenly-distributed palette — commit to one dominant color with a sharp accent."*
- **Layout:** *"No hero-with-gradient-and-three-feature-cards. No centered-everything default. No standard 3-column icon-card grid. No center testimonial carousel without a narrative reason."*
- **Components:** *"Avoid uniform border-radius on everything, glassmorphism cards, and identical drop shadows at low opacity on every element."*
- **Animation:** *"No generic fade-in-up-on-scroll applied to everything; motion must earn its place."*

### Positive steering by category
- **Typography:** *"Choose a distinctive, characterful typeface; pair a display face with a refined body face; use weight extremes (e.g. 300 vs 800, not 400 vs 600) and dramatic size jumps; prefer variable fonts."*
- **Color:** *"Commit to a cohesive restrained palette defined as semantic tokens; a dominant color with one sharp accent beats an even spread; draw the palette from the product's context, not from defaults."*
- **Spacing:** *"Use a consistent 4pt/8pt spacing rhythm; let hierarchy come from scale and space, not from borders everywhere."*
- **Layout:** *"Make the composition content-driven and distinctive; allow asymmetry, generous whitespace OR intentional density."*
- **Animation:** *"One well-orchestrated page-load moment with staggered reveals delights more than scattered micro-interactions; add purposeful hover/focus feedback."*

### Worked example: wrap bans inside an affirmative direction
Don't deliver a rules-list ("Rules: no Inter; no purple; 8px grid"). Brief like a creative director — state the vision first so the model commits to the direction and the bans become guardrails:

> *"I want this to feel like a precise instrument for power users — think the quiet confidence of Linear. Build it on a near-black canvas with a single rationed accent for the one primary action per screen, a clean grotesque paired with a monospace for IDs and shortcuts, and tight spacing on an 8px rhythm. Steer well clear of the generic AI look — no Inter, no purple gradients, no row of rounded feature cards. Let depth come from thin borders, not heavy shadows."*

The negatives ride along inside an affirmative vision; the model commits to the direction first, and the bans act as guardrails rather than a checklist.

### Paste-ready negative-constraint block
Drop into any UI generation prompt (always alongside a positive direction):

> *"Constraints: Do NOT use Inter/Roboto/Arial/Geist (and don't fall back to Space Grotesk). Do NOT use purple/indigo/violet gradients or gradient text. Do NOT use glassmorphism, colored glow shadows, side-tab accent borders, or a single uniform border-radius. Do NOT produce a 3-column icon-card grid, a hero-metric block, or an oversized italic-serif hero. Instead: choose a distinctive display+body type system, commit to a deliberate palette with one rationed accent, differentiate radius by component role, and build a real elevation hierarchy. State your font and palette choices before coding."*

---

## Reference: official anti-slop directives
Ready-reference quotations to cite or mirror in a brief.

### Anthropic frontend-aesthetics directive (use as a system constraint)
> *"You tend to converge toward generic, 'on distribution' outputs… avoid this: make creative, distinctive frontends… Avoid generic fonts like Arial and Inter… Clichéd color schemes (particularly purple gradients on white backgrounds)… Predictable layouts and component patterns… Cookie-cutter design that lacks context-specific character."*

### OpenAI Codex frontend-skill — verbatim "Hard Rules"
> "No cards by default. No hero cards by default. No more than one dominant idea per section. No more than two typefaces without a clear reason. No more than one accent color unless the product already has a strong system. No filler copy."

### OpenAI Codex frontend-skill — verbatim "Reject These Failures"
> "Generic SaaS card grid as the first impression; Beautiful image with weak brand presence; Strong headline with no clear action; Busy imagery behind text; Carousel with no narrative purpose; App UI made of stacked cards instead of layout."

These are the most precise anti-slop constraints publicly documented; Codex follows literal hard rules especially well (delivery mechanics per `references/prompt-structure.md`).
