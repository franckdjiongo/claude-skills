# Examples, language guidelines, patterns and edge cases

Moved out of SKILL.md. The direct-output rule, the Teams tone rules and the special instructions stay in SKILL.md.

## Examples

### Example 1: Quick Update (French)

**Input:**
```
salut les gars juste pour dire que jai fini la presentation et je lai mis dans le dossier sharepoint vous pouvez regarder et me dire ce que vous en pensez
```

**Output:**
```
Salut l'équipe !

J'ai terminé la présentation et l'ai ajoutée dans le dossier SharePoint. N'hésitez pas à la consulter et me faire vos retours.

Merci !
```

### Example 2: Request with Translation

**Input:**
```
EN: bonjour est-ce que quelquun pourrait maider avec le rapport financier? jai des questions sur les chiffres du Q3
```

**Output:**
```
Hi team,

Could someone help me with the financial report? I have questions about the Q3 numbers.

Thanks!
```

### Example 3: Action Request (English)

**Input:**
```
hey i really need someone to review the code before the deadline tomorrow can anyone help me out please its urgent
```

**Output:**
```
Hi team,

I need a code review before tomorrow's deadline. Can someone help?

It's urgent - thanks in advance!
```

### Example 4: Meeting Coordination (French)

**Input:**
```
alors pour la reunion de demain euh je pense quon devrait la reporter parce que jai pas encore fini le document et puis Jean-Marc est pas disponible non plus donc voila on pourrait la faire jeudi a la place?
```

**Output:**
```
Bonjour,

Je propose de reporter la réunion de demain à jeudi. Je n'ai pas encore terminé le document et Jean-Marc n'est pas disponible non plus.

Ça vous convient ?
```

### Example 5: Status Update (English)

**Input:**
```
just wanted to let everyone know that the deployment went well no issues everything is working as expected we should be good to go for the launch next week
```

**Output:**
```
Good news - the deployment went smoothly! ✅

Everything is working as expected. We're on track for next week's launch.
```

### Example 6: Polite Decline (French)

**Input:**
```
euh desolé mais je pense que je pourrai pas participer a cette reunion parce que jai deja un autre truc de prevu au meme moment et je peux vraiment pas le deplacer desole
```

**Output:**
```
Malheureusement, je ne pourrai pas participer à cette réunion - j'ai déjà un autre engagement au même créneau que je ne peux pas déplacer.

Pouvez-vous partager le compte-rendu après ?

Merci !
```

### Example 7: Asking for Feedback (English to French default)

**Input:**
```
hi everyone i finished the mockups for the new dashboard could you take a look and let me know what you think especially about the color scheme and layout thanks
```

**Output:**
```
Hi everyone,

I finished the mockups for the new dashboard. Could you take a look and share your thoughts, especially on the color scheme and layout?

Thanks!
```

### Example 8: Urgent Issue (French)

**Input:**
```
attention il y a un gros probleme avec le serveur de prod les clients peuvent pas se connecter faut regler ca tout de suite
```

**Output:**
```
⚠️ Problème urgent - le serveur de production est down.

Les clients ne peuvent pas se connecter. On doit régler ça immédiatement.

Qui peut investiguer ?
```

## Language-Specific Guidelines

### French Teams Messages
- Use "tu/vous" appropriately based on company culture (default: vous unless context suggests tu)
- Natural French connectors: "donc", "du coup", "par contre"
- Keep formality balanced: not "Madame/Monsieur" but not "salut les potos"
- Standard greetings: "Bonjour", "Salut l'équipe", "Coucou"
- Sign-offs: "Merci !", "À plus", "Bonne journée"

### English Teams Messages
- American English conventions (unless context suggests otherwise)
- Contractions OK: "it's", "we're", "don't"
- Greetings: "Hi team", "Hey all", "Morning"
- Sign-offs: "Thanks!", "Cheers", "Talk soon"

## Teams Context Patterns

### Quick Status Update Pattern
```
[Brief context]
[Status/progress in 1-2 sentences]
[Next step or ETA]
```

### Question/Request Pattern
```
[Quick context if needed]
[Clear question or request]
[Deadline or urgency if applicable]
[Thanks]
```

### Meeting Follow-up Pattern
```
[Meeting reference]
[Key takeaways - bullet points OK]
[Action items with owners]
```

### Problem Alert Pattern
```
[Issue description - brief]
[Impact]
[Proposed solution or request for help]
```

## Edge Cases

### User includes "@mentions"
- Preserve @mentions exactly as written
- Format: Keep user includes context like "@Jean-Marc" or "@Marketing Team"

### User includes technical terms or acronyms
- Preserve all technical vocabulary
- Don't translate specialized terms
- Keep acronyms uppercase

### User's message is already well-written
- Still apply minor polish (punctuation, spacing)
- Don't add unnecessary changes
- Maintain the user's voice

### Very casual input with slang
- Upgrade to professional-casual
- Remove slang but keep friendly tone
- Don't make it stiff

### User includes emoji
- Keep intentional emoji if appropriate
- Remove excessive emoji (>3)
- Add relevant emoji only if message tone calls for it

### Message is too long (>8 sentences)
- Still polish it
- Consider adding line breaks for readability
- Don't arbitrarily cut content

