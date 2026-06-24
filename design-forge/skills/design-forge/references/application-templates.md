# Application-Type Templates

Per-app-category brief guidance plus complete, paste-ready model briefs. Use this file in BRIEF mode to (1) inherit a category's default archetype and conventions without asking the user about every component, and (2) lift a full worked brief as a model for the user's own.

This file owns the per-category quick guides and the complete worked transformations. It does NOT re-explain archetype philosophy (see `references/archetype-library.md`) or the 6-part brief ordering theory (see `references/prompt-structure.md`). For natural-language spec phrasing (color/type/spacing without code) see `references/spec-language.md`; for the anti-slop vocabulary see `references/anti-slop-rules.md`.

## Table of Contents
- [How to Use This File](#how-to-use-this-file)
- [Part 1 — Per-Category Quick Guides](#part-1--per-category-quick-guides)
  - [Dashboard](#dashboard)
  - [Landing Page](#landing-page)
  - [Form-Heavy App](#form-heavy-app)
  - [Data-Table App](#data-table-app)
  - [Content Platform](#content-platform)
  - [E-commerce](#e-commerce)
  - [Documentation Site](#documentation-site)
  - [Admin Panel](#admin-panel)
  - [Mobile Web App](#mobile-web-app)
- [Part 2 — Complete Worked Briefs (Paste-Ready Models)](#part-2--complete-worked-briefs-paste-ready-models)
  - [Model A — Project-Management Dashboard](#model-a--project-management-dashboard)
  - [Model B — Todo App](#model-b--todo-app)
  - [Model C — Construction-Hours Tracker](#model-c--construction-hours-tracker)
  - [Model D — AI Startup Landing Page](#model-d--ai-startup-landing-page)
  - [Model E — Server-Monitoring Dashboard](#model-e--server-monitoring-dashboard)
  - [Model F — Recipe-Sharing Community](#model-f--recipe-sharing-community)

## How to Use This File
1. Identify the user's app category. Map it to a row in Part 1 to inherit the default archetype, what to nail down, what to leave to the model, and the one anti-slop line that category most needs.
2. Find the closest worked brief in Part 2 and use it as the structural model. Every worked brief is reproduced in full and ships in five blocks: **Project / What it needs to do / Design direction / Avoid / Foundations**. These map onto the 6-part order documented in `references/prompt-structure.md`.
3. Swap in the user's specifics; keep the design-direction prose, the anti-slop negatives, and the foundations intact — those are the load-bearing parts that defeat AI slop.

---

## Part 1 — Per-Category Quick Guides

Format for each: **Default archetype · Specify · Leave open · Critical anti-slop.** Archetype names reference `references/archetype-library.md`.

### Dashboard
- **Default archetype:** Developer / Data-Dense.
- **Specify:** navigation structure (sidebar); KPI/stat hierarchy; table density; dark surface elevation; semantic chart colors.
- **Leave open:** exact chart types; icon choices.
- **Critical anti-slop:** "Linear/Datadog-grade density and restraint, not a Bootstrap admin theme."

### Landing Page
- **Default archetype:** Premium SaaS or Creative.
- **Specify:** the single hero message + one primary CTA; the brand's emotional tone; one reference product.
- **Leave open:** section-ordering details; illustration style.
- **Critical anti-slop:** "No gradient-hero-plus-three-cards; treat the first viewport like a poster; the brand must be unmistakable in the first screen." (OpenAI's litmus check.)

### Form-Heavy App
- **Default archetype:** Premium SaaS / Warm.
- **Specify:** single-column field flow; inline validation behavior; multi-step structure if the form is long.
- **Leave open:** exact field grouping.
- **Critical anti-slop:** "Labels above inputs, generous spacing, never block paste, keep submit enabled until the user submits, errors inline next to the fields." (Vercel guidelines.)

### Data-Table App
- **Default archetype:** Developer / Data-Dense.
- **Specify:** column hierarchy; tabular numerals; row density; sort/filter affordances; sticky headers.
- **Leave open:** pagination vs infinite scroll.
- **Critical anti-slop:** "Real data-grid density with aligned tabular figures, not big rounded cards wrapping each row."

### Content Platform
- **Default archetype:** Editorial / Minimal.
- **Specify:** reading typography; comfortable measure (~65–75 chars); content hierarchy.
- **Leave open:** exact accent color.
- **Critical anti-slop:** "Reading-first; type carries the hierarchy; no card-grid of identical posts unless density genuinely demands it."

### E-commerce
- **Default archetype:** Consumer.
- **Specify:** product imagery as the hero; price/CTA clarity; trust cues (reviews, guarantees).
- **Leave open:** grid columns.
- **Critical anti-slop:** "Imagery-led on a neutral canvas; one CTA color; no generic SaaS hero."

### Documentation Site
- **Default archetype:** Developer / Technical.
- **Specify:** persistent nav tree; code-block treatment; in-page TOC; search / command palette.
- **Leave open:** exact accent color.
- **Critical anti-slop:** "Vercel/Stripe-docs clarity; monospace code blocks with a copy affordance; calm reading column."

### Admin Panel
- **Default archetype:** Developer.
- **Specify:** sidebar nav; table density; action patterns; role/permission cues.
- **Leave open:** minor layout choices.
- **Critical anti-slop:** "Linear-quality, not a default admin scaffold."

### Mobile Web App
- **Default archetype:** Warm or Consumer.
- **Specify:** thumb-zone primary actions; bottom navigation; bottom-sheet overlays; large touch targets.
- **Leave open:** secondary-screen layout.
- **Critical anti-slop:** "Designed mobile-first for one-handed use; not a desktop layout squeezed onto a phone."

---

## Part 2 — Complete Worked Briefs (Paste-Ready Models)

Each model is a full casual-input → finished design-enriched brief. The finished brief contains **zero CSS** yet fully constrains the model toward a premium, distinctive, consistent result. Paste any of these into a development LLM as-is, or adapt by swapping the domain specifics while keeping the design-direction, Avoid, and Foundations blocks.

### Model A — Project-Management Dashboard

**Casual input:** "Build me a project management dashboard."

**Finished brief:**

> **Project.** A project-management dashboard for small software teams to track issues, sprints, and roadmaps. Users live in this tool all day and are technical power users who value speed and keyboard control.
>
> **What it needs to do.** Show a list/board of issues with status, assignee, priority, and labels; let users switch between list, board, and timeline views; surface a few key metrics (cycle time, in-progress count, completed this week); support fast creation and editing of issues; include a command palette (⌘K) for everything.
>
> **Design direction.** This should feel like a precise instrument built for engineers — the quiet, fast confidence of Linear. Build it on a near-black canvas with a tight cool-gray surface ladder, where panels and modals read as progressively lighter elevated surfaces (design dark mode as real elevation, not an inverted light theme). Use a clean grotesque for the UI paired with a monospace for issue IDs, counts, and keyboard shortcuts, with tight letter-spacing on larger text. Ration a single accent color to the one primary action and active states per screen; everything else lives in the monochrome gray scale. Density is the point: compact rows, tabular numerals so numbers align, hierarchy from type and spacing on a tight `8px` rhythm rather than from boxes. Let cards and panels gain depth from thin `1px` borders and a soft shadow, never from heavy fills. Add one well-judged motion moment — fast, functional transitions that make the product *feel* fast — and subtle hover/selection feedback; respect reduced-motion.
>
> **Avoid.** The generic AI-dashboard look: no Inter or Roboto, no purple/indigo gradients, no row of big rounded stat-cards, no uniform giant border-radius, no decorative fade-ins everywhere. This must not look like a default Bootstrap/Tailwind admin template.
>
> **Foundations.** Define a small set of color, spacing, and type tokens up front and use them consistently across every screen; build reusable components (issue row, status badge, KPI stat, view switcher) rather than one-off styles. Dark mode is the primary theme. Ensure keyboard navigation and accessible contrast throughout.

### Model B — Todo App

**Casual input:** "Build me a todo app."

**Finished brief:**

> **Project.** A focused personal task manager for individuals who want a calm, frictionless place to capture and complete tasks — used daily, on both phone and desktop.
>
> **What it needs to do.** Quick task capture; list and "today" views; due dates; simple projects/tags; and a satisfying completion action.
>
> **Design direction.** Warm and reassuring, in the spirit of Things and Headspace — a calm, uncluttered surface with generous breathing room, a friendly humanist typeface, and a soft palette built on one warm accent. Let typography and spacing carry the hierarchy, not boxes. One genuinely delightful micro-interaction when a task is completed; otherwise motion stays quiet. Mobile-first, with primary actions in the thumb zone and a bottom sheet for quick-add.
>
> **Avoid.** Inter/Roboto, purple gradients, a wall of identical rounded cards, fade-ins on everything.
>
> **Foundations.** Define color/spacing/type tokens up front and reuse them; light and dark themes from the same tokens; AA contrast and full keyboard support.

### Model C — Construction-Hours Tracker

**Casual input:** "I need an app for my construction company to track worker hours."

**Finished brief:**

> **Project.** A multi-tenant SaaS platform for construction companies to manage employee timesheets across job sites. Roles: workers clock in/out (mobile, often outdoors, gloves, bright sun), site managers approve hours, and admins manage employees, sites, and run payroll exports.
>
> **What it needs to do.** Clock-in/out with job-site selection; weekly timesheet views; approval workflows; and CSV/payroll export.
>
> **Design direction.** Professional, sturdy, and legible — closer to a clear instrument than a consumer app, with the structured clarity of Ramp's finance tooling. High-contrast type that survives glare, large touch targets for field use, tabular numerals so hours and totals align in clean columns, and a restrained palette with one clear accent for primary actions plus semantic colors for approved/pending/rejected. Manager and admin views can be denser, desktop-first with a sidebar; the worker view is mobile-first with huge thumb-zone clock-in buttons and a bottom nav.
>
> **Avoid.** The generic SaaS look — no Inter, no purple gradient hero, no decorative card grid; this is a tool, not a marketing site.
>
> **Foundations.** Semantic tokens; reusable components (timesheet row, status badge, site picker); light theme primary with strong outdoor legibility; AA contrast; accessible focus states.

### Model D — AI Startup Landing Page

**Casual input:** "Make a landing page for my AI startup."

**Finished brief:**

> **Project.** A marketing landing page for an AI developer-infrastructure startup aimed at technical founders and engineers.
>
> **What it needs to do.** One clear hero message; a few capability sections; social proof; and a single primary CTA (start free / book a demo).
>
> **Design direction.** Premium developer-tool aesthetic with the typographic restraint of Stripe and the precision of Vercel/Linear. Treat the first viewport like a poster, not a document: a full-bleed hero where the brand is unmistakable, a light-weight display headline with tight tracking, a clean grotesque body face, and a near-monochrome canvas with one rationed accent. Use a monospace for any code or technical labels to signal credibility. One orchestrated motion moment on load with staggered reveals; subtle hover feedback. Decorative gradient, if any, only as a soft halo behind product imagery — never behind text.
>
> **Avoid.** The AI-slop landing page — no Inter, no purple-to-blue gradient hero, no centered "Build the future" headline over three rounded feature cards, no generic icon grid. Two typefaces max, one accent color.
>
> **Foundations.** Tokens up front; dark mode as real elevation; responsive and mobile-first; AA contrast.

### Model E — Server-Monitoring Dashboard

**Casual input:** "I want a dashboard to monitor my servers."

**Finished brief:**

> **Project.** A real-time infrastructure monitoring dashboard for DevOps engineers — power users who watch it all day and need to spot problems instantly.
>
> **What it needs to do.** Show fleet health; key metrics over time (CPU, memory, latency, error rate); alert status; and per-host detail, with filtering and time-range selection.
>
> **Design direction.** A high-density instrument panel in the spirit of Datadog and Grafana, with Linear-grade restraint. Dark canvas with a tight cool-gray surface ladder where panels read as elevated surfaces; compact rows; tabular numerals; a clean grotesque plus monospace for metrics and IDs. Use color strictly semantically — green for healthy, amber for warning, red for critical — with one consistent palette across every chart so a color always means the same thing. Charts are first-class with minimal chrome and legible small labels. Motion is minimal: live data updates, not decoration. Multi-panel layout, configurable, with a command palette for navigation.
>
> **Avoid.** A generic admin template — no big rounded stat cards, no Inter, no purple accents, no decorative animation. Density and clarity over polish-for-its-own-sake.
>
> **Foundations.** Semantic color tokens; reusable widgets (metric tile, time-series panel, alert row); dark mode primary with accessible data colors; keyboard navigation.

### Model F — Recipe-Sharing Community

**Casual input:** "Build a site where people can share and comment on recipes."

**Finished brief:**

> **Project.** A community content platform where home cooks publish recipes and discuss them. Used casually, on phone and desktop.
>
> **What it needs to do.** Visitors browse and search recipes; members publish recipes (photos, ingredients, steps), save favorites, and comment in threads.
>
> **Design direction.** Warm, editorial, and appetizing — reading-first like Medium but with the friendly approachability of a lifestyle brand, and light community structure like a calmer Reddit. Let large, beautifully cropped food photography be the hero on a warm near-white canvas; a characterful serif or humanist display for recipe titles paired with a clean, comfortable body face at a generous reading measure; one warm accent. Threaded comments with clear identity markers, collapsible and scannable. Tactile hover on imagery; one quiet save/favorite micro-interaction.
>
> **Avoid.** A generic card-grid of identical recipe tiles, Inter, purple gradients, cramped spacing. Imagery and typography lead; chrome recedes.
>
> **Foundations.** Tokens up front; reusable components (recipe card, ingredient list, step block, comment thread); light and dark themes; responsive and mobile-first; AA contrast and keyboard support.
