# Visual Technique Catalog

Specific techniques organized by the problem they solve.

## Creating Visual Hierarchy

### Scale Contrast
Use extreme size differences (not 16px vs 18px—try 48px vs 14px). Headlines should dominate.

### Weight Contrast
Pair ultra-light with bold. Black weight headlines with light body text create drama.

### Color Hierarchy
- Primary content: High contrast (near-black or white)
- Secondary content: Reduced contrast (60-70% opacity or muted hue)
- Tertiary: Further reduced (40-50%)

### Spatial Hierarchy
Group related items tightly. Separate unrelated items generously. Distance = relationship.

---

## Creating Visual Interest

### Tension Through Asymmetry
Offset elements from center. Place focal points at golden ratio intersections (⅓ or ⅔ marks).

### Intentional Overlap
Let elements break boundaries. Images bleeding off edges. Text overlapping shapes. Creates depth and energy.

### Diagonal Movement
Angle elements 2-5 degrees. Use diagonal lines or gradient directions to create flow.

### Negative Space as Element
Large empty areas are compositional choices. Use them to frame content and direct attention.

### Grid-Breaking Moments
Establish a grid, then break it deliberately for emphasis. The exception proves the rule.

---

## Typography Techniques

### Display/Body Pairing
| Display Font | Body Font | Mood |
|--------------|-----------|------|
| Playfair Display | Source Sans | Editorial sophistication |
| Space Grotesk | IBM Plex Sans | Technical precision |
| Fraunces | Work Sans | Warm personality |
| Bebas Neue | Open Sans | Bold confidence |
| Cormorant Garamond | Nunito | Elegant accessibility |
| DM Serif Display | DM Sans | Modern classic |
| Outfit | Inter | Clean tech |
| Syne | General Sans | Creative forward |

### Text Effects
- **Oversized numbers**: Use display sizes for statistics (120px+)
- **Pull quotes**: Larger, different weight, generous margins
- **Drop caps**: First letter at 3-5x size, spanning 2-3 lines
- **Tracked headlines**: ALL CAPS with 0.1-0.2em letter-spacing
- **Tight headlines**: Negative letter-spacing (-0.02em) for impact

---

## Color Techniques

### 60-30-10 Rule
- 60%: Dominant (background, large surfaces)
- 30%: Secondary (containers, sections)
- 10%: Accent (CTAs, highlights, emphasis)

### Duotone
Two colors only. High impact, strong identity. Works well with:
- Black + one accent
- Dark blue + gold
- Dark charcoal + coral

