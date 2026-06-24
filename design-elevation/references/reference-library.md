# Design Reference Library

Exemplars and principles to draw from. Not to copy—to understand and adapt.

## Design Systems to Study

### Stripe
**Signature**: Obsessive polish, gradient meshes, buttery animations.
- Color: Deep blue-purple backgrounds, vibrant gradients
- Typography: Tight, confident headlines; generous body text
- Layout: Asymmetric hero sections, generous whitespace
- Details: Micro-interactions on everything, 3D elements
- **Lesson**: Every pixel matters. If it's worth doing, it's worth polishing.

### Linear
**Signature**: Monochrome sophistication, restraint as luxury.
- Color: Near-black + white + one accent (purple/blue)
- Typography: Inter (but executed perfectly), tight tracking
- Layout: Clean grids, generous spacing, minimal decoration
- Details: Subtle reveals, keyboard-first thinking
- **Lesson**: Remove until you can't. Then remove more.

### Apple
**Signature**: Dramatic photography, typographic confidence, spatial luxury.
- Color: High contrast, product-first color stories
- Typography: SF Pro at extreme sizes, weight as hierarchy
- Layout: Full-bleed imagery, centered compositions, scroll-triggered reveals
- Details: Smooth 60fps animations, parallax depth
- **Lesson**: Let the product be the hero. Everything else serves it.

### Notion
**Signature**: Friendly minimalism, content-first flexibility.
- Color: Warm neutrals, soft accents
- Typography: Readable, approachable, system fonts done well
- Layout: Block-based, breathing room
- Details: Playful illustrations, empty state delight
- **Lesson**: Simple doesn't mean boring. Personality in restraint.

### Vercel
**Signature**: Developer aesthetic, terminal-inspired precision.
- Color: Pure black + white + syntax highlighting accents
- Typography: Geist, monospace for code
- Layout: Dense information, clear hierarchy
- Details: Code animations, gradient text
- **Lesson**: Know your audience. Speak their visual language.

---

## Historical Design Movements

### Swiss/International Style
**Principles**: Grid systems, objective photography, sans-serif type, asymmetric layouts.
- Mathematical proportions
- Limited color palette
- Clean, rational hierarchy
- **When to use**: Data-heavy content, professional contexts, when clarity is paramount.

### Bauhaus
**Principles**: Form follows function, geometric shapes, primary colors, industrial materials.
- Circle, square, triangle as building blocks
- Red, yellow, blue as accent system
- Sans-serif typography
- **When to use**: Bold statements, artistic contexts, brand identities.

### Art Deco
**Principles**: Geometric patterns, metallic colors, symmetry, luxury materials.
- Gold, silver, black color stories
- Repeating patterns at borders
- Decorative type treatments
- **When to use**: Premium products, entertainment, event materials.

### Brutalism
**Principles**: Raw materials, exposed structure, bold forms, honest construction.
- System fonts, harsh contrasts
- Visible grid structures
- Minimal ornamentation
- **When to use**: Counter-cultural brands, statement pieces, portfolios.

---

## Typography References

### Google Fonts (Quality Selections)

**Display Fonts**
- Playfair Display: Editorial elegance
- DM Serif Display: Modern classic
- Fraunces: Variable, personality
- Bebas Neue: Bold impact
- Syne: Contemporary forward
- Space Grotesk: Technical precision
- Outfit: Clean geometric

**Body Fonts**
- Source Sans 3: Versatile workhorse
- IBM Plex Sans: Technical readability
- Work Sans: Friendly geometric
- General Sans: Modern neutral
- DM Sans: Clean companion to DM Serif
- Nunito: Rounded approachability

### Type Scale (Desktop)

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Display | 48-72px | 700-900 | 1.1-1.2 |
| H1 | 36-48px | 600-700 | 1.2-1.3 |
| H2 | 28-32px | 600 | 1.3 |
| H3 | 22-24px | 600 | 1.4 |
| Body Large | 18-20px | 400 | 1.6-1.7 |
| Body | 16px | 400 | 1.5-1.6 |
| Small | 14px | 400 | 1.5 |
| Caption | 12px | 500 | 1.4 |

---

## Color Systems

### Neutral Foundations

**Warm Neutrals** (approachable, human)
- Background: #f9f7f4
- Surface: #ffffff
- Text: #2d2a26
- Muted: #6b6560

**Cool Neutrals** (professional, technical)
- Background: #f8f9fa
- Surface: #ffffff
- Text: #1a1d21
- Muted: #6c757d

**Dark Foundations**
- Background: #0f0f0f or #121212
- Surface: #1a1a1a
- Elevated: #242424
- Text: #e5e5e5
- Muted: #888888

### Accent Color Psychology

