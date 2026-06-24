# UI/UX Audit Report — <SCREEN_NAME>

> Severity defs, scoring math, and field rules: see references/scoring-and-report.md.

**Date:** <YYYY-MM-DD>
**Screen / Route:** <screen name or URL>
**Overall Score:** <0–100>
**Shippable:** <SHIPPABLE | NOT SHIPPABLE>

## Executive Summary
<One paragraph: composite score, shippable flag, single highest-leverage fix.>

## Critical Issues (Ship-Blockers)
<Failed binary gates + all CRITICAL findings. List by ID. If none: "None.">
- [ ] `<ID>` — <one-line defect> — <failed gate or impact>

## Binary Gates
| Gate | Pass/Fail |
|---|---|
| Keyboard operability | <PASS/FAIL> |
| Visible focus | <PASS/FAIL> |
| Text contrast >=4.5:1 | <PASS/FAIL> |
| Non-text contrast >=3:1 | <PASS/FAIL> |
| No horizontal overflow (375–1920px) | <PASS/FAIL> |
| No critical CLS | <PASS/FAIL> |

## Category Breakdown
| Category | Sub-score | Summary |
|---|---|---|
| Accessibility (30%) | <0–100> | <one line> |
| Layout / Visual (25%) | <0–100> | <one line> |
| Typography (20%) | <0–100> | <one line> |
| Interaction (15%) | <0–100> | <one line> |
| Performance (10%) | <0–100> | <one line> |

## Detailed Findings
<Ordered by Pareto priority. One block per finding. Group homogeneous same-root-cause issues into one block with a list.>

### `<ID>` — <short title>
- **Location:** <component path or region [x,y,w,h]>
- **Severity:** <critical | major | minor | enhancement>
- **Category:** <accessibility | layout | typography | interaction | performance | content>
- **Description:** <what + why it matters>
- **Fix prompt:**
  > <Self-contained, paste-ready. Name selector + current value + desired outcome AND exact value/token + anti-slop negative constraints + token reference.>

## Copy-Paste Fix Prompts
<One paste-ready prompt per finding, each ending with the anti-slop negative-constraint block from references/scoring-and-report.md.>

**`<ID>`**
> <fix prompt>
>
> Constraints: Do NOT use Inter/Roboto/Open Sans/Arial as the sole typeface. Do NOT use purple/indigo/violet gradients, lavender accents, or gradient text. Do NOT use glassmorphism, colored glow shadows, side-tab accent border stripes, or a single uniform border-radius. Do NOT produce a repeated 3-column icon-card grid or an oversized italic serif hero. Use a distinctive type system and a deliberate OKLCH palette with one reserved accent. Reference semantic tokens, never hardcoded hex or magic-number px. State your font and palette choices before writing code.

## Progress Checklist
| ID | Severity | Status | Iteration |
|---|---|---|---|
| `<ID>` | <severity> | <open/fixed/wontfix> | <n> |

## Machine-Readable JSON
```json
{
  "screen": "<screen>",
  "score": 0,
  "shippable": false,
  "findings": [
    {
      "id": "<ID>",
      "category": "<category>",
      "severity": "<severity>",
      "location": { "component": "<path>", "region": [0, 0, 0, 0] },
      "description": "<what + why>",
      "fix_prompt": "<self-contained fix>",
      "status": "open"
    }
  ]
}
```
