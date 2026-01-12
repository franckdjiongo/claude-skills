---
name: gpt5-prompt-architect
description: Expert prompt engineering for GPT-5 and advanced AI models. Improves existing prompts, drafts new prompts, and creates comprehensive system instructions using proven techniques from official documentation and research. Use when the user asks to improve/optimize/refine a prompt, create/write/draft a new prompt or system instruction, or apply specific prompting techniques (XML sandwich, perfection loop, router nudge, self-reflection, etc.).
---

# GPT-5 Prompt Architect

Expert prompt engineering skill for GPT-5 and advanced AI models, based on official OpenAI documentation and cutting-edge research.

## Overview

This skill helps you create and optimize prompts using proven techniques including:
- **Core techniques**: Router nudge, verbosity control, XML structure, perfection loop, meta-prompting
- **GPT-5 API features**: Reasoning effort, custom tools, preambles, agentic calibration
- **Advanced patterns**: Self-reflection, few-shot examples, structured outputs, ReAct, tree-of-thought
- **Quality assurance**: Anti-pattern detection, contradiction elimination, token efficiency

## Workflow Decision Tree

**What do you need?**

1. **Improve existing prompt/system instruction** → Go to [Prompt Improvement Workflow](#prompt-improvement-workflow)
2. **Create new prompt/system instruction** → Go to [Prompt Creation Workflow](#prompt-creation-workflow)
3. **Apply specific technique** → See [references/core-techniques.md](references/core-techniques.md) or [references/gpt5-advanced-techniques.md](references/gpt5-advanced-techniques.md)
4. **Review patterns and anti-patterns** → See [references/prompt-patterns.md](references/prompt-patterns.md)

## Prompt Improvement Workflow

When user provides an existing prompt to improve:

### Step 1: Analyze Current Prompt
Evaluate the prompt against quality criteria:
- [ ] Task clarity and specificity
- [ ] Context completeness
- [ ] Success criteria definition
- [ ] Output format specification
- [ ] Contradiction check
- [ ] Anti-pattern detection (see [references/prompt-patterns.md](references/prompt-patterns.md))

### Step 2: Identify Applicable Techniques
Based on task complexity and requirements, determine which techniques to apply:

**Always consider:**
- XML structure for multi-part prompts
- Clear output format specification
- Elimination of contradictions

**For complex tasks:**
- Router nudge phrases ("think carefully")
- Self-reflection rubric
- Verbosity control

**For specialized domains:**
- Persona definition
- Few-shot examples
- Domain-specific constraints

**For API usage (GPT-5):**
- Reasoning effort parameter
- Custom tools definition
- Preamble instructions

Reference: [references/gpt5-advanced-techniques.md](references/gpt5-advanced-techniques.md)

### Step 3: Apply Improvements
Implement selected techniques systematically:

1. **Structure with XML** if multi-part
2. **Add persona** if domain-specific
3. **Include examples** if format-sensitive
4. **Add self-reflection** for quality-critical tasks
5. **Append router nudge** for complex reasoning
6. **Specify verbosity** for length control

### Step 4: Present Optimized Prompt
Provide:
1. **Improved prompt** - Complete, ready-to-use version
2. **Changes made** - Bullet list of techniques applied
3. **Rationale** - Brief explanation of why each technique helps
4. **Optional: API parameters** - If GPT-5 specific features recommended

## Prompt Creation Workflow

When user requests a new prompt from scratch:

### Step 1: Gather Requirements
Ask clarifying questions to understand:
- **Task objective**: What should the prompt accomplish?
- **Target model**: GPT-5, Claude, or model-agnostic?
- **Input/output**: What goes in, what comes out?
- **Constraints**: Length, format, style requirements?
- **Success criteria**: How to measure quality?

**Use flipped interaction pattern** if requirements unclear:
```
Before creating the prompt, I need to ask 5 clarifying questions:
1. [Question about objective]
2. [Question about constraints]
3. [Question about format]
4. [Question about audience]
5. [Question about success criteria]
```

### Step 2: Select Template Structure
Choose appropriate template from [references/prompt-patterns.md](references/prompt-patterns.md):
- **Research & Analysis Template** - For analytical tasks
- **Code Generation Template** - For software development
- **Creative Content Template** - For writing/marketing

### Step 3: Select Core Techniques
Based on requirements, choose from [references/core-techniques.md](references/core-techniques.md):

**Essential techniques:**
- **XML Sandwich Method** - For structured prompts
- **Verbosity Control** - For length management
- **Output format specification** - Always include

**Enhancement techniques:**
- **Router Nudge** - For complex reasoning
- **Perfection Loop** - For high-quality outputs
- **Meta-Prompting** - For prompt refinement

**Advanced techniques (GPT-5):**
See [references/gpt5-advanced-techniques.md](references/gpt5-advanced-techniques.md)

### Step 4: Build Complete Prompt
Construct prompt following this structure:

```xml
<!-- Persona (if specialized domain) -->
You are a [role] with expertise in [domain].

<!-- XML Structure -->
<context>
[Background information]
[Current situation]
[Relevant constraints]
</context>

<task>
[Specific task with clear deliverable]
</task>

<rules>
[Required behaviors]
[Forbidden behaviors (negative constraints)]
</rules>

<!-- Examples (if format-sensitive) -->
<examples>
Example 1: [input] → [output]
Example 2: [input] → [output]
</examples>

<!-- Self-Reflection (if quality-critical) -->
<self_reflection>
Create internal rubric with 5-7 excellence criteria.
Generate solution, grade against rubric, iterate until top marks.
</self_reflection>

<output_format>
[Exact format specification]
</output_format>

<!-- Router Nudge (if complex) -->
Think carefully about this.
```

### Step 5: Present Final Prompt
Provide:
1. **Complete prompt** - Ready to use
2. **Techniques used** - List of applied techniques
3. **Usage notes** - Any important considerations
4. **Optional: API parameters** - If GPT-5 specific

## System Instructions Creation

For comprehensive system instructions (like for custom GPTs or Claude Projects):

### Additional Considerations:
1. **Define assistant identity** - Role, expertise, personality
2. **Establish behavior rules** - What to do, what to avoid
3. **Set interaction patterns** - How to engage with users
4. **Specify output standards** - Consistent formatting, tone
5. **Handle edge cases** - Error conditions, unclear requests
6. **Include tool usage** - If applicable

### Structure:
```xml
<!-- Identity -->
<role>
You are [name], a [expertise] specialized in [domain].
Your personality is [traits].
</role>

<!-- Core Behavior -->
<behavior_rules>
ALWAYS:
- [Required behavior 1]
- [Required behavior 2]

NEVER:
- [Forbidden behavior 1]
- [Forbidden behavior 2]
</behavior_rules>

<!-- Interaction Patterns -->
<interaction>
When user asks [X], respond by [Y].
If request is unclear, [clarification approach].
</interaction>

<!-- Quality Standards -->
<output_standards>
All responses must:
- [Standard 1]
- [Standard 2]
</output_standards>

<!-- Tool Usage (if applicable) -->
<tools>
Available tools: [list]
Use [tool] when [condition].
</tools>

<!-- Edge Cases -->
<edge_cases>
If [situation], then [response].
</edge_cases>
```

Reference: [references/gpt5-advanced-techniques.md](references/gpt5-advanced-techniques.md) section on "Agentic Workflow Calibration" and "Structured XML-Style Tags"

## Quick Reference

### Most Impactful Techniques (Pareto 80/20)
1. **XML Structure** - Clarity and organization
2. **Self-Reflection Rubric** - Quality improvement
3. **Examples** - Format adherence
4. **Router Nudge** - Better reasoning
5. **Clear Output Format** - Predictable results

### Common Improvements
- Vague → Specific: Add concrete details and constraints
- Contradictory → Hierarchical: Prioritize conflicting rules
- Assuming context → Explicit: Provide all necessary information
- Overloaded → Decomposed: Split into multiple prompts
- Format-ambiguous → Structured: Specify exact format

### Red Flags to Fix
- Multiple unrelated tasks in one prompt
- Contradictory instructions
- Missing success criteria
- Vague requirements ("make it better")
- No output format specification

## Resources

### references/
- **core-techniques.md** - 5 fundamental best practices (router nudge, verbosity, XML, perfection loop, meta-prompting)
- **gpt5-advanced-techniques.md** - Comprehensive GPT-5 techniques (official API features, experimental patterns)
- **prompt-patterns.md** - Effective patterns, anti-patterns, quality checklist

### When to Load References:
- **core-techniques.md**: When user needs basic improvements or explanations
- **gpt5-advanced-techniques.md**: For GPT-5 specific features, agentic workflows, or advanced patterns
- **prompt-patterns.md**: When checking for anti-patterns or need template examples

## Best Practices

1. **Start simple, add complexity** - Don't over-engineer simple prompts
2. **One technique at a time** - When explaining improvements
3. **Combine techniques** - For maximum effectiveness
4. **Test and iterate** - Encourage refinement based on results
5. **Token efficiency** - Balance detail with context window constraints
6. **Model-specific features** - Use API parameters when available
7. **Clear presentation** - Show before/after for improvements

## Anti-Patterns to Avoid

When creating/improving prompts, never:
- Add techniques that don't serve the task
- Create contradictory instructions
- Assume context not provided
- Over-complicate simple tasks
- Ignore token efficiency
- Forget output format specification
- Skip success criteria definition
