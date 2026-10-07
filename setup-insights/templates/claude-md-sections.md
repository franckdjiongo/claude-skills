## Pre-Commit Checklist

Always run `VALIDATE_CMD` (or the full validation suite: typecheck, lint, build, test) before committing any changes. Never skip validation steps.

## UI Changes

- When making UI/visual changes, apply fixes to ALL instances of a component across the codebase, including variants, mobile views, and all page routes -- not just the first occurrence found.
- When implementing visual/animation features (shadows, card effects, theme tokens), verify rendering in BOTH light and dark mode.
- When making changes that affect global appearance (attribution, logos, meta tags, theme defaults), apply them site-wide -- not just to a single page.

## Task Clarity

When a prompt is ambiguous about whether to plan or implement, ask for clarification. Default to PLAN + IMPLEMENT unless the user says otherwise.

## Git Workflow

Always run formatting (`FORMAT_CMD` or equivalent) before staging to avoid pre-commit hook failures.
