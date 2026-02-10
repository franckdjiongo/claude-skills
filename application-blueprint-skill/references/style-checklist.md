# Style and Quality Checklist

Use this checklist before delivering the final documents. Both the English and French versions must pass every applicable check.

## Completeness

- [ ] Executive Summary is present and under 300 words
- [ ] Every section from the canonical structure is present (or marked N/A with reason)
- [ ] Every route/endpoint/page/screen found in the codebase is documented in the Features section
- [ ] Every data model/entity is described in the Data section
- [ ] Every external integration is documented
- [ ] Every user role found in the code is described
- [ ] Business rules and validation logic are captured
- [ ] The Glossary covers all technical and domain terms used

## Accuracy

- [ ] No feature is described that doesn't exist in the code
- [ ] No assumptions are presented as facts — anything inferred is flagged
- [ ] Data relationships match the actual schema
- [ ] Security model matches the actual implementation
- [ ] Integration descriptions match the actual API calls in the code

## Plain Language (Both Versions)

- [ ] A non-technical reader can understand the Executive Summary without help
- [ ] Every technical term is defined on first use
- [ ] No code, variable names, or file paths appear in prose
- [ ] No unexpanded acronyms
- [ ] Analogies are used for complex technical concepts
- [ ] Sentences average 15-20 words (allow some variation)

## English-Specific

- [ ] Active voice is used predominantly
- [ ] Present tense for feature descriptions
- [ ] No AI-sounding filler phrases (robust, leverage, seamlessly, etc.)
- [ ] No consecutive paragraphs starting with the same word
- [ ] Transitions between sections feel natural
- [ ] No exclamation marks

## French-Specific

- [ ] Quebec/Canadian typography: only first letter capitalized in headings
- [ ] Proper nouns correctly capitalized, common nouns lowercase
- [ ] French guillemets « » used, not English quotation marks
- [ ] Francized IT vocabulary used (courriel, mot de passe, identifiant, etc.)
- [ ] Accents on uppercase letters (À, É, È, etc.)
- [ ] Does NOT read like a translation — phrasing is naturally French
- [ ] Voix active par défaut
- [ ] No AI-sounding filler phrases in French equivalents
- [ ] No exclamation marks

## Document Quality

- [ ] Reads as a cohesive narrative, not disconnected sections
- [ ] No information is repeated across sections (DRY principle)
- [ ] Section lengths are proportional to importance
- [ ] Formatting is consistent (heading levels, bold usage, list style)
- [ ] No orphaned sections (sections with only one sentence)
- [ ] Both documents can stand alone — no cross-references between EN and FR

## Final Delivery

- [ ] English file named: `{app-name}-blueprint-en.md`
- [ ] French file named: `{app-name}-blueprint-fr.md`
- [ ] Both files saved to `/mnt/user-data/outputs/`
- [ ] Both files presented to the user via `present_files`
