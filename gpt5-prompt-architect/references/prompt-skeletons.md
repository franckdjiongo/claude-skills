# Prompt skeletons

Reusable skeletons moved out of SKILL.md.

## New prompt skeleton

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

## Flipped interaction pattern

```
Before creating the prompt, I need to ask 5 clarifying questions:
1. [Question about objective]
2. [Question about constraints]
3. [Question about format]
4. [Question about audience]
5. [Question about success criteria]
```

## System instruction skeleton

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
