# Phase 1 — Design (full procedure)

Moved out of SKILL.md. Phase 1 rules are binding: no CSS before the Design Spec is posted.

### 1.0 — Load the contracts (mandatory before any code)

Before writing a line of CSS, `Glob` the project for the pipeline's contract artifacts and read whatever exists:

```
Glob: **/design-intent.md
Glob: docs/branding/brand-package.md
Glob: docs/branding/brand-tokens.css
Glob: **/tokens.css
```

- **If `docs/branding/brand-package.md` (or `brand-tokens.css`) exists → palette and typography are `brand-fixed`.** Treat them as contractual, at the same authority as `tokens.css`. You do not re-pick colors or fonts, and you never retype a hex by hand — the build **imports or copies** the custom properties from `brand-tokens.css`. Any deviation from a brand-fixed value must be written down and justified.
- **If `design-intent.md` exists → its constraints (art direction, motion stance) bind Phase 1**, and its **TESTABLE CRITERIA** become extra rows of the Verification Ledger in Phase 2 (see the consumption rule at the top of Phase 2).
- **If none exist on a new (greenfield) site → declare it, and offer design-forge BRIEF first** (Step 0). If the user proceeds anyway, you own the direction via the Design Spec below.
- **On a new project with no `tokens.css` → ship-polished-ui bootstraps it.** Derive `tokens.css` from the brand-package / design-intent (or, absent those, from the Design Spec you post). This skill is the canonical producer of `tokens.css` for the build — downstream files reference these tokens, never raw literals.

### 1.1 — Set the visual direction

Read **[references/design-direction.md](references/design-direction.md)** for the in-house design doctrine (the 14 award-level rules, references-first Match/Change, the 3-directions exploration, media strategy, anti-average levers). **This read is mandatory in Phase 1 before you post the Design Spec** — the Spec below is where its rules become named, justified decisions. The direction owns:

- Bold aesthetic direction (refined minimalism, editorial maximalism, brutalist, etc.)
- Typography choices that aren't generic Inter/Roboto/Arial
- Color and motion that fit context, not a SaaS template
- Layered visual treatments — atmosphere, depth, spatial composition

The Anthropic `frontend-design` skill is **not required** and is being retired from this pipeline; if it happens to be installed it may *complement* the in-house doctrine, but never depend on it and never invoke it as a precondition.

Apply the design via direct edits to CSS modules, component files, design tokens, etc. Respect any project-level rules about design tokens (`tokens.css`), pre-commit hooks that ban raw hex/z-index literals, file-size budgets, and CSS Modules conventions. If you introduce a new color/shadow/z-index value, define it as a token first, then reference it.

### 1.2 — Motion inventory (mandatory before coding, for any animated surface)

For any **showcase site, landing page, or surface that carries animation, scroll effects, background media, or 3D**, you **MUST read [references/motion-craft.md](references/motion-craft.md) before writing code**, and then post a short **motion inventory** — a required line now, ahead of the full Design Spec that lands in Phase D. Motion is not an afterthought layered on at the end; a page that ships 100% static does not pass this skill. The inventory names, before you code:

- **Hover / press feedback** for each family of interactive elements (buttons, links, cards, inputs) — what the feedback is, not "some hover state."
- **Hero entrance** — how the hero resolves on first paint.
- **Scroll reveals** — which sections reveal on scroll, and how (fade-up, stagger, scrub).
- **THE signature moment** — exactly **one** memorable interaction per page (rule A1-01 / motion-craft §⑧). Name it and locate it. Accumulating effects is an amateur tell, not richness.
- **Reduced-motion behavior** — what each of the above degrades to under `prefers-reduced-motion: reduce` (the non-negotiable WCAG 2.3.3 gate — motion-craft §⑤).

`motion-craft.md` owns the *how*: the escalation hierarchy (CSS → Motion → GSAP → 3D, justified per storey), the per-project stacks, the canonical Lenis/ScrollTrigger/useGSAP/`@supports`/View-Transitions boilerplates (copy them verbatim), the 3D decision tree + R3F checklist, the animatable-property whitelist, and the 5 motion non-regression tests that the verify phase runs. Read it before Phase 1 coding on any animated site; the full Design Spec below folds this inventory into rubric 6.

