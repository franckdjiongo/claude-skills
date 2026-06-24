# Design System Reference Values

Concrete "expected values" lookup. AUDIT compares observed values against these; BRIEF pulls archetype values from these. **This file is values only** — for slop detection see `references/anti-slop-rules.md`; for defect detection criteria and severity see `references/defect-taxonomy.md`. Score and format findings per `references/scoring-and-report.md`.

**Source posture (operational caveat):** WCAG figures (ratios, `44×44`, `24×24`, focus appearance) are **normative** from W3C WCAG 2.2 — cite them as authoritative. Reverse-engineered tokens for **Vercel, Stripe, Linear** are measured from production CSS by third parties (DesignMD, explainx, refero), not official internal files — they **drift as sites are redesigned**; treat as **illustrative of the principle**, not gospel. Apple type leading comes from secondary reproductions (Apple's HIG page is JS-gated); internally consistent but not scraped from Apple plain-text.

## Table of Contents
- [Apple Human Interface Guidelines (iOS / SF Pro)](#apple-human-interface-guidelines-ios--sf-pro)
- [Google Material Design 3 / Material You](#google-material-design-3--material-you)
- [Reverse-Engineered Brand Systems](#reverse-engineered-brand-systems)
  - [Vercel / Geist](#vercel--geist)
  - [Linear](#linear)
  - [Stripe](#stripe)
  - [Tailwind conventions](#tailwind-conventions)
- [Motion & Animation Standards](#motion--animation-standards)
- [Dark Mode Standards](#dark-mode-standards)
- [Responsive Viewport Matrix](#responsive-viewport-matrix)

---

## Apple Human Interface Guidelines (iOS / SF Pro)

Type table at Dynamic Type "Large" (default) — **point size / weight / leading**:

| Style | Size | Weight | Leading |
|---|---|---|---|
| Large Title | 34pt | Regular (Bold when emphasized) | 41pt |
| Title 1 | 28pt | Regular | 34pt |
| Title 2 | 22pt | Regular | 28pt |
| Title 3 | 20pt | Regular | 25pt |
| Headline | 17pt | Semibold | 22pt |
| Body | 17pt | Regular | 22pt |
| Callout | 16pt | Regular | 21pt |
| Subhead | 15pt | Regular | 20pt |
| Footnote | 13pt | Regular | 18pt |
| Caption 1 | 12pt | Regular | 16pt |
| Caption 2 | 11pt | Regular | 13pt |

**Font family split:** SF Pro Text ≤19pt; SF Pro Display ≥20pt. Body tracking `−0.43px` (−2.5%) at 17pt; smaller sizes use **positive** tracking.

**Layout constants:**
- Touch target: **`44×44pt`** minimum.
- Minimum legible font: **11pt**.
- Spacing: **8pt** increments.

**Motion — critical caveat:** The HIG gives **qualitative** guidance only (*"prefer quick, precise animations"*, *"make motion optional"* — respect Reduce Motion) and publishes **NO numeric durations**. The `≈0.25s` figure is the UIKit `UIView.animate` API default, **not an HIG standard** — never cite a specific millisecond value as an Apple HIG figure. Apple system animations are predominantly **spring-driven**.

**Liquid Glass (iOS/iPadOS/macOS 26, 2025):** translucency/depth, bolder left-aligned typography, capsule shapes for large controls, concentric corner radii. Newer than the type table above — note as emerging, not yet a settled token set.

---

## Google Material Design 3 / Material You

### Color (HCT)
- Color space: **HCT** (Hue, Chroma, Tone). 5 key colors → tonal palettes.
- Tonal palette tones: **0–100 in steps of 10**, plus **95 / 98 / 99**.
- 26 color roles auto-paired for accessible contrast.

| Role | Light tone | Dark tone |
|---|---|---|
| primary | 40 | 80 |
| surface | 99 | 10 |
| onSurface | 10 | 90 |

### Elevation (levels 0–5 → dp)
| Level | dp |
|---|---|
| L0 | 0dp |
| L1 | 1dp |
| L2 | 3dp |
| L3 | 6dp |
| L4 | 8dp |
| L5 | 12dp |

M3 **prefers tonal elevation** (lighter / primary-tinted surface = higher) over shadow. Tone-based surface-container roles (these **replace** the deprecated +4/+5 elevation overlays): `surface-container-lowest`, `surface-container-low`, `surface-container` (default), `surface-container-high`, `surface-container-highest`.

### Motion duration tokens (ms)
From the material-foundation token set:

| Token | ms | Token | ms |
|---|---|---|---|
| short1 | 50 | long1 | 450 |
| short2 | 100 | long2 | 500 |
| short3 | 150 | long3 | 550 |
| short4 | 200 | long4 | 600 |
| medium1 | 250 | extra-long1 | 700 |
| medium2 | 300 | extra-long2 | 800 |
| medium3 | 350 | extra-long3 | 900 |
| medium4 | 400 | extra-long4 | 1000 |

### Easing tokens (cubic-bezier)
| Token | Curve |
|---|---|
| standard | `cubic-bezier(0.2, 0, 0, 1)` |
| standard-decelerate | `cubic-bezier(0, 0, 0, 1)` |
| standard-accelerate | `cubic-bezier(0.3, 0, 1, 1)` |
| emphasized | `cubic-bezier(0.2, 0, 0, 1)` |
| emphasized-decelerate | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| emphasized-accelerate | `cubic-bezier(0.3, 0, 0.8, 0.15)` |

### Grid & targets
- Baseline grid: **4dp**; components align to **8dp**.
- Touch target: **`48×48dp`**.

**M3 Expressive (2025, Google I/O):** added a motion-physics spring system, 35 new shapes, and shape morphing. Validated across 46 studies / 18,000+ participants; eye-tracking showed key UI elements (e.g. email send button) spotted **up to 4× faster** vs standard M3.

---

## Reverse-Engineered Brand Systems

> All token values below are third-party-measured and **drift over time** — treat as **illustrative of the principle**, not exact spec.

### Vercel / Geist
- **Fonts:** Geist Sans (body) + Geist Mono (headings/labels/code).
- **Tracking scales negative with size:** `−2.4px` @48px, `−1.28px` @32px, `−0.96px` @24px, `normal` @14px.
- **Weights (only three):** `400` (read) / `500` (interact) / `600` (announce).
- **Type scale (approx):** 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64. Default body **14px**; H2 24px.
- **Leading:** tight `1.15` / base `1.5` / relaxed `1.625`.
- **Palette:** `#000` / `#FFF`; near-black text `#171717`; border `#ebebeb`.
- **Spacing (4px scale):** `[4, 8, 12, 16, 24, 32, 48, 64]`. Default card padding **24px**; section padding **80–120px**.
- **Shadow-as-border philosophy:** use `box-shadow: 0 0 0 1px rgba(0,0,0,0.08)` instead of a CSS `border`. Layered stack: `rgba(0,0,0,0.08) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 2px, #fafafa 0 0 0 1px`.
- **Radius:** `6px` interactive elements; `9999px` pill for standalone CTAs.
- **Nav:** collapses to drawer `<960px`.
- Color is functional, never decorative.

### Linear
- **Dark-first** — every component designed for the dark surface first.
- **Color space:** LCH for theme generation (perceptually uniform — red and yellow at lightness 50 appear equally light).
- **Fonts:** Inter Display (headings) + Inter (body).
- **Palette:** neutral-heavy, minimal chrome/accent; recent versions forgo a brand accent almost entirely.
- **Grid:** denser, ~**1024px**.
- Custom theme generator built on core variables → surface / text / icon / control aliases.

### Stripe
- **Font:** Söhne variable (`sohne-var`), weights `300` (display) / `400` (body). `ss01` stylistic set enabled globally.
- **Tracking:** aggressive negative — `−1.4px` @56px down to `−0.2px` @20px; headlines `letter-spacing ≤ −0.020em`.
- **Numerals:** tabular figures (`font-feature-settings: "tnum"`) / monospaced numbers so currency columns align.
- **Palette:** monochrome navy ink `#0A2540` ("Midnight") / `#061b31` on white. One accent — brand "Blurple" **`#635BFF`** (≈ indigo-500; RGB 99,91,255; HSL 243° 100% 68%) for the single primary action — never two filled CTAs competing. Marketing-site variant: `#533afd`. Surface `#F6F9FC` / `#f8fafd`; border `#e5edf5`.
- **Spacing base:** 4px. **Radius:** `4px` buttons/inputs, `16px` cards, `100px` pills.
- **Section padding:** **64px**.
- **Shadow (subtle):** `rgba(23,23,23,0.06) 0 3px 6px`.
- **Focus ring:** `rgba(99,91,255,0.1) 0 0 0 3px`.
- **Grid:** 12-col, **1280px**. Generous whitespace functions as a trust signal.

### Tailwind conventions
- **Base unit:** 4px (`spacing-1` = 4px); even steps align to the 8pt grid.
- **shadcn/ui defaults:** `--radius: 0.5rem`, `--primary`, `--background`, etc. — convenient but produce **undifferentiated** output.
- **Anti-pattern values to override:** default purple/indigo palette, uniform `rounded-lg`, identical shadcn defaults. (Detection lives in `references/anti-slop-rules.md`.)
- **Premium fix direction:** generate OKLCH brand tokens (via tweakcn / shadcn `create`), use semantic CSS variables, differentiate radii per component role.

---

## Motion & Animation Standards

### Duration ranges by interaction size
| Interaction | Duration |
|---|---|
| Micro (hover, toggle, button press) | 100–200ms |
| Small (tooltips, small fades) | 200–300ms |
| Medium (cards, modals, expanding panels) | 300–500ms |
| Large / page transitions | 300–700ms |

Material reference points: switch 100ms; desktop transitions **150–200ms** (faster than mobile, which travels farther). Animations over **~1s** break engagement (NN/g).

### Easing curves (cubic-bezier)
| Purpose | Curve | Behavior |
|---|---|---|
| Entrance (decelerate / ease-out) | `cubic-bezier(0, 0, 0.2, 1)` | arrives and settles |
| Exit (accelerate / ease-in) | `cubic-bezier(0.4, 0, 1, 1)` | leaves at speed |
| State change (standard / ease-in-out) | `cubic-bezier(0.4, 0, 0.2, 1)` — or M3 standard `cubic-bezier(0.2, 0, 0, 1)` | symmetric |
| Premium emphasized | `cubic-bezier(0.05, 0.7, 0.1, 1)` (M3 emphasized-decelerate) | expressive settle |
| Spring (interactive/physical feedback) | stiffness `~400`, damping `~36` | physical |

Avoid `linear` for movement; avoid bounce/elastic on UI chrome. (Premium-vs-slop motion patterns are catalogued in `references/anti-slop-rules.md`.)

### `prefers-reduced-motion` pattern
Blanket kill switch:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
**Better practice:** progressive opt-in — wrap motion in `@media (prefers-reduced-motion: no-preference)`. Replace movement with opacity fades; still provide state-change feedback. Addresses WCAG 2.3.3. Autoplay/looping content still needs a pause control (WCAG 2.2.2). Test via Chrome DevTools → Rendering → "Emulate prefers-reduced-motion."

### Performance budget
- Target **60fps** (16.7ms/frame).
- Animate **only `transform` and `opacity`** (GPU-composited).
- **Never** animate `width` / `height` / `top` / `left` / `margin` / `padding` (layout thrash) — use `transform: scale/translate`, or `grid-template-rows` for height.
- Verify with Chrome DevTools Rendering FPS meter and paint-flashing.

---

## Dark Mode Standards

### Surface hierarchy via elevation tinting
- **Never pure black** (`#000000`). Material dark-theme base is **`#121212`** (dark grey, not black — easier to see shadows on grey). Brand-tinted alternatives: `#0D1117`, `#09111A`.
- **Elevation = lighter, NOT shadowed:** step each surface **+5–8% lightness**. Use a minimum of 4 levels: surface-base → surface-raised (cards/sidebars) → surface-overlay (nested/hover) → overlay (modals/dropdowns).
- **White-overlay opacity ladder** (white overlay on `#121212`, scales with elevation):

| Elevation | White overlay |
|---|---|
| 0dp | 0% |
| 1dp | 5% |
| 8dp | 12% |
| 24dp | 16% |

- Add a subtle color temperature to the blacks (tinted grays via small hue shift) for personality.

### Text color hierarchy (not pure white)
| Emphasis | Value |
|---|---|
| High | `rgba(255,255,255,0.87)` |
| Medium | `rgba(255,255,255,0.60)` |
| Disabled | `rgba(255,255,255,0.38)` |

Pure `#FFF` "vibrates"/blooms on dark. Pick **one** system (opacity OR hex) and stick to it. Base `#121212` vs white ≥ `15.8:1`, so elevated (lighter) surfaces still clear `4.5:1` for body text.

### Shadows in dark mode
Shadows are largely invisible on dark — convey elevation by a **lighter surface** instead. Use borders `rgba(255,255,255,0.08–0.12)` for subtle dividers.

### Accent adjustment
- **Desaturate accents 10–20%** for dark (fully saturated colors vibrate).
- **Do NOT invert hex** — inverting `#0070F3` yields orange. Material uses a lighter tonal value (tone 80 vs tone 40).
- Create `--color-accent-default` and `--color-accent-dark-variant` tokens.

### Image / illustration adaptation
Reduce image brightness (`filter: brightness(0.9)` or `opacity: 0.9`); avoid pure-white illustration backgrounds; provide dark-specific assets where needed.

### Common LLM dark-mode failures (the values to correct toward)
Pure-black background → use `#121212`. Pure-white text → use `rgba(255,255,255,0.87)`. Same shadow as light mode (invisible) → use lighter surface + subtle border. Inverted hex accents → use desaturated/lighter tonal variant. Dark-gray text on slightly-less-dark gray → restore contrast hierarchy. No surface-elevation hierarchy → apply the white-overlay ladder. Treat dark as a first-class context with semantic tokens, not an inversion of light.

**Paste-ready fix prompt:** *"Dark surfaces use pure `#000000` and body text is pure `#FFFFFF`. Change the base surface to `#121212` and step elevated surfaces by +5–8% lightness (cards via `rgba(255,255,255,0.05)` white overlay, modals via `0.16`). Set text to `rgba(255,255,255,0.87)` high-emphasis, `0.60` medium, `0.38` disabled. Replace light-mode `box-shadow` elevation with lighter surfaces plus `1px` borders at `rgba(255,255,255,0.08)`. Desaturate the accent 10–20% rather than inverting its hex. Do NOT use pure black, pure white text, or colored glow shadows."*

---

## Responsive Viewport Matrix

### Viewport checkpoints
| Class | Widths |
|---|---|
| Mobile | 375px (iPhone SE/standard), 390px (iPhone 13/14/15), 414px (Plus/Max) |
| Tablet | 768px (iPad portrait), 834px (iPad Air/Pro 11"), 1024px (iPad landscape) |
| Desktop | 1280px, 1440px, 1920px |

### Per-viewport expected values
| Concern | Mobile (375–414) | Tablet (768–1024) | Desktop (1280–1920) |
|---|---|---|---|
| Columns | 1 stacked | 2 | 3–4 / 12-col |
| Section padding | 24–32px | 48px | 64–120px |
| Component padding | 16px | 20px | 24px |
| Type (display/H1) | 32px | 40px | 48–64px |
| Nav | hamburger / bottom nav | collapsed sidebar | full horizontal / sidebar |

### Touch-target compliance
- **`44×44` CSS px** minimum (Apple / WCAG AAA 2.5.5).
- **`48×48`** recommended (Material).
- WCAG AA floor (2.5.8): **`24×24`** or 24px spacing.
- **≥8px** between adjacent targets.

### Reflow patterns / anti-patterns
- **Good:** single-column stack, priority+ navigation, reflow to **400% zoom** without horizontal scroll (WCAG 1.4.10).
- **Anti:** fixed pixel widths, content overflow forcing horizontal scroll, text baked into images, swipe-only carousels (need a button alternative per WCAG 2.5.7).

### `clamp()` typography
```css
h1   { font-size: clamp(2rem, 1.2rem + 3vw, 4rem); }
body { font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem); } /* never below 16px mobile body */
```

### Navigation pattern adaptation
- Hamburger drawer (Vercel collapses `<960px`), bottom nav (mobile app, ≤5 tabs), sidebar collapse (expanded **320px** → collapsed **80px**). Maintain the active state across breakpoints.

### Responsive media behavior
- `max-width: 100%`, `height: auto`, `aspect-ratio` to prevent CLS.
- `srcset` / `sizes` for resolution switching.
- `object-fit: cover` for art-directed crops.
- Lazy-load below-fold media.
