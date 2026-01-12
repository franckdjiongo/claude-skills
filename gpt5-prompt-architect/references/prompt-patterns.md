# Prompt Patterns & Anti-Patterns

Quick reference for effective prompt construction and common pitfalls to avoid.

## ✅ Effective Patterns

### 1. Specific and Actionable
```
✅ GOOD: "Write a Python function that takes a list of integers and returns the sum of even numbers only. Include error handling for non-integer inputs."

❌ BAD: "Write some code for working with numbers."
```

### 2. Context-Rich
```
✅ GOOD: "I'm building an e-commerce site for handmade jewelry. The target audience is women aged 25-45 interested in sustainable fashion. Generate 5 product descriptions."

❌ BAD: "Generate product descriptions."
```

### 3. Clear Success Criteria
```
✅ GOOD: "Summarize this article in exactly 3 bullet points. Each point should be one sentence and focus on actionable insights."

❌ BAD: "Summarize this article."
```

### 4. Role Definition
```
✅ GOOD: "As a senior cloud architect with expertise in AWS, review this infrastructure diagram and identify security vulnerabilities."

❌ BAD: "Look at this infrastructure diagram."
```

### 5. Output Format Specification
```
✅ GOOD: "Provide your response as valid JSON with keys: 'title', 'summary', 'tags' (array), 'priority' (1-5)."

❌ BAD: "Give me the information."
```

## ❌ Common Anti-Patterns

### 1. Vagueness
```
❌ "Make it better"
❌ "Improve this"
❌ "Do something with this data"

✅ "Refactor this code to reduce cyclomatic complexity below 10 and add docstrings to all functions."
```

### 2. Contradictory Instructions
```
❌ "Be concise but provide detailed explanations"
❌ "Don't schedule without consent" + "Auto-schedule earliest slot"

✅ "Provide a 2-paragraph executive summary (concise), followed by a detailed technical section (comprehensive)."
```

### 3. Assuming Context
```
❌ "Fix the bug in my code"
❌ "Continue from where we left off"

✅ "Here is my Python script [code]. It throws a TypeError on line 42 when processing empty lists. Fix this bug."
```

### 4. Overloading Single Prompt
```
❌ "Analyze this data, create visualizations, write a report, generate SQL queries, and train a model"

✅ Break into multiple prompts:
   1. "Analyze this data and identify key trends"
   2. "Based on the analysis, suggest appropriate visualizations"
   3. "Write an executive summary of findings"
```

### 5. Missing Constraints
```
❌ "Generate a password"

✅ "Generate a secure password with exactly 16 characters, including uppercase, lowercase, numbers, and special characters (!@#$%^&*). Do not use ambiguous characters like 0/O or 1/l."
```

## 🎯 Pattern Templates

### Research & Analysis Template
```xml
<role>
You are a [domain] expert with [specific expertise].
</role>

<context>
[Background information]
[Current situation]
[Relevant constraints]
</context>

<task>
[Specific task with clear deliverable]
</task>

<success_criteria>
- Criterion 1
- Criterion 2
- Criterion 3
</success_criteria>

<output_format>
[Exact format specification]
</output_format>

Think carefully about this.
```

### Code Generation Template
```xml
<role>
You are a senior [language] developer specializing in [domain].
</role>

<requirements>
- Requirement 1
- Requirement 2
- Requirement 3
</requirements>

<constraints>
- Use [specific library/framework]
- Follow [coding standard]
- Include [testing/documentation requirement]
</constraints>

<self_reflection>
Before providing the final code:
1. Define what constitutes excellent code for this task
2. Generate the solution
3. Review against your excellence criteria
4. Iterate if needed
</self_reflection>

<output_format>
Provide complete, production-ready code with:
- Inline comments for complex logic
- Docstrings for functions/classes
- Error handling
- Example usage
</output_format>
```

### Creative Content Template
```xml
<context>
[Brand/project context]
[Target audience]
[Goals/objectives]
</context>

<task>
[Specific creative task]
</task>

<tone_and_style>
- Tone: [formal/casual/friendly/etc.]
- Style: [descriptive/concise/technical/etc.]
- Voice: [active/passive, first/third person]
</tone_and_style>

<examples>
Example 1: [input] → [output]
Example 2: [input] → [output]
</examples>

<constraints>
- Do not: [what to avoid]
- Must include: [required elements]
</constraints>

<output_format>
[Format specification]
</output_format>
```

## 🔄 Iteration Patterns

### Pattern 1: Progressive Refinement
```
Prompt 1: "Draft a basic version of [X]"
Prompt 2: "Refine this draft by [specific improvement]"
Prompt 3: "Polish for [specific audience/purpose]"
```

### Pattern 2: Generate-Critique-Improve
```
Prompt 1: "Generate [X] following these requirements"
Prompt 2: "Critique this [X] against these criteria"
Prompt 3: "Improve based on the critique"
```

### Pattern 3: Clarify-Then-Execute
```
Prompt 1: "Before proceeding, ask me 5 clarifying questions about [task]"
Prompt 2: [Answer questions]
Prompt 3: "Now execute [task] with the clarified requirements"
```

## 📊 Quality Indicators

### High-Quality Prompt Checklist
- [ ] Specific task clearly stated
- [ ] Necessary context provided
- [ ] Success criteria defined
- [ ] Output format specified
- [ ] Constraints/rules listed
- [ ] Examples included (if applicable)
- [ ] Role/persona defined (if applicable)
- [ ] No contradictory instructions
- [ ] Appropriate verbosity level indicated

### Red Flags (Revise if present)
- [ ] Uses "maybe" or "perhaps" in requirements
- [ ] Multiple unrelated tasks in one prompt
- [ ] Assumes AI has context it doesn't have
- [ ] Contradictory requirements
- [ ] Vague success criteria
- [ ] No output format guidance
- [ ] Overly complex single prompt (split instead)

## 🚀 Advanced Optimization

### Technique Stacking Priority
1. **Always include:**
   - Clear task definition
   - Output format specification

2. **For complex tasks, add:**
   - XML structure
   - Self-reflection rubric
   - Router nudge phrase

3. **For specialized domains, add:**
   - Persona definition
   - Domain-specific examples
   - Technical constraints

4. **For agentic workflows, add:**
   - Tool definitions
   - Workflow calibration
   - Preamble instructions

### Token Efficiency Tips
- Use delimiters instead of repeated explanations
- Leverage examples over verbose descriptions
- Structure with tags for clear parsing
- Specify exact lengths when needed
- Front-load critical information
