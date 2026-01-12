# GPT-5 Advanced Prompting Techniques

This reference provides comprehensive techniques for GPT-5, including official API features and experimental approaches. Techniques marked with [Inference] are logically derived but not directly documented.

## Table of Contents

### Part 1: Official & Established Techniques
1. Minimal and Tunable Reasoning Effort
2. Verbosity Control
3. Custom Tools with Free-Form Inputs
4. Allowed Tools
5. Tool Preambles
6. Agentic Workflow Calibration
7. Structured XML-Style Tags
8. Eliminating Contradictions & Instruction Hierarchy
9. Responses API & Reasoning Reuse
10. Self-Reflection & Excellence Rubrics
11. Persona Pattern
12. Few-Shot & Golden Example Patterns
13. Structured Output Pattern
14. Delimiter Pattern
15. Flipped Interaction & Clarifying Questions
16. Negative Constraint Pattern
17. Tool Use Pattern
18. Verbosity & Tone Control via Prompt
19. Code-as-Context

### Part 2: Experimental & Emergent Techniques
1. Self-Correction & Self-Critique Loops
2. Self-Calibration, Reversing CoT & Self-Verification
3. ReAct (Reason + Act) Pattern
4. Tree-of-Thought & Deliberate Search
5. Chain-of-Thought Monitorability
6. Meta-Prompting
7. Self-Rewarding Correction
8. Chain-of-Thought Verification & Self-Consistency
9. Reversing & Chain-of-Verification Patterns
10. Cumulative Reasoning & Modular Decomposition
11. Advanced Agentic Preamble Design
12. Meta-Instruction Layering

---

## Part 1: Official & Established Techniques

### 1. Minimal and Tunable Reasoning Effort

**Status:** Officially Documented

**Description:** GPT-5 API parameter `reasoning_effort` controls reasoning token allocation: `minimal`, `low`, `medium` (default), `high`.

**Use cases:**
- `minimal`: Latency-sensitive tasks, simple lookups
- `medium`/`high`: Planning, multi-step coding, agentic workflows

**Implementation:**
```python
{
  "reasoning_effort": "high"  # or "minimal", "low", "medium"
}
```

Can combine with natural language: "focus on the most important factors and stop once the key criteria are met"

---

### 2. Verbosity Control

**Status:** Officially Documented

**API parameter:** `verbosity` - `low`, `medium`, `high`

**Can override via prompt:**
- "Provide a short answer with minimal elaboration"
- "Give comprehensive explanations"

**Use cases:**
- Low: Token-constrained scenarios, bottom-line answers
- High: Educational contexts, verification needs

---

### 3. Custom Tools with Free-Form Inputs

**Status:** Officially Documented

**Description:** GPT-5 accepts plain text tool inputs instead of strict JSON schemas. Optional context-free grammar (CFG) constrains outputs.

**Implementation:**
```python
{
  "type": "custom",
  "description": "Summarize text in plain language",
  "cfg": "[optional grammar rules]"
}
```

**Use cases:**
- Free-form: Summarization, translation
- CFG: SQL generation, structured parsing

---

### 4. Allowed Tools

**Status:** Officially Documented

**Description:** `allowed_tools` field restricts which tools GPT-5 can call.

**Options:**
- `auto`: Model decides
- `required`: Must call a tool

**Use cases:**
- Restrict dangerous operations (e.g., file deletion)
- Force tool usage for specific tasks

---

### 5. Tool Preambles

**Status:** Officially Documented

**Description:** Concise summaries explaining tool call rationale and workflow plans.

**Enable with tag:**
```xml
<tool_preambles>
Begin by rephrasing the user's goal, outline the plan, narrate steps succinctly, and summarize completed work.
</tool_preambles>
```

**Use cases:**
- Multi-step tasks
- User trust and transparency
- Debugging and monitoring

---

### 6. Agentic Workflow Calibration

**Status:** Widely Established

**Description:** Control when AI acts autonomously vs. defers to user.

**Tags to use:**
```xml
<context_gathering>
Start broad, fan out to focused subqueries. Early stop criteria: [define]
</context_gathering>

<persistence>
Continue until problem is fully solved without returning prematurely.
</persistence>
```

**Use cases:**
- Research workflows
- Coding assistance
- Planning tasks

---

### 7. Structured XML-Style Tags

**Status:** Widely Established

**Benefits:**
- Clear instruction boundaries
- Improved adherence
- Referenceable sections

**Pattern:**
```xml
<rules>
1. Rule one
2. Rule two
3. Rule three
</rules>

<context_understanding>
[Background info]
</context_understanding>

<task>
Follow all items in <rules>
</task>
```

**Use cases:** Complex multi-part prompts, code editing rules, formatting instructions

---

### 8. Eliminating Contradictions & Instruction Hierarchy

**Status:** Widely Established

**Critical:** Contradictory instructions degrade performance and waste reasoning tokens.

**Best practices:**
- Review and resolve conflicts
- Prioritize rules explicitly
- State tie-breakers

