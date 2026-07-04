# Design Intent — <PROJECT_NAME>

> The persistent source of truth BRIEF mode produces and AUDIT/TEST mode verifies. Keep it `<=200` lines (`300` hard cap). Put non-negotiables first; phrase as standing instructions, not questions. For Codex, mirror the TESTABLE CRITERIA as hard rules. How to write/order/deliver this file: references/prompt-structure.md. AUDIT scores the build against this file per references/scoring-and-report.md.

**Last updated:** <YYYY-MM-DD>
**Target tool(s):** <Claude Code (CLAUDE.md) | Codex CLI (AGENTS.md) | Gemini CLI (GEMINI.md)>

## Project
- **What it is:** <one sentence>
- **Audience:** <who uses it>
- **Single job of the product:** <the one thing every screen serves>

## Archetype
<one of the 8, e.g. Developer/Technical — see references/archetype-library.md>

## Reference Anchors (inspired-by, NOT clone)
- <Product> — for its <one dimension, e.g. information density>
- <Product> — for its <one dimension, e.g. typographic restraint>
- <Product> — for its <one dimension, e.g. motion subtlety>
- Free axis: <the dimension to diverge from all references, e.g. "warmer palette than any of them">

## Palette Direction
- **Canvas / text:** <e.g. near-white canvas, deep-navy text — never pure black>
- **Dominant color:** <role + temperature + saturation, no hex unless brand-fixed>
- **Accent:** <the one accent>
- **Rationed-accent rule:** the accent appears ONLY on <the one primary action per screen + active state>; everywhere else lives in the <neutral scale>.
- **Semantic colors (if any):** <success / warning / error roles, consistent across all charts>

## Typography Direction
- **Display:** <personality + weight, e.g. light-weight grotesque, tight tracking>
- **Body:** <refined, legible body face>
- **Mono (if any):** <for IDs / numbers / code / shortcuts>
- **Scale:** <dramatic vs subtle size jumps>
- **Banned fonts:** <e.g. Inter, Roboto, Open Sans — and the secondary default to avoid>

## Spacing / Density Rhythm
- **Grid base:** <e.g. 4pt / 8pt>
- **Section spacing:** <generous vs tight between major regions>
- **In-component spacing:** <compact rows vs airy>
- **Density stance:** <instrument-panel-dense | airy-and-uncluttered>

## Motion Stance
- **Signature moment:** <the ONE memorable interaction, localized to a single region — e.g. hero typographic reveal | none>. Everything else stays sober in its service; accumulating effects is an amateur tell, not richness.
- **Micro-interaction families:** <hover / focus / active / press behaviors — 150–300ms, expressive easing (expo-out/cubic-out), never `linear` or default `ease`>.
- **Scroll reveals:** <what enters on scroll + how — reveals 600–1200ms, text split by LINES with 60–100ms stagger; native scroll only, no scroll-jacking>.
- **Reduced-motion behavior:** parallax/scrub/auto-play replaced by opacity fades or held stills; layout stays complete and usable; background video paused + poster shown (WCAG 2.3.3).
- **Technical storey (justified):** <lowest floor that covers the need — CSS native → Motion → GSAP → 3D. Name the need each climb answers; reaching for GSAP/3D by reflex is a slop tell. Coherent with ship-polished-ui/references/motion-craft.md>.
- **Purpose:** <clarify hierarchy / demonstrate speed — never decorate>.

## Dark-Mode Approach (Elevation)
- **Primary theme:** <light | dark | both>
- **Surface ladder:** real elevation via `>=3` progressively lighter surfaces (<base → panel → card/modal>), NOT an inverted light theme.
- **Derived states:** hover/active/focus derived from the same tokens.

## Key Component Decisions
- **Navigation:** <e.g. persistent compact left sidebar; ⌘K command palette>
- **Data display:** <e.g. dense data grid, tabular numerals, sticky header; cards only where grouping helps>
- **Forms (if any):** <labels above inputs, inline validation, never block paste>
- **Overlays (if any):** <modal/drawer/bottom-sheet usage>
- **<Other component>:** <decision>

## Decisions & Rationale (what AND why)
- <decision> — because <reason, so future sessions don't undo it>
- <decision> — because <reason>

## TESTABLE CRITERIA (AUDIT/TEST verifies each)
Every line must be countable, measurable, or binary. Tighten with audit findings over time (the audit-back-to-brief loop in references/prompt-structure.md).
- [ ] Accent color used ONLY on the one primary action per screen (count accent uses per screen = 1 action).
- [ ] All numeric data uses tabular figures (aligned columns).
- [ ] Dark mode has `>=3` distinct elevation surfaces.
- [ ] Every interactive element has a visible focus state.
- [ ] AA contrast throughout (text `>=4.5:1`, large text/non-text `>=3:1`).
- [ ] No horizontal scroll from `375px` to `1920px`.
- [ ] No banned fonts present (<list>); declared faces used everywhere.
- [ ] Spacing follows the <4pt/8pt> rhythm; no magic-number px.
- [ ] All values come from named tokens; no hardcoded hex.
- [ ] Reusable components used (no one-off styling): <list the named components>.
- [ ] No AI-slop fingerprints (no purple/indigo gradient, no row of identical rounded feature cards, no uniform radius-on-everything) — full catalog in references/anti-slop-rules.md.

### Performance (Core Web Vitals — mobile, throttled)
- [ ] LCP `< 2.5s` (floor); award target `< 1.5s` documented.
- [ ] CLS `< 0.1` (floor); award target `< 0.05` documented — images/video carry `width`/`height` or `aspect-ratio`.
- [ ] INP `< 200ms` (floor); award target `< 100ms` documented — holds under 4× CPU throttle even during motion.
- [ ] Explicit JS budget declared if Three.js/3D is used (bundle KB ceiling + `dpr` clamp + `dispose()` on unmount); static fallback when WebGL/reduced-motion.

- [ ] <project-specific checkable criterion>
