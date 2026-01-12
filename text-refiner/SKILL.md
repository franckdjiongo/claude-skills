---
name: text-refiner
description: Reformule proprement les dictées vocales et textes bruts en français ou anglais, sans changer le sens. Nettoie les répétitions, hésitations, erreurs de transcription et améliore la fluidité. Sortie directe sans préambule. Détecte automatiquement la langue ou utilise celle spécifiée ("Français", "Anglais", "FR", "EN"). Ce skill devrait être utilisé quand l'utilisateur soumet du texte dicté, des notes vocales transcrites, ou tout texte nécessitant une reformulation propre et professionnelle.
---

# Text Refiner

## Overview

This skill transforms raw dictated text or rough notes into clean, professional writing in French or English. It removes verbal tics, repetitions, hesitations, and transcription errors while preserving the original meaning and intent. The output is direct and ready-to-use with no preamble or explanation.

## Core Directive: Output Only

**CRITICAL**: Never include any preamble, explanation, or commentary. Provide ONLY the refined text.

❌ **NEVER do this:**
```
Voici votre texte reformulé :

[refined text]

J'ai corrigé les répétitions et amélioré la fluidité.
```

✅ **ALWAYS do this:**
```
[refined text]
```

## Workflow

### Step 1: Language Detection and Selection

**Automatic Detection:**
- If no language is specified, detect the primary language of the input text
- Use the detected language for the output

**Explicit Language Override:**
If the user specifies a language using any of these indicators, output in that language regardless of input language:
- "Français" or "FR" → Output in French
- "Anglais" or "EN" → Output in English

**Language Indicators:**
- Can appear at the start: "FR: [text]" or "Anglais [text]"
- Can appear at the end: "[text] EN"
- Can appear as instruction: "Reformule en français: [text]"
- Can appear anywhere the user naturally places it

### Step 2: Text Analysis

Identify and mark for correction:

**Dictation Artifacts:**
- Verbal fillers: "euh", "umm", "like", "you know", "alors"
- False starts: "Je veux... je voudrais dire que..."
- Repetitions: "très très important" → "très important"
- Self-corrections: "c'était mardi... non jeudi"

**Transcription Errors:**
- Homophone mistakes: "sa" vs "ça", "ses" vs "ces"
- Missing punctuation or capitalization
- Run-on sentences without breaks
- Incorrect word boundaries: "dici" → "d'ici"

**Structural Issues:**
- Lack of paragraph breaks in long text
- Inconsistent tense usage
- Subject-verb agreement errors
- Missing or incorrect articles

### Step 3: Refinement Rules

**Preserve:**
- ✅ Original meaning and intent
- ✅ Key facts, numbers, names, technical terms
- ✅ Tone and register (formal vs casual)
- ✅ First-person perspective if present
- ✅ Specific vocabulary choices when intentional

**Improve:**
- ✅ Grammar and syntax
- ✅ Punctuation and capitalization
- ✅ Sentence structure and flow
- ✅ Word choice for clarity
- ✅ Professional presentation

**Remove:**
- ❌ Verbal fillers and hesitations
- ❌ Unnecessary repetitions
- ❌ False starts and self-corrections
- ❌ Transcription artifacts

**DO NOT:**
- ❌ Change the fundamental message
- ❌ Add information not in the original
- ❌ Remove key details or nuance
- ❌ Alter the speaker's voice dramatically
- ❌ Over-formalize casual content

### Step 4: Output Generation

Produce the refined text according to these rules:

**Formatting:**
- Maintain logical paragraph breaks
- Use proper capitalization
- Include appropriate punctuation
- Preserve lists or bullet points if present in intent

**Length:**
- Aim for conciseness without losing meaning
- Remove redundancy but keep necessary detail
- Typical reduction: 10-30% shorter than raw dictation

**Quality Standards:**
- Professional and polished
- Grammatically correct
- Natural and fluent
- Ready to send/publish without further editing

## Special Cases