**Example problem:**
```
❌ "Don't schedule without consent" + "Auto-schedule earliest slot"
```

**Solution:**
```
✅ "Don't schedule without consent. If consent given, auto-schedule earliest slot."
```

---

### 9. Responses API & Reasoning Reuse

**Status:** Officially Documented

**Description:** Retain reasoning state across tool calls with `previous_response_id`.

**Benefits:**
- Reduces token consumption
- Maintains consistency
- Lowers latency

**Implementation:**
```python
{
  "previous_response_id": "[ID from previous call]"
}
```

**Use cases:** Long-running tasks, multi-step research, coding sessions

---

### 10. Self-Reflection & Excellence Rubrics

**Status:** Widely Established

**Description:** AI creates internal rubric, evaluates output, iterates before presenting.

**Pattern:**
```xml
<self_reflection>
Create an internal rubric with 5-7 categories for excellence.
Generate solution, then grade against rubric.
Iterate until top marks achieved on all categories.
Do not show rubric to user.
</self_reflection>
```

**Use cases:**
- High-quality components
- Reports and documentation
- Production-ready code

---

### 11. Persona Pattern

**Status:** Widely Established

**Description:** Assign role/persona to prime relevant knowledge and style.

**Example:**
```
You are a senior JavaScript developer specializing in backend APIs. You prioritize clean code, proper error handling, and comprehensive testing.
```

**Use cases:** Domain-specific tasks, consistent tone, specialized knowledge

---

### 12. Few-Shot & Golden Example Patterns

**Status:** Widely Established

**Description:** Provide input-output pairs or comprehensive templates.

**Pattern:**
```
Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware

**Example 2:**
Input: Fixed bug where dates displayed incorrectly
Output:
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

**Use cases:** Format-sensitive tasks, custom schemas, style consistency

---

### 13. Structured Output Pattern

**Status:** Widely Established

**Description:** Define exact structure for machine-parseable outputs.

**Pattern:**
```
Provide only valid JSON with keys 'name', 'category', 'price', 'in_stock'.
Use these exact data types:
- name: string
- category: string
- price: number
- in_stock: boolean
```

**Use cases:** API payloads, configuration files, data pipelines

---

### 14. Delimiter Pattern

**Status:** Widely Established

**Description:** Wrap user data in delimiters to prevent confusion with instructions.

**Pattern:**
```
Summarize the following technical report:

"""
[USER DATA/CODE HERE]
"""

Requirements: [instructions]
```

**Delimiters:** Triple quotes, triple backticks, XML tags

**Use cases:** Long code, data tables, documents with instruction-like phrases

---

### 15. Flipped Interaction & Clarifying Questions

**Status:** Widely Established

**Description:** AI asks clarifying questions before proceeding.

**Pattern:**
```
Before writing the code, ask me exactly 5 clarifying questions to ensure you fully understand the requirements. Do not proceed until all questions are answered.
```

**Use cases:** Vague requirements, preventing misalignment, gathering specifications

---

### 16. Negative Constraint Pattern

**Status:** Widely Established

**Description:** List what to avoid.

**Pattern:**
```
Summarize this technical report for non-technical readers.

Do not:
- Use specialized terms or acronyms
- Include technical jargon
- Reference advanced concepts without explanation
```

**Use cases:** Audience-specific content, compliance requirements

---

### 17. Tool Use Pattern

**Status:** Widely Established

**Description:** Explicitly describe available tools and their capabilities.

**Pattern:**
```
Available tools:
1. calculate(expression: string) - Evaluates mathematical expressions
2. search(query: string) - Searches the web for information
3. code_interpreter(code: string, language: string) - Executes code

Use these tools as needed to complete the task.
```

**Use cases:** Agentic behavior, external computations, data retrieval

---

### 18. Verbosity & Tone Control via Prompt

**Status:** Widely Established

**Description:** Natural language instructions for detail and tone.

**Patterns:**
- "Respond in a friendly yet professional tone and be concise"
- "Provide detailed explanations with examples"
- "Use technical language appropriate for senior developers"

**Use cases:** User-facing messages, documentation, code comments

---

### 19. Code-as-Context

**Status:** Widely Established

**Description:** Supply entire files/documents using GPT-5's large context window.

**Pattern:**
```
Here is the complete codebase for analysis:

```[language]
[FULL CODE]
```

