# design-direction.md — The in-house design doctrine

This file is ship-polished-ui's **taste authority**. The Anthropic `frontend-design`
skill has been retired from this pipeline; the direction of a client site no longer
comes from an external skill, it comes from here. Read this file **in Phase 1, before
writing the Design Spec** — the Spec (SKILL.md Phase 1) is where these rules turn into
named, justified decisions; this file is *why* each rule exists and *how* to apply it.

Taste is not a vibe you summon at the end. It is a set of decisions taken **before** the
CSS, defended against a named reference, and then verified in Phase 2. The root cause of
AI slop is not a bad model — it is **the absence of a decision**. "Clean and modern"
literally forces the statistical average (Inter + violet + three cards). This doctrine
exists to force the decision.

---

## Part 1 — The 14 award-level rules

These are the rules a designer with 15 years of experience applies without thinking.
Encoded verbatim from the ecosystem plan's annex A1 (the distilled Awwwards SOTY 2025 /
juror research). Each Design Spec decision should trace to one or more of them.

**A1-01 — Signature moment.** Exactly ONE memorable interaction per page (hero WebGL,
typographic reveal, unusual navigation); the rest of the site stays sober and in its
service. Accumulating effects is an amateur tell, not richness.
*Why:* the #1 principle of Awwwards SOTY 2025 winners; "custom interaction design" is the
single biggest differentiator cited by juries.

**A1-02 — Display typography.** 1 display face with character + 1 sober text family.
Display > 48px → letter-spacing −0.02 to −0.04em, line-height 1.0–1.15. Body →
line-height 1.5–1.6, measure 45–75ch. Caps labels → letter-spacing +0.05–0.1em. The
title is a COMPOSITION element (oversized, asymmetric, overlapping the media), not a
centered line.

**A1-03 — Fluid scale.** Everything in `clamp()`, base 16–18px; ratio 1.2–1.25 for dense
UI, 1.333–1.618 for marketing; H1 can be 3–6× the body for editorial contrast.

