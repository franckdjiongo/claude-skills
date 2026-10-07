# Technique catalog, prompt architecture, advanced patterns, troubleshooting

## Technique Selection

Select techniques strategically based on task requirements. Always verify each technique exists in the reference documents before applying.

### Foundation Techniques (Use Always)

**Explicit Instructions with Context and Rationale:**
- Spell out exactly what you want (format, depth, constraints)
- Explain WHY behind instructions to help Claude generalize
- Provide complete specifications without relying on inference
- Document source: Section 1.1 (Report), Technique #2 (PDF)

**Role-Prompting via System Message:**
- Set domain-expert persona in system parameter
- Most powerful use of system prompts
- Dramatically boosts accuracy and tailors tone
- Document source: Section 3.1 (Report), Technique #1 (PDF)

**Structured Formatting with XML Tags:**
- Use tags like `<context>`, `<instructions>`, `<example>`, `<output_format>`
- Reduces ambiguity and ensures reliable interpretation
- Claude is trained to recognize and prioritize XML-tagged content
- Document source: Section 1.2 (Report), Technique #9 (PDF)

**Verbosity Control:**
- Claude 4.5 defaults to concise, efficient responses
- Explicitly request detail when needed or enforce brevity with constraints
- Match verbosity to task complexity
- Document source: Section 1.3 (Report), Technique #8 (PDF)

### Reasoning & Accuracy Techniques

**Chain-of-Thought Prompting:**
- Use "think step by step" or "ultrathink" to trigger deeper reasoning
- Three levels: Basic CoT, Guided CoT, Structured CoT
- Improves logic on complex problems (math, coding, puzzles)
- Document source: Section 2.3 (Report), Technique #3 (PDF)

**Extended Thinking:**
- API-level feature allocating "thinking budget" (budget_tokens)
- For computationally intensive problems: proofs, physics, competitive coding
- Produces visible thinking blocks showing reasoning process
- Document source: Section 2.1 (Report), Technique #3 (PDF)

**Interleaved Thinking (Beta):**
- Reasoning between tool calls within a single turn
- Enables dynamic strategy adjustment based on real-time results
- Requires beta header: `interleaved-thinking-2025-05-14`
- Document source: Section 2.2 (Report)

**Self-Critique and Correction:**
- Have Claude review and refine its own outputs
- Catches errors, inconsistencies, missing pieces
- Use for high-stakes accuracy tasks
- Document source: Technique #5 (PDF)

### Complex Task Techniques

**Iterative Planning then Action:**
- Two-phase approach: plan first, then execute
- Prevents haphazard answers and allows verification
- Critical for coding tasks and multi-step workflows
- Document source: Section 4 (Report), Technique #4 (PDF)

**Multi-Pass Drafting & Refinement:**
- Split work into focused passes (outline → draft → refine)
- Maintains long-term consistency
- Produces higher-quality creative and long-form outputs
- Document source: Technique #6 (PDF)

**Few-Shot Examples:**
- Provide sample Q&A pairs or formatted examples
- Claude mimics patterns for style, format, or specialized output
- Especially useful when format is hard to describe
- Document source: Technique #7 (PDF)

### Agentic Patterns

**Action Bias Control:**
- `<default_to_action>` for proactive autonomous agents
- `<do_not_act_before_instructions>` for cautious human-in-loop
- Controls whether Claude acts autonomously or waits for confirmation
- Document source: Section 3.3 (Report), Technique #10 (PDF)

**Parallel vs. Sequential Tool Execution:**
- Claude 4.5 defaults to aggressive parallelism for speed
- Use `<use_parallel_tool_calls>` to maximize concurrency
- Enforce sequential execution for dependent tasks
- Document source: Section 4.3 (Report), Technique #11 (PDF)

**State Management Architecture:**
- Layer 1: Filesystem as scratchpad (progress.txt, SUMMARY.md)
- Layer 2: Memory Tool API for persistent cross-session knowledge
- Layer 3: Git for checkpointing and versioning code changes
- Document source: Section 4.1 (Report), Technique #12 (PDF)

