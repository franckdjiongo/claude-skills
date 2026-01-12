# Quality Checklist

Validate all documentation before delivery.

## Content Completeness

### User Guides
- [ ] Quick Start enables first success in <5 minutes
- [ ] All mandatory sections present (Quick Start, How-Tos, Troubleshooting, FAQ, Contact Support)
- [ ] Troubleshooting organized by symptom with exact error messages
- [ ] FAQ answers 5-10 most common questions

### Technical Guides
- [ ] All mandatory sections present (Overview, Architecture, Data Model, Configuration, Deployment, Operations, Security, Change Log)
- [ ] Architecture diagrams at appropriate depth level
- [ ] Error handling documented for flows
- [ ] Security model documented for Dataverse solutions
- [ ] Configuration parameters fully documented (name, type, purpose, values, default, required)

## Writing Quality

- [ ] Readability grade 7-9 (user guides)
- [ ] Active voice throughout
- [ ] Present tense
- [ ] ≤20 words per sentence
- [ ] ≤12 steps per procedure
- [ ] Conditions before instructions ("To save changes, click OK")
- [ ] Consistent terminology (no synonyms for same concept)
- [ ] No jargon without definition
- [ ] No hedging words unless genuine uncertainty

## Formatting Compliance

- [ ] Sentence case headings
- [ ] Proper heading hierarchy (H1 → H2 → H3, no skipping)
- [ ] UI elements in bold (**Save**)
- [ ] Code/technical terms in code font (`tableName`)
- [ ] Numbered lists for sequential procedures
- [ ] Bulleted lists for non-sequential items
- [ ] Tables for structured reference data
- [ ] Code blocks with language identifier
- [ ] All metadata fields populated

## Accessibility Compliance (WCAG 2.2 Level AA)

### Perceivable
- [ ] All images have descriptive alt text
- [ ] Color contrast ratio ≥4.5:1 for text
- [ ] Information not conveyed by color alone
- [ ] Tables use proper header markup

### Operable
- [ ] All content accessible via keyboard
- [ ] Proper heading hierarchy
- [ ] Descriptive link text (never "click here")

### Understandable
- [ ] Language of page declared
- [ ] Error messages identify problem clearly
- [ ] Consistent navigation and terminology

## Power Platform Specifics

- [ ] Correct product terminology (Dataverse not CDS)
- [ ] Canvas/model-driven distinctions clear
- [ ] Flow error handling section included
- [ ] Connection references documented
- [ ] Environment variables documented
- [ ] Security roles documented

## Review Process

| Stage | Reviewer | Focus |
|-------|----------|-------|
| 1. Self-review | Author | Grammar, spelling, style |
| 2. Peer review | Team member | Clarity, structure, consistency |
| 3. SME review | Developer/engineer | Technical accuracy |
| 4. Stakeholder approval | Product owner | Sign-off for publication |

Before publishing:
- [ ] All links tested and working
- [ ] Code samples validated
- [ ] Screenshots current and annotated
- [ ] Formal sign-off from approvers recorded