| Color | Associations | Use For |
|-------|-------------|---------|
| Blue (#0066ff) | Trust, stability, tech | Links, CTAs, info |
| Green (#22c55e) | Growth, success, nature | Positive actions, confirmations |
| Red (#ef4444) | Energy, urgency, error | Warnings, important actions |
| Orange (#f97316) | Warmth, creativity, caution | Highlights, warnings |
| Purple (#8b5cf6) | Premium, creative, wisdom | Luxury, creative brands |
| Teal (#14b8a6) | Calm, sophisticated, health | Healthcare, wellness |
| Pink (#ec4899) | Playful, modern, bold | Youth, creative, fashion |

---

## Layout Principles

### Golden Ratio (1.618)
- Divide space in 1:1.618 ratio for pleasing proportions
- Use for hero splits, sidebar ratios, image crops

### Rule of Thirds
- Place focal points at intersection of third-lines
- More dynamic than center placement

### Z-Pattern (Scanning)
- Eye moves: top-left → top-right → diagonal → bottom-left → bottom-right
- Place key content along this path

### F-Pattern (Reading)
- Eye scans horizontally at top, less horizontally below, then vertical scan
- For text-heavy content, place important info in top-left

### Visual Weight Factors
- Size: Larger = heavier
- Color: Darker/saturated = heavier
- Position: Lower/right = needs more weight to balance
- Isolation: Alone = heavier than grouped
- Complexity: Detailed = heavier than simple

---

## Animation Principles

### Easing Functions
- **ease-out**: For elements entering (starts fast, ends slow)
- **ease-in**: For elements leaving (starts slow, ends fast)
- **ease-in-out**: For state changes (smooth both ends)
- **linear**: Only for continuous animations (loading spinners)

### Duration Guidelines
- Micro-interactions: 100-200ms
- Small transitions: 200-300ms
- Medium transitions: 300-400ms
- Large/complex: 400-600ms
- Page transitions: 400-800ms

### Animation Properties
- **Prefer**: transform, opacity (GPU-accelerated)
- **Avoid**: width, height, top, left (trigger layout)
- **Consider**: filter (moderate performance cost)

---

## 2025-2026 Design Trends

### Liquid Glass / Glassmorphism 2.0
**Definition**: Translucent surfaces with depth, light refraction, and fluid motion—inspired by Apple's evolved design language.

**Key Characteristics**:
- Surfaces appear dynamic, reflecting light as users interact
- Layered translucent elements create depth and atmosphere
- Subtle motion and blur effects
- Works best on vibrant or gradient backgrounds

**Implementation**:
```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
```

**When to Use**: Premium products, immersive experiences, modern apps. Avoid on low-contrast backgrounds or when accessibility is paramount.

### Bento Grid Layouts
**Definition**: Modular grid systems inspired by Japanese bento boxes—organizing content into distinct rectangular compartments of varying sizes.

**Why It Works**:
- Research shows carousel banners get <1% clicks, with 89% going to the first slide
- Bento grids display multiple content pieces simultaneously
- Creates visual hierarchy through size variation
- Perfect for dashboards, portfolios, feature showcases

**Best Practices**:
- Use CSS Grid with `grid-template-columns` and `grid-template-rows`
- Create visual hierarchy with larger "hero" cells
- Maintain consistent gaps (16-24px typically)
- Make responsive: stack cells vertically on mobile

**Implementation**:
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: var(--space-lg);
}
.bento-hero {
  grid-column: span 2;
  grid-row: span 2;
}
```

### Material Expressive / Sensory Design
**Definition**: Google's Material Design evolution focusing on dynamic motion, tactile feedback, and interfaces that feel "alive."

**Key Characteristics**:
- Motion responds to user input with physics-based animation
- Surfaces react with depth changes and haptic-like visual feedback
- Expressive color and type that adapts to context
- Bold personality while maintaining usability

### AI-Adaptive Interfaces
**Definition**: UIs that learn and adapt based on user behavior, context, and preferences.

**Design Considerations**:
- Show AI reasoning transparently (explainable AI)
- Allow users to override AI decisions
- Design "agentic" experiences where the UI anticipates needs
- Personalize layouts, not just content
- 80% of users prefer tailored experiences

### Voice & Multimodal Interfaces
**Definition**: Interfaces blending voice, touch, and visual interaction depending on context.

**Design Considerations**:
- Design for hands-busy scenarios (cooking, driving, carrying items)
- Provide visual feedback for voice commands
- Support both input methods interchangeably
- Nearly 50% of US population expected to use voice assistants by 2026

---

## Accessibility Standards (WCAG 2.2)

### Color Contrast Requirements

| Element Type | Minimum Ratio (AA) | Enhanced (AAA) |
|--------------|-------------------|----------------|
| Normal text (<18pt) | 4.5:1 | 7:1 |
| Large text (≥18pt or ≥14pt bold) | 3:1 | 4.5:1 |
| UI components & graphics | 3:1 | 3:1 |
| Focus indicators | 3:1 | 3:1 |

### Touch Target Requirements

| Guideline | Minimum Size | Recommended |
|-----------|--------------|-------------|
| WCAG 2.2 AA | 24×24 px | 44×44 px |
| Apple HIG | 44×44 pt | 44×44 pt |
| Material Design | 48×48 dp | 48×48 dp |
| Best Practice | 44×44 px | 48×48 px + 8px spacing |

**Key Rules**:
- Minimum 6px inactive space between actionable elements
- Touch targets can extend beyond visible boundaries
- Inline links exempt if text is sentence-sized
- Always test with real devices, not just simulators

### Focus Visibility (WCAG 2.2 Updates)
- Focus indicators must be clearly visible (2.4.7)
- Cannot be fully obscured from viewport
- Minimum 2px outline thickness recommended
- 3:1 contrast ratio against adjacent colors

### Don't Rely on Color Alone
- Error states need text/icons, not just red
- Success messages need indicators beyond green
- Active tabs need more than color change
- Links should have underlines or other visual cues

---

## Design Tokens

### Token Architecture (Three-Tier)

**1. Global Tokens (Primitives)**
Raw values without context—your palette:
```json
{
  "color": {
    "blue-500": "#3b82f6",
    "blue-600": "#2563eb",
    "gray-100": "#f3f4f6"
  }
}
```

**2. Alias Tokens (Semantic)**
Contextual meaning:
```json
{
  "color": {
    "brand-primary": "{color.blue-600}",
    "background-default": "{color.gray-100}",
    "text-primary": "{color.gray-900}"
  }
}
```

**3. Component Tokens (Specific)**
Component-level decisions:
```json
{
  "button": {
    "primary-background": "{color.brand-primary}",
    "primary-text": "{color.white}",
    "border-radius": "{radius.md}"
  }
}
```

### Benefits
- Single source of truth across platforms
- Theme switching becomes trivial
- Design-dev handoff is explicit
- Same token generates CSS, iOS Swift, Android XML

### Implementation with CSS Variables
```css
:root {
  /* Global */
  --color-blue-600: #2563eb;

  /* Semantic */
  --color-brand-primary: var(--color-blue-600);

  /* Component */
  --button-primary-bg: var(--color-brand-primary);
}

[data-theme="dark"] {
  --color-brand-primary: #60a5fa;
}
```

---

## Modern Typography (2025 Updates)

### Variable Fonts
**Benefits**: Single file, infinite weights/widths, smaller file sizes, dynamic adjustments.

**Recommended Variable Fonts**:
- **Inter**: wght 100-900, comprehensive language support
- **Plus Jakarta Sans**: wght 200-800, modern geometric
- **Manrope**: wght 200-800, distinctive personality
- **Space Grotesk**: wght 300-700, technical aesthetic
- **Outfit**: wght 100-900, clean geometric

**Usage**:
```css
@font-face {
  font-family: 'Inter';
  src: url('Inter-VariableFont.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

h1 {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-variation-settings: 'wght' 700;
}
```

### Fluid Typography with Clamp
Replace fixed breakpoints with smooth scaling:
```css
h1 {
  /* Min: 32px, Preferred: 5vw, Max: 64px */
  font-size: clamp(2rem, 5vw, 4rem);
}

body {
  /* Min: 16px, Preferred: 1.5vw, Max: 20px */
  font-size: clamp(1rem, 1.5vw, 1.25rem);
}
```

### Bold Typography Trend
2025-2026 sees a move toward:
- Oversized display headlines (80-120px+)
- Extreme weight contrasts (100 vs 900)
- Tighter letter-spacing for impact (-0.03em)
- Custom/distinctive font choices over system fonts

---

## Sustainable & Performant Design

### Why It Matters
- Users increasingly aware of digital environmental impact
- 39% stop engaging if loading takes too long
- Energy-efficient design = better UX = better business

### Green Design Principles
1. **Fewer unnecessary animations**: Use motion purposefully
2. **Lighter file sizes**: Optimize images, use modern formats (WebP, AVIF)
3. **Fast-loading pages**: Lazy load below-fold content
4. **Reduced data transfer**: Cache aggressively, compress assets
5. **Dark mode**: OLED screens consume less power with dark UIs

### Performance Budget Examples
| Asset Type | Budget (per page) |
|------------|-------------------|
| Total page weight | <1.5MB |
| Images | <500KB |
| JavaScript | <300KB |
| Fonts | <100KB |
| CSS | <50KB |
