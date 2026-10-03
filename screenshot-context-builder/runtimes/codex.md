Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:first-pass -->
### 2. First-pass names with sub-agents (in parallel)
Split into batches of ~7 and spawn one sub-agent per batch with `spawn_agent` (all in the same turn), then collect them with `wait_agent`. Never write a model name here: resolve the model and effort when you spawn, from `.codex/model-routing.json` in the repo or `~/.codex/model-routing.json` (pick the lightest role it defines for plain reading tasks; if none fits, keep the session model and pass a low `reasoning_effort` explicitly). If a sub-agent cannot open images, do this pass yourself in smaller batches. Give each sub-agent: the file paths, the domain context, and this instruction:

> For each image, read it and propose a kebab-case filename, no accents/special chars, max 60 chars, capturing (1) the section/feature visible and (2) the main element/problem/state shown. Use grouping prefixes (e.g. `grille-`, `modal-`, `vide-`, `filtre-`, `footer-`). Return one line per image: `ORIGINAL.png -> new-name.png`. Also add an `OBSERVATIONS:` section with exact strings you can read (names, totals, labels, messages).

Treat these names as a **draft**. A sub-agent reads thumbnails and will sometimes mislabel — e.g. naming a file `grille-interne-*` when it actually shows external data, or `soumission-*` for a screen that's merely "open". Do not ship these blindly.
<!-- /slot:first-pass -->
