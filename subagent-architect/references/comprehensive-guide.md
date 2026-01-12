# Claude Code Sub-Agents: Comprehensive Reference

**Description:** Unified technical handbook covering architecture, configuration, operations, and governance patterns for Claude Code sub-agents across CLI, SDK, and orchestrated workflows.
**Last updated:** 2025-11-13

## Table of Contents
- [1. Introduction](#1-introduction)
  - [1.1 Definition and Scope](#11-definition-and-scope)
  - [1.2 Orchestrated Delegation Principle](#12-orchestrated-delegation-principle)
  - [1.3 Purpose and Key Benefits](#13-purpose-and-key-benefits)
  - [1.4 Enabling Platform Components](#14-enabling-platform-components)
- [2. Core Architecture and Agentic Flow](#2-core-architecture-and-agentic-flow)
  - [2.1 Multi-Agent Orchestrator Pattern](#21-multi-agent-orchestrator-pattern)
  - [2.2 Agentic Loop](#22-agentic-loop)
  - [2.3 Orchestration Models](#23-orchestration-models)
  - [2.4 Delegation, Parallelism, and Speculation](#24-delegation-parallelism-and-speculation)
  - [2.5 Separation of Concerns and Context Budgets](#25-separation-of-concerns-and-context-budgets)
  - [2.6 Communication, Handoffs, and Memory](#26-communication-handoffs-and-memory)
  - [2.7 Automatic vs. Explicit Invocation](#27-automatic-vs-explicit-invocation)
  - [2.8 Hierarchies, Chaining, and Composition](#28-hierarchies-chaining-and-composition)
  - [2.9 State Management Strategies](#29-state-management-strategies)
- [3. Configuration and Setup](#3-configuration-and-setup)
  - [3.1 Prerequisites and Installation](#31-prerequisites-and-installation)
  - [3.2 Agent Discovery and Scope](#32-agent-discovery-and-scope)
  - [3.3 Authoring Sub-Agent Files](#33-authoring-sub-agent-files)
  - [3.4 YAML Frontmatter Fields](#34-yaml-frontmatter-fields)
  - [3.5 Tools, Permissions, and Safety Defaults](#35-tools-permissions-and-safety-defaults)
  - [3.6 Interactive Creation Workflow](#36-interactive-creation-workflow)
  - [3.7 Programmatic Definitions and Overrides](#37-programmatic-definitions-and-overrides)
  - [3.8 Agent Skills and Knowledge Packaging](#38-agent-skills-and-knowledge-packaging)
  - [3.9 Hooks and Event Automation](#39-hooks-and-event-automation)
- [4. Tooling, Models, and Capabilities](#4-tooling-models-and-capabilities)
- [5. Real-World Patterns and Templates](#5-real-world-patterns-and-templates)
  - [5.1 Code Review Specialist](#51-code-review-specialist)
  - [5.2 Debugger and Incident Responder](#52-debugger-and-incident-responder)
  - [5.3 Data Science and Analytics Agent](#53-data-science-and-analytics-agent)
  - [5.4 Research-Grade Multi-Agent System](#54-research-grade-multi-agent-system)
  - [5.5 TDD Orchestration Loop](#55-tdd-orchestration-loop)
  - [5.6 Additional Reference Agent Definitions](#56-additional-reference-agent-definitions)
- [6. Best Practices](#6-best-practices)
- [7. Anti-Patterns and Pitfalls](#7-anti-patterns-and-pitfalls)
  - [7.1 Functional Design Failures](#71-functional-design-failures)
  - [7.2 Security Pitfalls](#72-security-pitfalls)
  - [7.3 Operational and Resource Risks](#73-operational-and-resource-risks)
- [8. Advanced Techniques and Workflows](#8-advanced-techniques-and-workflows)
- [9. Security and Governance Guidance](#9-security-and-governance-guidance)
- [10. Troubleshooting and Diagnostics](#10-troubleshooting-and-diagnostics)
- [Appendix A. YAML Field Quick Reference](#appendix-a-yaml-field-quick-reference)
- [Appendix B. Sample Agent Summary Matrix](#appendix-b-sample-agent-summary-matrix)
- [Appendix C. Glossary](#appendix-c-glossary)
- [References](#references)

## 1. Introduction

### 1.1 Definition and Scope
Claude Code sub-agents are specialized, autonomous AI assistants orchestrated by a primary Claude instance. They operate as "agents within an agent"—pre-configured personas with tailored instructions, context windows, and tool access dedicated to well-defined engineering or analytical tasks. Each sub-agent executes inside an isolated context window so that intermediate reasoning, tool calls, and artifacts never pollute the orchestrator’s conversation.1

### 1.2 Orchestrated Delegation Principle
Claude Code implements an orchestrated delegation model rather than free-form parallel execution. The orchestrator (primary agent) decides when to spin up a sub-agent, launches it in an isolated workspace, and receives the distilled output. This maintains clean context boundaries while enabling domain experts to collaborate on the same request.5

### 1.3 Purpose and Key Benefits
Sub-agents expand Claude’s effectiveness on complex workflows by combining specialization, isolation, and optional parallelism. Core benefits include:
- **Context isolation:** Each sub-agent maintains its own transcript, preventing contamination of the main session. Intermediate steps and large working sets stay inside the helper, while the orchestrator receives concise results.
- **Domain expertise:** Prompts define narrowly scoped roles (e.g., "database-migration expert" or "UI tester"), producing higher-quality task execution than a generalist agent.
- **Parallel exploration:** Orchestrators can spawn multiple helpers simultaneously to explore independent branches. Anthropic measured ~90% higher success on complex research benchmarks when a lead agent coordinated several specialists instead of working sequentially.
- **Focused tool access:** Tool permissions can be scoped per agent to enforce least privilege and reduce risk.
- **Independent reasoning cycles:** Helpers run their own deliberation (including optional "think" traces), report back, and never interfere with each other’s reasoning.

### 1.4 Enabling Platform Components
Claude sub-agents run on the same production-grade infrastructure as Claude Code and the Claude Agent SDK. Key platform features:
- **Claude Agent SDK (TypeScript & Python):** Shared runtime used by Claude Code, offering APIs for queries, streaming, and agent orchestration. It supports inline agent definitions, hooks, and memory utilities.7
- **Context compaction:** Automatic summarization prevents long-running sessions from exceeding window limits.7
- **Tool ecosystem:** Built-in file, code, web, and search tools plus Model Context Protocol (MCP) integrations for services like Playwright, Slack, or GitHub.10
- **Security primitives:** Fine-grained tool permissions, ask/deny prompts, and sandboxing protect projects even when agents are autonomous.10
- **Configuration hierarchy:** Agents (.claude/agents/), Skills (.claude/skills/), and hooks (.claude/settings.json) live on disk for collaborative editing and version control.10

## 2. Core Architecture and Agentic Flow

### 2.1 Multi-Agent Orchestrator Pattern
Claude Code follows an orchestrator–worker design. The orchestrator decomposes a complex request into subtasks, spawns specialized workers, and synthesizes their results. Each worker operates with strict independence—no shared memory beyond data explicitly passed through prompts—eliminating cross-contamination between concurrent helpers. The orchestrator retains responsibility for global planning, prioritization, and response synthesis.

### 2.2 Agentic Loop
Every Claude agent, including sub-agents, runs an iterative loop of **gather context → take action → verify output**:
1. **Gather context:** Retrieve situational data via file-system tools (e.g., `ls`, `grep`, `tail`), semantic search if configured, or by delegating to another sub-agent for missing information.6
2. **Take action:** Execute built-in tools, run code, call MCP services, or edit files. Sub-agents follow their prompts closely—e.g., invoking TodoWrite, running `pytest`, or generating SQL scripts.6
3. **Verify work:** Validate outputs using deterministic checks (linters, tests), visual comparisons (Playwright screenshots), or LLM-as-judge validators for fuzzier criteria.6
The loop repeats until the sub-agent satisfies its goal or the orchestrator intervenes.

### 2.3 Orchestration Models
Claude’s orchestration behavior has evolved across three patterns:
- **Sequential (legacy):** Users manually selected a specialist up front. Flow: *User → Main Claude → Manual agent choice → Result*. Predictable but inflexible for multi-domain work.14
- **Collaborative (default):** The primary agent plans the work, optionally @mentions specialists, and integrates their outputs. This is the main Claude Code experience.14
- **Proactive (native) orchestration:** Claude 4.5+ models autonomously invoke sub-agent tools when descriptions match the task, even without explicit @mentions. Well-authored descriptions act as policy hints that unlock proactive delegation.15

### 2.4 Delegation, Parallelism, and Speculation
Upon receiving a request, the orchestrator decides whether to delegate. When it does, it may launch several helpers in parallel, each with a clear objective. Parallel exploration is especially powerful for breadth-first searches, multi-entity research, or simultaneous code reviews (style, security, tests). Anthropic’s internal research system demonstrated a 90.2% success rate on difficult queries using one lead agent plus parallel researchers versus failure by a single agent. Speculative delegation—spawning extra helpers knowing some may be redundant—can further improve coverage when cost allows.

### 2.5 Separation of Concerns and Context Budgets
Design each helper around a narrow responsibility while the orchestrator maintains the big picture. A LeadResearcher might spawn CompanyDataFinder and NewsCrawler helpers; each can spend its entire 100K-token context diving deep but return only a 1–2K summary. This separation prevents context overload and keeps synthesis manageable.

### 2.6 Communication, Handoffs, and Memory
Though helpers are invoked through API calls rather than literal chat messages, treat handoffs as structured specifications. Provide goals, necessary context, and expected output formats. For long-running plans, store shared state externally (e.g., orchestrator writes plans to Memory or files) so subtasks persist even if windows reset. Anthropic’s multi-agent research system persisted plans in a shared memory file to coordinate later steps. The orchestrator should track progress, completed subtasks, and outstanding work.

### 2.7 Automatic vs. Explicit Invocation
Two invocation modes coexist:
- **Automatic delegation:** If a sub-agent’s description clearly matches the current task, Claude may launch it without explicit instruction. Descriptions should include actionable triggers such as "Use proactively after code changes" or "MUST BE USED for optimization tasks". Claude 4.5 greatly improved native sub-agent orchestration and will proactively delegate when the description aligns.
- **Explicit invocation:** Users or calling code can demand a specific helper (e.g., `> Use the code-reviewer subagent to check the auth module`). In SDK calls, include the agent in the `agents` map and mention it in the prompt. Explicit invocation guarantees usage even if automatic heuristics would skip it.

### 2.8 Hierarchies, Chaining, and Composition
Sub-agents do not automatically spawn further helpers; orchestration remains centralized. However, orchestrators can chain helpers by feeding one’s output into another (e.g., code-analyzer → optimizer). Complex pipelines may involve sequential stages or even multiple orchestrators in layered hierarchies, though this increases coordination complexity and should be attempted only when clearly beneficial.

### 2.9 State Management Strategies
The orchestrator maintains global state: which subtasks have run, which remain, and any follow-ups. Store critical data in structured formats (JSON) or unstructured notes, and leverage git for durable work logs. For multi-session workflows, the Memory tool persists findings so future helpers can reload context. Claude’s `<clear_tool_uses>` and compaction commands help manage context growth, while Git check-ins provide checkpoints and rollback options.

## 3. Configuration and Setup

### 3.1 Prerequisites and Installation
1. Install Node.js 18 or newer.16
2. Run `npm install -g @anthropic-ai/claude-code` (avoid `sudo` to prevent permission issues).16
3. Authenticate by running `claude` inside a project directory; the CLI launches an OAuth flow linked to your Anthropic account (requires active billing or a Pro/Max plan).16
4. Validate with `claude doctor`; a healthy installation reports `✔ All systems go`.16

### 3.2 Agent Discovery and Scope
Claude scans two locations at startup or when `/agents` runs. Project agents override user agents with identical names.10

| Scope | Directory | Availability | Priority |
| :--- | :--- | :--- | :--- |
| Project | `./.claude/agents/` | Only within the current repository | 1 (highest) |
| User | `~/.claude/agents/` | Global across all projects for that user | 2 |

### 3.3 Authoring Sub-Agent Files
File-based agents use Markdown with YAML frontmatter:
1. Create the directory (e.g., `mkdir -p .claude/agents`).
2. Add a Markdown file named after the agent (e.g., `code-reviewer.md`). The filename (minus extension) becomes the agent identifier.
3. Include a YAML header delineated by `--- ... ---`, then write the system prompt body with instructions, checklists, and heuristics.14

### 3.4 YAML Frontmatter Fields
| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `name` | Yes | String | Unique, lowercase identifier used for invocation (e.g., `grammar-style-editor`).17
| `description` | Yes | String | Natural-language summary of purpose and triggers. Essential for proactive delegation.14
| `mode` | Yes | String | Must be `subagent`.14
| `model` | No | String | Preferred model (e.g., `anthropic/claude-3-5-sonnet-20241022`, `sonnet`, `opus`, `haiku`, or `inherit`). Defaults to the orchestrator’s configured sub-agent model (Sonnet by default).14
| `temperature` | No | Float | Creativity vs. determinism control (e.g., `0.3`).
| `tools` | No | Map | Explicit tool toggles (`read`, `write`, `edit`, `bash`, `grep`, `glob`, `TodoWrite`, etc.). Omitted entries inherit orchestrator tools—explicitly set to enforce least privilege.14
| `permissions` | No | Map | Ask/allow/deny policies for destructive actions (e.g., `edit: ask`, `bash: {"*": deny}`) to enforce zero-trust execution.14

### 3.5 Tools, Permissions, and Safety Defaults
- Grant only the capabilities an agent needs (principle of least privilege).3
- Default destructive operations (`edit`, `write`) to `ask` for confirmation.14
- Deny `bash` by default or allow-list specific safe commands (e.g., `{ "grep": allow, "ls": allow, "*": deny }`).14
- Never rely on `--dangerously-skip-permissions`; the YAML permissions block is the supported granular alternative.21

### 3.6 Interactive Creation Workflow
Use the Claude Code CLI/IDE `/agents` command:
1. Open `/agents` to list, create, or edit helpers.
2. Choose **Create New Agent**, then select scope (Project vs. User).
3. Fill fields: name, description (include trigger phrases), tools (choose minimal set), model (inherit or explicit), and author the prompt (manual or AI-generated). Example prompt guidelines for a debugger: capture error context, isolate root cause, recommend fixes, and verify results.
4. Save to generate `.claude/agents/<name>.md`.
5. Test by invoking (`> Ask the debugger subagent to investigate the latest error.`). The UI collapses outputs after ~3 concurrent agents; expand to inspect tool traces. Claude may need a restart or `/agents` refresh to pick up new files.

### 3.7 Programmatic Definitions and Overrides
The SDK accepts inline agent definitions via the `agents` option. Examples:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "Review the authentication module for security issues",
  options: {
    agents: {
      "code-reviewer": {
        description: "Expert code review specialist. Use for quality, security, and maintainability reviews.",
        prompt: `You are a code review specialist with expertise in security, performance, and best practices.
When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements
Be thorough but concise in your feedback.`,
        tools: ["Read", "Grep", "Glob"],
        model: "sonnet"
      },
      "test-runner": {
        description: "Runs and analyzes test suites. Use for test execution and coverage analysis.",
        prompt: `You are a test execution specialist. Run tests and provide clear analysis of results.
Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures`,
        tools: ["Bash", "Read", "Grep"],
        model: "sonnet"
      }
    }
  }
});
for await (const message of result) {
  console.log(message);
}
```

```python
from anthropic_sdk import query, ClaudeAgentOptions, AgentDefinition
agents_def = {
    "code-reviewer": AgentDefinition(
        description="Expert code review specialist...",
        prompt="You are a senior code reviewer...",
        tools=["Read", "Grep", "Glob", "Bash"],
        model="inherit"
    )
}
response = query(
    prompt="Use the code-reviewer agent to check the auth module",
    options=ClaudeAgentOptions(agents=agents_def)
)
```

CLI users can launch ephemeral agents with `claude --agents '<JSON>'`, supplying the same fields. Session-scoped agents defined programmatically override user-level files but yield to project-level definitions with matching names.

### 3.8 Agent Skills and Knowledge Packaging
Keep system prompts lean by factoring reusable procedures into `.claude/skills/<skill>.md`. Equip agents with skills to inject deep context (e.g., corporate coding standards) without inflating every spawn. Treat skills as living documents—run tasks, observe failures, ask Claude to reflect, and capture successful heuristics.18

### 3.9 Hooks and Event Automation
Claude Code hooks (configured in `.claude/settings.json` or via the SDK) trigger scripts before or after tool calls. Use them to:
- Enforce guardrails (e.g., deny `rm -rf` from Bash with an Elixir hook).30
- Launch agents automatically on repository events (e.g., invoke a code reviewer whenever new commits land, or run a test-runner after test file edits).
- Inject auditing logic (logging tool usage, prompting for confirmation).
Ensure hook scripts validate inputs and quote shell variables to prevent injection.21

```elixir
# Hook callback to block 'rm -rf'
def check_bash_command(input, _tool_use_id, _context) do
  case input do
    %{"tool_name" => "Bash", "tool_input" => %{"command" => cmd}} ->
      if String.contains?(cmd, "rm -rf") do
        # Denies the tool call and returns a message
        Output.deny("Dangerous command blocked: rm -rf")
      else
        # Allows the tool call to proceed
        Output.allow()
      end
    _ -> %{} # Not a bash command, allow
  end
end
```

## 4. Tooling, Models, and Capabilities
- **Built-in tools:** File readers/writers, editors, `grep`, `glob`, Git commands, shell, TodoWrite, search utilities, and more. Tool availability differs between Claude Code’s managed environment and local setups—install required CLIs (e.g., BigQuery) when running locally.
- **Model selection:** Claude defaults sub-agents to Sonnet to balance speed and cost. Use Haiku (including Claude 4.5 Haiku) for lightweight or highly parallel helpers; reserve Opus for tasks needing deep reasoning (e.g., complex debugging). Optimize cost by matching model capability to task difficulty.
- **Think tool:** Provide a simple reflection tool so agents pause, reason, and follow policies before acting.22
- **Model Context Protocol (MCP):** Connect trusted MCP servers for tools like Playwright. Audit third-party servers before enabling and rely on permissions to sandbox capabilities.21
- **Context compaction & memory:** Long-running sessions auto-summarize. When compaction isn’t enough, persist state with Memory or Git so future agents can resume.
- **Session management:** Built-in monitoring, retries, and error handling help orchestrators recover from tool failures without manual intervention.10

## 5. Real-World Patterns and Templates

### 5.1 Code Review Specialist
Project-level agent (`.claude/agents/code-reviewer.md`):
```yaml
---
name: code-reviewer
description: >-
  Expert code review specialist. Proactively reviews code for quality, security, and maintainability.
  Use immediately after writing or modifying code.
tools:
  - Read
  - Grep
  - Glob
  - Bash
model: inherit
---
You are a senior code reviewer ensuring high standards of code quality and security.
When invoked:
1. Run `git diff` to gather recent code changes.
2. Focus your analysis on the modified files identified.
3. Begin the review immediately on those files.

Review checklist:
- Code is simple and readable (no overly complex or redundant logic).
- Functions and variables are well-named and self-documenting.
- No duplicated code blocks; adhere to DRY principles.
- Proper error handling for all operations.
- No secrets or API keys exposed in code or config.
- Input validation for external inputs.
- Sufficient test coverage for new or changed code.
- Performance implications considered (no obvious inefficiencies).

Provide feedback organized by priority:
- **Critical issues** – must be fixed before merge (security vulnerabilities, failing tests).
- **Warnings** – should be addressed (performance issues, minor bugs).
- **Suggestions** – optional improvements (style nits, refactoring opportunities).

For each issue, explain the impact and suggest specific fixes.
```
This agent intentionally lacks write access, separating review from implementation. Automatic delegation triggers immediately after edits because the description includes "Use immediately after writing or modifying code."

### 5.2 Debugger and Incident Responder
User-level agent (`~/.claude/agents/debugger.md`):
```yaml
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues or failing tests.
tools:
  - Read
  - Edit
  - Bash
  - Grep
  - Glob
model: opus
---
You are an expert debugger, skilled at root cause analysis of software issues.
When invoked:
1. Capture the error message, stack trace, or failing test output.
2. Identify the minimal steps or inputs to reproduce the issue.
3. Isolate the code or component causing the error.
4. Propose a fix and implement it if appropriate (you have Edit access). Focus on minimal, correct changes.
5. Run relevant tests or commands via Bash to verify the fix.
6. Report what was fixed; if unresolved, explain why and suggest next steps.

Guidelines:
- Use logs and test outputs (Read/Grep) for evidence.
- Form hypotheses and test them systematically.
- Explain reasoning in plain language.
- Ensure changes do not break other functionality (run regression tests if available).

For each bug:
- Explain the root cause and cite file/line numbers.
- Describe the fix and rationale.
- Document the result of re-running tests.
```
Selecting Opus prioritizes accuracy for complex debugging despite higher cost.

### 5.3 Data Science and Analytics Agent
Project agent (`.claude/agents/data-scientist.md`):
```yaml
---
name: data-scientist
description: Data analysis expert for SQL queries, BigQuery operations, and data insights. Use proactively for data analysis tasks and database queries.
tools:
  - Bash
  - Read
  - Write
model: sonnet
---
You are a data scientist specializing in SQL and BigQuery analysis.
When invoked:
1. Understand the analysis request and relevant metrics.
2. Construct efficient SQL queries to retrieve the needed data.
3. Use BigQuery CLI commands via Bash to run queries.
4. Analyze and summarize results.

Best practices:
- Optimize queries with proper filters to minimize scanned data.
- Use appropriate aggregations and joins.
- Comment complex SQL for clarity.
- Format results for readability (tables, charts when possible).
- Provide data-driven interpretations and next steps.

For each analysis:
- Explain query approach and assumptions.
- Highlight key findings.
- Recommend further investigation if warranted.
```
The agent isolates heavy data operations within its context so the orchestrator receives concise summaries.

### 5.4 Research-Grade Multi-Agent System
Anthropic’s production research workflow features a LeadResearcher orchestrator plus specialized helpers (WebSearcher, FileAnalyzer, etc.). For a query such as identifying S&P 500 IT board members, the lead agent divides companies among multiple search helpers, each gathering data in parallel. Helpers return structured findings; the orchestrator merges them into a final answer. Careful prompting (delegation plans, stop criteria) delivered a 90.2% success rate compared to failure by a single agent.

### 5.5 TDD Orchestration Loop
A primary agent can enforce test-driven development:
1. Analyze request (e.g., "Create `/api/users/{id}` endpoint").
2. Delegate to `test-generator` to author failing tests (`src/tests/test_user_api.py` covering 404/200 cases).
3. Run `pytest src/tests/test_user_api.py` and confirm failure.
4. Delegate to `python-implementer` to modify application code until tests pass.
5. Implementer iterates: read tests, edit `src/api/routes.py`, run `pytest`, repeat until success, then report `SUCCESS`.
6. Orchestrator re-runs tests for final verification and notifies the user.
This loop provides an auditable, autonomous implementation pipeline.

### 5.6 Additional Reference Agent Definitions
The following templates showcase specialized roles, tools, and guardrails:
- **grammar-style-editor:** Improves grammar, clarity, and engagement while preserving author voice; requests edit permission before modifying files. Tools: read/write/edit/grep/glob; temperature 0.3.
- **tech-debt-finder:** Scans for `TODO`, `FIXME`, anti-patterns (e.g., `dangerouslySetInnerHTML`). Uses `glob`, `grep`, `TodoWrite` to create `tech-debt-report.md`; Bash limited to safe commands.
- **test-generator:** Creates new failing tests for uncovered code paths. Writes new files only; forbidden from editing implementation code. Emphasizes that tests must fail initially.
- **python-implementer:** Modifies Python source (but not tests) to satisfy failing suites. Allowed to run `pytest`; edit permissions restricted to `src/**/*.py` while excluding `src/tests/**`.
- **playwright-visual-tester:** Uses Playwright MCP to capture screenshots, compare against expected UI states, and report discrepancies; Bash fully denied.
- **architecture-reviewer:** Maps project imports with `glob`/`grep`, detects circular dependencies, and writes `architecture-report.md` via `TodoWrite`.
- **performance-optimizer:** Analyzes bundle size, N+1 queries, and React performance. Runs allowed commands such as `npm run build -- --stats` or `pytest`; suggests and optionally applies fixes.
- **security-auditor:** Searches for SQL injection, XSS markers, and hard-coded secrets; writes findings to `security-report.md` using `TodoWrite`.
- **documentation-writer:** Generates documentation or docstrings from source files, creating Markdown or inline comments without modifying implementation logic.
- **conservative-orchestrator system prompt:** Guides the primary agent to prefer self-execution unless delegation offers clear benefit (specialized expertise, clean context, or multi-step processes).
These reference definitions illustrate combinations of tool scopes, permissions, and prompts that can be adapted to new domains.

## 6. Best Practices
- **Start from AI-generated drafts:** Ask Claude to scaffold new agent definitions, then iterate manually. Saves time and aligns with platform conventions.
- **Single responsibility:** Give each sub-agent one clear purpose. Split broad mandates into focused helpers to avoid instruction conflicts.3
- **Descriptive names and triggers:** Use unique names to avoid accidental bias (e.g., `ui-reviewer` instead of generic `code-reviewer` if overriding behavior) and embed trigger phrases in descriptions for proactive orchestration.14
- **Detailed prompts:** Provide step-by-step instructions, checklists, heuristics, and stop criteria. Balance guidance with flexibility to avoid contradictory directives.
- **Lean prompts, deep skills:** Keep system prompts concise; move reusable procedures into Agent Skills.3
- **Context and state discipline:** Supply necessary context explicitly (files, excerpts) so helpers don’t guess. Track structured data in JSON and freeform notes in text files. Git commits offer checkpoints and changelog history.15
- **Tool minimization:** Explicitly list required tools; omit destructive ones unless essential. Test agents with minimal toolsets first.
- **Tool naming discipline:** Evaluate naming schemes (e.g., `db_read_user` vs. `user.db.read`) because naming conventions influence an LLM’s ability to choose the correct tool.23
- **Permission hygiene:** Default to `ask` or `deny` for sensitive operations, never `allow` without justification. Avoid `--dangerously-skip-permissions`.21
- **Version control:** Check `.claude/agents/` and skills into source control. Review agent changes like code, since prompt edits materially alter behavior.
- **Agent independence:** Do not rely on implicit shared context. Pass necessary data via prompts or allow agents to retrieve it with tools.
- **Proactivity calibration:** Wording such as "Use proactively when encountering issues" encourages automatic delegation; conversely, state that an agent should only run when explicitly requested if it must remain dormant.
- **Testing and monitoring:** Simulate workflows, inspect logs, and monitor collapsed sub-agent outputs to catch anomalies early. Use Claude to reflect on failures and propose prompt or skill adjustments.
- **Guardrails and heuristics:** Embed stop conditions (e.g., "If sufficient information found, stop searching") to avoid infinite loops. Provide heuristics for search strategies (broad-to-narrow queries).
- **Model selection:** Choose smaller, cheaper models (Haiku, Sonnet) for straightforward tasks; reserve Opus for complex reasoning. Claude defaults sub-agents to Sonnet to reduce cost.
- **Continuous improvement:** Treat agents as living artifacts—update prompts when patterns of failure emerge, use Claude’s self-reflection capabilities, and re-run validations regularly.

## 7. Anti-Patterns and Pitfalls

### 7.1 Functional Design Failures
| Anti-Pattern | Cause | Resolution |
| :--- | :--- | :--- |
| Overloaded "mega-agent" | One agent tasked with unrelated responsibilities, leading to conflicting instructions and poor adherence. | Split into specialized agents following the single-responsibility principle. |
| Too many agents for trivial work | Launching helpers for simple tasks inflates latency and cost; early experiments showed models spawning 10+ agents unnecessarily. | Scale agent count to task complexity; provide guidelines in orchestrator prompts about when delegation is warranted. |
| Vague descriptions | Ambiguous descriptions prevent proactive delegation or cause incorrect agent selection. | Write specific, trigger-rich descriptions (e.g., "Use proactively for reviewing React components"). |
| Prompt/context bloat | Dumping all context into one prompt causes token blow-ups. | Keep prompts lean, move reusable knowledge into Agent Skills.3 |
| Orchestration conflict | Multiple agents attempt to produce the final plan or edit the same artifact, creating race conditions. | Designate the orchestrator as integrator; instruct helpers to return data or artifacts only. |
| Static prompts | Agent definitions never evolve, so performance stagnates. | Iteratively refactor prompts and skills; treat them like code assets.24 |
| Naming collisions and defaults | Common names trigger Claude’s built-in behaviors or agents shadow one another. | Use unique identifiers and ensure descriptions clearly differentiate roles. |
| Lack of context handoff | Invoking agents without supplying necessary inputs forces guessing. | Include relevant excerpts or allow tool retrieval in the prompt; orchestrator must share needed context. |
| Ignoring agent outputs/failures | Systems assume success; empty results or tool errors cause confusion. | Check responses, add conditional logic (e.g., skip next agent if previous returned nothing), and communicate status to users. |

### 7.2 Security Pitfalls
| Pitfall | Risk | Mitigation |
| :--- | :--- | :--- |
| Permission "YOLO mode" (`--dangerously-skip-permissions`) | Bypasses all safeguards; agents can modify or delete anything. | Never use in production. Configure granular `permissions` blocks instead.21 |
| Insecure hooks | Unvalidated input in hook scripts can enable command injection. | Quote shell variables and sanitize inputs before executing commands.21 |
| Untrusted MCP servers | Malicious servers may exfiltrate data or execute harmful actions. | Connect only to audited, trusted MCP providers; verify code of open-source servers.21 |
| Prompt injection | Malicious prompts attempt to override instructions (e.g., request `rm -rf /`). | Combine strong permissions (deny dangerous tools) with guardrails in prompts; sandbox agents lacking destructive capabilities.21 |

### 7.3 Operational and Resource Risks
- **High token consumption:** Parallel agents multiply context usage. Set exploration budgets (e.g., limit searches to three queries) and prefer smaller models when possible. Monitor analytics for overruns.
- **High CPU or resource contention:** Launching many Bash-heavy agents concurrently can stall local machines. Limit parallelism, stagger execution, or enforce resource caps via settings. Arsturn community fixes suggest adjusting `.claude/settings.json` to cap processes.
- **Agent registration failures:** Misplaced files, malformed YAML, or outdated CLI versions prevent agents from loading. Verify directory, YAML delimiters, and upgrade Claude Code; restart if necessary. If duplicate names exist, rename to avoid shadowing.
- **Tool errors:** Missing CLIs or credentials cause tool failures. Install required dependencies, authenticate external services, and ensure permissions allow requested commands. Inspect logs to identify failing tool calls.
- **Confusing output streams:** Interleaved responses from many agents can overwhelm logs. Use SDK message metadata to label outputs, instruct agents to prefix their responses, or reduce parallelism temporarily.
- **Token blow-ups from long prompts:** Keep prompts concise, store references in skills, and rely on context compaction.

## 8. Advanced Techniques and Workflows
- **Sub-agent chaining and sequencing:** Use the orchestrator to pipeline helpers (e.g., requirement parser → code generator). Provide explicit step-by-step instructions or programmatically pass outputs between calls. Manage context growth by clearing or compacting between stages.
- **Dynamic selection and generation:** Build logic that enables or disables agents per query, or generate new AgentDefinition objects on the fly (e.g., `createSecurityAgent(level)`). Claude can even draft new agents mid-session whose YAML you feed back into the SDK.
- **Parallel tool calling (model-level):** Instruct a single agent to batch independent tool calls within one turn. The runtime executes them concurrently—ideal for fetching data from multiple microservices.25
- **Sub-agent parallelism (orchestrator-level):** Spawn multiple helpers within one message. Respect system caps (e.g., max 10 concurrent helpers); if more tasks remain, batch subsequent spawns as earlier agents finish.3
- **Speculative delegation:** Launch additional helpers exploring alternate hypotheses to increase coverage when latency and cost budgets permit.
- **Recursive decomposition:** Break complex problems into trees of sub-problems, recursively calling helpers for each branch, then synthesizing results up the tree—effective for deep research or refactoring efforts.29
- **TDD automation:** Combine `test-generator` and `python-implementer` with orchestrator-driven test runs to enforce red-green cycles autonomously.12
- **Lifecycle hooks:** Use hooks to audit or veto tool calls (e.g., block `rm -rf`) and to trigger agents on events such as new commits or file edits, effectively turning Claude Code into an event-driven CI assistant.30
- **Multiple orchestrators:** For extremely large projects, coordinate several lead agents (e.g., project-level planner spawning phase-specific orchestrators). Keep responsibilities clear and communication channels explicit.
- **Extended thinking:** Enable Claude’s deliberate reasoning traces when clarity is worth additional tokens; note that extended thinking can disable prompt caching for those segments.

## 9. Security and Governance Guidance
- **Zero-trust defaults:** Combine restrictive tool lists with `ask`/`deny` permissions so sub-agents must request approval before destructive actions.
- **Audit and review:** Store agent definitions and hooks in version control, require code review for prompt or permission changes, and document rationale for granting powerful tools.
- **Safe automation:** When integrating hooks or external servers, validate input, sanitize commands, and maintain allow-lists.
- **Data governance:** Use sub-agents with read-only access for sensitive data audits; reserve write-capable agents for tightly scoped tasks with human oversight.
- **MCP trust boundaries:** Evaluate third-party MCP code, require explicit user confirmation when connecting new servers, and monitor usage logs for anomalies.
- **Prompt injection resilience:** Combine hardened prompts (explicitly ignoring malicious instructions) with denied destructive tools to contain adversarial inputs.

## 10. Troubleshooting and Diagnostics
| Issue | Likely Cause | Recommended Fix |
| :--- | :--- | :--- |
| Automatic delegation never triggers | Description lacks clear triggers or another agent’s description overlaps. Older models (<4.5) are less proactive. | Rewrite description with explicit cues ("Use after code changes"), remove ambiguity, upgrade to Claude 4.5+, confirm agent is loaded via `/agents`. |
| Explicit invocation ignored | Name mismatch or agent not registered. | Use exact lowercase name, restart session, or pass agent explicitly via SDK/CLI JSON. Ensure plan tier supports sub-agents. |
| Agent deviates from instructions | Name biases or vague prompt. | Rename agent to avoid implicit behaviors, tighten instructions (e.g., "Your ONLY goal..."), remove unnecessary tools. |
| Excessive CPU usage or freezes | Too many heavy tool calls in parallel (e.g., Bash compiles). | Limit concurrent helpers, stagger execution, configure resource caps, check for infinite retry loops. |
| User-level agent not detected | YAML syntax error or older CLI bug. | Validate frontmatter, update Claude Code, try placing file in project scope, rename to force reload, contact support if persistent. |
| Output streams overwhelming | Too many parallel responses interleaving. | Label outputs via SDK metadata, instruct agents to prefix responses, reduce concurrency temporarily. |
| Tool execution failures | Missing CLIs, credentials, or permissions. | Install required tools, authenticate services, adjust permissions allow-lists, inspect logs for failing commands. |
| Token blow-ups | Prompt too long or too many simultaneous agents. | Refactor prompts into skills, limit agent count, leverage context compaction. |
| Task batches stall | Parallel spawn cap reached. | Batch tasks up to the cap (e.g., 10), wait for completion, then spawn the next batch. |
| Sub-agent runs but finds nothing | Agents return empty results. | Add fallback logic (e.g., broaden search, inform user), ensure prompts include success/failure reporting. |

## Appendix A. YAML Field Quick Reference
| Field | Notes |
| :--- | :--- |
| `name` | Lowercase identifier; avoid collisions with existing agents. |
| `description` | Include trigger phrases ("Use proactively...") to enable automatic delegation. |
| `mode` | Must equal `subagent`. |
| `model` | `inherit`, `sonnet`, `haiku`, `opus`, or full model ID (e.g., `anthropic/claude-3-5-sonnet-20241022`). |
| `temperature` | Optional float; lower values for deterministic behavior. |
| `tools` | List/map enabling only required tools (Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Playwright, etc.). |
| `permissions` | Zero-trust policies (e.g., `edit: ask`, `bash: {"*": deny}` or allow-list specific commands). |
| `skills` | (Optional) Attach reusable `.claude/skills/*.md` files. |
| `memory` | Configure persistent memory usage if supported. |

## Appendix B. Sample Agent Summary Matrix
| Agent | Purpose | Key Tools/Settings |
| :--- | :--- | :--- |
| grammar-style-editor | Improves grammar, clarity, engagement; preserves voice. | Tools: read/write/edit/grep/glob; `temperature: 0.3`; permissions ask for edits/writes. |
| tech-debt-finder | Finds TODO/FIXME markers and anti-patterns; writes consolidated report. | Tools: read/grep/glob/TodoWrite; Bash allow-list (`grep`, `ls`). |
| test-generator | Writes new failing tests for specified features. | Tools: read/write/glob; prohibits edits; enforces failing tests. |
| python-implementer | Modifies Python code (not tests) until suites pass. | Tools: read/edit/glob/bash; edit allow-list for `src/**/*.py`; `pytest` allow-listed. |
| playwright-visual-tester | Runs Playwright MCP visual checks. | Tools: read, Playwright MCP; Bash denied. |
| architecture-reviewer | Detects circular dependencies and architectural anti-patterns. | Tools: read/glob/grep/TodoWrite; writes `architecture-report.md`. |
| performance-optimizer | Analyzes bundle size, DB queries, React performance. | Tools: read/edit/glob/bash (`npm`, `pytest` allowed). |
| security-auditor | Scans for security flaws and secrets. | Tools: read/glob/grep/TodoWrite; Bash denied. |
| documentation-writer | Generates documentation/docstrings from code. | Tools: read/write/glob; edit denied. |
| code-reviewer | Performs structured post-edit reviews with priority-tagged findings. | Tools: read/grep/glob/bash; inherits model. |
| debugger | Performs root-cause analysis and fixes; runs regression tests. | Tools: read/edit/bash/grep/glob; model Opus for complex reasoning. |
| data-scientist | Executes SQL/BigQuery analytics and summarizes results. | Tools: bash/read/write; model Sonnet. |
| LeadResearcher system | Delegates to multiple search agents for large research tasks. | Spawned helpers use browsing tools; orchestrator synthesizes findings. |
| conservative orchestrator prompt | Governs when to delegate vs. self-perform. | Emphasizes self-execution unless delegation criteria met. |

## Appendix C. Glossary
- **Agent Skills:** Modular Markdown files containing reusable procedures or knowledge that can be attached to agents without inflating prompts.
- **Automatic delegation:** Claude autonomously invokes a sub-agent when the description matches the task context.
- **Claude Agent SDK:** Programmatic API for orchestrating agents in TypeScript or Python, sharing runtime with Claude Code.
- **Hook:** Lifecycle callback (script or function) triggered around tool usage for auditing or automation.
- **Model Context Protocol (MCP):** Standard for connecting external tool servers (e.g., Playwright) to Claude.
- **Orchestrator:** Primary agent coordinating sub-agents, managing planning, and synthesizing outputs.
- **Sub-agent:** Specialized helper agent with its own prompt, tools, and context window.
- **TodoWrite:** Claude Code tool for writing files or TODO entries based on findings.

## References
1. https://github.com/webdevtodayjason/sub-agents
2. https://www.reddit.com/r/ClaudeAI/comments/1mo40o3/has_anyone_found_configuration_options_for_claude/
3. https://medium.com/@md.mollaie/an-analytical-comparison-of-agentic-development-environments-claude-code-cursor-and-warp-5ab0019988b4
4. https://claudefa.st/blog/guide/agents/custom-agents
5. https://leamas.sh/
6. https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
7. https://docs.claude.com/en/api/agent-sdk/overview
8. https://docs.claude.com/en/docs/intro
9. https://docs.claude.com/en/docs/agent-sdk/python
10. https://docs.claude.com/en/docs/claude-code/sub-agents
11. https://docs.claude.com/en/docs/agent-sdk/subagents
12. https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
13. https://docs.claude.com/en/docs/agent-sdk/overview
14. https://gist.github.com/RichardHightower/827c4b655f894a1dd2d14b15be6a33c0
15. https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices#subagent-orchestration
16. https://docs.claude.com/en/docs/claude-code/sub-agents#installation
17. https://docs.claude.com/en/docs/agent-sdk/subagents#frontmatter
18. https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
19. https://www.anthropic.com/engineering/multi-agent-research-system
20. https://docs.claude.com/en/docs/agent-sdk/typescript
21. https://stevekinney.com/courses/ai-development/claude-code-permissions
22. https://www.anthropic.com/engineering/claude-think-tool
23. https://www.anthropic.com/engineering/writing-tools-for-agents
24. https://www.cursor-ide.com/blog/claude-subagents
25. https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices#parallel-tool-calls
26. https://support.claude.com/en/articles/12386420-claude-code-faq
27. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
28. https://raw.githubusercontent.com/wiki/ruvnet/claude-flow/CLAUDE.md
29. https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk#recursive-decomposition
30. https://preview.hex.pm/preview/claude_agent_sdk/show/HOOKS_GUIDE.md
31. https://github.com/anthropics/anthropic-sdk-python
32. https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
33. https://modelcontextprotocol.io/
34. https://docs.claude.com/en/docs/mcp
35. https://news.ycombinator.com/item?id=44301809

