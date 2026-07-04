# Elevation Protocol

Systematic process for transforming functional output into polished design.

## Phase 1: Functional Draft

Build the structure first. Get all content in place. Don't style yet.

**Deliverable**: Working layout with placeholder styling. Ugly is fine.

---

## Phase 2: Foundation Pass

Establish the design system before making individual choices.

### 2.1 Define Variables
```css
:root {
  /* Typography */
  --font-display: 'Display Font', serif;
  --font-body: 'Body Font', sans-serif;
  
  /* Colors */
  --color-primary: #value;
  --color-secondary: #value;
  --color-accent: #value;
  --color-text: #value;
  --color-text-muted: #value;
  --color-background: #value;
  --color-surface: #value;
  
  /* Spacing (8pt grid) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### 2.2 Apply Typography
- Set display font on headings
- Set body font on text
- Establish size scale
- Set line-heights
- Add letter-spacing where needed

### 2.3 Apply Color
- Background surfaces
- Text colors (primary, secondary, muted)
- Accent placements (sparingly)

**Deliverable**: Consistent, systematic styling. Still basic, but coherent.

---

## Phase 3: Composition Pass

Refine layout and spatial relationships.

### 3.1 Spacing Audit
- Check all margins use system values
- Check all padding uses system values
- Verify spacing relationships (tight within groups, generous between)

### 3.2 Alignment Check
- Verify grid adherence
- Check baseline alignment
- Confirm edge consistency

### 3.3 Visual Flow
- Does the eye move naturally?
- Is there a clear focal point?
- Is hierarchy working?

**Deliverable**: Well-composed layout with intentional spatial relationships.

---

## Phase 4: Detail Pass

Add refinements that create polish.

### 4.1 Micro Details
- Border treatments
- Shadow refinements
- Corner radius consistency
- Icon sizing and alignment

### 4.2 State Treatments
- Hover states
- Focus states
- Active states
- Disabled states

### 4.3 Texture & Depth
- Background treatments
- Surface elevation
- Subtle patterns or gradients

**Deliverable**: Refined output with attention to details.

---

## Phase 5: Distinction Pass

Make it memorable. This is where good becomes excellent.

### 5.1 Signature Element
Identify one thing that makes this distinctive:
- Unique color treatment?
- Memorable typography moment?
- Unexpected layout choice?
- Custom visual element?

### 5.2 Intentional Surprise
Add one element that breaks expectation:
- Oversized type
- Unusual color accent
- Asymmetric composition
- Animated detail

### 5.3 Remove One Thing
Find one element that isn't earning its place. Remove it.

**Deliverable**: Distinctive output with clear point of view.

---

## Phase 6: Validation Pass

Final quality check before delivery. **This pass is scored and posted — it is not a set of self-directed questions.** "Distance / Comparison / Pride" tests done "in your head" are removed: an LLM always passes them. Replace them with objective, measured criteria.

### 6.1 Post the Scored Validation Grid
Run the 12-criterion grid from `interrogation-checklist.md` (§ Scored Validation Grid) and **post it as an artifact**, one row per criterion with its **real measured value** — never a bare score. At least four rows are measured mechanically:
- forbidden display fonts → `grep` the output
- body & muted contrast → `node scripts/contrast-check.mjs <fg> <bg>` (paste the ratio)
- AI-slop tells → `node scripts/slop-lint.mjs <file>` (paste the count/verdict)

### 6.2 Gate
**Score < 10/12 → mandatory correction pass** (fix the failing rows, re-measure, re-post), max 3 iterations. Any row still short after 3 passes is **documented as a known deviation** with its reason — never silently passed.

### 6.3 Emit the Design Decisions block
Attach the compact **Design Decisions** block (fonts + reason, palette + 60-30-10 distribution, signature element, media strategy, grid result `N/12`). The reasoning is now visible, not internal.

**Deliverable**: Final output + posted scored grid + Design Decisions block.

---

## Time Allocation Guide

For a typical visual output:

| Phase | % of Time | Focus |
|-------|-----------|-------|
| Functional Draft | 20% | Structure, content |
| Foundation Pass | 15% | System, consistency |
| Composition Pass | 20% | Layout, spacing |
| Detail Pass | 20% | Polish, refinement |
| Distinction Pass | 15% | Memorability |
| Validation Pass | 10% | Quality assurance |

---

## Emergency Elevation Checklist (locked — explicit request only)

Emergency mode skips phases and their gates. **Do NOT auto-trigger it** because a task looks small or urgent. It runs **only on an explicit user request** ("mode urgence", "vite fait, saute les étapes"), and when it runs you must **announce**: *"mode urgence — phases X, Y sautées"* naming the skipped phases. Absent an explicit request, run the full protocol including the scored grid (Phase 6).

When legitimately requested, prioritize these:

1. **Typography**: switch to better fonts, establish clear hierarchy (Inter still banned in display)
2. **Color**: apply intentional palette, not defaults
3. **Spacing**: generous margins, consistent padding
4. **One signature element**: make one thing memorable
5. **Remove clutter**: delete unnecessary decorations

---

## Common Elevation Patterns

### Dashboard → Professional Dashboard
- Replace default grays with branded neutrals
- Add subtle card elevation
- Improve chart colors and typography
- Add empty state illustrations
- Refine data visualization hierarchy

### Landing Page → Compelling Landing Page
- Hero with personality (gradient, image treatment, animation)
- Strong typographic hierarchy
- Social proof with design attention
- CTA with clear visual weight
- Footer that doesn't feel forgotten

### Presentation → Memorable Presentation
- Consistent slide system
- Hero typography on key slides
- Data visualization refinement
- Transition between sections
- Visual breathing room

### Form → Delightful Form
- Clear input hierarchy
- Helpful inline validation
- Progress indication
- Success state celebration
- Error handling with grace
