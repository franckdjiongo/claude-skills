# Scoring & Report

The single source for severity definitions, the scoring math, the report structure, the machine-readable JSON schema, and the anatomy of a self-contained correction prompt. All three modes (AUDIT, TEST, BRIEF→audit) tag findings with the severities defined here; they do not redefine them.

## Table of Contents
- [Severity Legend](#severity-legend)
- [Scoring Model](#scoring-model)
  - [Evidence-Gated Scoring (no pass on an unobserved dimension)](#evidence-gated-scoring-no-pass-on-an-unobserved-dimension)
  - [Binary Gates (pass/fail)](#binary-gates-passfail)
  - [Severity-Weighted Composite](#severity-weighted-composite)
  - [Category Weights (optional)](#category-weights-optional)
  - [Thresholds](#thresholds)
  - [Per-Screen vs App-Wide](#per-screen-vs-app-wide)
- [Report Structure](#report-structure)
  - [Per-Finding Format](#per-finding-format)
  - [Grouped vs Individual Findings](#grouped-vs-individual-findings)
  - [Pareto Priority Ordering](#pareto-priority-ordering)
- [Machine-Readable JSON Schema](#machine-readable-json-schema)
- [Progress-Tracking Checklist](#progress-tracking-checklist)
- [Anatomy of a Self-Contained Correction Prompt](#anatomy-of-a-self-contained-correction-prompt)
  - [Paste-Ready Category Examples](#paste-ready-category-examples)
  - [Anti-Slop Negative-Constraint Block](#anti-slop-negative-constraint-block)

---

## Severity Legend

Tag every finding with exactly one severity. These definitions are authoritative across the skill.

| Severity | What qualifies | Examples |
|---|---|---|
| **CRITICAL** | Blocks usability or fails accessibility law (WCAG AA / ADA / EAA). A user cannot complete a task, or a protected user is locked out. | Keyboard trap or unreachable control; no visible focus indicator; text contrast below 4.5:1 (or non-text below 3:1); horizontal scroll on mobile; layout shift that moves an actionable control as the user reaches for it; modal with no focus trap; touch target below the floor on a primary mobile action; state conveyed by color alone; `INP > 500 ms` / unresponsive UI. |
| **MAJOR** | Degrades perceived quality or trust. The product works but reads as unpolished, inconsistent, or AI-generated. | Off-grid / arbitrary spacing; flat type hierarchy (steps under a 1.25 ratio); missing hover/empty/error states; AI-slop tells (purple→indigo gradient, Inter as sole face, glassmorphism); FOIT on primary content; blurry hero/logo on HiDPI; truncated translated labels in shipped locales; no design-token layer. |
| **MINOR** | Polish. Noticeable to a trained eye; does not affect task completion or trust materially. | Tracking/optical-centering nits; minor radius drift; small below-fold layout shift; paragraph-spacing imbalance; cursor nuance; below-fold image pop-in. |
| **ENHANCEMENT** | Premium elevation. Not a defect — an opportunity to move from correct to exceptional. | Orchestrated staggered page-load motion; skeleton-loader refinement; optimistic UI; tonal dark-mode surface temperature. |

Severity is per-finding and independent of category. A `CRITICAL` finding caps shippability regardless of the composite score (see [Thresholds](#thresholds)).

---

## Scoring Model

Two complementary models run together: strict **binary gates** for non-negotiables, then a graded **severity-weighted composite** for everything else.

### Evidence-Gated Scoring (no pass on an unobserved dimension)

A score is a claim about evidence. A category that was never rendered, scrolled, or driven into the state where its defects live MUST be reported as **NOT EVIDENCED** — never `pass` and never folded into the composite as if it earned points. Absence of findings is not a pass.

- **"No findings" is ambiguous — disambiguate it.** Always distinguish "looked and found nothing" (an evidenced pass) from "never looked" (NOT EVIDENCED). A responsive verdict with no small-mobile screenshot, a footer verdict where the page was never scrolled to the bottom, or a motion verdict where animations were never observed settling are all NOT EVIDENCED, not clean.
- **Downgrade, never inflate, on observation gaps.** If the environment cannot resize, scroll, or drive states (static single-screenshot input; a host that pins one viewport; a tool that cannot reach the footer or trigger hover/focus), DOWNGRADE the affected dimension's verdict to NOT EVIDENCED and surface the gap in the report. Never award a pass to compensate for what you could not see, and never silently assume a width/route/state you did not render.
- **NOT EVIDENCED is not a passing score.** A screen with required dimensions unevidenced is **not shippable on those dimensions** (see the [Viewport coverage](#binary-gates-passfail) gate). The composite is reported only over evidenced dimensions, annotated with the coverage gap; do not present a composite as app-wide-complete while dimensions remain unobserved.
- This rule binds all three modes. In AUDIT over static screenshots, mark every dimension the input cannot show as NOT EVIDENCED. In TEST, the whole point is to convert NOT EVIDENCED into evidenced verdicts by actually rendering each viewport class and driving each state (see references/testing-protocol.md §2, §7 and Phase 2). Findings and gates may only cite a width, route, or state that was actually rendered/observed (see references/analysis-protocol.md, evidence-limits: no-pass-on-unobserved + responsive-reflow caveat).

Record what was and was not observed in the `coverage` object of the [JSON schema](#machine-readable-json-schema) and in the [Report Structure](#report-structure) coverage line.

### Binary Gates (pass/fail)

Run these FIRST. Each is a strict pass/fail gate. **Any single gate failure caps the screen at `NOT SHIPPABLE`** regardless of the composite score (strict AND-gate — one failure blocks ship).

| Gate | Pass condition |
|---|---|
| Keyboard operability | Every interactive element reachable and operable by keyboard; no traps; logical tab order. |
| Visible focus | Every focusable element shows a `:focus-visible` indicator at `>=3:1` contrast against adjacent states. |
| Text contrast | All body text `>=4.5:1`; large text (`>=24px`, or bold `>=18.66px`) `>=3:1`. |
| Non-text contrast | UI components and graphical objects (icons, borders, focus rings) `>=3:1` (WCAG 1.4.11). |
| No horizontal overflow | No unintended horizontal scroll at any viewport from `375px` to `1920px`. |
| No critical CLS | No layout shift that moves an actionable control after first paint; target `CLS <= 0.1` at p75. |
| Viewport coverage | The audit actually rendered every required viewport class — small-mobile (`320`/`360`), mobile (`375`/`390`/`414`), tablet (`768`/`834`/`1024`), desktop (`1280`/`1440`/`1920`) — and recorded which states were driven. No gate or finding references a width/route/state that was never rendered/observed. |

> The "one failure blocks ship" pattern mirrors strict quality-gate systems (SonarQube Quality Gates; the Hallmark slop-gate model). The exact gate count in third-party tools is corroborated only via secondary coverage — never cite a specific external gate count as a first-party figure. The thresholds above (`4.5:1`, `3:1`, `CLS <= 0.1`) are first-party normative (WCAG 2.2 / Core Web Vitals).

> **Viewport-coverage note.** This gate enforces the [Evidence-Gated Scoring](#evidence-gated-scoring-no-pass-on-an-unobserved-dimension) rule for the responsive-, footer-, and motion-dependent dimensions. Those verdicts are **INVALID — reported as NOT EVIDENCED, not pass** — unless the matching viewport class was actually rendered: the responsive verdict requires small-mobile + mobile + tablet + desktop renders (single-column reflow and reading order live at small-mobile — see references/testing-protocol.md §2 `TEST-MOBILE-REFLOW` at `320`/`360`, and references/defect-taxonomy.md V5-06); the footer/composition verdict requires scrolling to the bottom at each class; the motion verdict requires animations observed after settling (references/testing-protocol.md settle-animations-before-capture). Each class also requires the per-breakpoint hero-fills-viewport and header-density passes (references/testing-protocol.md Phase 2; references/defect-taxonomy.md V0-01, V7). The report MUST list which viewports and states were **covered vs not covered**. Any required class not rendered ⇒ that dimension is **not evidenced** and the screen is **not shippable on that dimension** — a missing small-mobile render alone caps the responsive dimension at NOT SHIPPABLE even when every observed width is clean. The Responsive Viewport Matrix that defines these classes (including the Small-mobile class) lives in references/design-system-reference.md. Hosts that cannot resize to a class DOWNGRADE that dimension (never inflate it) per the evidence rule; for orchestrating per-viewport renders on large apps, see references/environment-adaptation.md ("Orchestrated audit").

For what to look for under each gate, see references/defect-taxonomy.md and references/edge-cases.md. Do not restate those checklists here.

### Severity-Weighted Composite

For everything that is not a hard gate, compute a graded score.

```
Score = 100 - Σ(defect_count × severity_weight)
```

| Severity | Weight |
|---|---|
| Critical | 10 |
| Major | 5 |
| Minor | 3 |
| Enhancement | 1 |

Floor the score at 0. (This is the Defect Severity Index family: critical defects weighted ~5–10× minor ones.)

### Category Weights (optional)

When a weighted composite across dimensions is wanted, compute a sub-score per category, then combine:

| Category | Weight |
|---|---|
| Accessibility | 30% |
| Layout / Visual | 25% |
| Typography | 20% |
| Interaction | 15% |
| Performance | 10% |

Composite = Σ(category_sub_score × category_weight). Report the per-category sub-scores in the [category breakdown](#report-structure) regardless of whether you fold them into a single weighted number.

### Thresholds

Three-tier band (mirrors the Core Web Vitals Good / Needs-Improvement / Poor model):

| Score | Verdict |
|---|---|
| `>= 90` | **Production-ready** (premium tier — the Linear/Stripe/Vercel craft band). |
| `70–89` | **Needs work** (ship-blocking only if a critical gate also failed). |
| `< 70` | **Critical rework.** |

> No public numeric UI score exists for Linear/Stripe/Vercel — the `>=90` band is a calibration target, not a measured external benchmark. The closest checkable proxy is Vercel's *Web Interface Guidelines*. Treat the `>=90` framing as a quality bar to push toward, not a scraped figure.

**Hard override:** any failed binary gate → `NOT SHIPPABLE`, regardless of composite. A screen can score 88 on the composite and still be `NOT SHIPPABLE` because one contrast pair fails 4.5:1.

### Per-Screen vs App-Wide

- **Gate on the worst screen.** The app-wide shippable flag is the worst-performing screen (a URL is labeled by its worst metric, per Core Web Vitals convention). One un-shippable screen makes the app un-shippable.
- **Average for trend.** Report a mean composite across screens for session-over-session trend tracking, separate from the gating verdict.
- Record every score with a date so regression/progress is visible across runs.

---

## Report Structure

Order the report exactly:

1. **Executive summary + overall score** — one paragraph, the composite, the shippable flag, and the single highest-leverage fix.
2. **Coverage line** — one line stating which viewport classes (small-mobile `320`/`360`, mobile `375`/`390`/`414`, tablet `768`/`834`/`1024`, desktop `1280`/`1440`/`1920`) and which states (hover/focus/error/empty, scrolled-to-footer, animations-settled) were **covered vs not covered**, and which dimensions are therefore **evidenced vs NOT EVIDENCED** (see [Evidence-Gated Scoring](#evidence-gated-scoring-no-pass-on-an-unobserved-dimension) and the [Viewport coverage](#binary-gates-passfail) gate). Mirrors the `coverage` object in the [JSON schema](#machine-readable-json-schema).
3. **Critical issues (ship-blockers) first** — every failed gate and every `CRITICAL` finding, before anything else.
4. **Category breakdown with sub-scores** — Accessibility / Layout / Typography / Interaction / Performance, each with its sub-score and a one-line summary. A category whose evidence was never captured shows **NOT EVIDENCED** in place of a sub-score, never a pass.
5. **Detailed findings** — full per-finding blocks, ordered by [Pareto priority](#pareto-priority-ordering).
6. **Copy-paste fix prompts** — one self-contained, paste-ready prompt per finding (see [anatomy](#anatomy-of-a-self-contained-correction-prompt)).
7. **Progress checklist** — the [tracking table](#progress-tracking-checklist).

Blank fill-in skeleton: assets/audit-report-template.md.

### Per-Finding Format

Every finding carries these fields:

| Field | Content |
|---|---|
| **ID** | Stable identifier, category-prefixed, e.g., `A11Y-003`, `TYPE-007`, `LAYOUT-002`. |
| **Location** | Component path (e.g., `components/Card/Avatar.tsx`) or screenshot region `[x,y,w,h]`. |
| **Description** | What the defect is **and** why it matters (impact on user/trust/law). |
| **Severity** | One of `critical` / `major` / `minor` / `enhancement` (see [legend](#severity-legend)). |
| **Category** | One of `accessibility` / `layout` / `typography` / `interaction` / `performance` / `content`. |
| **Fix prompt** | Self-contained, copy-pasteable. Must satisfy all 5 ingredients in [anatomy](#anatomy-of-a-self-contained-correction-prompt). |

### Grouped vs Individual Findings

- **Group** homogeneous issues that share one root cause into a single finding with an enumerated list — e.g., "All 12 spacing values use arbitrary px instead of tokens" listed once, not 12 times.
- **Report individually** distinct root causes, even if they live in the same component.

### Pareto Priority Ordering

Lead with the ~20% of fixes that resolve ~80% of perceived-quality loss. Typical high-leverage clusters, in order:

1. Spacing / rhythm tokenization (arbitrary px → token scale).
2. Focus / hover / interaction states.
3. Layout-shift (CLS) fixes.
4. Typography-scale consistency (flat hierarchy → modular scale).

Critical gate failures always precede this list — they ship-block regardless of leverage.

---

## Machine-Readable JSON Schema

Emit this alongside the human report so downstream tooling can parse findings, the score, and the shippable flag.

```json
{
  "screen": "checkout",
  "score": 78,
  "shippable": false,
  "coverage": {
    "surfaces_covered": ["/", "/chat", "/settings"],
    "surfaces_not_covered": ["/approvals — dialog non déclenchable dans cet environnement"],
    "viewports_rendered": ["375", "390", "768", "1280", "1440"],
    "viewports_required": ["320", "360", "375", "390", "414", "768", "834", "1024", "1280", "1440", "1920"],
    "viewports_not_rendered": ["320", "360", "414", "834", "1024", "1920"],
    "states_observed": ["default", "hover", "focus", "scrolled-to-footer", "animations-settled"],
    "states_not_observed": ["error", "empty"],
    "dimensions_evidenced": ["accessibility", "typography", "interaction"],
    "dimensions_not_evidenced": ["responsive", "footer", "motion"],
    "environment_limits": ["host pinned to a single viewport; could not resize to small-mobile"]
  },
  "findings": [
    {
      "id": "A11Y-003",
      "category": "accessibility",
      "severity": "critical",
      "location": { "component": "Modal/Confirm.tsx", "region": [320, 140, 480, 260] },
      "description": "Modal has no focus trap; Tab escapes to background content.",
      "fix_prompt": "In Modal/Confirm.tsx add role=dialog + aria-modal=true...",
      "status": "open"
    }
  ]
}
```

Field rules:
- `score`: composite per [Scoring Model](#scoring-model), 0–100, computed over **evidenced dimensions only**.
- `shippable`: `false` if any binary gate fails on this screen (including [Viewport coverage](#binary-gates-passfail)), else derived from the threshold band.
- `coverage`: required. Records what was observed so a verdict can never silently rest on an unobserved width or state (see [Evidence-Gated Scoring](#evidence-gated-scoring-no-pass-on-an-unobserved-dimension)).
  - `surfaces_covered` / `surfaces_not_covered`: when a coverage manifest exists (scripts/scan-surfaces.mjs), list each manifest surface by its `route` or `file` in exactly one of the two arrays — `surfaces_not_covered` entries carry the reason after an em/long dash. This is what makes a skipped screen a *declared* gap instead of a silent one; `scripts/check-report.mjs` verifies no manifest surface is absent from the report.
  - `viewports_rendered` / `viewports_required` / `viewports_not_rendered`: width strings in px. `viewports_required` enumerates the four classes — small-mobile (`320`/`360`), mobile (`375`/`390`/`414`), tablet (`768`/`834`/`1024`), desktop (`1280`/`1440`/`1920`) — per the Responsive Viewport Matrix in references/design-system-reference.md. A non-empty `viewports_not_rendered` that includes a required class ⇒ the Viewport coverage gate fails for the dimensions that depend on it.
  - `states_observed` / `states_not_observed`: from `default` / `hover` / `focus` / `error` / `empty` / `scrolled-to-footer` / `animations-settled`.
  - `dimensions_evidenced` / `dimensions_not_evidenced`: partition of the dimensions; any in `dimensions_not_evidenced` is reported as **NOT EVIDENCED**, never scored as `pass`, and renders the screen not shippable on that dimension.
  - `environment_limits`: free-text notes on why a class/state could not be observed (drives the DOWNGRADE-never-inflate handling; see references/environment-adaptation.md).
- `location`: include `component` and/or `region` (`[x,y,w,h]`); at least one is required.
- `severity` / `category`: lowercase, from the enumerations above.
- `status`: `open` / `fixed` / `wontfix`.

---

## Progress-Tracking Checklist

A checklist table so fixed/unfixed counts are visible across iterations. One row per finding ID.

| ID | Severity | Status | Iteration |
|---|---|---|---|
| `A11Y-003` | critical | open | 1 |
| `LAYOUT-002` | major | fixed | 2 |
| `TYPE-007` | minor | wontfix | 1 |

`Status` ∈ `open` / `fixed` / `wontfix`. `Iteration` = the run number in which the status last changed. Re-run the audit, update statuses, and compare counts to show progress.

---

## Anatomy of a Self-Contained Correction Prompt

Every fix prompt in the report MUST be standalone and paste-ready — a developer pastes it cold into a development LLM (Claude Code, Gemini CLI, Codex) and knows exactly what to change. Never write "the issue above," "as mentioned," or "fix this." Each prompt has **5 ingredients**:

1. **Name the component/selector** — exact file path or CSS selector (`.feature-card`, `components/Card/Avatar.tsx`).
2. **State the current value** — the measured/observed value that is wrong (`padding: 18px`, `#9CA3AF on #FFFFFF (2.8:1)`).
3. **State the desired outcome AND the exact CSS value/token** — both the goal and the precise target (`set padding to var(--space-6) (24px)`).
4. **Add anti-slop negative constraints** — prevent regression into the LLM-default aesthetic (see [block](#anti-slop-negative-constraint-block)).
5. **Reference design-system tokens** — point at semantic tokens, not raw hex/px, so theming and dark mode keep working (`var(--surface)`, `var(--space-6)`).

For token reference values to cite (Apple HIG, Material 3, Vercel/Geist, Linear, Stripe, Tailwind), see references/design-system-reference.md. For the full AI-slop catalog the negative constraints draw on, see references/anti-slop-rules.md.

### Paste-Ready Category Examples

Each is standalone and includes all 5 ingredients.

**Contrast**
> In `.helper-text`, the color is `#9CA3AF` on a `#FFFFFF` background (`2.8:1`, fails WCAG AA for body text). Change `color` to `#4B5563` (`~7:1` on white) or to the semantic token `var(--on-surface-muted)`. Keep the same font-size and weight; do not lighten the background to compensate. Verify the pair computes `>=4.5:1`.

**Touch target**
> In `.icon-button` (`components/Toolbar/IconButton.tsx`), the hit area is `16x16px`, below the mobile floor. Set `min-width` and `min-height` to `44px` with the icon centered, and ensure `>=8px` spacing from adjacent targets. Keep the visual icon at its current `20px` size — pad the target, do not enlarge the glyph. Map the size to the token `var(--size-touch)` if one exists.

**Type hierarchy**
> In the article layout, `h1` and body copy are both `~16px` (flat hierarchy). Apply a Major Third (1.25) modular scale via type tokens: `h1` `var(--text-3xl)` (39px), `h2` `var(--text-2xl)` (31px), `h3` `var(--text-xl)` (25px), body `var(--text-base)` (16px). Set headings to `font-weight: 700` and body to `400`. Do NOT use gradient text on any heading; use solid `var(--on-surface)`.

**Dark mode**
> In the dark theme, surfaces are pure `#000000` and text is pure `#FFFFFF` (vibrates/blooms). Set the base surface to `#121212` (token `var(--surface)`) and step each elevated surface `+5–8%` lightness via `var(--surface-raised)` / `var(--surface-overlay)`. Set text to `rgba(255,255,255,0.87)` high-emphasis, `0.60` medium, `0.38` disabled. Do NOT use colored glow box-shadows for elevation — convey elevation with the lighter surface. Do NOT invert light-mode hex for the accent; use the dedicated `var(--accent-dark)` variant.

### Anti-Slop Negative-Constraint Block

Append this verbatim to any UI fix prompt to prevent the development LLM from regenerating the generic AI aesthetic. This block is part of the report output (the slop *catalog* and rationale live in references/anti-slop-rules.md; this is the ready-to-paste constraint paragraph).

> Constraints: Do NOT use Inter/Roboto/Open Sans/Arial as the sole typeface. Do NOT use purple/indigo/violet gradients, lavender accents, or gradient text. Do NOT use glassmorphism, colored glow shadows, side-tab accent border stripes, or a single uniform border-radius on every element. Do NOT produce a repeated 3-column icon-card grid or an oversized italic serif hero headline. Use a distinctive type system (display face + refined body face) and a deliberate OKLCH palette with one reserved accent. Reference semantic design tokens, never hardcoded hex or magic-number px. State your font and palette choices before writing code.
