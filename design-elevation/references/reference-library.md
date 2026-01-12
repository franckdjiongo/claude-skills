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
