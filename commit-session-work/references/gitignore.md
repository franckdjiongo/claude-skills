# Deciding `.gitignore` rules

Add a narrow ignore rule only when all conditions hold:

- the path is a local, disposable, reproducible artifact (cache, dependency directory, build staging output, generated log, editor state, verification screenshot, temporary export);
- project conventions do not expect it to be versioned;
- it is not tracked;
- ignoring it will not hide source, documentation, fixtures, migrations, lockfiles, required generated outputs, or user-authored data.

Inspect existing ignore files and use `git check-ignore -v` where useful. Prefer the narrowest project-relative pattern. Never ignore an unknown directory wholesale when it contains source or configuration. Never ignore a tracked file instead of reviewing it.

In Full-tree mode: add safe ignore rules automatically without asking; commit the resulting `.gitignore` change; commit every remaining non-ignored path; if a secret file needs ignoring, add the narrow safe rule without reading or printing the secret; if a tracked file contains a secret, stop as a hard blocker because `.gitignore` cannot protect tracked content.
