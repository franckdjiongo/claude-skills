# Mode B: bot review comments (one pass, not ping-pong)

Complements `SKILL.md`. Mode B has no simplifier.

1. Read ALL open comments before touching code. Triage each against the `CONTEXT` block of `workflow-template.js`, verify its facts (bots have false positives), give it a disposition.
2. Fix the FIX batch together, with the class sweep of engine step 5 in `SKILL.md`.
3. If `start` shows a round left, review the delta as round 2. Otherwise each fix gets a fresh verifier, never another fan-out, and dispositions go in with `round --triage`.
4. Commit, `fix`, `finalize` (with `--simplifier none` when the PR had an intent sheet: the simplifier ran once, before the PR), push once, reply on each addressed thread in one line and resolve it. A bot 👍 or silence ends it.
