Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:models -->
- **Les lentilles** tournent TOUJOURS en sous-agents `spawn_agent` (`task_name` : `lentille_candide`, `lentille_fact_check`, `lentille_mecanique_domaine`, `lentille_regles_process`, et si demandées `lentille_personas`, `lentille_futur` ; `agent_type: "default"`, `fork_turns: "none"`) dont le modèle et l'effort viennent du rôle `review-hunter`, résolu au moment de l'usage par le résolveur du skill adversarial-pr-review : `node ~/.agents/skills/adversarial-pr-review/scripts/resolve-codex-models.mjs --repo <repo-cible>` (fichier de routage du repo, puis `~/.codex/model-routing.json`, puis modèle de la session). Si ce fichier n'existe pas, lis toi-même `roles["review-hunter"]` dans `<repo-cible>/.codex/model-routing.json` puis dans `~/.codex/model-routing.json`, sinon garde le modèle de la session, et dis dans ta réponse que le résolveur manquait. Sans effort défini, prends `medium`. Passe toujours `model` ET `reasoning_effort` : un sous-agent sans effort hérite de celui de la session, plus élevé. Jamais au-dessus de `high` pour un sous-agent, et jamais de nom de modèle écrit dans ce skill.
- **Le triage** (étape 2) reste au modèle de la SESSION : le jugement et la correction du plan reviennent au modèle fort de l'authoring.
<!-- /slot:models -->

<!-- slot:etape0-run -->
Codex n'exécute rien au chargement d'un skill et ne lui passe pas
d'arguments : le chemin du plan et le repo cible viennent de la demande (ou du
skill brief-chantier qui t'invoque). Lance le lint TOI-MÊME, avant toute autre
étape, et lis sa sortie réelle (c'est elle qui fait foi, jamais
ton résumé du plan) :

```bash
node <dossier-de-ce-skill>/scripts/preflight-lint.mjs <chemin-absolu-du-plan.html> <repo-cible> [--legacy]
```
<!-- /slot:etape0-run -->

<!-- slot:flotte-proof -->
Un run PASS enregistre sa preuve (contenu-adressée) dans `~/.claude/.flotte-lint-runs.json` (le même journal que côté Claude Code). Côté Codex, aucun hook d'arrêt ne vérifie cette preuve : avant de terminer une session qui a écrit ≥ 2 plans d'une même vague, relance `preflight-flotte.mjs` sur la vague et confirme son PASS dans ta réponse, avec la sortie réelle.
<!-- /slot:flotte-proof -->

<!-- slot:etape1-intro -->
Chaque round = un fan-out de sous-agents `spawn_agent`, un par lentille, lancés EN PARALLÈLE (rôle `review-hunter`, voir ci-dessus). Codex limite le nombre d'agents simultanés : lance-les par vagues, et si `spawn_agent` répond « agent thread limit reached », attends qu'un agent finisse puis relance celui qui a été refusé : une lentille n'est jamais abandonnée. `wait_agent` dit seulement qu'un agent a fini : tiens la liste de tes `task_name` et attends que chacun ait rendu sa réponse finale. Chaque message exige une réponse en JSON seul (findings structurés : titre, sévérité bloquant/majeur/mineur, zone du plan, détail, fix proposé). Chaque agent lit le plan EN ENTIER + le repo cible : vérifier dans le code avant d'affirmer, rendre une liste VIDE plutôt que des findings cosmétiques, ignorer ce qui est hors périmètre. Avant de lancer le moindre agent, vérifie que le chemin du plan et le repo cible sont renseignés et existent. Une réponse qui n'est pas du JSON valide se redemande à l'agent ; tu ne la complètes jamais toi-même.
<!-- /slot:etape1-intro -->
