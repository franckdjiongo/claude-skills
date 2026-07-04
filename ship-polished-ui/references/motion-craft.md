# Motion & 3D Craft Playbook

**MUST read before Phase 1 coding** on any showcase site, landing page, or surface that carries animation, scroll effects, background media, or 3D. This file is the owner of ship-polished-ui's motion objective: a static page does not pass. It encodes the decision hierarchy, the per-project stacks, the canonical boilerplates (copy them verbatim — do not regenerate from memory), the 3D decision tree, the non-negotiable gates, and the motion QA regression tests.

The content below is distilled from the 2026 motion research and is authoritative. When a boilerplate here conflicts with something you remember, the boilerplate here wins.

---

## ① Minimal escalation hierarchy

Motion has floors. Start at the lowest floor that covers the need, and **write a justification every time you climb a storey** (name the need the lower storey cannot cover). Reaching for GSAP or 3D by reflex — before CSS or Motion has been ruled out in writing — is itself a slop tell.

```
CSS natif (transitions, scroll-driven, View Transitions)
   ↓  need: React-component orchestration not expressible in CSS
Motion (motion/react)
   ↓  need: timeline / scroll-narrative orchestration Motion can't sequence
GSAP (+ ScrollTrigger, SplitText, Flip, MorphSVG…)
   ↓  need: 3D is the CORE of the experience, not decoration
canvas / 3D (Three.js / R3F)
```

- **CSS native** first: transitions, scroll-driven animations, View Transitions. Zero main-thread JS for simple reveals.
- **Motion** (`motion/react`) for React component animation the CSS floor can't express.
- **GSAP** only when timeline / scroll-narrative orchestration demands it.
- **canvas / 3D** only if the 3D *is* the experience.

**Rule (non-negotiable): each storey up requires a written justification** — a need not covered by the storey below. And **never stack Motion and GSAP on the same element / the same property** — pick one owner per animated property. Two libraries fighting over one `transform` is how you get jank you can't debug.

---

## ② Stack by project type

Decide the stack from what the project *is*, not from what looks impressive. Do not put Lenis on a data-dense app because a showcase site used it.

| Project type | Motion stack | Notes |
|---|---|---|
| **Static showcase (Astro/HTML)** | CSS scroll-driven (guard `@supports`) + native View Transitions + GSAP ScrollTrigger for narrative; Lenis if the art direction demands it | Zero main-thread JS for simple reveals |
| **SaaS React/Next** | Motion for product UI; GSAP confined to marketing/hero pages | **NO** global Lenis on a dense app (tables, virtualized lists) |
| **Immersive portal / 3D experience** | R3F + drei + ScrollTrigger scrub driving camera/scene + Lenis | WebGPURenderer (auto WebGL2 fallback); shaders in TSL |

---

## ③ Canonical boilerplates

Copy these blocks **verbatim**. They are the tested integrations; re-deriving them from memory is where the subtle bugs (missing `lagSmoothing(0)`, `gsap.to()` in a bare `useEffect`, an unguarded scroll-driven rule that hides content) creep in.

```
// GSAP — 100 % gratuit depuis v3.13 (avril 2025), TOUS les plugins inclus
// (ScrollTrigger, SplitText, MorphSVG…). Ne jamais chercher de version "Club".
// npm i gsap @gsap/react
gsap.registerPlugin(ScrollTrigger)          // UNE fois, au niveau module

// Lenis + ScrollTrigger — l'intégration canonique
const lenis = new Lenis()                    // wrappe le scroll NATIF (a11y OK)
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add(t => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
// React : <ReactLenis root> (package lenis/react) ; lenis.destroy() au unmount

// React — TOUJOURS useGSAP (scope + revert auto). JAMAIS de gsap.to() nu
// dans useEffect (StrictMode double-mount = triggers dupliqués).
useGSAP(() => { /* tweens */ }, { scope: containerRef })

// Reduced motion — la gate non négociable (WCAG 2.3.3)
gsap.matchMedia().add({
  reduceMotion: '(prefers-reduced-motion: reduce)',
  full:         '(prefers-reduced-motion: no-preference)'
}, ctx => { /* si reduceMotion : fades d'opacité, pas de Lenis, pas de scrub 3D */ })
```

