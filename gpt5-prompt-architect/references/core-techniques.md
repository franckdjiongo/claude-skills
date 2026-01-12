# Core Best Practices for AI Prompts

This reference contains five fundamental techniques for writing effective prompts that work across advanced AI models.

## 1. Router Nudge Phrases

**Purpose:** Signal the AI to engage its most powerful reasoning model for complex tasks.

**When to use:** High-stakes tasks, complex analysis, tasks requiring consideration of second-order effects.

**Phrases to append:**
- "think hard about this"
- "think deeply about this"
- "think carefully"

**Example:**
```
Analyze my company's quarterly sales data and suggest three strategies for growth. Think carefully about this.
```

## 2. Verbosity Control

**Purpose:** Precisely control response length and detail level.

**Levels:**

**Low Verbosity (Bottom line only):**
```
Give me the bottom line in 100 words or less. Use markdown for clarity and structure.
```

**Medium Verbosity (Key takeaways + context):**
```
Aim for a concise 3 to 5 paragraph explanation.
```

**High Verbosity (Comprehensive document):**
```
Provide a comprehensive and detailed breakdown (600-800 words).
```

**Example:**
```
Explain the concept of blockchain. Aim for a concise 3 to 5 paragraph explanation.
```

## 3. Prompt Optimization (Meta-Prompting)

**Purpose:** Refine prompts for maximum effectiveness by having the AI improve them.

**Method A - External Tool:**
Use OpenAI's Prompt Optimizer to paste and improve prompts.

**Method B - Meta-Prompting:**
```
You are an expert prompt engineer. Your job is to take my prompt and make it 10 times better so that an AI can give the best possible response. Here is my prompt: [YOUR PROMPT]
```

**Benefits:**
- Adds structure
- Eliminates vagueness
- Incorporates error handling

## 4. XML Sandwich Method

**Purpose:** Structure prompts with clear sections for better understanding.

**Structure:**
```xml
<context>
[Background information]
</context>

<task>
[Specific task to perform]
</task>

<output_format>
[Desired format of the response]
</output_format>
```

**Example:**
```xml
<context>
I am creating a marketing campaign for a new vegan protein powder. The target audience is fitness enthusiasts between the ages of 25 and 40.
</context>

<task>
Generate three catchy slogans for this product.
</task>

<output_format>
Provide the slogans as a bulleted list.
</output_format>
```

## 5. Perfection Loop

**Purpose:** For complex tasks, instruct the AI to self-critique and improve before presenting results.

**Three-step process:**
1. Define excellence for the task
2. Generate the response
3. Grade and iterate internally until optimal

**Example:**
```
Your task is to write a Python script that scrapes the headlines from the front page of BBC News.

Before you begin, follow a 'Perfection Loop':
1. First, define what constitutes an 'excellent' Python scraping script. Consider factors like readability, efficiency, error handling, and commenting.
2. Then, write the script according to my request.
3. Finally, review your script against the definition of excellence you created. If it doesn't meet the standard, iterate on it until it does.

Provide only the final, perfected Python script as your answer.
```

## Combining Techniques

These methods are not mutually exclusive. Combine them for powerful results:

**Example - XML Sandwich + Router Nudge:**
```xml
<context>
[Your context]
</context>

<task>
[Your task]
</task>

<output_format>
[Desired format]
</output_format>

Think carefully about this.
```
