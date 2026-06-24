# Automated Tools — Copy-Paste CLI Layer & Regression Protocol

Copy-paste-ready command-line tools that corroborate the manual passes, plus the regression-testing loop that gates a developer LLM's fixes. This file owns the **commands, their interpretation thresholds, and the before/after regression methodology**. It does not restate manual test steps (see `references/testing-protocol.md`) and it does not define severity tiers or report structure (see `references/scoring-and-report.md`).

> **CARDINAL RULE — verify flags against current tool versions before running.** Flags drift between releases. Every command below is illustrative of the workflow; confirm syntax against the tool's current `--help` / npm / GitHub page before relying on it.

> **CARDINAL RULE — correlation gate.** Automated tools corroborate; they do not deliver verdicts. Every automated finding MUST be confirmed against a screenshot or computed style before it enters the report. Discard any finding the visual evidence contradicts, noting it as "auto-flagged, visually disconfirmed." See [Correlation Gate](#correlation-gate--mandatory).

## Table of Contents
- [Lighthouse — performance / a11y / best-practices / SEO](#lighthouse--performance--a11y--best-practices--seo)
- [axe-core / pa11y — accessibility](#axe-core--pa11y--accessibility)
- [Project Wallace — CSS stats & token drift](#project-wallace--css-stats--token-drift)
- [HTML validation — vnu / html-validate](#html-validation--vnu--html-validate)
- [Link checking — lychee / linkinator](#link-checking--lychee--linkinator)
- [Image optimization analysis](#image-optimization-analysis)
- [Visual diff — odiff](#visual-diff--odiff)
- [Custom agent scripts](#custom-agent-scripts)
- [Correlation gate (mandatory)](#correlation-gate--mandatory)
- [Regression testing protocol](#regression-testing-protocol)

---

## Lighthouse — performance / a11y / best-practices / SEO

```bash
npm install -g lighthouse
lighthouse https://localhost:3000 \
  --output=json --output=html --output-path=./lh-report \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless"
```

**Authenticated / local-state flow** (when the route requires login): launch Chrome with a remote-debugging port, log in manually in that browser, then point Lighthouse at the live tab so it inherits the authenticated session:

```bash
chrome-debug          # launches Chrome and logs "Debugging on port 9222"
# ...log in to the app in that Chrome window...
lighthouse https://localhost:3000 --port=9222
```

### Interpretation
- Scores are `0–100`. Treat **`<90` = needs attention**, **`<50` = failing**.
- An accessibility score `<100` almost always means real WCAG issues — escalate; cross-check against the axe/pa11y output and the manual accessibility pass in `references/testing-protocol.md`.
- **Run 3 times and take the MEDIAN.** Scores vary run-to-run; a single run is not reportable.

### Throttling caveat — the 4× CPU local default
- The local CLI applies **Simulated Slow 4G + 4× CPU slowdown by default** (per Lighthouse's throttling docs, roughly the bottom 25% of 4G / top 25% of 3G connections).
- PageSpeed Insights moved to a **1.2× CPU slowdown in December 2024**. The `4×` figure is the **local-CLI default only** — never present a local Lighthouse perf score as equivalent to PSI/field data, and state the throttling profile when reporting a number.

---

## axe-core / pa11y — accessibility

```bash
npm install -g pa11y
# Run both engines against WCAG 2.1 AA:
pa11y https://localhost:3000 --runner axe --runner htmlcs --standard WCAG2AA --reporter cli

# Fail threshold + machine-readable JSON for the report:
pa11y https://localhost:3000 --runner axe --threshold 0 --reporter json > a11y.json
```

### Severity mapping
axe-core emits four impact levels. Fix the top two before shipping; map each into the report's severity scale per `references/scoring-and-report.md`.

| axe impact | Action |
|---|---|
| `critical` | Blocker — fix before ship |
| `serious` | Blocker — fix before ship |
| `moderate` | Fix in normal cycle |
| `minor` | Polish / backlog |

### Coverage caveat — supplements, never replaces
- axe-core detects roughly **57% of accessibility issues by volume** in real-world audits, but catches only on the order of **~40% of distinct WCAG success-criteria barriers** (consistent with the UK GDS finding that the best automated tool tested found ~40% of known barriers).
- **Never claim full WCAG coverage from an automated scan.** Automated scanning *supplements* the manual keyboard + accessibility-tree pass (see `references/testing-protocol.md`); it does not replace it.
- **No environment has a real screen reader.** Automated tools inspect the DOM/accessibility tree only — they cannot verify what VoiceOver/NVDA/JAWS actually announce. Always pair axe results with a recommendation for manual AT testing.

---

## Project Wallace — CSS stats & token drift

```bash
npm install -g wallace-cli
wallace https://localhost:3000 --format json
# or feed a built stylesheet directly:
cat dist/styles.css | wallace
```

### Token-drift signals
| Signal | Reading |
|---|---|
| Unique colors `>30` | Hardcoded color sprawl — palette is not token-driven |
| Many unique `font-size` values | Type scale is not tokenized; designer's scale is being bypassed |
| Rising selector **specificity** graph | Cascade becoming unmaintainable |
| High `!important` count | Override-driven cascade — structural smell |

High counts indicate the design-system tokens (`--color-*`, `--space-*`, `--font-*`) are being bypassed. Confirm by sampling computed styles on the offending components before reporting. Note: reverse-engineered design-system token values drift between releases — treat any token reference as illustrative of the principle, not a fixed spec.

---

## HTML validation — vnu / html-validate

```bash
# Nu Html Checker (no Java needed; uses validator.nu's web service):
npx html-validator-cli --url=https://localhost:3000 --format=text

# Local files, opinionated linting:
npm i -g html-validate && html-validate "src/**/*.html"
```

Flags unclosed/misnested tags, deprecated elements, duplicate `id`s, and missing `lang`. Corroborates the semantic-HTML findings in `references/edge-cases.md`.

---

## Link checking — lychee / linkinator

```bash
# lychee (fast, Rust) — install via brew/cargo, then crawl a running site:
lychee --no-progress https://localhost:3000

# Node alternative:
npx linkinator https://localhost:3000 --recurse --format csv
```

Reports broken internal/external links. lychee additionally catches broken `#anchor` fragment links.

---

## Image optimization analysis

```bash
# Squoosh CLI is UNMAINTAINED — verify before use; prefer `sharp` for production/CI.
npx @squoosh/cli --webp '{"quality":75}' ./public/images/*.png -d ./optimized
npx @squoosh/cli --avif auto ./public/images/*.jpg -d ./optimized
```

### Interpretation
- **Flag** any raster image served as PNG/JPEG that is **`>100KB` and lacks a WebP/AVIF variant**.
- At equivalent perceived quality, **AVIF is typically 30–50% smaller than JPEG** (20–80% depending on the image).
- **For batch / CI work prefer a maintained library such as `sharp`** — Squoosh CLI is no longer actively maintained and is best-effort only.

---

## Visual diff — odiff

Used for the regression loop below. Fast, native (no Node image-decoding overhead).

```bash
npx odiff baseline.png current.png diff.png --threshold 0.1 --antialiasing
```

| Flag | Effect |
|---|---|
| `--threshold 0.1` | Per-pixel color-difference tolerance (0–1); lower = stricter |
| `--antialiasing` | Suppresses false positives from sub-pixel anti-aliasing on text/edges |
| `--failOnLayoutDiff` | Fails on dimension changes that pixel-threshold diffs miss (layout shift, reflow) |

Returns match/no-match plus a diff pixel count and percentage, and writes the highlighted `diff.png`.

---

## Custom agent scripts

Two short scripts the agent can write and run in the controlled browser (read-only inspection JS) or via a headless driver. Both automate a manual check across every page at once.

### Non-token color audit
Quantifies design-token drift. Iterate every element, collect computed colors, dedupe, and flag any value that does not resolve to a `--color-*` custom property.

```js
// Run in the controlled browser console. Flags colors not sourced from --color-* tokens.
const tokenColors = new Set(
  Array.from(document.styleSheets)
    .flatMap(s => { try { return Array.from(s.cssRules); } catch { return []; } })
    .filter(r => r.style)
    .flatMap(r => Array.from(r.style).filter(p => p.startsWith('--color')))
    .map(p => getComputedStyle(document.documentElement).getPropertyValue(p).trim())
    .filter(Boolean)
);
const used = new Map(); // value -> count
document.querySelectorAll('*').forEach(el => {
  const cs = getComputedStyle(el);
  [cs.color, cs.backgroundColor, cs.borderColor].forEach(v => {
    if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'rgb(0, 0, 0)') used.set(v, (used.get(v) || 0) + 1);
  });
});
const offTokens = [...used.entries()].filter(([v]) => ![...tokenColors].some(t => v.includes(t)));
console.table(offTokens.map(([value, count]) => ({ value, count })));
```

### Focus-style verifier
Automates the manual focus check across all interactive elements. Programmatically focus each one and read its computed focus indicator; flag any with no visible `outline` and no `box-shadow`.

```js
// Run in the controlled browser console. Flags interactive elements with no visible focus indicator.
const missing = [];
document.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(el => {
  el.focus();
  const cs = getComputedStyle(el);
  const noOutline = cs.outlineStyle === 'none' || cs.outlineWidth === '0px';
  const noShadow = cs.boxShadow === 'none';
  if (noOutline && noShadow) {
    missing.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || el.value || '').slice(0, 30) });
  }
});
console.table(missing);
```

Confirm every flagged element by Tab-then-screenshot before reporting (the script reads computed style; the screenshot proves what a sighted user sees).

---

## Correlation gate (mandatory)

The single rule that governs whether any automated output is allowed into the report.

1. Run the tool and collect its findings.
2. For **each** finding, map it to a defect category per `references/scoring-and-report.md`.
3. **Confirm it against visual evidence** — the corresponding screenshot and/or a computed-style readout (e.g. an axe contrast violation must match the on-screen rendering and the computed `color` + `background-color`).
4. **Attach** the confirming screenshot or computed-style line to the finding.
5. **Discard** any finding the visual evidence contradicts. Record it in the report's noise section as **"auto-flagged, visually disconfirmed"** so the discard is auditable.

Never paste a raw tool dump into the report. A number with no confirming screenshot is not a finding.

---

## Regression testing protocol

The before/after loop that gates a developer LLM's fixes. Acceptance criteria are **locked with measured values BEFORE the dev LLM starts** so the loop cannot drift into ambiguity. Manual capture sequences referenced here are defined in `references/testing-protocol.md`.

### 1. Baseline capture (before any fix)
- Run the exact viewport sweep and component captures from `references/testing-protocol.md`.
- Store screenshots as the reference set: `/baseline/<route>_<width>.png`.
- In environments that record video (Antigravity WebP), also store the browser-session recordings as animation baselines.

### 2. Lock acceptance criteria — BEFORE handing defects to the dev LLM
Define, per defect, exactly what "fixed" looks like, **with measured values**, so iteration cannot drift. Examples (paste-ready, standalone):

> **Acceptance — card padding.** `.product-card` currently renders `padding: 16px` at `375px` and `padding: 12px` at `1440px` (inconsistent). Fixed = `.product-card` has `padding: 24px` on **all** breakpoints `375–1920px`. Do not change card `width`, `border-radius`, or `gap`.

> **Acceptance — horizontal scroll.** The page currently shows horizontal scroll at `375px` and `414px` (`document.documentElement.scrollWidth` exceeds `clientWidth`). Fixed = **no** horizontal scroll at any width `375–1920px` (`scrollWidth === clientWidth`). Do not introduce `overflow-x: hidden` as a mask — remove the overflowing element's fixed width instead.

> **Acceptance — focus ring.** Primary `button` currently has `outline: none` with no replacement (invisible focus). Fixed = visible focus indicator with contrast `≥3:1` against its background on every interactive element. Do not remove `:hover` styles or change the resting button appearance.

### 3. Post-fix comparison
- Re-run the **identical** sequence into `/current/`.
- Diff each pair:
  ```bash
  npx odiff baseline/<route>_<width>.png current/<route>_<width>.png diff/<route>_<width>.png --threshold 0.1 --antialiasing
  ```
- Confirm **both**: (a) the targeted defect is resolved, and (b) **no new diff appeared elsewhere** (regression). Add `--failOnLayoutDiff` to catch dimension changes that pixel thresholds miss.

### 4. Visual-diff methodology by defect type
| Defect type | Diff method |
|---|---|
| Spacing / color / alignment | **Overlay/highlight diff** — the `odiff` `diff.png` |
| Layout / structural change | **Side-by-side** baseline vs current |
| Subtle anti-aliased text shift | **Difference-mask** with `--antialiasing` enabled to suppress sub-pixel false positives |
| Animation / motion | **Frame-by-frame** of before/after WebP recordings (Antigravity) or sequential screenshot bursts (Claude/Codex — no native video) |

### 5. Iteration protocol (partial fix or new regression)
If a fix is partial or introduces a regression, formulate a **before/after/remaining-gap** follow-up correction prompt (format per `references/scoring-and-report.md`). It must name all three: the before screenshot, the after screenshot, and the precise remaining gap **with its measured value**. Example (standalone):

> **Follow-up — sidebar overlap.** Before: `/baseline/dashboard_768.png` showed the sidebar overlapping the main content at `768px`. After your fix: `/current/dashboard_768.png` — the overlap is gone at `768px` but a **new** `12px` horizontal scroll now appears at `768px` (`scrollWidth` = `780`, `clientWidth` = `768`). Remaining gap: eliminate the `12px` overflow so `scrollWidth === clientWidth` at `768px`, without re-introducing the sidebar overlap. The `375px` and `1440px` layouts are correct — do not change them.

Re-run the regression pass (step 3) after each iteration; the loop closes only when every locked acceptance criterion passes and no new diff is introduced.
