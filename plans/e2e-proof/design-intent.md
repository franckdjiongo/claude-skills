# Design Intent — HtmlShare Public Landing Page

> Persistent source of truth BRIEF mode produced and AUDIT/TEST verifies. Non-negotiables first;
> phrased as standing instructions. Palette + typography are BRAND-FIXED (from docs/branding/
> brand-package.md + brand-tokens.css) — do not invent new colors or faces. AUDIT scores the build
> against this file per design-forge references/scoring-and-report.md.

**Last updated:** 2026-07-04
**Target tool(s):** Claude Code (CLAUDE.md) / ship-polished-ui
**Scope:** the single public marketing landing page (product launch). Not the app UI.

## Project
- **What it is:** the public landing page for HtmlShare — a service that turns one self-contained HTML file into a clean, permanent URL anyone can open in any browser.
- **Audience:** francophone + anglophone developers and small teams, especially people whose agent/LLM *produced* an HTML artifact and who need to share it without hosting it. Technical, skeptical of marketing fluff.
- **Single job of the page:** make a developer believe "this just works" and get them to their first shared link — one hero primary action (deploy / try it), reinforced once near the fold-end.

## Archetype
Developer / Technical (Linear / Vercel / Raycast lineage) — an instrument, not a marketing brochure. **Free axis / the divergence that makes it distinctive:** warm amber-on-warm-dark instead of the cyan/violet/lime that every dev tool defaults to. The page should feel like a well-made CLI's output rendered as a page: calm, dark, monospace-literate, with one warm ember of color.

## Reference Anchors (inspired-by, NOT clone)
- Linear — for instrument-panel calm and a single rationed accent proving restraint.
- Vercel — for the "deploy → live URL" narrative and near-monochrome surface discipline.
- Raycast — for the treatment of the product's own rendered surface (the URL/code chrome) as the hero visual.
- **Free axis:** warmer than all three — a warm-paper light theme and an amber ember on near-black, never their cool grays/blues.

## Palette Direction (BRAND-FIXED — brand-tokens.css)
- **Canvas / text (dark, default theme):** near-black warm base `--brand-bg` #08070a, raised card `--brand-surface` #141117, cream ink `--brand-ink` #f3efe6, secondary `--brand-muted` #b8b1a2.
- **Canvas / text (light theme):** warm paper `--brand-bg` #faf6ee, white card, warm near-black ink #1b1206, muted #6b6456.
- **Accent (the ONE accent):** signature amber `--brand-accent` #e3a64b. Dark = usable as text (9.4:1). Light = DECORATIVE / large only; accent-as-text in light uses `--brand-accent-text` #8a5a12.
- **Rationed-accent rule:** amber appears ONLY on the one primary CTA per viewport region + the product's rendered link/URL highlight + at most ONE brand ember in the hero. Everywhere else lives in the warm-neutral scale. No amber on body copy, borders-by-default, or decorative dividers.
- **Semantic colors:** none needed; this is a marketing page, not a dashboard. Do not introduce success/error hues.

## Typography Direction (BRAND-FIXED)
- **Display:** Space Grotesk — geometric-but-warm grotesk; tight negative tracking at hero sizes; weight restraint (do not go heavier than needed for authority).
- **Body:** Inter — text ONLY, never in display (hard brand rule).
- **Mono:** IBM Plex Mono — used for the surfaces the product actually renders: the URL (`view.htmlshare.ca/…`), the `htmlshare deploy` command, and any code/artifact chrome. Mono is a load-bearing brand signal here, not decoration.
- **Scale:** 1.25 minor-third (tokens --brand-step-0..4). Confident hero jump, calm body rhythm.
- **Banned fonts:** Inter in display; Roboto, Open Sans, system-ui as a visible display face.

## Spacing / Density Rhythm
- **Grid base:** 8pt (4pt for in-component detail).
- **Section spacing:** generous 96–140px between major regions — this is a landing page, let it breathe more than the app would.
- **In-component spacing:** the code/URL chrome is tight and precise (terminal-like); prose sections are airy.
- **Density stance:** airy-and-uncluttered overall, with ONE dense instrument-like element (the deploy→URL demo) to signal "this is a tool."

## Motion Stance
- **Signature moment:** the **deploy-to-URL reveal** — on hero load (or on a single explicit interaction), a `htmlshare deploy` command line resolves into a clean `view.htmlshare.ca/<slug>` URL that settles into place, the amber highlight igniting on the finished link. ONE region, ONE moment. It literally animates the product's core promise ("one file in, one clean link out"). Nothing else on the page competes with it.
- **Micro-interaction families:** hover/focus/active on CTA and links only — 150–250ms, expo-out / cubic-out easing, never `linear` or default `ease`. Copy-URL button gives a crisp confirmed state.
- **Scroll reveals:** at most a quiet opacity+8px rise on section entry, 400–700ms, ≤80ms line stagger on the hero headline only. Native scroll exclusively — no scroll-jacking, no pinned scenes.
- **Reduced-motion behavior:** `prefers-reduced-motion: reduce` replaces the deploy reveal with the finished URL shown statically (final state, no keyframes); scroll rises become instant; nothing auto-plays. Layout is complete and usable with zero motion.
- **Technical storey (justified):** CSS/Web Animations only — a text/URL resolve and hover states need nothing above the native floor. Reaching for GSAP/Three.js/3D here is a slop tell and is banned for this page.
- **Purpose:** the one moment demonstrates the product; everything else clarifies hierarchy. Motion never decorates.

