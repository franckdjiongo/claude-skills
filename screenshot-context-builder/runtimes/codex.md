Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:first-pass -->
### 2. First-pass names with sub-agents (in parallel)
Split into batches of ~7 and spawn one sub-agent per batch:
`spawn_agent({ task_name: "screenshots_batch_<n>", agent_type: "default", fork_turns: "none", reasoning_effort: "low", message })`.
Leave out `model` (the session model is fine for reading thumbnails); the `review-*` roles in the routing files are for code review, not for this. Never write a model name here. Codex limits how many agents run at once: spawn in waves, and when `spawn_agent` answers "agent thread limit reached", wait for one to finish and spawn the refused batch again. `wait_agent` only says that some agent finished: keep the list of your `task_name`s and keep waiting until every batch has replied. If a sub-agent cannot open images, do this pass yourself in smaller batches. Give each sub-agent: the file paths, the domain context, and this instruction:

> For each image, read it and propose a kebab-case filename, no accents/special chars, max 60 chars, capturing (1) the section/feature visible and (2) the main element/problem/state shown. Use grouping prefixes (e.g. `grille-`, `modal-`, `vide-`, `filtre-`, `footer-`). Return one line per image: `ORIGINAL.png -> new-name.png`. Also add an `OBSERVATIONS:` section with exact strings you can read (names, totals, labels, messages).

Treat these names as a **draft**. A sub-agent reads thumbnails and will sometimes mislabel — e.g. naming a file `grille-interne-*` when it actually shows external data, or `soumission-*` for a screen that's merely "open". Do not ship these blindly.
<!-- /slot:first-pass -->
