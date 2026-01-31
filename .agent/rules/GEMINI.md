---
trigger: always_on
---

# Skills App - Instructions

This is the **Skills Library Web Application** - a mobile-first React app for browsing and discovering Claude Code skills.

## Tech Stack

- **Vite** - Build tool and dev server
- **React 18** + **TypeScript** - UI framework
- **Motion (Framer Motion)** - Animations and transitions
- **Lucide React** - Icon library
- **CSS Custom Properties** - Theming system (no CSS framework)

## Commands

```bash
npm run dev     # Start development server (port 5173)
npm run build   # Production build to dist/
npm run preview # Preview production build
npm run lint    # Run ESLint
```

## Project Structure

```
src/
├── components/     # React components
│   ├── Header.tsx
│   ├── SkillCard.tsx
│   ├── SkillGrid.tsx
│   ├── SkillDetail.tsx      # Bottom sheet (mobile) / modal (desktop)
│   ├── ComparisonModal.tsx  # Side-by-side skill comparison
│   ├── StatsDashboard.tsx   # Analytics modal
│   ├── Sidebar.tsx          # Repository browser
│   ├── CategoryChips.tsx    # Horizontal scrolling filter
│   └── *.css                # Component-specific styles
├── data/
│   └── skills.ts            # Skills data and search functions
├── hooks/                   # Custom React hooks
│   ├── useFavorites.ts
│   ├── useComparison.ts
│   ├── useTheme.ts
│   └── ...
├── styles/
│   └── globals.css          # Design tokens and base styles
├── types/
│   └── index.ts             # TypeScript type definitions
└── utils/                   # Utility functions
```

## Design System

**Neo-Terminal / Cyberpunk aesthetic:**

- **Colors**: Dark theme with deep blacks (`#0a0a0f`), electric accents (cyan `#00f0ff`, magenta `#ff00d4`, gold `#ffd700`)
- **Fonts**: JetBrains Mono (code) + Outfit (display)
- **Effects**: Holographic card glow, scanline overlay, grid background

**CSS Variables** are defined in `globals.css`:
- `--bg-*` for backgrounds
- `--text-*` for typography
- `--accent-*` for accent colors
- `--space-*` for spacing
- `--radius-*` for border radius
- `--z-*` for z-index layers

## Key Patterns

### Modal Positioning

Modals use fixed positioning with viewport centering on desktop and bottom-sheet style on mobile:

```css
/* Desktop: centered */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
}

/* Mobile: bottom sheet */
@media (max-width: 768px) {
  .modal {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
  }
}
```

### Component CSS

Each component has its own `.css` file imported directly. Use CSS custom properties for theming consistency.

### Animations

Use Motion (Framer Motion) for complex animations:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
/>
```

## Adding New Skills

Skills data lives in `src/data/skills.ts`. To add skills:

1. Add skill object to the `skills` array
2. Update category counts if needed
3. The app will automatically pick up changes

## Common Tasks

### Fix modal positioning issues
- Ensure `right: auto` and `bottom: auto` are set for desktop centering
- Add explicit desktop media query with `min-width` to reinforce positioning
- Check z-index conflicts in `globals.css` (`--z-modal: 1000`)

### Add new component
1. Create `ComponentName.tsx` in `src/components/`
2. Create `ComponentName.css` for styles
3. Export from `src/components/index.ts`
4. Import and use in `App.tsx`

### Modify theme
- Edit CSS variables in `src/styles/globals.css`
- Light theme overrides are in `[data-theme="light"]` selector
