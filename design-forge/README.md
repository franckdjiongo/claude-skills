# Design Forge

> **UX/UI Quality Analyst & Design Brief Architect** — one plugin, three modes, sharing a single scoring framework, report format, and anti-slop ruleset, wired into a **brief → build → verify** pipeline.

Design Forge helps you go from *"I want to build an app"* to a premium, distinctive UI — and then proves the result is actually good. It writes the design brief, audits the screenshots, and actively tests the live app, all against the same standards.

Works in **Claude Code** (CLI, Desktop, IDE) and **OpenAI Codex** (CLI, App, IDE).

---

## What you get

Installing this plugin adds **one skill** and **three specialist agents**:

| Component | Name | Role |
|---|---|---|
| Skill (router) | `design-forge` | Detects which mode you need and dispatches to the right specialist |
| Agent | `design-forge-audit` | Passive visual QA of screenshots / video / static exports |
| Agent | `design-forge-test` | Active, hands-on QA of a **running** app (needs computer-use tools) |
| Agent | `design-forge-brief` | Turns a plain app idea into a design-enriched build prompt |

> **Codex note.** Codex plugins can bundle skills, MCP servers, apps, and hooks — **but not agents** (there is no `agents` key in the Codex plugin manifest, by design). So in Codex, Design Forge runs as the single `design-forge` skill, whose router handles all three modes inline — you lose no functionality. The three `agents/*.md` files are loaded by **Claude Code only**. See [Codex: how agents work](#codex-how-agents-work) below.

---

## What's new in v1.2

- **design-intent template: performance TESTABLE CRITERIA** — Core Web Vitals thresholds baked into every brief: blocking floor LCP < 2.5 s mobile / CLS < 0.1 / INP < 200 ms, documented award target 1.5 s / 0.05 / 100 ms, explicit JS budget when Three.js/3D is in play.
- **design-intent template: structured Motion Stance** — signature moment (one, localized), micro-interaction families with timings, scroll reveals, reduced-motion behavior, and a justified technical storey (CSS → Motion → GSAP → 3D), terminology aligned with ship-polished-ui's `motion-craft.md`.
- **QA division of labor** — written into the skill: `ship-polished-ui` owns the incremental QA loop during the build; design-forge AUDIT/TEST owns the full scored pre-delivery audit against the design-intent.

## What's new in v1.1

- **Viewport-coverage gate + evidence-gated scoring** — a responsive / footer / motion verdict is now invalid unless every device class (small-mobile 320/360, mobile, tablet, desktop) was actually rendered, and any dimension that was never observed is reported as *not evidenced* instead of silently passing.
- **New `V0 — Hero & First Viewport` group** — hero fills the viewport (`svh`/`dvh`), a visible scroll-down cue, and hero engagement (imagery / depth / motion).
- **Five field-confirmed checks** — translucent sticky-header bleed-through (`V3-09`) with a scroll-composite contrast sweep, mobile single-column reflow ordering (`V5-06`) and desktop-spacing-leak (`V2-07`) with a single-column-stack test — plus scroll-to-top, footer composition, per-breakpoint header density, button-placement consistency, text-alignment, and visual-richness checks.
- **Small-mobile (320/360)** added to the viewport matrix; a **settle-animations-before-capture** step ends mid-animation false frames.
- **Optional orchestrated-audit mode** for large apps (route-sharded, live-first, provenance-stamped) — a scale tool that inherits the coverage + honesty guardrails.

---

## The three modes

| Mode | You provide | You get back |
|---|---|---|
| **AUDIT** | Screenshots, a screen recording, or a pointer to a running app (passive evidence) | A **scored defect report** with self-contained, paste-ready correction prompts, prioritized by impact |
| **TEST** | A running app **+** computer-use tools (controllable browser, mouse/keyboard, terminal) | The same scored report, with deeper coverage — viewport sweeps, keyboard a11y, edge-case injection, error/empty/loading states, DOM/a11y-tree inspection, Lighthouse/axe |
| **BRIEF** | A plain-language description of an app you want to build | A **design-enriched prompt** (+ a persistent `design-intent.md`) that makes a development LLM produce premium UI on the first try |

The skill auto-detects the mode from your request and what you supply. If it's genuinely ambiguous, it asks one question; otherwise it states its choice and proceeds.

---

## The pipeline: brief → build → verify

Design Forge closes the loop instead of treating design as a one-shot:

1. **BRIEF** emits a `design-intent.md` recording the archetype, palette/type/spacing/motion/dark-mode direction, the rationed-accent rule, and a list of **testable criteria** (countable accent uses, tabular figures, ≥3 dark elevation surfaces, visible focus on every control, AA contrast, no horizontal scroll).
2. You **build** the app with any development LLM using that prompt/file.
3. **AUDIT** or **TEST** reads the *same* `design-intent.md` and grades the build against it — every design decision becomes a checkable criterion (*"the brief rationed one accent; the build uses indigo in six decorative places → violation"*).
4. Recurring drift feeds back into `design-intent.md` as sharper constraints for next time.

---

## Installation

This plugin is distributed through the **`claude-skills`** marketplace.

### Claude Code

```bash
# Add the marketplace (once)
/plugin marketplace add franckdjiongo/claude-skills

# Install the plugin
/plugin install design-forge@claude-skills

# Activate without restarting
/reload-plugins
```

Or use the **Plugins** UI in Claude Code Desktop: *Plugins → Marketplace → Design Forge → Install*, then toggle it on. After installing you should see a **Skills** section (`design-forge`) and an **Agents** section (the three specialists). The skill triggers automatically from your request, or you can invoke it explicitly with `/design-forge:design-forge` (plugin skills are namespaced by plugin name).

### OpenAI Codex

```bash
# Add the marketplace (once)
codex plugin marketplace add franckdjiongo/claude-skills
```

Then install from the plugin browser: run `codex`, open **`/plugins`**, switch to the **Franck Djiongo Skills** source, open **Design Forge**, and install. In the Codex App / IDE, search or browse for the plugin and choose **Add to Codex**.

> Installed from a marketplace, the plugin is pulled from the **GitHub repo** — so updates only appear after the change is pushed there and you run **Update / reinstall** in the host.

---

## Usage

Just describe what you want — the skill triggers automatically. Examples:

- **BRIEF** — *"I want to build a calm budgeting app for freelancers — make me a design brief."*
- **AUDIT** — paste a screenshot: *"Audit this UI. Is this AI slop? Give me a quality score and fix prompts."*
- **TEST** — *"Test my site at localhost:3000 — click through everything and check responsiveness and accessibility."*

Trigger phrases: `design forge`, `audit my UI`, `is this AI slop`, `make my app look premium`, `design brief for…`, `test my site`.

### Two ways a specialist runs

1. **Inline (default)** — required when you paste images or need back-and-forth (a dispatched sub-agent can't see pasted screenshots). The main agent adopts the specialist's playbook.
2. **Dispatched sub-agent (optional)** — for context isolation on long, tool-heavy **TEST** runs, or when inputs live on disk (saved screenshots, a `design-intent.md`).

---

## Codex: how agents work

Researched against the official Codex docs:

- **Codex agents are standalone TOML files**, not plugin components. They live in `~/.codex/agents/` (personal) or `.codex/agents/` (project), with fields like `name`, `description`, `developer_instructions`, `model`, `model_reasoning_effort`, `sandbox_mode`, and `nickname_candidates`.
- **A Codex plugin cannot ship agents.** The `.codex-plugin/plugin.json` manifest only supports `skills`, `mcpServers` (`.mcp.json`), `apps` (`.app.json`), and `hooks` — there is no `agents` key and no `agents/` convention. Codex simply ignores this plugin's `agents/*.md` files.
- **You don't need them in Codex.** The `design-forge` skill's router already runs AUDIT / TEST / BRIEF inline, so the single skill is the full experience.
- **Optional (power users):** to run a specialist as a dedicated Codex subagent, hand-author a TOML in `~/.codex/agents/`, e.g.:

  ```toml
  name = "design-forge-audit"
  description = "Passive UX/UI visual QA of screenshots/video; emits a scored defect report."
  model_reasoning_effort = "high"
  developer_instructions = """
  Act as the Design Forge audit specialist: pixel-level defect analysis, AI-slop
  rejection, a scored report, and self-contained paste-ready correction prompts.
  Load and follow the installed design-forge skill's references/ and assets/.
  """
  ```
  Heads-up: as of mid-2026 there are open Codex issues where *project-scoped* agents in `.codex/agents/` are advertised but fail to spawn — prefer the personal `~/.codex/agents/` location.

## Requirements

- **AUDIT** and **BRIEF** work in any environment.
- **TEST** needs host **computer-use / browser-control** capabilities (e.g. Claude in Chrome, computer-use, a controllable terminal). It adapts per platform (Claude Desktop, Codex, Antigravity), runs the nearest substitute for anything the platform can't do, and states the gap plus a manual-verification recommendation in the report.
- No environment has a real screen reader: Design Forge inspects the accessibility tree and recommends manual VoiceOver/NVDA verification rather than claiming screen-reader output.

---

## What makes the output different

- **Prioritized by impact** — every report leads with the ~20% of fixes that resolve ~80% of perceived-quality loss.
- **Self-contained correction prompts** — copy any one prompt into a development LLM with zero extra context; it names the component/selector, current vs. desired value, the exact token, and anti-slop constraints.
- **Rejects AI slop** — pushes toward intentional, distinctive, premium design instead of the generic LLM-default aesthetic, with concrete premium alternatives.
- **Quantitative** — cites exact values, tokens, and the standard violated (e.g. *"≈2.8:1, fails WCAG AA 4.5:1"*), and flags where a value was estimated.

---

## Directory layout

```
design-forge/
├── .claude-plugin/plugin.json     # Claude Code manifest (auto-discovers skills/ + agents/)
├── .codex-plugin/plugin.json      # Codex manifest ("skills": "./skills/")
├── README.md                      # this file
├── agents/                        # plugin agents (Claude Code) — must be at plugin root
│   ├── design-forge-audit.md
│   ├── design-forge-brief.md
│   ├── design-forge-test.md
│   └── openai.yaml                # Codex per-plugin interface/policy
└── skills/
    └── design-forge/
        ├── SKILL.md               # the router skill
        ├── references/            # on-demand knowledge base (loaded per mode)
        └── assets/                # output templates (report + design-intent skeletons)
```

Bundled files are referenced at runtime via `${CLAUDE_PLUGIN_ROOT}`, which expands to the plugin's absolute install path — so the skill and agents always find their references and templates regardless of where the plugin is installed.

---

## License & author

MIT · by [Franck Djiongo](https://github.com/franckdjiongo/claude-skills). Part of the [claude-skills](https://github.com/franckdjiongo/claude-skills) library.
