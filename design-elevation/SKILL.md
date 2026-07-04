---
name: design-elevation
description: Apply professional design thinking to documentary visual artifacts — presentations, plans HTML, rapports, dashboards, spreadsheets, PDFs, data visualizations. Automatically interrogates design choices, applies best practices from Stripe/Linear/Apple, and pushes for polished, hand-crafted results rather than generic template output. Triggers on requests for slides, decks, presentations ("présentation", "slides"), plans HTML ("plan HTML"), reports ("rapport"), dashboards, styled documents, or any documentary deliverable where appearance matters. For client websites and application UIs — anything shipped and browser-verified — use ship-polished-ui instead; that skill owns the site pipeline and its non-negotiable visual QA loop.
---

# Design Elevation Skill

Transform functional visual output into polished, professional design. Apply automatically to any visual artifact request.

## Activation

This skill activates for **documentary** visual output — deliverables that are read, not shipped and browser-verified:
- Presentations, slide decks, pitch decks
- Dashboards, reports, data visualizations
- Plans HTML, styled HTML documents (rapports, mémos)
- PDF documents, styled reports
- Spreadsheets with visual formatting
- Any documentary artifact where appearance matters

**Out of scope — hand off to `ship-polished-ui`:** client websites, landing pages, application UIs, and web components that get built and shipped. Those belong to the `ship-polished-ui` pipeline (Design Spec → build → non-negotiable browser visual QA → Verification Ledger). Design-elevation deliberately no longer owns them, so that no site leaves without browser QA.

## Core Process

### 1. Read Reference Materials — gated by phase, not summarized away
Do **not** rely on a mental summary of the six phases: that shortcuts the actual reading and reintroduces generic output. Each phase has a **read gate** — you must open the named file and **cite one technique from it by name** before proceeding:

- **Always read first**: [references/interrogation-checklist.md](references/interrogation-checklist.md) — the scored grid and its 12 criteria.
- **Phase 2 (Foundation) gate → READ** [references/technique-catalog.md](references/technique-catalog.md), sections **§Typography Techniques + §Color Techniques** — cite one typographic and one color technique you are applying.
- **Phase 3 (Composition/responsive) gate → READ** [references/responsive-design.md](references/responsive-design.md) — cite one responsive strategy you are applying.
- **For systematic refinement**: [references/elevation-protocol.md](references/elevation-protocol.md) — the phase-by-phase process.
- **For inspiration**: [references/reference-library.md](references/reference-library.md) — exemplars, trends, principles.
- **For balance decisions**: [references/philosophy.md](references/philosophy.md) — bold vs. restrained.

A phase whose file was not read (no cited technique) is **not-evidenced**: you may not claim that phase is done.

### 2. Apply the Elevation Protocol
Follow the six-phase process from `elevation-protocol.md`:
1. **Functional Draft**: Structure and content first
2. **Foundation Pass**: Establish design system (variables, typography, color)
3. **Composition Pass**: Refine layout and spacing
4. **Detail Pass**: Add micro-refinements
5. **Distinction Pass**: Make it memorable
6. **Validation Pass**: Run the **scored validation grid** (below), not self-directed questions

### 3. Scored Validation Grid (replaces "would a design director approve this?")
An LLM answers "yes" to any self-flattering question, so self-questions do not gate anything. Before delivery, **post the grid as an artifact** in the chat — 12 objective criteria, each with the **real measured value** (a computed ratio, a releved padding, the output of a script or grep), never a bare score:

| # | Criterion | Threshold | How it is measured |
|---|-----------|-----------|--------------------|
| 1 | Display/body size ratio | ≥ 2.5× | measured: largest display px ÷ body px |
| 2 | Section vertical padding (desktop) | ≥ 96 px | releved from the CSS/rendered value |
| 3 | Palette 60-30-10 | dominant ≈60% · secondary ≈30% · accent ≤10% | **counted by surface area**, not by swatch count |
| 4 | Signature element | exactly 1, named + located | e.g. "oversized §00 numeral, masthead" |
| 5 | Forbidden fonts in display | 0 | **grep** the output for `Inter\|Roboto\|Arial\|system-ui` in display roles |
| 6 | Body/background contrast | ≥ 4.5:1 (≥ 3:1 large) | **`node scripts/contrast-check.mjs <fg> <bg>`** — paste the ratio |
| 7 | Muted-text/background contrast | ≥ 4.5:1 | **`contrast-check.mjs`** — paste the ratio |
| 8 | AI-slop tells | ≤ 1 (0 ideal) | **`node scripts/slop-lint.mjs <file>`** — paste the count/verdict |
| 9 | Spacing grid | all values multiples of 4/8 | releved: list non-conforming values (0 = pass) |
| 10 | Typographic measure | body 45–75 ch | releved max-width in ch |
| 11 | Neutrals not pure | no `#000`/`#fff` as base surfaces | grep the tokens |
| 12 | Every decision justified | 0 bare adjectives ("clean/modern/premium") without a named reason | read the Design Decisions block |

