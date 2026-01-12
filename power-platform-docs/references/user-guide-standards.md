# User Guide Standards

## Mandatory Sections

| Section | Purpose |
|---------|---------|
| Quick Start | Get users productive in <5 minutes with core workflow |
| Core Feature How-Tos | Task-oriented procedures for primary use cases |
| Troubleshooting | Self-service problem resolution by symptom |
| FAQ | Answer 5-10 most common questions |
| Contact Support | Escalation path (place last to encourage self-service) |

Optional: Glossary, Advanced Features, What's New

## Readability Targets

| Metric | Target |
|--------|--------|
| Flesch-Kincaid Grade Level | 7-9 |
| Flesch Reading Ease | 60-70 |
| Sentence length | ≤20 words |
| Procedure steps | ≤12 steps |

## Word Replacements

| Instead of | Use |
|------------|-----|
| Utilize | Use |
| Prior to | Before |
| Terminate | End |
| Facilitate | Help |
| Interface (verb) | Connect |

## Screenshot Guidelines

**Include screenshots for**: Multi-step processes, hidden menus/settings, decision points with options, error states.

**Skip screenshots for**: Simple labeled buttons, standard OK/Cancel dialogs, obvious UI elements, frequently-changing interfaces.

**Format standards**:
- Max width: 600px
- Format: PNG
- Callout color: Red rectangles/arrows
- File size: <200KB
- Pattern: Context text → Screenshot → Details

**Placeholder format**:
```markdown
![Alt text description][screenshot-id]
<!-- Screenshot: [What to capture] -->
<!-- Callouts: [Elements to highlight] -->
```

## Troubleshooting Section Format

Organize by **symptom** (what users see), not technical cause.

```markdown
## [Exact Error Message or Symptom]

**What you see:**
- Error message text verbatim
- Specific behavior description

**Common causes:**
- Cause 1 (most frequent)
- Cause 2

**Solutions (try in order):**
1. Simplest fix first
2. Next solution
3. More involved fix

**Still not working?**
Contact [support] with: [specific information to include]
```

## FAQ Format

```markdown
## Frequently asked questions

**Q: How do I [common question]?**
A: [Direct answer in 1-2 sentences]. [Additional context if needed].

**Q: Can I [common question]?**
A: [Yes/No]. [Explanation].
```

## User Guide Template

```markdown
# [App Name] User Guide
Version: 1.0 | Last Updated: YYYY-MM-DD | Audience: End Users

## Quick start
- Prerequisites (permissions, browser requirements)
- First-time login steps
- Complete your first [core task] in 5 minutes

## [Primary feature] how-to
- Step-by-step procedure with annotated screenshots
- Expected results after each major step

## [Secondary feature] how-to
- Step-by-step procedure

## Troubleshooting
### "Access denied" error
### App loads slowly
### Data not saving

## Frequently asked questions
- Q: How do I [common question]?
- Q: Can I [common question]?

## Getting help
- Self-service resources
- Support contact information
- Information to include when reporting issues
```