### Contextual Palettes
| Context | Primary | Accent | Mood |
|---------|---------|--------|------|
| Finance | Deep navy (#1a1f36) | Gold (#c9a227) | Trust, premium |
| Health | Sage (#7d8c75) | Warm coral (#e07b54) | Calm, human |
| Tech | Near-black (#0f0f0f) | Electric blue (#0066ff) | Precise, modern |
| Creative | Off-white (#f5f2eb) | Vermillion (#e63946) | Artful, bold |
| Legal | Charcoal (#2d2d2d) | Burgundy (#722f37) | Serious, established |

### Semantic Color Usage
- **Blue**: Links, information, trust
- **Green**: Success, positive, go
- **Red**: Error, important, stop
- **Yellow/Orange**: Warning, attention
- **Purple**: Premium, creative
- **Gray**: Neutral, secondary

---

## Layout Techniques

### The 8-Point Grid
All spacing in multiples of 8: 8, 16, 24, 32, 48, 64, 96, 128. Creates rhythm and consistency.

### Modular Scale
Use a multiplier (1.25, 1.414, 1.618) for proportional sizes:
- Base: 16px
- 1.25 scale: 16, 20, 25, 31, 39, 49...
- 1.414 scale: 16, 23, 32, 45, 64...

### Card Patterns
- **Elevated**: Shadow + white background
- **Outlined**: Border + transparent background
- **Filled**: Colored background + no border
- **Glass**: Blur + transparency (use sparingly)

### Section Rhythm
Alternate section styles: full-bleed image → contained text → asymmetric layout → centered quote.

---

## Polish Techniques

### Micro-Interactions
- Button hover: translate-y(-2px) + shadow increase
- Card hover: subtle scale(1.02) + shadow
- Link hover: underline animate from left
- Focus states: ring with offset, not just outline

### Texture & Depth
- **Grain overlay**: 2-5% opacity noise texture
- **Gradient mesh**: Subtle color transitions
- **Layered shadows**: Multiple shadows at different distances
- **Frosted glass**: backdrop-filter: blur(10px)

### Border Treatments
- **Subtle dividers**: 1px at 10% opacity
- **Accent borders**: 3-4px solid accent color (left edge)
- **Gradient borders**: Via background-clip or pseudo-elements
- **No borders**: Use spacing and color contrast instead

### Image Treatments
- **Duotone filter**: mix-blend-mode: multiply
- **Vignette**: Radial gradient overlay
- **Mask shapes**: clip-path for non-rectangular images
- **Object-fit**: Always specify cover or contain

---

## Dark Mode Specifics

### Color Adjustments
- Reduce saturation by 10-20%
- Avoid pure black (#000); use near-black (#0f0f0f, #121212)
- Avoid pure white (#fff); use off-white (#e5e5e5, #f0f0f0)
- Increase contrast for text
- Reduce shadow intensity

### Surface Hierarchy (Dark)
- Background: #0f0f0f
- Surface 1: #1a1a1a
- Surface 2: #242424
- Surface 3: #2f2f2f

### Elevation in Dark Mode
Higher elevation = lighter surface (not more shadow). Shadows are barely visible; rely on surface color.

---

## Modern Layout Techniques (2025-2026)

### Bento Grid Layouts
Modular grid inspired by Japanese bento boxes—varying cell sizes create visual hierarchy.

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 16px;
}

/* Hero cell spanning 2×2 */
.bento-hero {
  grid-column: span 2;
  grid-row: span 2;
}

/* Wide cell */
.bento-wide {
  grid-column: span 2;
}

/* Tall cell */
.bento-tall {
  grid-row: span 2;
}
```

**Best For**: Dashboards, portfolios, feature showcases, landing pages.

### Container Queries
Let components respond to their container size, not just viewport:

```css
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}
```

**Best For**: Reusable components, design systems, widget-based layouts.

### Fluid Everything (No Breakpoint Approach)
Replace fixed breakpoints with smooth scaling:

```css
:root {
  /* Fluid typography */
  --text-body: clamp(1rem, 0.5vw + 0.9rem, 1.125rem);
  --text-h1: clamp(2rem, 5vw + 1rem, 4rem);

  /* Fluid spacing */
  --space-section: clamp(3rem, 8vw, 8rem);
  --space-component: clamp(1rem, 3vw, 3rem);
}
```

---

## Modern Visual Effects

### Liquid Glass Effect
Apple-inspired translucent surfaces with depth:

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

**Caution**: Test accessibility—ensure text contrast remains sufficient.

### Gradient Mesh / Aurora Backgrounds
Multi-color gradient backgrounds with organic shapes:

```css
.aurora-bg {
  background:
    radial-gradient(ellipse at 20% 30%, rgba(120, 80, 255, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(255, 100, 150, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(80, 200, 255, 0.2) 0%, transparent 60%),
    #0f0f1a;
}
```

### Noise/Grain Texture
Adds warmth and analog feel to digital surfaces:

```css
.grain-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.04;
  pointer-events: none;
}
```

---

## Accessibility-First Techniques

### Focus Indicators (WCAG 2.2 Compliant)
```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: 4px;
}

/* High contrast for dark backgrounds */
[data-theme="dark"] :focus-visible {
  outline-color: #60a5fa;
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch Target Sizing
```css
/* Minimum 44×44px for all interactive elements */
button,
a,
input[type="checkbox"],
input[type="radio"] {
  min-width: 44px;
  min-height: 44px;
}

/* Expand clickable area without changing visual size */
.small-icon-button {
  position: relative;
  padding: 0;
}

.small-icon-button::after {
  content: '';
  position: absolute;
  inset: -8px; /* Expands hit area by 8px in all directions */
}
```

---

## Performance-Conscious Design

### Efficient Shadows
Avoid multiple layered shadows for frequently animated elements:

```css
/* Heavy - avoid on animated elements */
.heavy-shadow {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.1),
    0 4px 8px rgba(0,0,0,0.1),
    0 16px 32px rgba(0,0,0,0.1);
}

/* Light - better for interactive elements */
.light-shadow {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### GPU-Optimized Animations
```css
/* Good - GPU accelerated */
.animate-good {
  transform: translateY(-4px) scale(1.02);
  opacity: 0.9;
}

/* Avoid - triggers layout recalculation */
.animate-avoid {
  top: -4px;
  width: 102%;
  height: 102%;
}
```

### Lazy Visual Effects
```css
/* Apply expensive effects only when visible */
@media (prefers-reduced-motion: no-preference) {
  .glass-effect {
    backdrop-filter: blur(20px);
  }
}

/* Disable blur on low-end devices (via JS class) */
.low-performance .glass-effect {
  backdrop-filter: none;
  background: rgba(0, 0, 0, 0.8);
}
