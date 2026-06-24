# Design Interrogation Checklist

Questions to ask before delivering any visual output. Work through systematically.

## 1. Typography

- [ ] Is the type hierarchy clear? (3 levels max: headline, subhead, body)
- [ ] Are font choices distinctive? (No Inter, Roboto, Arial, system defaults)
- [ ] Is there contrast between display and body fonts?
- [ ] Are sizes creating proper visual weight? (Headlines should dominate)
- [ ] Is line-height appropriate? (1.2-1.4 headlines, 1.5-1.7 body)
- [ ] Is letter-spacing intentional? (Tighter headlines, normal body)
- [ ] Are widths controlled? (60-75 characters for readability)

## 2. Color

- [ ] Is there a clear dominant color? (60-30-10 rule)
- [ ] Does the palette have intentional relationships? (Complementary, analogous, triadic)
- [ ] Are accent colors used sparingly for emphasis?
- [ ] Is contrast sufficient for readability? (WCAG AA minimum)
- [ ] Does color support hierarchy? (Not just decoration)
- [ ] Are colors defined as variables for consistency?

## 3. Layout & Composition

- [ ] Is there a clear grid or structural logic?
- [ ] Is whitespace generous and intentional?
- [ ] Are elements aligned to a consistent baseline?
- [ ] Is there visual tension or interest? (Asymmetry, overlap, diagonal flow)
- [ ] Does the eye flow naturally through the content?
- [ ] Are margins and padding consistent? (Use 8pt or 4pt grid)

## 4. Visual Details

- [ ] Are corners consistent? (All sharp, all rounded, or intentionally mixed)
- [ ] Are shadows purposeful? (Creating depth, not just decoration)
- [ ] Is there texture or background interest? (Not just solid colors)
- [ ] Are borders used minimally and consistently?
- [ ] Do icons match the overall aesthetic?
- [ ] Are images high quality and properly cropped?

## 5. Polish & Refinement

- [ ] Would a design director approve this?
- [ ] Does it feel hand-crafted or template-generated?
- [ ] Is every element intentional? (Can you justify each choice?)
- [ ] What would improve it by 20%? (Make that change)
- [ ] Does it have a memorable characteristic?
- [ ] Would you be proud to show this to a client?

## 6. Responsive & Device Adaptation

- [ ] Does the design work on mobile (320-480px)?
- [ ] Does the design work on tablet (640-1024px)?
- [ ] Does the design work on desktop (1024px+)?
- [ ] Is navigation adapted per device? (hamburger mobile, full nav desktop)
- [ ] Are touch targets at least 44×44px on touch devices?
- [ ] Does typography scale appropriately across devices?
- [ ] Are images responsive and optimized for each device?
- [ ] Does content hierarchy change sensibly between breakpoints?

## 7. Accessibility (WCAG 2.2)

- [ ] Does text meet contrast ratio? (4.5:1 normal, 3:1 large)
- [ ] Do UI components meet contrast ratio? (3:1 against adjacent colors)
- [ ] Are focus indicators visible? (2px outline, 3:1 contrast)
- [ ] Is information conveyed without relying on color alone?
- [ ] Are interactive elements keyboard accessible?
- [ ] Do form inputs have associated labels?
- [ ] Is there sufficient spacing between touch targets? (6px minimum)
- [ ] Are animations respectful of prefers-reduced-motion?

## 8. Modern Standards (2025-2026)

- [ ] Are design tokens/CSS variables used for consistency?
- [ ] Is fluid typography implemented (clamp) where appropriate?
- [ ] Are modern layout techniques used? (CSS Grid, Container Queries)
- [ ] Is dark mode supported (if applicable)?
- [ ] Is the design performant? (appropriate image formats, lazy loading)
- [ ] Does it avoid current "AI aesthetic" patterns?

## Red Flags (Fix Immediately)

- Default fonts without explicit selection
- Evenly distributed color palette (no hierarchy)
- Cookie-cutter layouts without context-specific choices
- Generic gradient backgrounds (especially purple)
- Shadows on everything or nothing
- Inconsistent spacing values
- Decorative elements without purpose
- Touch targets under 44×44px on mobile
- Text contrast below 4.5:1
- No focus indicators for keyboard navigation
- Horizontal scroll on mobile devices
- Desktop-only hover interactions without touch alternatives
