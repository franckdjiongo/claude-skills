# Responsive Design Guide

Strategies for designing across mobile, tablet, and desktop devices.

---

## Device Landscape (2025-2026)

### Market Reality
- **58%+ of global web traffic** comes from mobile devices
- Mobile-first is the industry standard, not optional
- Users expect seamless experience across all devices

### Device Categories

| Category | Width Range | Example Devices |
|----------|-------------|-----------------|
| Mobile Portrait | 320-480px | iPhone SE, Android phones |
| Mobile Landscape | 480-640px | Phones rotated |
| Tablet Portrait | 640-768px | iPad Mini, small tablets |
| Tablet Landscape | 768-1024px | iPad, Android tablets |
| Small Desktop | 1024-1280px | Laptops, older monitors |
| Desktop | 1280-1440px | Standard monitors |
| Large Desktop | 1440-1920px+ | Wide monitors, 4K displays |

---

## Breakpoints

### Recommended Breakpoint System

```css
/* Mobile-first breakpoints */
:root {
  /* Base: 0-639px (mobile) */
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small laptops */
  --breakpoint-xl: 1280px;  /* Desktops */
  --breakpoint-2xl: 1536px; /* Large screens */
}

/* Usage with mobile-first approach */
.element {
  /* Mobile styles (default) */
  padding: 16px;
}

@media (min-width: 640px) {
  .element { padding: 24px; }
}

@media (min-width: 1024px) {
  .element { padding: 32px; }
}
```

### Container Widths

| Breakpoint | Container Max-Width |
|------------|---------------------|
| < 640px | 100% (full width) |
| 640-767px | 640px |
| 768-1023px | 768px |
| 1024-1279px | 1024px |
| 1280-1535px | 1200px |
| 1536px+ | 1400px |

---

## Mobile Design (< 640px)

### Layout Principles
- **Single column**: Stack content vertically
- **Full-width elements**: Maximize screen real estate
- **Thumb-friendly zones**: Primary actions in bottom 1/3 of screen
- **Generous touch targets**: Minimum 44×44px (prefer 48×48px)

### Navigation Patterns
- **Hamburger menu**: Collapsible for complex navigation
- **Bottom navigation bar**: For 3-5 primary destinations (like iOS/Android apps)
- **Tab bar**: For section switching within a view
- **Slide-out drawer**: For secondary navigation and settings

### Typography Scale (Mobile)

| Element | Size | Line Height |
|---------|------|-------------|
| Display | 32-40px | 1.1-1.2 |
| H1 | 28-32px | 1.2 |
| H2 | 22-26px | 1.3 |
| H3 | 18-20px | 1.3 |
| Body | 16px | 1.5-1.6 |
| Small | 14px | 1.4 |
| Caption | 12px | 1.4 |

### Mobile-Specific Techniques
```css
/* Prevent zoom on input focus (iOS) */
input, select, textarea {
  font-size: 16px;
}

/* Safe area for notched devices */
.container {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Prevent horizontal scroll */
html, body {
  overflow-x: hidden;
}

/* Smooth scrolling with momentum */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### Touch Interaction Design
- **Swipe gestures**: For carousels, dismissible elements, navigation
- **Pull-to-refresh**: For content updates
- **Long-press**: For context menus (with visual feedback)
- **Tap vs. hover**: Design for tap-first, hover as enhancement

---

## Tablet Design (640-1024px)

### Layout Principles
- **Two-column layouts**: Side-by-side content becomes viable
- **Split views**: Master-detail patterns work well
- **Adaptive grids**: 2-3 columns for card layouts
- **Both orientations**: Design for portrait AND landscape

### Navigation Patterns
- **Collapsible sidebar**: Persistent in landscape, collapsible in portrait
- **Tab bar expansion**: More items visible than mobile
- **Contextual toolbars**: Action bars for selected items

### Typography Scale (Tablet)

| Element | Size | Line Height |
|---------|------|-------------|
| Display | 40-56px | 1.1-1.2 |
| H1 | 32-40px | 1.2 |
| H2 | 26-30px | 1.3 |
| H3 | 20-24px | 1.3 |
| Body | 16-18px | 1.5-1.6 |
| Small | 14px | 1.4 |

### Tablet-Specific Patterns
```css
/* Two-column card grid */
@media (min-width: 640px) {
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

/* Split view (master-detail) */
@media (min-width: 768px) {
  .split-view {
    display: grid;
    grid-template-columns: 300px 1fr;
  }
}

/* Collapsible sidebar */
.sidebar {
  position: fixed;
  width: 280px;
  transform: translateX(-100%);
  transition: transform 0.3s ease-out;
}

.sidebar.open {
  transform: translateX(0);
}

@media (min-width: 1024px) {
  .sidebar {
    position: static;
    transform: none;
  }
}
```

---

## Desktop Design (1024px+)

### Layout Principles
- **Multi-column layouts**: 3-4+ columns possible
- **Persistent navigation**: Sidebars, top bars always visible
- **Dense information**: More content visible simultaneously
- **Hover states**: Essential—users expect hover feedback

### Navigation Patterns
- **Horizontal nav bar**: Full menu visibility
- **Sticky header**: Keeps navigation accessible while scrolling
- **Sidebar navigation**: For complex apps with many sections
- **Mega menus**: For large sites with deep hierarchies

### Typography Scale (Desktop)

| Element | Size | Line Height |
|---------|------|-------------|
| Display | 48-72px | 1.1-1.2 |
| H1 | 36-48px | 1.2-1.3 |
| H2 | 28-32px | 1.3 |
| H3 | 22-24px | 1.4 |
| Body Large | 18-20px | 1.6-1.7 |
| Body | 16px | 1.5-1.6 |
| Small | 14px | 1.5 |

### Desktop-Specific Techniques
```css
/* Max content width for readability */
.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}

