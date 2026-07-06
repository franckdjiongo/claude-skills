# Design Studio

> Complete design system as one plugin: brand identity (brand-forge), premium production-grade websites/app UIs with real-browser visual QA (ship-polished-ui), and polished documentary artifacts — slides, plans, reports, dashboards (design-elevation), plus a visual-qa-inspector agent for fresh-context browser verification.

Works in **Claude Code** and **OpenAI Codex**.

## What you get

| Component | Name | Role |
|---|---|---|
| Skill | `ship-polished-ui` | Create or improve premium, production-grade websites and app UIs — runs a non-negotiable real-browser visual QA loop and posts a Verification Ledger before done. |
| Skill | `design-elevation` | Professional design thinking for documentary artifacts — slides, plans HTML, reports, dashboards, PDFs, data viz. |
| Skill | `brand-forge` | Full brand package from scratch — verified name, slogans, logo concepts, palette, typography, `brand-tokens.css`. |
| Agent | `visual-qa-inspector` | Fresh-context browser QA pass on UI changes; dispatched by `ship-polished-ui` (Claude Code only). |

> In **Codex**, agents are not a plugin component (they are standalone TOML in
> `~/.codex/agents/`). Any `agents/` here load in **Claude Code only**.

## Installation

### Claude Code
```bash
/plugin marketplace add franckdjiongo/claude-skills
/plugin install design-studio@claude-skills
/reload-plugins
```

### OpenAI Codex
```bash
codex plugin marketplace add franckdjiongo/claude-skills
```
Then install from the `/plugins` browser (CLI) or **Add to Codex** (App/IDE).

> Marketplace installs pull from GitHub — push changes, then Update/reinstall.

## Directory layout
```
design-studio/
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── README.md
├── SWITCH.md                       (bascule ~/.claude ↔ plugin + rollback)
├── agents/
│   └── visual-qa-inspector.md      (Claude Code only)
└── skills/
    ├── ship-polished-ui/SKILL.md   (+ references/)
    ├── design-elevation/SKILL.md   (+ references/)
    └── brand-forge/SKILL.md        (+ references/)
```

> This plugin is a **mirror**: the source of truth for each skill is the
> repo-root folder (`ship-polished-ui/`, `design-elevation/`, `brand-forge/`)
> and `~/.claude/agents/visual-qa-inspector.md`. Re-sync with
> `node scripts/sync-design-studio.mjs` (from the repo root) after editing a
> source. See `SWITCH.md` before activating the plugin.
