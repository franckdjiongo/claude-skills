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
   jamais « un workflow »), pour que l'instruction n'ait qu'une seule lecture, PR
<!-- /slot:goal-review-engine -->

<!-- slot:watchdog-tick -->
1. **Tick périodique (30-45 min)** — tant qu'au moins un chantier n'a pas livré
   sa PR, une minuterie est armée en permanence : l'automatisation heartbeat de
   la session (`automation_update`) si elle est disponible, sinon `sleep` (outil
   `clock`) entre deux ticks — jamais une fin de tour sans minuterie armée.
   Écris d'abord la consigne de surveillance COMPLÈTE (chantiers, worktrees,
   quoi vérifier, quand relancer) dans un FICHIER, en tête du journal de
   surveillance : `<repo-cible>/.worktrees/.surveillance-<vague>.md` (hors de
   tout worktree de chantier) ; recopie-la aussi dans le message du heartbeat
   s'il existe. Relis ce fichier à chaque tick : c'est lui, pas le présent
   skill, qui survit à une compaction du contexte (une session-orchestrateur
   nocturne compacte). À chaque tick, pour CHAQUE chantier : vérité disque du
   worktree (`git -C <worktree> log --oneline -1` + mtime des fichiers récents)
   comparée au dernier point connu, et état de l'agent (`list_agents` : en cours,
   ou terminé avec sa réponse) s'il a été lancé par toi. Un retour de
   `wait_agent` n'est pas un tick : ne refais la vérification disque que si 30 min
   au moins se sont écoulées depuis la précédente (sinon c'est du polling). Si
   un chantier tourne dans une session que tu n'as pas lancée, il n'y a pas
   d'agent à interroger : seul le disque fait foi, et c'est la minuterie qui
   produit le tick.
<!-- /slot:watchdog-tick -->
<!-- slot:watchdog-relance -->
2. **Disque immobile + agent absent de `list_agents` ou non « running » =
   mort.** Un agent encore « running » mais silencieux (long `validate`, longue
   réflexion) n'est PAS mort : relance-le avec `followup_task` (ou
   `send_message`) vers son `task_name`, en lui donnant l'état exact vérifié sur
   disque. Pour un agent mort : si tu dois le remplacer, `close_agent` d'abord
   (jamais deux agents sur le même worktree), puis `spawn_agent` avec un message
   qui porte l'état exact (commits présents, travail non commité vu par
   `git status` / `git diff` dans le worktree, verdicts de revue déjà reçus) et
   la consigne de continuer depuis là — jamais « reprends » à vide. Chantier dans
   une session que tu n'as pas lancée : tu ne peux ni le fermer ni le relancer —
   escalade à l'utilisateur avec l'état disque.
<!-- /slot:watchdog-relance -->