### Very Short Text (1-2 sentences)
- Still refine for grammar and clarity
- Remove fillers even in brief text
- Output directly with no explanation

### Technical or Specialized Content
- Preserve technical terms exactly
- Maintain industry-specific language
- Do not simplify specialized vocabulary

### Mixed Language Input
- If text contains phrases in both French and English:
  - Translate everything to the target language
  - If no language specified, use the dominant language (>60% of words)
  - Preserve proper nouns and technical terms as-is

### Ambiguous Corrections
- If uncertain about intended meaning, favor the most logical interpretation
- Maintain the original word if multiple corrections are equally valid
- Default to preserving the user's apparent intent

## Examples

### Example 1: French Dictation with Fillers

**Input:**
```
Euh alors je voulais dire que... bon le projet il avance bien mais euh on a eu des des problèmes avec la base de données hier et puis voilà quoi on doit refaire les tests
```

**Output:**
```
Le projet avance bien, mais nous avons eu des problèmes avec la base de données hier. Nous devons refaire les tests.
```

### Example 2: English Transcription Error

**Input:**
```
We need to, you know, like finalize the report by friday and then umm send it to the client. Its really important that we dont miss the deadline this time.
```

**Output:**
```
We need to finalize the report by Friday and then send it to the client. It's really important that we don't miss the deadline this time.
```

### Example 3: Language Override (FR specified for English input)

**Input:**
```
FR: The meeting is scheduled for tomorrow at 3pm and we need to prepare the slides
```

**Output:**
```
La réunion est prévue pour demain à 15h et nous devons préparer les diapositives.
```

### Example 4: Professional Email Dictation

**Input:**
```
Bonjour euh je vous écris pour euh confirmer notre rendez-vous de de lundi prochain à à 14h. Euh si jamais vous avez besoin de reporter merci de me le dire au plus vite quoi. Cordialement
```

**Output:**
```
Bonjour,

Je vous écris pour confirmer notre rendez-vous de lundi prochain à 14h. Si vous avez besoin de le reporter, merci de me le dire au plus vite.

Cordialement
```

### Example 5: Technical Content Preservation

**Input:**
```
Alors pour le le déploiement on va utiliser euh Docker et Kubernetes donc euh il faut configurer les pods et puis euh mettre en place le load balancer quoi
```

**Output:**
```
Pour le déploiement, nous utiliserons Docker et Kubernetes. Il faut configurer les pods et mettre en place le load balancer.
```

## Language-Specific Rules

### French Refinement
- Use proper French typography (« guillemets », espaces insécables)
- Follow French capitalization (lowercase for days/months)
- Use appropriate French sentence connectors (donc, ainsi, par conséquent)
- Maintain vouvoiement/tutoiement from original
- Follow user's preference rules from context (per user preferences: proper Canadian French conventions)

### English Refinement
- Use Oxford comma for clarity in lists
- American vs British spelling: default to American unless context suggests otherwise
- Use contractions appropriately based on formality level
- Maintain consistent tense throughout

## Edge Cases and Troubleshooting

### User says "clean this up" or similar
- Treat as a text refinement request
- Apply all refinement rules
- Output only the refined text

### User provides text in brackets or quotes
- Refine the content within brackets/quotes
- Do not include the brackets/quotes in output unless they're part of the intended message

### Very rough or barely intelligible input
- Do best effort interpretation
- Preserve any clear phrases exactly
- Make logical assumptions for unclear sections
- Still output only the refined text (no apologies about quality)

### User includes context before text
Example: "Reformule cette note que j'ai dictée: [text]"
- Ignore the instruction portion
- Refine only the actual text content
- Output only refined text

## Critical Reminders

1. **NEVER include preamble** - Start directly with refined text
2. **NEVER add explanations** - No "Voici...", "Here is...", etc.
3. **NEVER describe changes** - Just output the result
4. **ALWAYS preserve meaning** - Accuracy over eloquence
5. **ALWAYS respect language override** - FR/EN indicators are absolute
6. **ALWAYS maintain user's voice** - Improve, don't transform
