# Obsidian for Technical Users: Consolidated Reference Guide

**Version**: v1.10.3 (December 2025)  
**Consolidated from**: Obsidian Fundamentals (December 2025) + Technical Users Complete Reference Guide

Obsidian is a local-first, Markdown-based knowledge management application that stores notes as plain `.md` files. Your vault (collection of notes) is just a folder on disk, enabling full control, offline access, Git compatibility, and integration with AI tools like Claude via MCP servers. This consolidated guide covers vault architecture, plugin configuration, templates, sync strategies, and AI-assisted workflows validated as of late 2024/2025.

---

## Table of Contents

1. [Obsidian Fundamentals](#1-obsidian-fundamentals)
2. [Vault Architecture Patterns](#2-vault-architecture-patterns)
3. [Essential Configuration](#3-essential-configuration)
4. [Templates and Automation](#4-templates-and-automation)
5. [Integration with Development Workflows](#5-integration-with-development-workflows)
6. [Sync and Backup Strategies](#6-sync-and-backup-strategies)
7. [Anti-Patterns and Mistakes to Avoid](#7-anti-patterns-and-mistakes-to-avoid)
8. [Quick-Start Checklist](#8-quick-start-checklist)
9. [Sources](#9-sources)

---

## 1. Obsidian Fundamentals

### Core Architecture

Obsidian stores everything as **plaintext Markdown files** in a local folder called a vault. The `.obsidian/` subfolder contains settings, installed plugins, and themes—these can be version-controlled or excluded from sync as needed. This architecture means your notes work in any text editor, can be processed by scripts, and remain readable decades from now.

The application renders Markdown content including tables, code blocks, LaTeX math (`$equation$`), and callout blocks (`> [!note]`) in Live Preview or Reading mode. Attachments (images, PDFs) can be embedded with `![[file.png]]` syntax.

### Recent Additions (2024-2025)

**Bases** (v1.9+): A core plugin providing a database-like experience using the new `.base` file format. Bases transform collections of notes into queryable tables, card grids, and boards powered entirely by frontmatter data—no external plugins required. All data remains in Markdown files while providing Notion-like views for projects, inventories, and workflows.

**Properties** (2023+): Structured metadata (YAML frontmatter) promoted to first-class status with a visual Properties editor UI. Common fields like `tags`, `aliases`, and `cssclasses` are recognized automatically. Properties must now use list format (plural) in YAML rather than the old singular fields.

**Canvas**: A core plugin providing whiteboard-style space to arrange notes, text, and media visually—useful for mind-mapping, architecture diagrams, or project planning.

### Linking Mechanics

Obsidian's power comes from its **bidirectional linking system**. The wikilink syntax creates connections that work both directions—the linked note automatically shows incoming links in its Backlinks panel.

| Syntax | Function |
|--------|----------|
| `[[Note Name]]` | Basic link to another note |
| `[[Note Name\|Display Text]]` | Link with custom display text |
| `[[Note#Heading]]` | Link to specific heading |
| `[[Note#^block-id]]` | Link to specific block/paragraph |
| `![[Note]]` | Embed note content inline |
| `![[file.png]]` | Embed image or attachment |

The **Backlinks panel** shows two categories: explicit links (direct references) and unlinked mentions (note title appearing as plain text elsewhere). This surfaces connections you didn't explicitly create.

### Graph View

The Graph View renders your vault as a network where nodes represent notes and edges represent links. Node size scales with connection count, making hub notes visually prominent.

Practical uses:
- Identifying orphan notes (nodes with no connections)
- Discovering clusters of related content
- Finding unexpected connections between topics
- Understanding local context via Local Graph (neighbors of current note only)

Configure colored groups based on search queries—for example, color all `#project` notes blue and all `#reference` notes gray. The graph can be filtered by tags, folders, or link properties. Many find it most helpful in moderate-sized vaults; very large vaults may need filtering to be useful.

### Frontmatter and Properties

YAML frontmatter at the top of notes stores structured metadata that Obsidian and plugins can query:

```yaml
---
title: Authentication Architecture
type: project
status: active
created: 2025-12-23
deadline: 2025-12-31
tags: [security, backend]
aliases: [Auth System, Login Flow]
cssclasses: [wide-page]
---
```

Obsidian recognizes native property types: **text**, **list**, **number**, **checkbox**, **date**, and **datetime**. Use ISO 8601 dates (`YYYY-MM-DD`) for Dataview compatibility. The Properties panel above note content provides a visual editor with type enforcement and auto-suggest.

---

## 2. Vault Architecture Patterns

### Folder Structure Strategies

Rather than rigid hierarchies, Obsidian encourages a fluid network of links—yet some structure is beneficial for multi-project vaults.

**Nick Milo's ACE Framework** (organizing by note purpose):

```
/+ (Add/Inbox)    → New notes, drafts, temporary focus areas
/Atlas            → Knowledge notes (concepts, references, sources)
/Calendar         → Time-based notes (daily, weekly, journals)
/Efforts          → Action-oriented notes (projects, ongoing work)
/x (Extra)        → Templates, scripts, CSS, attachments
```

**Type-based structure with numbered prefixes** (ensures consistent display order):

```
/00 Journals      → Daily and periodic notes
/01 Meetings      → Meeting notes
/02 Projects      → Active project documentation
/03 References    → External sources, books, courses
/04 Templates     → Template files
/Attachments      → Images, PDFs, media files
```

**Minimal approach** (Steph Ango, Obsidian CEO): Most notes in vault root with only `/References`, `/Clippings`, and `/Attachments` as folders. Navigation via Quick Switcher and search rather than folder browsing.

**Common project structure**: A `Projects/` folder with sub-folders for each active project, containing project-specific notes, meeting minutes, and documents.

### Tags versus Folders versus Links

Each organizational tool serves a distinct purpose:

| Tool | Best For | Limitation |
|------|----------|------------|
| **Folders** | File types, project boundaries, archivable units | A note can only exist in one folder |
| **Tags** | Multi-dimensional categorization, status markers, filtering | Require discipline for consistency; less visible context |
| **Links** | Relationships between ideas, contextual connections | Need active habit to create |
| **Properties** | Structured metadata for queries, dates, status | Limited to frontmatter |

Nested tags (`#tech/python/async`) create hierarchies without folder rigidity. Tags like `#status/active`, `#status/review` work well for filtering with Dataview queries.

**Recommended approach**: Folders for types, tags for topics, links for relationships, properties for metadata.

### Maps of Content (MOCs)

MOCs are index or hub notes that list and link related notes on a topic. Unlike folders (rigid—a note is either in or out), MOCs can link to anything, allowing one note to appear in multiple contexts.

```markdown
# Python MOC

## Core Language
- [[Python Data Types]]
- [[Python Control Flow]]
- [[Python Functions]]

## Async Programming  
- [[asyncio Fundamentals]]
- [[Concurrency Patterns]]

## Related
- [[Backend Architecture MOC]]
```

**Nick Milo's Linking Your Thinking (LYT) methodology** advocates creating MOCs at the "mental squeeze point"—when you feel overwhelmed by scattered notes on a topic. MOCs emerge from usage rather than being planned upfront. This balances structure with emergence: start with minimal organization, let patterns reveal themselves through writing and linking, then crystallize those patterns into MOCs when needed.

### Multi-Project Vault Strategies

Most power users prefer a **single vault** for cross-pollination of ideas and unified search. Within a single vault, separate projects using:

- **Top-level folders** per project (simple, clear boundaries)
- **The Efforts pattern** from ACE: `/Efforts/🔥 Active/`, `/Efforts/〰️ Simmering/`, `/Efforts/💤 Sleeping/` organized by intensity
- **Project MOCs** that link to all related notes regardless of folder location
- **Prefix conventions**: All notes for Project Alpha in `Projects/Alpha/…` with tag `#alpha`

Consider **multiple vaults** when: performance degrades with vault size, strict privacy separation is required, or different plugin configurations are needed per context.

**Git submodules or symlinks**: If each project has documentation in its repo, symlink those folders into your vault. This makes project docs accessible inside your vault with live updates while keeping the source of truth in the repo. Obsidian handles sub-folders that are themselves Git repos, though the Obsidian Git plugin may not auto-handle multiple sub-repos.

---

## 3. Essential Configuration

### Core Plugins to Enable

| Plugin | Purpose | Configuration |
|--------|---------|---------------|
| **Backlinks** | Show incoming connections | Enable "Backlinks in document" |
| **Quick Switcher** | Fast file navigation (Ctrl/Cmd+O) | Essential for large vaults |
| **Graph View** | Visualize note connections | Configure groups by tags |
| **Daily Notes** | Date-stamped journal entries | Set folder, date format, template |
| **Page Preview** | Hover preview with Ctrl | Enable for link inspection |
| **Tags View** | Browse and manage tags | Essential for tag-based organization |
| **Outline** | Sidebar heading outline | Helpful for long technical notes |
| **Properties** | Edit YAML frontmatter via UI | On by default in 2025 |
| **Templates** | Basic template insertion | Skip if using Templater |
| **Slash Commands** | Type "/" for command access | Disabled by default—enable it |
| **Canvas** | Visual boards and diagrams | Enable for architecture work |
| **File Recovery** | Periodic snapshots for safety | Keep enabled for backups |

### Critical Settings to Tweak

**Editor settings**:
- Enable "Fold headings" and "Fold indents" to collapse sections
- Enable "Scroll past end" for better writing experience
- Verify "Automatically update internal links" is on (usually default)

**Files & Links**:
- Consider "Use [[Wikilinks]]" setting if collaborating with others who prefer standard Markdown links
- Set default location for attachments (e.g., `Attachments/` folder)

**Appearance**:
- Choose a comfortable theme (Default, Things, Primary, or community themes)
- Configure "Show frontmatter" preference (Visible/Hidden/Source)

### Critical Community Plugins

**Templater** (230,000+ installs): Replaces core Templates with dynamic content generation. Key capabilities:

```javascript
<% tp.date.now("YYYY-MM-DD") %>              // Current date
<% tp.date.now("YYYY-MM-DD", -1) %>          // Yesterday
<% tp.file.title %>                          // Current filename
<% tp.file.creation_date("YYYY-MM-DD") %>    // File creation date
<% tp.file.cursor() %>                       // Place cursor here
<% await tp.system.prompt("Enter title:") %> // User text input
<% await tp.system.suggester(labels, values) %> // Dropdown selection
```

Templater can auto-apply templates by folder, execute JavaScript, access clipboard data, and integrate with other plugins. **Start with Templater over core Templates**—migration requires template rewrites.

**Dataview**: Treats your vault as a database, querying note metadata with SQL-like syntax:

```dataview
TABLE status, priority, deadline 
FROM #project 
WHERE status != "completed"
SORT deadline ASC
```

```dataview
LIST FROM "" 
WHERE file.cday = date("2025-12-23")
```

Dataview queries update live as notes change. Use sparingly in large vaults—complex queries impact performance.

**Obsidian Git**: Integrates version control with automatic commit-and-sync, source control view for staging, history browsing, and diff viewing. Requires Git installed on system. **Mobile support is limited**—isomorphic-git struggles with large repositories.

**Tasks**: Advanced task management with due dates, priorities, recurring tasks, and vault-wide queries:

```tasks
not done
due before next week
group by filename
```

**Calendar + Periodic Notes**: Visual calendar navigation and weekly/monthly/yearly notes extending Daily Notes functionality.

**QuickAdd**: Macro and scripting plugin for custom commands—prompt for input, create notes from templates, append to notes, chain Obsidian commands. Essential for automating repetitive workflows.

**Additional Recommended Plugins**:

| Plugin | Purpose |
|--------|---------|
| Advanced Tables | Easier Markdown table editing with auto-formatting |
| Kanban | Trello-style boards inside notes |
| Excalidraw | Sketch and diagram tool integration |
| Linter | Auto-format Markdown on save |
| Tag Wrangler | Rename/merge tags vault-wide |
| Smart Connections | AI-powered semantic note suggestions |
| Outliner/Zoom | WorkFlowy-like outlining features |

### Recommended Plugin Progression

1. **Weeks 1-4**: Core plugins only (Daily Notes, Backlinks, Graph View)
2. **Month 2-3**: Add Templater, Calendar, basic folder structure
3. **Month 4+**: Dataview, Tasks, advanced automation (only when needed)

---

## 4. Templates and Automation

### Core Templates vs Templater

**Core Templates** are straightforward: create a folder with Markdown files as snippets, insert via command/hotkey. Supports basic placeholders: `{{date}}`, `{{time}}`, `{{title}}`.

**Templater** does everything Templates does plus: date manipulation, user prompts with dropdowns, clipboard access, web API calls, arbitrary JavaScript execution, folder-specific auto-templates, and access to note metadata.

### Daily Note Template

```markdown
---
created: <% tp.file.creation_date() %>
tags: [daily-note]
week: <% tp.date.now("YYYY-[W]W") %>
---

# <% moment(tp.file.title,'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %>

<< [[<% tp.date.now("YYYY-MM-DD", -1) %>|Yesterday]] | [[<% tp.date.now("YYYY-MM-DD", 1) %>|Tomorrow]] >>

---
## Focus
- [ ] <% tp.file.cursor() %>

## Notes

## End of Day
### Completed
### Blocked
### Tomorrow

---
### Notes created today
```dataview
LIST FROM "" WHERE file.cday = date("<% tp.date.now('YYYY-MM-DD') %>")
```
```

### Project Documentation Template

```markdown
---
project: <% await tp.system.prompt("Project Name") %>
status: <% await tp.system.suggester(["Planning", "Active", "On Hold", "Completed"], ["planning", "active", "on-hold", "completed"]) %>
created: <% tp.date.now("YYYY-MM-DD") %>
deadline: 
repo: 
tags: [project]
---

# <% tp.frontmatter.project %>

[[Projects MOC]]

## Overview
<% tp.file.cursor() %>

## Goals & Success Criteria
- [ ] 

## Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
|          |           |      |

## Dependencies

## Progress Log
### <% tp.date.now("YYYY-MM-DD") %>
- 
```

### Meeting Note Template

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
type: <% await tp.system.suggester(["Team", "1:1", "Client", "Standup"], ["team", "one-on-one", "client", "standup"]) %>
participants: 
project: 
tags: [meeting]
---

# <% await tp.system.prompt("Meeting Title") %>

## Attendees

## Agenda
1. 

## Discussion
<% tp.file.cursor() %>

## Decisions

## Action Items
- [ ] 

<%* await tp.file.rename(tp.date.now("YYYY-MM-DD") + " - " + await tp.system.prompt("Meeting filename")) %>
```

### Frontmatter Conventions

Standardize fields across note types for consistent Dataview queries:

```yaml
# Universal fields
created: 2025-12-23
modified: 2025-12-23
status: draft | active | completed | archived
tags: [category/subcategory]

# Project-specific
deadline: 2025-12-31
priority: 1-5
project: [[Parent Project]]

# Meeting-specific
participants: [person1, person2]
type: team | one-on-one | client
```

**Critical**: Always use the same property names (e.g., `status`, `deadline`) across all project notes for Dataview compatibility.

### Folder-Specific Automation

Configure Templater to auto-apply templates based on folder:

```
Settings → Templater → Folder Templates
├── Daily/     → Templates/Daily.md
├── Meetings/  → Templates/Meeting.md
├── Projects/  → Templates/Project.md
```

Enable "Trigger Templater on new file creation" so notes created in these folders automatically use the assigned template.

### QuickAdd Automation Examples

- **Log Task**: Prompt for task description and project, append `- [ ] description @project` to daily note and project note
- **New Meeting Note**: Ask for title, use template, auto-link to project MOC, open note
- **Quick Capture**: Hotkey → prompt → append to Inbox note without breaking flow

---

## 5. Integration with Development Workflows

### Git Integration Approaches

**Direct vault as repository** (simplest): Initialize `git init` in vault folder, add remote, use Obsidian Git plugin for automatic commits.

Recommended `.gitignore`:

```gitignore
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.trash/
.DS_Store
```

**Git configuration**:
- Auto backup interval: 10-30 minutes
- Auto pull on startup: ✅
- Commit message: `vault backup: {{date}}`

**Symlinked folders** connect external directories to your vault without duplication:

```bash
# macOS/Linux
ln -s ~/projects/myapp/docs ~/ObsidianVault/Projects/MyApp

# Windows (requires Developer Mode)
mklink /D "C:\ObsidianVault\Projects\MyApp" "C:\projects\myapp\docs"
```

Caveats: May cause indexing issues on mobile, can complicate cloud sync, keep symlinks on same physical drive as vault.

**Git submodules** enable including external repositories within your vault. Desktop-only feature requiring manual submodule updates. Obsidian Git plugin doesn't fully support auto-handling submodules.

### MCP Servers for Claude Integration

Three main options connect Obsidian to Claude and other AI tools:

**obsidian-claude-code-mcp** (iansinnott): Native Obsidian plugin integration with dual WebSocket/HTTP transport. Claude Code CLI auto-discovers via `/ide` command. Tools include file read/write, workspace context, and vault structure access.

**mcp-obsidian** (MarkusPfundstein): Uses Local REST API plugin with broader MCP client support including Claude Desktop.

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uvx",
      "args": ["mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "<your_api_key>",
        "OBSIDIAN_HOST": "127.0.0.1",
        "OBSIDIAN_PORT": "27124"
      }
    }
  }
}
```

**obsidian-mcp-tools** (jacksteamdev): Adds semantic search (meaning-based, not keyword) and Templater integration. Utilizes Smart Connections plugin for embeddings.

### Claude Workflow Patterns

**Pattern 1: Knowledge base context for coding**  
Document architecture decisions, API references, and project notes in Obsidian. When coding, Claude accesses your vault via MCP: "Reference my notes on authentication and implement the login flow."

**Pattern 2: Automated documentation updates**  
Claude reads existing documentation via MCP, analyzes codebase changes, and updates vault notes. Obsidian Git plugin commits changes automatically.

**Pattern 3: Vault organization with AI**  
Use Claude to restructure vaults, create dashboards, fix broken links, migrate metadata formats. Examples: "Update filenames to have preferred spacing" or "Convert all Dataview key::value pairs to Bases format."

**Pattern 4: Symlinked code + vault**  
Symlink project documentation folders into vault. Edit docs from within Obsidian, use wikilinks between projects and notes, give AI access to both code context and knowledge base simultaneously.

**Security note**: Giving AI access to your vault means potentially sensitive info could be read by the model. With Claude, processing is cloud-based—use caution with confidential data.

### IDE and Tool Integration

- Open vault files in VS Code for advanced search/replace or VS Code Markdown features
- Use Obsidian URI scheme (`obsidian://open?vault=VaultName&file=Path`) for external programs to open specific notes
- Right-click code files in vault → "Open in default app" to launch in IDE
- Embed code fences with syntax highlighting for virtually any language in documentation notes

---

## 6. Sync and Backup Strategies

### Sync Method Comparison

| Feature | Obsidian Sync | Git + Plugin | Syncthing | iCloud/Dropbox |
|---------|--------------|--------------|-----------|----------------|
| **Cost** | $4-10/month | Free | Free | Free tier |
| **E2E encryption** | ✅ Yes | ❌ (visible on host) | ✅ Local only | ❌ |
| **Version history** | 1-12 months | Full Git history | Limited | 30 days |
| **Conflict handling** | Auto-merge | Manual Git merge | File versioning | File duplicates |
| **Mobile support** | ✅ Excellent | ⚠️ Unstable | ✅ Via 3rd-party | ✅ Platform-dependent |
| **Setup complexity** | Easy | Moderate | Moderate | Easy |
| **Selective sync** | ✅ Yes | ✅ .gitignore | ✅ Yes | Limited |
| **Real-time sync** | Yes (short delay) | No (commit/push cycle) | Yes (continuous if online) | Varies |
| **Binary files** | Just syncs them | Bloats history | Syncs any file | Yes |

### Detailed Pros and Cons

**Obsidian Sync** ($4-10/month):
- Pros: Seamless integration, end-to-end encrypted, syncs attachments and settings, built-in conflict resolution with options, version history up to 1 year, works across all platforms including mobile, developer-supported
- Cons: Paid subscription, closed-source proprietary service, requires internet, some reports of typing latency in very large vaults during active scanning

**Git (via Obsidian Git plugin)**:
- Pros: Free, full version control with commit history/revert/branch, line-by-line diffs, decentralized (any remote host), scriptable and CI-integratable
- Cons: Not real-time (must commit & push), merge conflicts require manual resolution, Git knowledge required, binary attachments bloat history, mobile is tricky (iOS needs Working Copy app), no built-in encryption

**Syncthing** (peer-to-peer):
- Pros: Free and self-hosted, no third-party server required, encrypted in transit, real-time continuous sync when devices online, cross-platform, no size limits, conflict handling keeps both versions
- Cons: Setup complexity, both devices must be online to sync, iOS background sync is limited, no built-in version history, requires troubleshooting via forums

### Recommendations by Use Case

**For cross-platform simplicity**: Obsidian Sync provides smoothest experience with automatic conflict resolution across all platforms.

**For developers wanting version history**: Git on desktop with automatic commits + Obsidian Sync or Syncthing for mobile. Git provides granular history; second solution handles mobile where Git is unreliable.

**For local-only, privacy-focused**: Syncthing creates peer-to-peer encrypted sync without cloud storage. On iOS, use Möbius Sync or Synctrain.

**Critical warning**: Do not mix sync solutions (e.g., Git + iCloud on same vault)—this causes conflicts and corruption. Choose one sync method per vault.

### Backup Strategy

Regardless of sync method, maintain independent backups:

- **Local backup**: Time Machine (Mac), File History (Windows), or rsync scripts
- **Cloud backup**: Automated upload to separate cloud storage
- **Git remote**: Even if not using Git for sync, periodic pushes to GitHub/GitLab provide offsite backup
- **Obsidian File Recovery plugin**: Periodic snapshots (keep enabled as safety net)

---

## 7. Anti-Patterns and Mistakes to Avoid

### Structural Anti-Patterns

**Pre-emptive folder creation**: Building elaborate hierarchies before writing notes. Result: empty folders, wasted reorganizing time, harder Graph View interpretation.  
→ **Solution**: Add folders only when you have notes that need them.

**Over-complicated hierarchy**: Deep nested structures requiring folder decisions before capturing ideas.  
→ **Solution**: Keep folders shallow (3 levels maximum); use MOCs and tags for topic organization.

**Top-down organization compulsion**: Prioritizing perfect organization over actual writing.  
→ **Solution**: Write first, organize later—or not at all. Obsidian's search is powerful enough.

**Tag overwhelm**: Slapping `#tags` on everything without conventions, leading to duplicates (`#python` vs `#Python`) and meaningless proliferation.  
→ **Solution**: Use tags sparingly and purposefully. Document tag conventions in a reference note. Use Tag Wrangler to merge/rename.

**Isolated notes**: Creating notes but never linking them, losing the networked thought benefit.  
→ **Solution**: Make linking a habit. Every note should link to at least one other note. Use Backlinks pane to find connection opportunities.

### Plugin Anti-Patterns

**The "just one more plugin" trap**: Installing 20+ plugins hoping to find the perfect setup.  
→ **Solution**: Start with core plugins only; add community plugins one at a time when specific needs arise. "The perfect setup does not exist, you will always be battling entropy."

**Plugin overload and maintenance hell**: Too many plugins introduce bugs, performance issues, and update chores.  
→ **Solution**: Keep ~10 well-understood plugins rather than 40 you forget about. Periodically review and disable unused ones. Favor well-maintained, popular plugins.

**Mixing incompatible plugins**: Using two plugins that manage the same thing (e.g., core Templates and Templater both active).  
→ **Solution**: Clarify your toolset. If using Templater, disable core Templates. Check for setting conflicts.

**Not configuring plugins**: Installing without setup (e.g., Dataview without writing queries, Calendar not pointed to Daily Notes folder).  
→ **Solution**: After installing, always check plugin options. Read the README. Learn basic usage before moving on.

### Performance Anti-Patterns

| Anti-pattern | Impact | Threshold |
|--------------|--------|-----------|
| Too many Dataview queries | Freezes on editing | Multiple queries + 1,500+ notes |
| Dataview on startup pages | Minutes-long load times | Especially on mobile |
| `FROM ""` scanning entire vault | Slow queries | Always use folder/tag filters |
| Tasks plugin views at startup | Significant delays | Re-reads vault on every file |
| Excessive attachments | Unusable searches | 500,000+ total files |

**Optimization strategies**:
- Limit Dataview queries per page
- Specify `FROM "folder"` instead of vault-wide scans
- Close plugin views before quitting Obsidian
- Use local images instead of external URLs in tables
- Archive old notes to reduce active vault size
- Disable/limit Graph View if it becomes sluggish with huge vaults

### Workflow Anti-Patterns

**Not linking notes**: Loses compound benefit of connected ideas. Links are how notes resurface and reveal unexpected connections.

**No capture habit**: Creates friction preventing ideas from reaching the vault.  
→ **Solution**: Configure QuickAdd or mobile inbox for frictionless capture.

**Trying to make Obsidian do everything**: Using it as task manager when dedicated tools do that better. Obsidian excels as a thinking tool.

**Over-automation**: Spending more time configuring than writing.  
→ **Solution**: "Don't fall into the trap of endlessly tweaking instead of doing."

**Set-and-forget knowledge**: Notes go in, never out, leading to bloat and outdated info.  
→ **Solution**: Schedule periodic reviews. Archive/delete obsolete notes. Curate MOCs as notes accumulate. If a note was a raw meeting dump, polish it later.

---

## 8. Quick-Start Checklist

### Day 1: Foundation

- [ ] Install Obsidian and create vault in accessible, sync-friendly location
- [ ] Enable core plugins: Backlinks, Quick Switcher, Daily Notes, Tags View, Outline, Properties
- [ ] Set Daily Notes folder (e.g., `Calendar/Daily/`)
- [ ] Configure date format to `YYYY-MM-DD`
- [ ] Create first daily note—start writing immediately
- [ ] Learn 5 Markdown basics: `# headings`, `**bold**`, `[[links]]`, `- lists`, `` `code` ``

### Week 1: Basic Structure

- [ ] Install Templater (disable core Templates)
- [ ] Create `/Templates/` folder with Daily Note template
- [ ] Configure Templater folder templates for automatic application
- [ ] Create 3-4 top-level folders: `Calendar/`, `Projects/`, `References/`, `Templates/`
- [ ] Enable "Trigger Templater on new file creation"
- [ ] Practice linking: every new note should link to at least one existing note

### Week 2-4: Expand Capabilities

- [ ] Install Obsidian Git, configure automatic commits (if using Git)
- [ ] Create `.gitignore` excluding workspace files
- [ ] Install Calendar plugin for daily note navigation
- [ ] Create first MOC when a topic accumulates 5+ related notes
- [ ] Add Meeting and Project templates
- [ ] Establish weekly review habit: process inbox, update MOCs

### Month 2+: Power Features (As Needed)

- [ ] Install Dataview when you need dynamic queries
- [ ] Install Tasks if managing todos in Obsidian
- [ ] Configure MCP server for Claude integration
- [ ] Set up symlinks to code repository documentation
- [ ] Create project dashboards with Dataview tables
- [ ] Consider Periodic Notes for weekly/monthly reviews

### Key Configuration Reference

**Templater settings**:
- Template folder: `Templates/`
- Trigger on new file creation: ✅
- Automatic jump to cursor: ✅
- Folder templates: Configure per target folder

**Git settings** (if using):
- Auto backup interval: 10-30 minutes
- Auto pull on startup: ✅
- Commit message: `vault backup: {{date}}`

**Daily Notes settings**:
- Date format: `YYYY-MM-DD`
- New file location: `Calendar/Daily/`
- Template: `Templates/Daily.md`

---

## 9. Sources

### Official Documentation
- Obsidian Help: help.obsidian.md
- Obsidian Changelog: obsidian.md/changelog
- Obsidian Forum: forum.obsidian.md

### Plugin Documentation
- Templater: silentvoid13.github.io/Templater
- Dataview: blacksmithgu.github.io/obsidian-dataview
- Obsidian Git: github.com/Vinzent03/obsidian-git
- Tasks: publish.obsidian.md/tasks
- QuickAdd: quickadd.obsidian.guide

### MCP Servers
- mcp-obsidian (REST API): github.com/MarkusPfundstein/mcp-obsidian
- obsidian-claude-code-mcp: github.com/iansinnott/obsidian-claude-code-mcp
- obsidian-mcp-tools: github.com/jacksteamdev/obsidian-mcp-tools

### Methodology and Best Practices
- Linking Your Thinking (Nick Milo): linkingyourthinking.com
- Obsidian Rocks guides: obsidian.rocks
- Steph Ango's vault structure: stephango.com
- How to Manage Multiple Projects with Obsidian: blog.obsibrain.com
- Maps of Content: Effortless organization for notes: obsidian.rocks

### Community Resources
- Obsidian Stats (plugin metrics): obsidianstats.com
- Template repositories: github.com/groepl/Obsidian-Templates, github.com/lguenth/obsidian-templates
- Sebastien Dubois, Must-have Obsidian Plugins: dsebastien.net
- Nicole van der Hoeven, 5 Things Templater Can Do: nicolevanderhoeven.com
- 10 Problems with Obsidian You'll Realize When It's Too Late (Theo James): Medium
- Syncing Notes with Obsidian comparison: ergaster.org
- Claude & MCP Integration threads: r/ObsidianMD
- Supercharge Your Knowledge Management — Integrating Obsidian MCP with Claude (Souvik Pal): Medium

---

*Consolidated December 2025 from multiple source documents. All unique technical content preserved.*