/* Prose max-width for readability (60-75 chars) */
.prose {
  max-width: 65ch;
}

/* Multi-column card grid */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Hover states */
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  transition: all 0.2s ease-out;
}
```

---

## Fluid Design Techniques

### Fluid Typography (Clamp)
Replace breakpoint-based sizing with smooth scaling:

```css
/* Fluid display heading */
h1 {
  font-size: clamp(2rem, 5vw + 1rem, 4rem);
  /* Min: 32px, Scales with viewport, Max: 64px */
}

/* Fluid body text */
body {
  font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
  /* Min: 16px, Scales slightly, Max: 18px */
}
```

### Fluid Spacing
```css
:root {
  /* Fluid spacing scale */
  --space-sm: clamp(0.5rem, 1vw, 1rem);
  --space-md: clamp(1rem, 2vw, 2rem);
  --space-lg: clamp(1.5rem, 4vw, 4rem);
  --space-xl: clamp(2rem, 6vw, 6rem);
}

section {
  padding: var(--space-xl) var(--space-md);
}
```

### Container Queries (Modern Approach)
Let components respond to their container, not just viewport:

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (min-width: 600px) {
  .card {
    grid-template-columns: 300px 1fr;
  }
}
```

---

## Component Adaptation Patterns

### Cards
| Screen Size | Layout | Image Treatment |
|-------------|--------|-----------------|
| Mobile | Full-width, stacked | Top image, full-width |
| Tablet | 2-col grid | Side image or top image |
| Desktop | 3-4 col grid | Flexible, hover effects |

### Data Tables
| Screen Size | Strategy |
|-------------|----------|
| Mobile | Card view, horizontal scroll, or column priority |
| Tablet | Horizontal scroll with frozen first column |
| Desktop | Full table with all columns visible |

```css
/* Mobile: Convert table to cards */
@media (max-width: 639px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }
  thead { display: none; }
  tr {
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }
  td::before {
    content: attr(data-label);
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
}
```

### Forms
| Screen Size | Layout | Notes |
|-------------|--------|-------|
| Mobile | Single column, full-width inputs | Large touch targets |
| Tablet | Single column, constrained width | 480-600px max-width |
| Desktop | Multi-column for related fields | Side-by-side first/last name |

### Images
```css
/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Art direction with picture element */
<picture>
  <source media="(min-width: 1024px)" srcset="hero-desktop.jpg">
  <source media="(min-width: 640px)" srcset="hero-tablet.jpg">
  <img src="hero-mobile.jpg" alt="Hero image">
</picture>
```

---

## Testing Checklist

### Breakpoint Testing
- [ ] Test at each major breakpoint (320, 640, 768, 1024, 1280, 1536)
- [ ] Test between breakpoints (resize slowly to find issues)
- [ ] Test with browser DevTools device emulation
- [ ] Test on real devices (behavior differs from emulators)

### Device-Specific Testing
- [ ] iPhone SE (smallest common iOS device)
- [ ] iPhone 14/15 Pro Max (largest common iOS device)
- [ ] Popular Android devices (Samsung Galaxy, Pixel)
- [ ] iPad Mini and iPad Pro
- [ ] Various desktop resolutions

### Interaction Testing
- [ ] Touch interactions work smoothly on mobile/tablet
- [ ] Hover states work on desktop
- [ ] Focus states visible for keyboard navigation
- [ ] Text remains readable at all sizes
- [ ] Touch targets meet minimum size (44×44px)

### Performance Testing
- [ ] Test on slow network (3G simulation)
- [ ] Test on lower-end devices
- [ ] Images load appropriately for device
- [ ] No layout shift as content loads

---

## Common Mistakes to Avoid

### Layout Mistakes
- ❌ Fixed widths that cause horizontal scroll
- ❌ Content that disappears at certain breakpoints
- ❌ Hover-only interactions without touch alternatives
- ❌ Typography that doesn't scale appropriately

### Navigation Mistakes
- ❌ Hamburger menu on desktop (wastes space)
- ❌ Too many nav items on mobile bottom bar (max 5)
- ❌ Tap targets too close together
- ❌ No visual feedback on tap/click

### Performance Mistakes
- ❌ Loading desktop images on mobile
- ❌ Heavy animations on mobile devices
- ❌ Blocking resources that delay first paint
- ❌ Not lazy-loading below-fold content

---

## Quick Reference: Device-Specific Decisions

| Decision | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Columns | 1 | 2-3 | 3-6 |
| Nav style | Hamburger/bottom | Collapsible sidebar | Full horizontal |
| Touch targets | 48×48px | 44×44px | Can be smaller |
| Hover effects | None required | Nice to have | Essential |
| Content density | Low | Medium | High |
| Typography | Smaller scale | Medium scale | Full scale |
| Images | Optimized/cropped | Medium resolution | Full resolution |
| Animations | Minimal | Moderate | Full |
