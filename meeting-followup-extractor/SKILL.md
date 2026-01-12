---
name: meeting-followup-extractor
description: Extract follow-up questions from meeting summaries and draft client follow-up emails. Use when the user provides a meeting summary document and requests extraction of questions for client follow-up, or when they want to generate a follow-up email based on meeting notes. Automatically detects the document language (French or English) and generates the email in the same language.
---

# Meeting Follow-up Extractor

## Overview

Extract actionable follow-up questions from structured meeting summaries and generate clear, professional client follow-up emails. This skill works with meeting summary documents that contain sections with questions, uncertainties, or points requiring clarification.

## Workflow

### Step 1: Analyze the Meeting Summary

Read the entire meeting summary document to:

1. **Detect the language** - Identify if the document is in French or English (or other languages)
2. **Identify question sections** - Look for sections containing:
   - Questions requiring client clarification
   - Ambiguities or uncertainties mentioned
   - Points marked as needing validation
   - Items requiring client confirmation
3. **Extract client name** - Find the client/participant name from document headers or metadata

**Common section indicators:**
- "Questions techniques" / "Technical questions"
- "Prochains utilisateurs à rencontrer" / "Next users to meet"
- "Points nécessitant validation" / "Points requiring validation"
- "Ambiguïtés identifiées" / "Identified ambiguities"
- Any section with explicit questions or uncertainties

### Step 2: Filter Questions for Client

**Include only questions that:**
- Require client input or clarification
- Are about business processes, rules, or requirements
- Need validation or confirmation from the client
- Are relevant to the project scope

**Exclude questions that are:**
- Internal technical decisions
- Team coordination matters
- Questions for other stakeholders (not the client)
- Already answered in the document

### Step 3: Generate the Follow-up Email

Create a simple, professional email in the **same language** as the meeting summary.

**Email structure:**

```
Subject: Suivi de notre rencontre du [DATE] / Follow-up from our meeting on [DATE]

Bonjour [CLIENT_NAME] / Hello [CLIENT_NAME],

J'ai revu notre rencontre et j'aurais quelques questions de clarification:
I've reviewed our meeting and have a few clarification questions:

1. [Question 1 - clear and concise]
2. [Question 2 - clear and concise]
3. [Question 3 - clear and concise]
[...]

Pourriez-vous prendre un moment pour répondre à ces points?
Could you take a moment to address these points?

Merci beaucoup / Thank you very much
```

**Key principles:**
- Keep it simple and direct
- Use numbered lists for easy reference
- Rephrase questions clearly without technical jargon
- Maximum 10 questions per email (if more, prioritize)
- Use natural, professional tone

### Step 4: Update the Meeting Summary

After generating the email, ask the user if they want to update the original meeting summary document to:
- Add a "Follow-up Email" section at the end
- Mark questions as "sent to client"
- Track the follow-up date

## Language Handling

**Auto-detection rules:**
1. Check document title and headers for language indicators
2. Scan first 500 words for language patterns
3. Default to document's primary language

**French indicators:**
- "Rencontre", "Synthèse", "Questions", "Règles d'affaires"
- French date formats (28 octobre 2025)
- French-specific words (avec, pour, mais, etc.)

**English indicators:**
- "Meeting", "Summary", "Questions", "Business Rules"
- English date formats (October 28, 2025)
- English-specific words (with, for, but, etc.)

## Examples

### Example 1: French Meeting Summary

**Input:** Meeting summary with section "Questions techniques pour l'équipe"

**Output:**
```
Objet: Suivi de notre rencontre du 28 octobre 2025

Bonjour Karolane,

J'ai revu notre rencontre et j'aurais quelques questions de clarification:

1. Comment gérez-vous actuellement un employé qui travaille sur deux contrats dans la même journée?
2. Quelle est la procédure exacte lorsqu'un employé est blessé sur le chantier?
3. Y a-t-il des cas où un employé peut avoir plus de deux affectations dans une même journée?

Pourriez-vous prendre un moment pour répondre à ces points?

Merci beaucoup
```

### Example 2: English Meeting Summary

**Input:** Meeting summary with "Points requiring validation"

**Output:**
```
Subject: Follow-up from our meeting on October 28, 2025

Hello Sarah,

I've reviewed our meeting and have a few clarification questions:

1. What is your current process for handling multi-day projects?
2. Do you need approval for expenses over $1000?
3. How often should the reports be generated?

Could you take a moment to address these points?

Thank you very much
```

## Output Format

Always provide:
1. The extracted questions (numbered list)
2. The complete email draft (ready to copy)
3. Offer to update the original document if applicable

**Do not:**
- Include internal technical questions in client emails
- Use overly technical language
- Add formatting beyond basic structure
- Make the email longer than necessary
