Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.
Le détail pas à pas du fan-out vit dans references/codex-hand-run.md (Codex uniquement).

<!-- slot:engine-intro -->
Codex cannot run the Workflow template by itself: the engine is always the hand-run fan-out, parallel
`spawn_agent` calls (one per dimension) then one verifier per finding, specified in
`references/codex-hand-run.md`. Never scale it down because the user didn't name a multi-agent
review: the size of the diff decides (see "Scaling & cost").
<!-- /slot:engine-intro -->

<!-- slot:template-intro -->
The template is `references/workflow-template.js`; on Codex it is the specification you run by hand,
steps 1-6 of `references/codex-hand-run.md`.
<!-- /slot:template-intro -->

<!-- slot:model-policy -->
**Model policy:** hunters and verifiers run the SAME model, resolved at use time by
`scripts/resolve-codex-models.mjs`. Never name a model, never pass an effort above `high`, never omit
`reasoning_effort` (an agent spawned without one inherits the session default). The Verify step is not
optional. Details: `references/codex-hand-run.md`.
<!-- /slot:model-policy -->

<!-- slot:agent-deaths -->
**Agents dying mid-run (rate limits).** Do not restart the round: keep every JSON reply you hold and
re-spawn ONLY the dead agents with the same message, model and effort. Fixer details:
`references/codex-hand-run.md`.
<!-- /slot:agent-deaths -->
