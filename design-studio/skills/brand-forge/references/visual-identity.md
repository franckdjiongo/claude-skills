# Visual Identity — Encoded Craft for the Creative Director

The creative director agent reads this file (absolute path injected in its prompt)
before designing anything. Everything here is a **space of choices, never a set of
defaults**. Picking the first option in a list, or reusing an archetype's default
territory, is a slop tell and is explicitly forbidden — derive from a specific
product attribute and justify the link.

## Table of Contents

1. [Typographic Pairings (by archetype)](#typographic-pairings)
2. [Logo Procedure (verifiable steps)](#logo-procedure)
3. [Palette Rules](#palette-rules)
4. [Identity Scoring Grid](#identity-scoring-grid)
5. [Creative Gates (slogans, contrast, SVG)](#creative-gates)
6. [Image-Prompt Handoff](#image-prompt-handoff)

---

## Typographic Pairings

12-15 named pairings, grouped by archetype. Each is a `display / text` pair with
its loading source, license, and a note when a **variable font** is available
(prefer variable when self-hosting — one file, full weight range). All are free
for commercial use. **These are candidates to choose between, not a menu to grab
the top of.** Justify the pick against a product attribute.

Loading: Google Fonts (`https://fonts.google.com/specimen/<Name>`) or Fontshare
(`https://www.fontshare.com/fonts/<slug>`). URLs go verbatim into brand-package.md.

### Professional & Sleek
| Pairing | Display / Text | Source · License | Notes |
|---------|----------------|------------------|-------|
| **Editorial-Precise** | Fraunces / Inter | Google · OFL | Fraunces = variable (opsz, wght, SOFT). Confident serif display, neutral text. |
| **Swiss-Modern** | Space Grotesk / IBM Plex Sans | Google · OFL | Geometric grotesk pairing; technical but warm. |
| **Quiet-Authority** | Newsreader / Public Sans | Google · OFL | Reading-optimized serif + civic sans; trustworthy. |

### Playful & Modern
| Pairing | Display / Text | Source · License | Notes |
|---------|----------------|------------------|-------|
| **Rounded-Friendly** | Clash Display / Satoshi | Fontshare · Free commercial | Satoshi = variable. Distinctive, non-Inter, approachable. |
| **Bold-Optimist** | Cabinet Grotesk / General Sans | Fontshare · Free commercial | Both variable; strong display weights. |
| **Editorial-Pop** | Fraunces (soft) / Work Sans | Google · OFL | Soft-axis Fraunces reads warm; energetic. |

### Techy & Powerful
| Pairing | Display / Text | Source · License | Notes |
|---------|----------------|------------------|-------|
| **Terminal-Sharp** | Space Grotesk / JetBrains Mono | Google · OFL | Mono body for dev-tool credibility. Use mono sparingly for text. |
| **Precision-Grid** | Chivo / Chivo Mono | Google · OFL | Single superfamily; tight, high-contrast dark-mode-first. |
| **Machined** | Archivo / Archivo (expanded) | Google · OFL | Archivo = variable (wght, wdth). One family, expressive range. |

### Minimal & Elegant
| Pairing | Display / Text | Source · License | Notes |
|---------|----------------|------------------|-------|
| **Whisper-Serif** | Cormorant / Inter | Google · OFL | High-contrast serif display, restrained text. Editorial elegance. |
| **Warm-Minimal** | Instrument Serif / Instrument Sans | Google · OFL | Companion superfamily; quiet, aspirational. |
| **Neo-Grotesk-Calm** | Hanken Grotesk / Hanken Grotesk | Google · OFL | Single variable family; maximum simplicity, wordmark-friendly. |
| **Literary** | Lora / Source Sans 3 | Google · OFL | Book-grade serif; poetic, unhurried. |

> **Never ship Inter/Roboto/Open Sans as the DISPLAY face** — that is the strongest
> generic-AI tell in type. Inter as a neutral TEXT face is fine; the display face
> must carry personality. If the product justifies a system stack, say so explicitly.

---

## Logo Procedure

Design in **verifiable steps**, each producing an artifact or a decision that the
identity-scoring agent (§4) can check. Never jump to "here's a logo".

1. **Concept** — one sentence: what idea does the mark encode? Tie it to a product
   attribute, not a cliché (no lightbulbs, globes, generic swooshes, gradients-as-personality).
2. **Geometric form** — reduce the concept to primitives (circle, arc, angle, grid,
   letterform). State the construction (e.g. "two arcs sharing a baseline").
3. **Monochrome test** — the mark must work in a single flat color. If it needs a
   gradient or a glow to read, it fails — redo step 2.
4. **16px description** — describe exactly what survives at favicon size. If detail
   is lost below recognition, simplify. The 16px form is the real logo; the hero
   form is a dressed-up version of it.
5. **Render** — produce ≥1 concept as **real inline SVG** and display it at
   16 / 32 / 512 px (see §5, this is a hard gate — a written description is not proof).

---

## Palette Rules

- **Base neutral + exactly 1 accent.** Not two accents, not a rainbow. The neutral
  carries 90% of surface; the accent is a scalpel.
- **3-5 colors total** across the whole system (bg, surface, ink, accent, +1 muted).
- **Derive the accent from a product attribute** and write the derivation. "Blue
  because tech" is not a derivation.
- **Provide light AND dark variants** for every token.
- **Contrast is calculated, never estimated** (§5).

### Ban-list (automatic slop tells — do not ship)
- **Lavender / generic purple** as the accent (the #1 AI-default color).
- **Purple→blue gradients** (the AI-hero-gradient cliché).
- **Glows / neon halos** as the primary visual device.
- Any palette that could not be told apart from a random SaaS template.

---

## Identity Scoring Grid

Scored by an agent **distinct from the creative director** (separation of maker and
judge — same principle as the naming generator/verifier split). Score each axis /10:

| Axis | Question | Weight |
|------|----------|--------|
| **Distinctiveness** | Side-by-side with the competitors from research-findings.md, is it visibly different? | ×2 |
| **Memorability** | Could someone redraw the mark from memory after one look? | ×1 |
| **Scalability** | Does the identity hold from 16px favicon to hero lockup (type + mark + palette)? | ×1 |

Weighted average **< 7 = re-work** (back to the creative director with the specific
failing axis). No package ships on a sub-7 identity.

---

## Creative Gates

Non-negotiable, checked before the final package is presented.

### Slogan ban-list (copywriter)
Reject any slogan containing: **streamline, empower, unleash, supercharge,
seamless, elevate, revolutionize, effortless** — or the **"It's not X, it's Y"**
construction. These are exhausted AI-copy tells.
**Positive rule:** every slogan must contain a **concrete noun specific to the
product** (what it literally does/handles), not an abstract benefit word.

### Contrast gate (blocking)
Every text/background pair in the palette is **calculated**, never eyeballed:

```
node /Users/elmabi/Desktop/my-projets/claude-skills/scripts/contrast-check.mjs <fg> <bg> [<fg2> <bg2> ...]
```

Thresholds: **≥ 4.5:1 body**, **≥ 3:1 large text** (≥24px, or ≥19px bold). Any pair
below its threshold **blocks** the package — adjust the token and re-run. Record the
computed ratios in brand-package.md.

### Real-SVG gate (blocking)
At least **one logo concept rendered as real inline SVG**, displayed at **16 / 32 /
512 px**. This is file-proof, not a declaration. A prose logo description without a
rendered SVG at three sizes does not satisfy the gate.

---

## Image-Prompt Handoff

brand-forge does **not** generate images. It writes the logo **brief** and routes it
to the user's dedicated prompt skills — never emits a raw "DALL-E prompt" (obsolete).

- **OpenAI (ChatGPT / gpt-image):** hand the logo brief to
  **chatgpt-image-prompt-architect**.
- **Google (Gemini / Nano Banana Pro):** hand the logo brief to
  **nano-banana-prompt-engineer**.

The brief includes: the concept sentence, the geometric construction, the exact
palette hexes, the monochrome constraint, and the target deliverables (logo mark,
app icon, full lockup, dark variant, marketing hero). The chosen skill turns this
brief into the model-specific prompt.