## Dark-Mode Approach (Elevation)
- **Primary theme:** dark (canonical brand default). Light theme is the warm-paper counterpart and must be equally finished.
- **Surface ladder (dark):** ≥3 real elevation surfaces — base #08070a → panel (between base and surface) → card/chrome #141117 — progressively lighter, NOT an inverted light theme. The rendered URL/code chrome sits highest.
- **Derived states:** hover/active/focus derived from the same brand tokens; no ad-hoc colors.

## Key Component Decisions
- **Hero:** one headline (Space Grotesk, tight tracking), one sub-line (Inter), one primary CTA (amber), and the deploy→URL demo as the hero visual. A slogan from the brand list ("Share HTML that just opens.") anchors it.
- **The product-surface chrome:** a faux browser/terminal frame in IBM Plex Mono showing the real URL shape (`view.htmlshare.ca/<slug>`) — this is the signature visual, treated as first-class, not a generic screenshot.
- **Feature/proof section:** at most 3 points, expressed as hairline-separated rows or asymmetric blocks — NOT a row of 3 identical rounded icon-cards (explicit anti-slop). Each states a concrete promise (renders in every browser, no sign-up to read, one command).
- **Bilingual:** FR + EN copy must both be first-class; a language toggle is present and unobtrusive. Neither language reads as a translation afterthought.
- **CTA (secondary reinforcement):** the same primary action restated once near the end; still the only amber action in its region.
- **Footer:** quiet, mono-labeled, links to view.htmlshare.ca and the brand domain htmlshare.ca.

## Decisions & Rationale (what AND why)
- Amber-on-dark instead of cyan/violet — because the whole point is to NOT look like the generic dev tool; the warm ember is the brand's distinctiveness (brand-package identity score rests on it).
- Mono for the URL/command surfaces — because the product's value IS the rendered HTML/clean URL; showing it in IBM Plex Mono makes the promise literal instead of asserted.
- One signature deploy→URL moment, nothing else animated — because accumulating effects is an amateur tell; a single moment that IS the product reads as craft.
- Airy landing (vs the app's density) — because this is a launch page persuading skeptics, not an instrument they operate; breathing room signals confidence.
- No neon glow / no gradient mesh — brand hard rule; the mark and page stay flat and warm (glow would fight the "sober tool" voice).

## TESTABLE CRITERIA (AUDIT/TEST verifies each — countable / binary)
- [ ] Amber `--brand-accent` (#e3a64b) used ONLY on: the primary CTA (each region = exactly 1), the rendered-URL highlight, and ≤1 hero ember. Count total amber uses ≤ 4 across the page; zero on body text, zero as default border/divider color.
- [ ] Light theme uses `--brand-accent-text` (#8a5a12), NOT #e3a64b, for any accent-colored TEXT (amber #e3a64b as light body text is a fail — 1.98:1).
- [ ] Display type is Space Grotesk everywhere it appears; Inter never appears in a display/heading role; body is Inter.
- [ ] The URL/command chrome renders in IBM Plex Mono (at least one visible mono surface showing `view.htmlshare.ca/<slug>` and/or `htmlshare deploy`).
- [ ] Dark theme has ≥3 distinct elevation surfaces (base → panel → card), verified by 3 different background values, not an inverted light theme.
- [ ] Every interactive element (CTA, links, language toggle, copy button) has a visible focus state ≥3:1 against its background.
- [ ] AA contrast throughout: body text ≥4.5:1, large/non-text ≥3:1, in BOTH themes (values pre-verified in brand-tokens.css — the build must not break them).
- [ ] No horizontal scroll from 375px to 1920px (test 375 / 768 / 1280 / 1920).
- [ ] Spacing follows the 8pt (4pt detail) rhythm; no magic-number px on major regions.
- [ ] All colors come from `--brand-*` tokens; no hardcoded hex outside brand-tokens.css.
- [ ] Both FR and EN copy render fully; language toggle switches all visible strings (no untranslated leftovers).
- [ ] Exactly ONE motion moment (deploy→URL reveal) is choreographed; no scroll-jacking, no pinned/parallax scenes, no auto-playing loops elsewhere.
- [ ] No banned visual (no purple→blue gradient, no lavender accent, no neon glow/halo as a primary device, no row of identical rounded feature cards, no uniform radius-on-everything, no generic swoosh replacing the mark's share-ellipse).
- [ ] Reduced-motion: with `prefers-reduced-motion: reduce`, the deploy reveal shows its final URL statically, no keyframes run, layout stays complete and usable.

### Performance (Core Web Vitals — mobile, throttled 4× CPU)
- [ ] LCP < 2.5s floor; target < 1.5s (self-contained page, system-fallback fonts declared, hero text/URL is real DOM not an image).
- [ ] CLS < 0.1 floor; target < 0.05 — the deploy→URL demo reserves its final height (aspect-ratio / min-height), fonts declared with fallbacks to avoid layout shift, any image carries width/height.
- [ ] INP < 200ms floor; target < 100ms — holds during the deploy reveal and copy-URL interaction under throttle.
- [ ] No 3D/WebGL and no heavy animation library; if any JS ships for the reveal, it is minimal and the page is fully readable with JS disabled (final URL rendered server-side/static).