### 1.3 — Post the Design Spec (mandatory — no CSS before the Spec)

**You may not write a line of CSS before you have posted the Design Spec.** The old exit
criterion "complete enough to look at" is gone — it let the model start typing at the
statistical average. The Spec is the artifact that forces the decisions *before* the code,
so Phase 2 has something concrete to verify each decision against.

Read **[references/design-direction.md](references/design-direction.md)** first (rules,
references-first, media strategy, anti-average levers), then post this block **verbatim in
shape**, filling every rubric. Copy it from the ecosystem plan's annex A4 — do not
regenerate from memory:

```
## DESIGN SPEC — {projet} — {date}
1. Direction typographique : {display face} + {famille texte} — parce que {justification liée au client, pas un adjectif}
2. Palette nommée : "{nom}" — base {oklch/hex} + accent {oklch/hex} — dérivée de {attribut marque/produit}
   (brand-package présent : OUI → valeurs brand-fixed / NON → dérivation documentée)
3. Primitive de layout : {nom} — répétée sur {liste des sections}
4. Signature moment : {description} — localisé {où} — technologie {CSS/Motion/GSAP/3D + justification d'étage}
5. Références nommées : {1-3 produits/sites réels} — MATCH : {espacement/typo/densité} — CHANGE : {contenu/accent}
6. Motion inventory : hover/press {familles} · entrance hero {…} · reveals scroll {sections} · reduced-motion {comportement}
7. Stratégie média : {photo client / images IA / vidéo d'ambiance / illustration / 3D / aucun} — parce que {lien produit}
   → production : {chatgpt-image-prompt-architect | nano-banana-prompt-engineer | outil vidéo} · règles perf A2-⑨
8. Persona : {ex. senior frontend engineer, print-design background} · Seed d'art direction : {ère/culture}
   · Données : {réelles du client | mock JSON structuré} — lorem ipsum interdit
```

The eight rubrics, and the rules that bind them:

1. **Named typographic direction + justification** — a display face + a text family, each
   named, each justified by the client (not "clean"). Bare adjectives ("clean", "modern",
   "premium", "sleek") are **forbidden** unless attached to a named reference (rubric 5).
2. **Named palette derived from the brand** — a named, non-default palette, base + accent,
   derived from a brand/product attribute. If a `brand-package.md` was loaded in 1.0, the
   values are **brand-fixed**; otherwise document the derivation. No lavender violet, no
   violet→blue gradient.
3. **ONE repeated layout primitive** — a single composition primitive named and listed
   across the sections it repeats on (rule A1-07).
4. **The localized signature moment** — exactly one memorable interaction, named, located,
   with its motion-craft escalation storey justified (rule A1-01).
5. **1–3 real named references, Match/Change** — real products/sites, each with what you
   MATCH (craft language) and what you CHANGE (identity). This is the referent Phase 2 uses
   for the swap-brand and greenfield-craft checks.
6. **Motion inventory** — the inventory from 1.2, folded in as this rubric.
7. **Media strategy + production routing** — the chosen visual register justified by the
   product (rule A1-14), with production routed to the dedicated skills and the perf rules
   of motion-craft §⑨.
8. **Persona + art-direction seed + real data** — the three anti-average levers
   (design-direction Part 5).

**On an ambitious request** (full site, hero, redesign), first sketch **3 directions** in
three lines each and choose one *with justification* before filling the Spec — never
implement the first idea (design-direction Part 3).

Only after the Spec is posted do you apply the design via direct edits. When phase 1 is
posted and the first edits are made, move immediately to phase 2 — do not batch up many
changes before verifying. Smaller verify cycles catch bugs closer to the change that caused
them. **The Spec is carried into Phase 2:** the Verification Ledger gets one *"conformité
Design Spec"* transverse row per decision (the named typo is actually loaded, the palette is
in tokens, the signature moment exists and works, the media respects §⑨).

