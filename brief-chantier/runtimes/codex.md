Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:preflight-invoke -->
10. **Préflight obligatoire.** Invoque le skill `brief-preflight` en lui donnant,
    dans ta demande, `<chemin-absolu-du-plan.html>` et `<repo-cible>` (Codex
    n'exécute rien au chargement d'un skill et ne lui passe pas d'arguments :
    c'est `brief-preflight` qui te fait lancer le lint toi-même, en premier) : lint déterministe
<!-- /slot:preflight-invoke -->

<!-- slot:wait-subagents -->
   chez l'orchestrateur ». Quand tu attends un sous-agent (`spawn_agent`) :
   appelle `wait_agent` avec un `timeout_ms` fini, en boucle, jusqu'à ce que
   chaque agent lancé ait rendu sa réponse finale. `wait_agent` dit seulement
   qu'UN agent a fini (ou que le délai a expiré) : tiens la liste de tes
   `task_name` et ne tiens un agent pour rendu que lorsque sa réponse finale est
   dans ton fil. La boucle d'attente EST `wait_agent` : pas de polling à côté.
   Ne termine JAMAIS un tour en attente nue, avec un agent encore actif et sans
   réponse finale : son travail n'aurait plus personne pour le relire. Ne laisse
   pas le subagent committer :
<!-- /slot:wait-subagents -->

<!-- slot:flotte-hook -->
   **Ce n'est pas facultatif, et aucun hook ne l'impose à ta place :** il n'existe
   pas de hook d'arrêt Codex qui vérifie la preuve du lint de vague. Avant de
   terminer une session qui a écrit ≥ 2 plans partageant un `flotte-nom`, relance
   `preflight-flotte.mjs` sur la vague et confirme son PASS dans ta réponse, avec
   la sortie réelle. Un run PASS ne couvre que le contenu des plans au moment où
   il a tourné : rééditer un plan après coup le périme, donc relance-le après la
   dernière édition. Si le contrôle ne s'applique vraiment pas (plans d'exemple,
   vague déjà dispatchée), dis-le dans ta réponse avec la raison. Toute la
   logique vit dans le lint ; il n'y a aucun smoke test de hook à rejouer côté
   Codex.
<!-- /slot:flotte-hook -->

<!-- slot:goal-review-engine -->
   round vide, **menée par des SOUS-AGENTS `spawn_agent` parallèles** — c'est le
   seul moteur de revue sous Codex, donc rien à choisir ni à éviter pour un run
   NON SUPERVISÉ ; nomme-le quand même dans le goal prompt (`spawn_agent`,
   jamais « un workflow »), pour que l'instruction n'ait qu'une seule lecture), PR
<!-- /slot:goal-review-engine -->

<!-- slot:watchdog-tick -->
1. **Tick périodique (30-45 min)** — une boucle de `wait_agent` à `timeout_ms`
   fini, tenue tant qu'au moins un chantier n'a pas livré sa PR. À chaque retour
   de `wait_agent` (agent fini ou délai écoulé), et au moins toutes les 30-45 min,
   pour CHAQUE chantier : vérité disque du worktree (`git -C <worktree>
   log --oneline -1` + mtime des fichiers récents) comparée au dernier point
   connu, et l'agent a-t-il rendu sa réponse finale ou non. Si un chantier tourne
   dans une session que tu n'as pas lancée toi-même, il n'y a pas d'agent à
   attendre : seul le disque fait foi. Écris la consigne de surveillance
   COMPLÈTE (chantiers, worktrees, quoi vérifier, quand relancer) en tête du
   journal de surveillance (item 4) et relis-la à chaque tick : ne compte pas sur
   le présent skill pour la retrouver après une compaction du contexte (une
   session-orchestrateur nocturne compacte).
<!-- /slot:watchdog-tick -->
<!-- slot:watchdog-relance -->
2. **Disque immobile + agent sans réponse finale = mort.** Relance avec l'état
   exact vérifié sur disque : si ta session expose un outil pour écrire à un
   agent en cours, envoie-lui cet état ; sinon lance un nouvel agent dont le
   message porte l'état exact (commits présents, travail non commité vu par
   `git status` / `git diff` dans le worktree, verdicts de revue déjà reçus) et
   la consigne de continuer depuis là — jamais « reprends » à vide.
<!-- /slot:watchdog-relance -->
