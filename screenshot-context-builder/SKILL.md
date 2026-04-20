---
name: screenshot-context-builder
description: >
  Rename batches of generic screenshots into descriptive names, and optionally rewrite a bug-report or feedback prompt to embed accurate image references and missing context. Use when the user wants to: rename screenshots with generic names (e.g. "Screenshot 2026-04-08..."), improve a voice-dictated or AI-rewritten prompt that references images, add exact image paths to a prompt, or do both at once. Triggers on: "rename my screenshots", "rename these images", "my prompt references screenshots", "I dictated this prompt", "add image paths to my prompt", "improve my prompt with the images", "prepare screenshots for Claude".
---

# Screenshot Context Builder

This skill automates two related tasks that often go together: giving screenshots meaningful names, and making sure any associated prompt accurately references those images with the correct paths and context.

## When the user arrives

Figure out which mode they need — ask only what's necessary:

1. **Folder path** — where are the images? (required for both modes)
2. **Domain/project context** — what does the application or project do? Even a sentence helps the analysis. If the user also provides a prompt, extract context from it.
3. **Mode** — rename only, or also improve a prompt?
4. **Exact image path format** — if the user wants paths embedded in the prompt, ask for the root path as it will appear in the target environment (e.g. `C:\Users\...\Screenshots\my-folder\`). The renamed filenames get appended to this root.

Don't ask all four at once — read what the user already gave you and ask only for what's missing.

---

## Mode A — Rename images

### Step 1: List images

List all image files in the folder (png, jpg, jpeg, gif, webp). Show the count to the user so they know what's coming.

### Step 2: Build context

Use the domain description the user provided, or extract it from any prompt they shared. The goal: understand what the application looks like, what its main sections are, and what kinds of problems are being illustrated. This context shapes how images get named.

### Step 3: Analyze with Haiku in parallel batches

Split the images into batches of 7. For each batch, spawn a Haiku subagent with:
- The list of image file paths to read
- The domain/project context
- This naming instruction:

> For each image, read it visually and propose a descriptive filename in kebab-case, no accents or special characters, max 60 characters. The name should capture: (1) the section or feature visible, and (2) the main element, problem, or state shown. Use meaningful prefixes that group related screens (e.g. `resume-semaine-`, `grille-`, `verification-`, `soumission-`, `notes-`, `modal-`). Return one line per image: `ORIGINAL_FILENAME -> new-name.png`

Spawn all batches simultaneously — don't wait for one to finish before starting the next.

### Step 4: Rename files

Once all subagents return, apply the renames using `mv` via Bash. Confirm the count of renamed files to the user.

---

## Mode B — Rename + improve a prompt

Do Mode A first (rename the images), then proceed with prompt improvement.

### Why prompts often need improvement

User prompts that describe visual bugs or UX issues are frequently imperfect because:
- They were dictated by voice and transcribed/rewritten by another AI, introducing inaccuracies
- The user wrote the prompt before taking screenshots, so image names don't match what's actually shown
- Context about scale, technical stack, or user constraints is present in the user's head but missing from the text
- The same problem may be mentioned in multiple places without linking to a specific image

### Step 5: Analyze images for prompt accuracy

After renaming, spawn Haiku subagents (same parallel batches) to read each image and extract:
- The section/feature visible
- The specific problem or anomaly visible (exact text values, colors, layout issues, error messages)
- Any discrepancy between what the image shows and what the original prompt claims

### Step 6: Rewrite the prompt

Rewrite the user's original prompt applying these principles:

**Structure**: Organize by functional area (e.g. one section per screen section or feature). Each section lists the bugs/observations, followed by the images that illustrate them.

**Image references**: Embed the exact renamed filenames with the full path the user provided. Group images under the section they illustrate. Format as a simple list of paths — Claude can read files directly from paths.

**Accuracy**: Correct any mismatches between what the prompt claims and what the images actually show. Use exact values visible in the screenshots (employee names, hour totals, error messages, button labels) rather than generic placeholders.

**Missing context**: Add any context the user mentioned verbally but didn't write — scale, user role, technical constraints, conventions (e.g. "Fluent UI only, no emojis"). If the user mentioned this in conversation, include it.

**Language**: Write the improved prompt in the exact same language as the original — if the user wrote in French, output in French; if in English, in English. Never switch languages.

**Tone**: Keep the prompt factual and problem-focused. Don't prescribe solutions — describe the problem and let Claude reason about the fix.

**Preserve intent**: Don't add sections or structures the user didn't ask for (no priority matrices, no engineering checklists, no executive summaries unless the user specifically requested them). If you notice something in an image the user didn't mention, you may add it as a brief note at the end of the relevant section, clearly marked "(observé dans l'image)" or "(observed in image)".

### Step 7: Save the prompt

Save the improved prompt as a `.md` file in the same folder as the images (or wherever the user specifies). Show them the path.

---

## Naming conventions reference

| Pattern | Use for |
|---|---|
| `resume-semaine-` | Weekly summary screens |
| `grille-` | Time entry or data grids |
| `verification-` | Review/validation screens |
| `soumission-` | Submission/confirmation flows |
| `notes-` | Notes panels or forms |
| `modal-` | Dialog boxes, pop-ups |
| `dashboard-` | Home/overview screens |
| `settings-` | Configuration screens |
| `erreur-` | Error states |
| `vide-` | Empty states |

Adapt these prefixes to the user's domain. If the application has different sections, derive prefixes from what the user tells you or from what the images show.

---

## Quality checks

Before delivering:
- All original "Screenshot YYYY-MM-DD HHMMSS.png" style names are gone
- No two files have the same new name (if there are near-duplicates, append `-2`, `-3`)
- All image paths in the improved prompt resolve to actual files in the folder
- The improved prompt is written in the same language as the original (French, English, etc.)