```
/* CSS scroll-driven — Firefox encore derrière flag mi-2026 :
   TOUJOURS sous @supports, et l'état PAR DÉFAUT = état final visible
   (sinon contenu invisible là où l'API manque). */
@supports (animation-timeline: view()) {
  .reveal { animation: fade-up linear both; animation-timeline: view(); }
}

/* View Transitions same-document = Baseline depuis oct. 2025 — guard simple : */
/* if (!document.startViewTransition) { update(); return; }                    */
/* REFUSER en prod : <ViewTransition> React / flag Next.js (canary).            */
```

**Why each line matters:**
- `gsap.registerPlugin(ScrollTrigger)` at **module level, once** — registering per-render or per-effect duplicates the plugin registration.
- `lenis.raf` inside `gsap.ticker.add` + `gsap.ticker.lagSmoothing(0)` — this is the *only* correct way to marry Lenis's smooth scroll to ScrollTrigger's update loop; a second independent RAF loop desyncs them.
- `useGSAP({ scope })` — auto-scopes selectors and auto-reverts on unmount; a bare `gsap.to()` in `useEffect` under React StrictMode double-mounts and leaves duplicated triggers.
- `@supports (animation-timeline: view())` **wrapping** the rule, with the default (unwrapped) state already visible — so the content is never invisible in a browser without the API.
- View Transitions: guard on `document.startViewTransition`; refuse React's `<ViewTransition>` / the Next.js canary flag in prod.

---

## ④ 3D decision tree + R3F checklist

**When is 3D actually right?**

- **3D pertinente** : produit/matériau à montrer (hero produit), portfolio créatif, expérience narrative — jamais pour du contenu dense. Toujours un fallback statique (image/vidéo) si WebGL indisponible ou reduced-motion.
- **Checklist R3F** : jamais d'état d'animation dans useState (→ `useFrame` + refs, sinon 5 FPS) · `<Canvas dpr={[1,2]}>` (clamper devicePixelRatio mobile) · `frameloop="demand"` pour les scènes quasi statiques · disposer geometries/materials/textures au unmount (fuite mémoire SPA) · tout composant 3D = `'use client'` + `next/dynamic ssr:false` (three.js ne tourne pas côté serveur).
- **Nouveau projet three.js** : WebGPURenderer (fallback WebGL2 automatique, ~95 % des navigateurs) ; shaders en TSL (compile WGSL + GLSL), pas en GLSL brut.

**R3F failure-mode reference (the checklist above, expanded):**

| Pitfall | Fix |
|---|---|
| Animation state in `useState` → re-render every frame → ~5 FPS | Drive animation in `useFrame` mutating **refs**, never state |
| Uncapped devicePixelRatio → mobile GPU melts | `<Canvas dpr={[1, 2]}>` — clamp DPR |
| Full RAF loop on a near-static scene | `frameloop="demand"` — render only on change |
| Geometries/materials/textures leak across SPA route changes | `dispose()` them on unmount |
| three.js imported in a Server Component | `'use client'` + `next/dynamic(..., { ssr: false })` |
| New project reaching for raw GLSL | WebGPURenderer (auto WebGL2 fallback) + shaders in **TSL** |

---

## ⑤ Reduced-motion gate (`prefers-reduced-motion`)

**Non-negotiable (WCAG 2.3.3).** Every motion surface has a reduced-motion path, tested once before delivery.

- Gate motion behind `gsap.matchMedia()` (boilerplate ③) or a `@media (prefers-reduced-motion: reduce)` block.
- When `reduce` is set: replace parallax / scroll-zoom / scrub / auto-play with plain opacity fades or held stills. **No Lenis, no 3D scrub.**
- The site must stay **complete and usable** in reduced-motion — never content that vanishes, never a collapsed layout.
- Background video: pause it and show the poster (see ⑨).
- This is verified in the Motion QA section of `visual-qa-checklist.md` and recorded as a transverse ledger row.

---

## ⑥ Animatable-property whitelist + FLIP

- **Whitelist** : `transform` (x/y/scale/rotate) + `opacity` ; `filter`/`clip-path` avec parcimonie.
- **INTERDITS en continu** : `width`, `height`, `top`/`left`, `margin`, `padding`, `box-shadow` — they trigger layout every frame and are the usual cause of jank.
- **Layout change → FLIP**, not animating the layout properties directly: use the GSAP **Flip** plugin or Motion's `layout` prop. FLIP animates a `transform` that *looks like* a width/position change while the browser only ever composites.
- Verify compositor-only in the DevTools performance trace: **no purple "Layout" bars** during scroll/interaction (this is the jank check in Motion QA).