**At least 3–4 criteria (rows 5, 6, 7, 8) are measured mechanically** via `contrast-check.mjs`, `slop-lint.mjs`, and `grep` — never self-judged. Score **< 10/12 → a mandatory correction pass** (fix the failing rows, re-measure, re-post), **max 3 iterations**; any criterion still short after 3 passes is **documented as a known deviation** with its reason, never silently passed.

### 4. Deliver Polished Result + a "Design Decisions" block (mandatory)
Design thinking is **no longer invisible**. Deliver the polished artifact, and end the delivery with a **compact "Design Decisions" block** (5–8 lines):
- **Fonts** + why (display face + reason, body face + reason)
- **Palette** + its 60-30-10 distribution
- **Signature element** (named + located)
- **Media strategy** if any (real photo / AI image / illustration / none — justified)
- **Scored grid result** (`N/12`, and any documented deviation)

This block makes the reasoning auditable and is the artifact the user (or a downstream reviewer) checks against.

## Key Principles

### Avoid AI Aesthetics
- **Inter rule (single, unambiguous)**: **Inter (and Roboto/Arial/system-ui) is banned in display / heading roles.** It is tolerated in **body** roles **only when the reason is written down** in the Design Decisions block. There is no "Inter executed perfectly" exception for display — the reference files carry this same rule, not a recommendation.
- No purple gradients on white backgrounds; no lavender/violet→blue aurora backgrounds
- No evenly distributed color palettes
- No cookie-cutter symmetric layouts
- Every choice must be intentional for context

### Reference tables are calibration only
The font-pairing and contextual-palette tables in `technique-catalog.md` and `reference-library.md` are marked **"calibration only — direct reuse forbidden."** Reusing a table row verbatim (e.g. every finance deck = navy + gold) manufactures a recognizable house-slop. **Derive** the palette/typography for the specific project from its brand/context and **document that derivation** in the Design Decisions block.

### Apply Professional Standards
- Typography: Display/body pairing, clear hierarchy, proper line-height
- Color: 60-30-10 distribution, sufficient contrast, semantic usage
- Layout: 8-point grid, generous whitespace, intentional flow
- Polish: Consistent corners, purposeful shadows, refined states

### Context-Driven Decisions
Match design choices to content purpose:
- Finance → trust, restraint, sophisticated
- Tech → precision, modern, systematic
- Creative → bold, distinctive, memorable
- Healthcare → calm, accessible, human

## Quick Reference

### Emergency Mode (locked — explicit request only)
Emergency Mode skips phases and therefore skips quality gates. It is **NOT auto-triggered** — never invoke it because a task "looks small" or "urgent" on your own reading. It runs **only on an explicit user request** ("mode urgence", "vite fait, saute les étapes", "quick pass"), and when it runs you must **announce it up front**: *"mode urgence — phases X, Y sautées"*, naming which phases and gates are being skipped. Absent an explicit request, run the full protocol including the scored grid.

When Emergency Mode is legitimately requested, prioritize:
1. Typography: better fonts + clear hierarchy
2. Color: intentional palette, not defaults
3. Spacing: generous margins, consistent padding
4. One signature element: make something memorable
5. Remove clutter: delete unnecessary decoration

### Quality gate = the scored grid, not self-questions
Delivery is gated by the **Scored Validation Grid** (§3 above) posted with measured values — not by asking yourself "would a director approve this?" (a self-question an LLM always passes). Score < 10/12 → correction pass.

## Output — web rendering is delegated

**Browser verification is not this skill's job.** For any artifact that is a **web page shipped and browser-verified** (a client site, landing page, app UI), hand off to **`ship-polished-ui`** and its Verification Ledger loop — do **not** run a browser QA loop here and do **not** claim "tested on real devices" (design-elevation cannot open a browser or a device; such a claim is an invitation to fabricate). This skill owns **documentary** artifacts (plans HTML, reports, decks, dashboards, PDFs); their appearance is gated by the scored grid, and any responsive check beyond static reasoning is deferred to the tooled protocol in `ship-polished-ui`.

Deliver the polished artifact directly, followed by the mandatory **Design Decisions** block (§4). When the user asks about a choice, cite the specific decision and the named technique from the catalog.
