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