Task: Identify performance bottlenecks and suggest optimizations.
```

**Use cases:** Refactoring, bug fixing, auditing, multi-file tasks

---

## Part 2: Experimental & Emergent Techniques

### 1. Self-Correction & Self-Critique Loops

**Status:** Experimental

**Description:** AI generates solution, evaluates it, then revises.

**Pattern:**
```
Provide your answer, then:
1. List potential mistakes or weaknesses
2. Correct identified issues
3. Present final revised answer
```

**Use cases:** Math problems, algorithm design, factual accuracy

---

### 2. Self-Calibration, Reversing CoT & Self-Verification

**Status:** Community-Vetted

**Techniques:**

**Self-Calibration:**
```
Generate your response, then critique it and propose improvements. Iterate until satisfied.
```

**Reversing Chain-of-Thought (RCoT):**
```
After providing the answer, create a new problem that would lead to this answer. Compare with original input.
```

**Self-Verification:**
```
Generate three independent solutions. Test each and select the most consistent one.
```

**Chain-of-Verification (CoVe):**
```
Pose verification questions about your output and answer them to check correctness.
```

**Use cases:** Objective truth tasks (math, coding, translation)

---

### 3. ReAct (Reason + Act) Pattern

**Status:** Community-Vetted

**Description:** Interleave reasoning and actions.

**Pattern:**
```
Think step-by-step. After each reasoning step, decide whether you need to call a tool.

Format:
Thought: [reasoning]
Action: [tool call if needed]
Observation: [result]
Thought: [continue reasoning]
...
```

**Use cases:** Research, planning, interactive coding

---

### 4. Tree-of-Thought & Deliberate Search

**Status:** Experimental

**Description:** Explore multiple reasoning paths, backtrack when needed.

**Pattern:**
```
List three possible next moves and rate them on a scale of 1-10.
Pick the highest-rated move.
Repeat until solution found.
```

**Use cases:** Puzzle solving, game playing, combinatorial complexity

---

### 5. Chain-of-Thought Monitorability

**Status:** Experimental

**Description:** Analyzing reasoning traces for safety/deception detection.

**Note:** Primarily research tool, not standard developer technique. Can request reasoning summaries or preambles.

**Use cases:** AI safety, high-stakes applications auditing

---

### 6. Meta-Prompting

**Status:** Community-Vetted

**Description:** Use AI to improve prompts.

**Pattern:**
```
Review this prompt and suggest minimal edits to improve it. Explain why each change matters:

[CURRENT PROMPT]
```

**Benefits:**
- Improved alignment
- Token efficiency
- Dynamic adaptation

---

### 7. Self-Rewarding Correction

**Status:** Experimental

**Description:** Model evaluates correctness, receives self-reward, refines solution.

**Approximation:**
```
Rate your solution on accuracy (1-10). If below 9, improve it and rate again. Continue until 9+.
```

**Use cases:** High-accuracy requirements, iterative improvement

---

### 8. Chain-of-Thought Verification & Self-Consistency

**Status:** Experimental

**Description:** Generate multiple reasoning paths, select majority/consensus answer.

**Pattern:**
```
Generate 5 independent reasoning sequences for this problem.
For each, provide the final answer.
Select the answer that appears most frequently.
```

**Use cases:** Mathematical reasoning, critical decisions

---

### 9. Reversing & Chain-of-Verification Patterns

**Status:** Community-Vetted

**Reverse CoT:**
```
After answering, reconstruct the question from your answer. Compare with original input.
```

**Chain-of-Verification:**
```
After answering, generate verification questions about your response and answer them.
```

**Use cases:** Detecting hallucinations, improving factual consistency

---

### 10. Cumulative Reasoning & Modular Decomposition

**Status:** Community-Vetted

**Pattern:**
```
Break this problem into sub-tasks.
For each sub-task:
1. Solve it independently
2. Verify the solution
3. Move to next sub-task
Finally, combine all results.
```

**Use cases:** Multi-step reasoning, project planning

---

### 11. Advanced Agentic Preamble Design

**Status:** Experimental

**Enhanced preamble template:**
```xml
<tool_preambles>
For each tool call, include:
1. Rephrasing of user's goal
2. Structured plan with numbered steps
3. Periodic progress reports
4. Flag uncertainties and propose next actions
5. Final summary
</tool_preambles>
```

**Use cases:** Long agentic workflows, user monitoring

---

### 12. Meta-Instruction Layering

**Status:** Experimental

**Description:** Separate instruction layers at different abstraction levels.

**Pattern:**
```xml
<meta_thinking>
Before starting, think about how to approach this problem strategically.
</meta_thinking>

<task_instructions>
1. [Specific step]
2. [Specific step]
3. [Specific step]
</task_instructions>

<output_formatting>
Present results as: [format specification]
</output_formatting>
```

**Use cases:** Complex reports, multi-section documents

---

## Combining Multiple Techniques

Most powerful approach: Stack multiple techniques.

**Example - Combining 5+ techniques:**
```xml
<!-- Persona -->
You are a senior data scientist specializing in machine learning operations.

<!-- XML Structure -->
<context>
[Background information]
</context>

<task>
[Specific task]
</task>

<rules>
<!-- Negative Constraints -->
- Do not use deprecated libraries
- Avoid hardcoded values
</rules>

<!-- Self-Reflection -->
<self_reflection>
Create internal rubric, iterate until excellent.
</self_reflection>

<!-- Few-Shot Example -->
<examples>
Example 1: [input] → [output]
Example 2: [input] → [output]
</examples>

<!-- Router Nudge -->
Think carefully about this.
</xml>
```