**Context Management:**
- Context Editing API to prune least relevant tool results
- Instruct agent on handling impending context limits
- Use CLAUDE.md for project-wide persistent instructions
- Document source: Section 4.2 (Report), Technique #12 (PDF)

### Special Cases

**Safety-Conscious Framing:**
- Acknowledge and clarify context for sensitive topics
- Set boundaries and intent explicitly
- Use neutral/clinical language when appropriate
- Two-step approach: outline abstractly, then execute concretely
- Document source: Section 3.4 (Report), Technique #14 (PDF)

**Hallucination Prevention:**
- Use `<investigate_before_answering>` tag
- Instruct Claude to read files/docs before answering questions about them
- Force verification before speculation
- Document source: Section 3.3 (Report), Technique #13 (PDF)

## Prompt Architecture

Structure prompts with clear, hierarchical sections:

### System Message Components

1. **Role/Persona**: Domain expertise and perspective level
2. **Operational Constraints**: Guardrails and boundaries
3. **Default Behaviors**: Action bias, tool use preferences, verbosity
4. **Output Format Preferences**: Structure and style guidelines

### User Message Components

1. **Context**: Background information and rationale
2. **Task**: Explicit request with specific requirements
3. **Constraints**: Length, tone, format, scope limitations
4. **Output Structure**: Desired format with XML tags if complex
5. **Examples**: Few-shot demonstrations if format/style is critical

**Best Practice**: Use XML tags liberally to separate sections and reduce ambiguity.


## Advanced Patterns

### Reusable Prompt Scaffolds

For production or team use, create standardized scaffolds with:

1. **Persona/Role**: Expertise and perspective definition
2. **Objective**: High-level goal statement
3. **Constraints**: Hard boundaries and rules
4. **Acceptance Criteria**: Definition of "done"
5. **Output Format**: Strict structure specification
6. **Behavioral Guardrails**: Decision-making logic (XML-tagged)

**Document source**: Section 3.2 (Report)

### Agentic System Design

For autonomous agents, implement:

1. **Memory Architecture**:
   - Filesystem for intra-session state
   - Memory Tool for cross-session persistence
   - Git for code versioning and checkpointing

2. **Context Engineering**:
   - Context Editing API for automatic pruning
   - Instruct on graceful handling of context limits
   - Use CLAUDE.md for project-wide context

3. **Tool Orchestration**:
   - Define parallel vs. sequential preferences
   - Establish Human-in-the-Loop gates for critical actions
   - Specify tool invocation patterns

4. **State Awareness**:
   - Instruct agent to track progress externally
   - Implement recovery patterns for interruptions
   - Define checkpoint strategies

**Document source**: Section 4 (Report), Techniques #10-12 (PDF)


## Troubleshooting Guide

Consult reference documents for detailed solutions. Common issues:

| Issue | Solution | Document Reference |
|-------|----------|-------------------|
| Incomplete outputs | Add explicit acceptance criteria; use iterative planning | Section 4 (Report) |
| Hallucinations | Add `<investigate_before_answering>`; require source citation | Section 3.3 (Report) |
| Wrong verbosity | Explicitly set verbosity level or length constraints | Technique #8 (PDF) |
| Wrong format | Provide few-shot example or detailed XML-tagged format spec | Technique #9 (PDF) |
| Safety refusals | Reframe with context/intent; try two-step approach | Technique #14 (PDF) |
| Lost context | Use memory tools, CLAUDE.md, or maintain decision log | Technique #12 (PDF) |
| Inconsistent behavior | Create reusable system prompt scaffold with guardrails | Section 3.2 (Report) |
| Too aggressive actions | Add `<do_not_act_before_instructions>` guardrail | Section 3.3 (Report) |
| Too hesitant | Add `<default_to_action>` directive | Section 3.3 (Report) |
