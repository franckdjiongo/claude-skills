# Workflow detail: design, review, analysis, education, output formats

Cross-references use the SKILL.md scenario letters (A new agent, B review, C project analysis, D education).

## 1. Design & Generation (New Sub-Agents)

Read `references/comprehensive-guide.md` sections 2-6 before designing.

### 1.1 Requirements Gathering

Ask targeted questions:
- What is the specific task/responsibility? (enforce single responsibility principle)
- What tools are needed? (read, write, edit, bash, grep, glob, TodoWrite, etc.)
- Should it act automatically or only when explicitly invoked?
- What security constraints apply? (sensitive operations, file restrictions, bash commands)
- What model is appropriate? (sonnet=default, haiku=lightweight, opus=complex reasoning)

### 1.2 Architecture Design

Apply best practices from the reference document:
- **Single Responsibility**: One clear purpose per agent
- **Least Privilege**: Minimal tool set required
- **Clear Descriptions**: Include proactive trigger phrases for automatic delegation
- **Security Defaults**: Use `ask`/`deny` for destructive operations
- **Separation of Concerns**: Distinguish review agents (read-only) from implementation agents (write access)

### 1.3 Generate Agent Definition

Produce a complete `.claude/agents/<name>.md` file with:

```yaml
---
name: agent-name
description: >-
  Explicit description of purpose and capabilities. 
  Include trigger phrases like "Use proactively when..." or "MUST BE USED for..." 
  to enable automatic delegation.
mode: subagent
model: inherit  # or sonnet/haiku/opus
temperature: 0.3  # optional, for deterministic behavior
tools:
  - Read
  - Write
  # List only required tools
permissions:
  edit: ask  # ask/allow/deny
  write: ask
  bash:
    "grep": allow
    "ls": allow
    "*": deny  # deny-by-default with allow-list
---

[Detailed system prompt with explicit instructions]

You are a [specialized role] with expertise in [domain].

When invoked:
1. [Step-by-step procedure]
2. [Clear actions and expectations]
3. [Verification criteria]

Guidelines:
- [Behavioral heuristics]
- [Quality standards]
- [Stop conditions]

Output format:
- [Expected structure]
- [Reporting requirements]
```

### 1.4 Provide Deployment Instructions

Include:
1. Where to save the file (`.claude/agents/` for project-level, `~/.claude/agents/` for user-level)
2. How to test (explicit invocation: `> Use the <agent-name> subagent to...`)
3. How automatic delegation triggers (based on description)
4. Restart steps if needed (`/agents` refresh or Claude Code restart)

## 2. Review & Optimization (Existing Sub-Agents)

Read `references/comprehensive-guide.md` sections 6-7 for best practices and anti-patterns.

### 2.1 Analysis Checklist

Evaluate the agent against these criteria:

**Functional Design:**
- [ ] Single, clear responsibility (no conflicting instructions)
- [ ] Explicit, step-by-step instructions
- [ ] Proper stop conditions and success criteria
- [ ] Appropriate model selection (sonnet/haiku/opus)
- [ ] Description includes proactive trigger phrases

**Security & Permissions:**
- [ ] Minimal tool set (only required tools listed)
- [ ] Proper permissions (ask/deny for sensitive operations)
- [ ] No `--dangerously-skip-permissions` reliance
- [ ] Bash commands allow-listed or denied appropriately
- [ ] Separation of review vs. implementation capabilities

**Context Management:**
- [ ] Prompt is concise (<500 lines)
- [ ] Reusable knowledge factored into Skills if applicable
- [ ] Clear input/output expectations
- [ ] Structured output format specified

**Naming & Discovery:**
- [ ] Unique name (no collisions with built-in agents)
- [ ] Description differentiates from similar agents
- [ ] Clear when automatic vs. explicit invocation applies

### 2.2 Provide Specific Improvements

For each issue found:
1. Explain the problem and impact
2. Reference specific sections from the comprehensive guide
3. Provide corrected YAML/prompt snippet
4. Explain the rationale for the change

### 2.3 Generate Updated Definition

Produce the complete improved agent file, highlighting changes with comments.

## 3. Project Analysis for Sub-Agent Opportunities

When the user describes a project or workflow without mentioning sub-agents:

### 3.1 Identify Automation Opportunities

Look for these patterns:
- Repetitive multi-step workflows
- Separation between analysis and implementation
- Tasks requiring specialized expertise
- Parallel/independent operations
- Need for context isolation
- High-stakes operations requiring review

### 3.2 Recommend Sub-Agent Architecture

If sub-agents would provide value, propose:
1. Which agents to create (name and responsibility)
2. How they would interact (orchestration pattern)
3. Expected benefits (context isolation, specialization, parallelism)
4. Implementation priority (which agents to start with)

If sub-agents are NOT needed:
- Explain why (task too simple, no clear separation of concerns, etc.)
- Suggest alternatives (Skills, hooks, simple automation)

### 3.3 Generate Starter Agents

If the user agrees, create 1-2 foundational agents following the Design & Generation workflow (Step 2).

## 4. Education & Guidance

When the user needs to understand sub-agent concepts:

### 4.1 Targeted Explanations

Consult `references/comprehensive-guide.md` for:
- Architecture patterns (section 2)
- Configuration details (section 3)
- Real-world templates (section 5)
- Best practices (section 6)
- Troubleshooting (section 10)

Provide concise explanations with specific examples from the reference document.

### 4.2 Example-Driven Teaching

Use reference templates to illustrate concepts:
- Show the code-reviewer agent for read-only specialists
- Show the debugger agent for edit-capable troubleshooters
- Show the data-scientist agent for tool-heavy workflows
- Show the TDD orchestration for multi-agent coordination

### 4.3 Link to Relevant Sections

Direct users to specific sections for deeper learning:
- "For parallel delegation patterns, see section 2.4"
- "For security best practices, see section 9"
- "For troubleshooting agent registration, see section 10"

## Output Formats

Structure responses based on the scenario:

**For new agent generation:**
```markdown
## [Agent Name] Sub-Agent

**Purpose**: [One-sentence description]

**Architecture Decisions**:
- Responsibility: [Single clear purpose]
- Tools: [Justified tool selection]
- Security: [Permission rationale]
- Model: [sonnet/haiku/opus with reason]

**Agent Definition**:
[Complete .claude/agents/<name>.md file content in code block]

**Deployment**:
1. Save to `.claude/agents/<name>.md`
2. Test with: `> Use the <name> subagent to [example task]`
3. Automatic triggers: [When Claude will invoke this proactively]
```

**For agent review:**
```markdown
## Review of [Agent Name]

**Issues Found**:
- [Priority: Critical/Warning/Suggestion]
  - Problem: [Description]
  - Impact: [Why it matters]
  - Fix: [Specific correction with reference to guide section]

**Updated Definition**:
[Complete improved agent file with inline comments highlighting changes]

**Rationale**:
[Explain key improvements and expected benefits]
```

**For project analysis:**
```markdown
## Sub-Agent Opportunity Analysis

**Current Workflow**: [Summary of user's description]

**Recommended Architecture**:
1. **[Agent 1 Name]**: [Responsibility] - [Benefit]
2. **[Agent 2 Name]**: [Responsibility] - [Benefit]

**Orchestration Pattern**: [How agents interact]

**Implementation Priority**: [Which to build first and why]

**Starter Agent**: [If user agrees, generate first agent definition]
```