**A1-04 — Palette.** Tinted neutral base (never pure #000/#FFF) + 1 dominant accent, 3–5
colors total. Forbidden: lavender violet, violet→blue gradient, colored glows. WCAG AA
**calculated**, not estimated (use `contrast-check.mjs`).

**A1-05 — Depth.** SVG grain `feTurbulence` (`fractalNoise`, baseFrequency 0.6–0.9) at
2–8% opacity over flat/gradient backgrounds — "printed" quality, kills banding and the
sterile look. Multi-layer neutral shadows, never a colored box-shadow.

**A1-06 — Hero.** Forbid the `[pill badge + centered H1 + subtitle + 2 buttons + 3 cards]`
pattern. One focal point per viewport; remove ~30% of the elements you planned — if it
feels empty, you are approaching premium.

**A1-07 — Layout.** ONE strong composition primitive repeated everywhere (12-col grid with
asymmetric offsets, bento, full-width editorial); forbid mixing 3+ card/section styles.
The grid structures, the asymmetry energizes.

**A1-08 — Spacing.** Strict 4/8pt; sections ≥ 96–160px desktop; whitespace proportional to
element importance; THEN optical adjustments (pair kerning, optical margin alignment) —
the mathematical system alone does not reach the 15-year level.

**A1-09 — Total consistency.** Inner pages, 404, forms and footers get the same care as
the hero; identical tokens everywhere. Inconsistency between pages is an explicit juror
failure criterion.

**A1-10 — Copy.** Zero lorem ipsum, zero generic stock, zero hollow SaaS vocabulary
(streamline, empower, supercharge, world-class). Short, specific copy with a voice; real
numbers rather than decorative stat-rows.

**A1-11 — Scrollytelling.** Write the arc IN PROSE before coding (start → tension →
reveal → resolution); scroll drives (scrub), not merely triggers; ONE scrollytold passage
per site; exit points and CTA always visible.

**A1-12 — Mobile in parallel.** Parity designed in from the start (hover replaced by
intentional touch interactions), never a responsive afterthought. Juries test mobile first.

**A1-13 — Separation without cards.** Visual-separation hierarchy, in order: whitespace
first → 3–5% luminosity shift → light elevation → border as last resort. The "1px-border
card for everything" is the template reflex; the premium page separates by space and light.

**A1-14 — Media decided by the product.** The visual register (real photo, AI image,
ambient video, illustration, 3D, none) is an art-direction choice justified by the product
and the client — never a default. A background video on a dense community portal is a
mistake; on an emotional showcase, a differentiator (perf rules: motion-craft §⑨).

---

## Part 2 — References-first (the anti-average protocol)

**A named reference beats every adjective.** Before you write a Design Spec, pick **1–3
real, named products or sites** to design against. "Clean and modern" is not a direction —
it is an instruction to regress to the mean. "The spacing rhythm and type pairing of
Linear, the editorial density of Stripe's press pages" *is* a direction.

Use the **Match / Change** template for each reference:

```
Reference: {named real product/site}
  MATCH:  {what you borrow — spacing rhythm, type pairing, density, border/shadow language}
  CHANGE: {what you make yours — content, accent color, motif, tone}
```

- **MATCH** the *craft language*: spacing cadence, typographic pairing, information
  density, how it handles borders and shadows.
- **CHANGE** the *identity*: content, accent, cultural motif, voice — so the result is
  attributable to *this* client, not a clone of the reference.

A reference is a floor for craft, not a template to copy. The swap-brand test in Phase 2
(visual-qa-checklist Signature & slop section) checks that the CHANGE actually happened.

---

## Part 3 — Explore 3 directions before implementing

On any **ambitious request** (a full site, a hero, a redesign): do **not** implement the
first idea. Sketch **3 distinct directions**, three lines each, then pick one *with a
written justification*.

```
Direction A — {name}: {typo register} / {palette mood} / {layout primitive} / {signature moment}
Direction B — {name}: …
Direction C — {name}: …
→ Chosen: {A/B/C} because {reason tied to product + audience, not "it looks nicer"}
```

The first idea a model reaches for is the population mean. The exercise of generating three
and choosing one is what buys distinctiveness. On a small retouch this is overkill — reserve
it for greenfield and redesigns.

---

## Part 4 — Media strategy

The Design Spec's **rubric 7 (media strategy)** is where you choose and justify the visual
register — always adapted to the product and project, **never by default** (rule A1-14).
The register options: real client photo / AI-generated images / ambient background video /
illustration / 3D / no media at all.

- **Choosing:** ask what the *product* needs. A dense portal wants no ambient video; an
  emotional showcase may be *made* by one. A B2B tool wants real product screenshots, not
  stock. Write the justification — "images IA parce que le produit n'a pas encore de
  photos réelles et la marque évoque X" — never "images because it looks richer."
- **Technique (the how) lives in motion-craft.md §⑨**: ambient-video rules (autoplay muted
  playsinline + mandatory `poster` as the LCP element, H.264 fallback never H.265-only,
  ≤ 4–6 MB, pause on `prefers-reduced-motion`, still image served on mobile) and AI-image
  rules (single stylistic seed across the whole site — an incoherent series is as strong an
  AI tell as Inter; AVIF/WebP, systematic `aspect-ratio`). This file decides *whether* and
  *why*; motion-craft §⑨ decides *how*.
- **Production is routed to the dedicated skills**, always *from* the Spec's art direction,
  never an improvised prompt:
  - Images → **chatgpt-image-prompt-architect** (OpenAI) or **nano-banana-prompt-engineer**
    (Gemini).
  - Ambient video → the project's video-generation tool (Seedance / equivalent).

---

## Part 5 — Anti-statistical-average levers

Three levers, all written into the Design Spec, that pull a decision away from the model's
population mean:

1. **Persona.** Give the design a maker. "Designed by a senior frontend engineer with a
   print-design background" produces different type and spacing choices than an unqualified
   "make it look good." Name the persona in the Spec (rubric 8).
2. **Art-direction seed.** An era/culture anchor: 70s ski lodge, Art déco, Japanese
   woodblock print, Swiss International, brutalist zine. The seed constrains palette, type
   and motif toward something specific and away from the default (rubric 8).
3. **Real data.** Use the client's real content, or a structured mock JSON — never lorem
   ipsum. Lorem ipsum feeds slop: it lets the layout ignore real content lengths, real
   labels, real hierarchy. Rubric 8 requires real or structured-mock data.

---

## How this file is used

- **Phase 1, before any CSS:** read this file, then post the Design Spec (SKILL.md Phase 1,
  8 rubrics). Each rubric is a *decision* traced to these rules — no bare adjectives.
- **Phase 2:** the Verification Ledger carries one "Design Spec conformance" transverse row
  per decision, and the Signature & slop section runs the swap-brand test against the named
  references from Part 2. In greenfield the craft referent is **external** (these named
  references), never the page judging itself.