---

## ⑦ The 5 motion non-regression tests

These are the motion-specific tests. They run in the **Motion QA** section of `visual-qa-checklist.md`; they are listed here as the source of truth for what each one proves.

1. **Resize after full scroll** — scroll the page all the way, then resize: the **pins hold** (no drift, no orphaned pinned element).
2. **Back-and-forth navigation** — navigate away and back: `ScrollTrigger.getAll().length` is **stable** across the round trip (no duplicated/leaked triggers).
3. **Reduced-motion OS enabled** — the site is **complete and usable** with fades instead of motion.
4. **CPU throttle 4×** — under 4× throttle, **INP < 200 ms** (motion doesn't starve interactivity).
5. **StrictMode** — no **duplicated** animation (the `useGSAP` / matchMedia discipline holds under double-mount).

---

## ⑧ Signature-moment rule + motion timing (A1-01)

**Exactly ONE memorable interaction per page** (a WebGL hero, a typographic reveal, an unusual navigation) — the rest of the site stays sober and in its service. Accumulating effects is an amateur tell, not richness. This is principle #1 of the Awwwards SOTY winners; "custom interaction design" is the single biggest differentiator jurors cite. Locate the signature moment in the Design Spec (rubric 4) and justify its escalation storey (①).

**Timing & feel:**

- **Reveals: 600–1200 ms** ; **micro-interactions: 150–300 ms**.
- **Easings expressifs** (expo-out, cubic-out) — **jamais** `linear` ni le `ease` par défaut.
- **Text reveals split by LINES**, stagger **60–100 ms** per line.
- **No scroll-jacking** : never block or hijack the wheel (the fullpage pattern); only scrub tied to **native** scroll is allowed; content must stay keyboard-reachable and readable without JS.
- **ScrollTrigger discipline** : triggers in DOM order ; **`ScrollTrigger.refresh()` after** async image/font/data loads ; function-based values (`end: () => …`) + `invalidateOnRefresh: true` ; never a viewport dimension frozen at mount.
- **Hydration** : anything depending on `window`/`matchMedia`/`Math.random`/`Date` stays out of the initial render — the first paint is identical server/client, animate **after mount**.

---

## ⑨ Background media — images & ambient video

The visual register (real photo / AI image / ambient video / illustration / 3D / none) is a Design-Spec decision (rubric 7), justified by the product — never a default. A background video on a dense community portal is a mistake; on an emotional showcase, a differentiator (rule A1-14). When media is chosen, these rules bind.

- **Ambient video** : `<video autoplay muted loop playsinline>` with a **mandatory `poster`** (the poster is the LCP element — the video loads after) ; modern sources AV1/WebM (VP9) via `<source>` **+ H.264 (baseline/main) as universal fallback — never H.265 alone** (support inégal, longtemps désactivé par défaut dans Firefox) ; target ≤ 4–6 Mo, 10–20 s loop, **no audio track** ; `preload="none"` off-hero ; never a video that blocks reading the text laid over it (overlay + calculated contrast).
- **Reduced-motion** : video **paused + poster shown** when `prefers-reduced-motion: reduce` (listener on the media query) — same gate as animations (⑤).
- **AI-generated images** : produced via the repo's dedicated skills — **chatgpt-image-prompt-architect** (OpenAI) or **nano-banana-prompt-engineer** (Gemini) — from the Design Spec's art direction, **never** an improvised off-direction prompt ; modern formats (AVIF/WebP + fallback), `width`/`height` or `aspect-ratio` systematically (CLS), `loading="lazy"` outside the initial viewport.
- **Series consistency** : every image on a site shares the same stylistic seed (light, palette, grain) — an inconsistent series is an AI tell as strong as Inter.
- **Mobile** : consider `<source media>` to serve a still image instead of the video on mobile (data + battery), or a dedicated vertically-cropped video.

Production of media is always routed through the Design Spec's art direction (rubric 7): images → chatgpt-image-prompt-architect / nano-banana-prompt-engineer; ambient video → the project's video-generation tool — never a prompt invented outside the direction.
