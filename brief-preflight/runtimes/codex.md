Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:models -->
- **Les 7 lentilles** tournent TOUJOURS en sous-agents `spawn_agent`
  (`task_name: "lentille-<nom>"`, `agent_type: "default"`, `fork_turns: "none"`)
  dont le modèle et l'effort viennent du rôle `review-hunter`, résolu au moment
  de l'usage par le résolveur du skill adversarial-pr-review :
  `node ~/.agents/skills/adversarial-pr-review/scripts/resolve-codex-models.mjs --repo <repo-cible>`
  (fichier de routage du repo, puis `~/.codex/model-routing.json`, puis modèle
  de la session). Si ce fichier n'existe pas, lis toi-même
  `roles["review-hunter"]` dans `<repo-cible>/.codex/model-routing.json` puis
  dans `~/.codex/model-routing.json`, sinon garde le modèle de la session, et
  dis dans ta réponse que le résolveur manquait. Passe toujours `model` ET `reasoning_effort` : un sous-agent
  sans effort hérite de celui de la session, plus élevé. Jamais au-dessus de
  `high` pour un sous-agent, et jamais de nom de modèle écrit dans ce skill.
- **Le triage** (étape 2) reste au modèle de la SESSION — c'est voulu : le
  jugement des findings et la correction du plan reviennent au modèle fort
  qui fait l'authoring.
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
**Ce lint n'est pas laissé à la mémoire de l'orchestrateur.** Un run PASS
enregistre sa preuve (contenu-adressée) dans `~/.claude/.flotte-lint-runs.json`
(le même journal que côté Claude Code). Côté Codex, aucun hook d'arrêt ne
vérifie cette preuve : avant de terminer une session qui a écrit ≥ 2 plans
d'une même vague, relance `preflight-flotte.mjs` sur la vague et confirme son
PASS dans ta réponse, avec la sortie réelle. Motif : une vague se prépare pour
un run nocturne, sans personne pour se souvenir de lancer quoi que ce soit —
c'est exactement ainsi que la règle du message de commit a été ratée par 2
chantiers sur 5 alors qu'elle était écrite dans le standard.
<!-- /slot:flotte-proof -->

<!-- slot:etape1-intro -->
Chaque round = un fan-out de 7 sous-agents `spawn_agent` lancés EN PARALLÈLE
(rôle `review-hunter`, voir « Modèles »), puis `wait_agent` sur tous. Chaque
message exige une réponse en JSON seul, au schéma de findings structuré :
titre, sévérité bloquant/majeur/mineur, zone du plan, détail, fix proposé.
Chaque agent lit le plan EN ENTIER + le repo cible, et a pour consigne :
vérifier dans le code avant d'affirmer, rendre une liste VIDE plutôt que des
findings cosmétiques, ignorer ce qui est déclaré hors périmètre. Avant de
lancer le moindre agent, vérifie que le chemin du plan et le repo cible sont
renseignés et existent — 4 rounds (~800 k tokens) ont déjà tourné sur « Plan à
analyser : undefined » faute de cette garde. Une réponse qui n'est pas du JSON
valide se redemande à l'agent ; tu ne la complètes jamais toi-même.
<!-- /slot:etape1-intro -->
