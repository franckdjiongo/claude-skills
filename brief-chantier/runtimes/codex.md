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
1. **Tick périodique (30 min)** — la minuterie est le heartbeat de la session :
   `automation_update` avec `mode:"create"`, `kind:"heartbeat"`,
   `name:"surveillance-<vague>"`, `status:"ACTIVE"`, `destination:"thread"`,
   `rrule:"FREQ=MINUTELY;INTERVAL=30"` (à ne pas confondre avec le « Heartbeat »
   de statut que chaque chantier envoie, Phase 3), armé tant qu'au
   moins un chantier n'a pas livré sa PR. Son `prompt` est un pointeur, pas une
   copie : « Relis `<repo-cible>/.worktrees/.surveillance-<vague>.md` et exécute
   le tick de surveillance ». Ce fichier est la seule source de la consigne
   COMPLÈTE (chantiers, worktrees, quoi vérifier, quand relancer) et le journal
   de l'item 4 (une ligne par chantier et par tick, ajoutée à la fin) : crée-le
   hors de tout worktree de chantier, arme le heartbeat, puis inscris dans
   l'en-tête du fichier l'`automationId` rendu par la création et ajoute une
   première ligne de journal datée « armement » (référence du premier tick) ; chaque
   ligne de journal est datée au DÉBUT du tick ; si
   `git -C <repo-cible> check-ignore -q .worktrees/x` échoue, ajoute
   `.worktrees/` à `.git/info/exclude` d'abord. Relis-le à chaque tick : c'est
   lui qui survit à une compaction du contexte. Pas de heartbeat disponible
   (`automation_update` absent) : dis-le à l'utilisateur au lancement — il n'y
   aura pas de tick sans surveillance humaine — et n'utilise jamais `sleep`
   comme minuterie (il ne dure que quelques dizaines de secondes : ce serait du
   polling). À chaque tick, pour CHAQUE chantier : vérité disque du worktree
   (`git -C <worktree> log --oneline -1` + mtime des fichiers récents)
   comparée au dernier point connu, et état de l'agent (`list_agents`) s'il a
   été lancé par toi. Le heartbeat n'arrive que lorsque ton tour est terminé :
   tant que tu attends tes propres agents dans une boucle `wait_agent`, c'est
   elle qui porte le tick — à chaque appel, `timeout_ms` = 30 min moins le temps
   écoulé depuis la dernière ligne du journal (minimum 10000), pour que le
   prochain retour tombe au plus tard 30 min après elle ; un retour compte
   comme tick si ces 30 min sont écoulées, sinon ce n'est pas un tick et tu ne
   refais pas la vérification disque (ce serait du polling). Un réveil du
   heartbeat est toujours un tick, sauf s'il tombe juste après un tick de
   `wait_agent` (heartbeat différé pendant le tour) : un tick est sauté, sans
   vérification complète, si la dernière ligne du journal a moins d'1 min. Avant
   de terminer un tour tu fais un tick si la dernière ligne du journal a 30 min
   ou plus. Seule exception hors tick : la vérification
   post-relance de l'item 3 (`wait_agent` sur l'agent relancé, `timeout_ms` =
   le plus petit de 600000 et du délai restant avant le prochain tick, soit
   (heure de la dernière ligne du journal + 30 min) − maintenant, plancher
   10000 ms), qui n'écrit de ligne au journal que si elle tombe aussi sur un
   tick. Le tick suivant ne relance jamais un agent relancé il y a moins de
   10 min : une relance proche de la limite des 30 min ne reçoit qu'une courte
   attente post-relance, ce n'est pas un silence. Dès que tous les chantiers ont livré leur PR, ou si le
   run est abandonné, supprime le heartbeat (`automation_update` avec
   `mode:"delete"` et `id` = l'`automationId` noté dans le fichier). Si la
   session orchestratrice a disparu sans le faire, la session de clôture
   (Phase 4) le supprime avec cet `id` ; si l'outil le refuse depuis une autre
   session, elle le signale à l'utilisateur. Cette session de clôture supprime le
   fichier de surveillance en tout dernier, après sa session review, qui lit
   le journal pour mesurer le temps par chantier.
<!-- /slot:watchdog-tick -->
<!-- slot:watchdog-relance -->
2. **Lis l'état de l'agent avant de conclure** (`list_agents`, champ
   `agent_status` ; `completed` et `errored` arrivent comme objets portant la
   réponse ou l'erreur) : `running` ou `pending_init` = vivant, même silencieux
   (long `validate`, longue réflexion) — relance-le par `followup_task` (ou
   `send_message`) vers son `task_name` avec l'état exact vérifié sur disque ;
   `completed` = lis d'abord sa réponse finale, puis `followup_task` si le
   travail n'est pas fini ; `interrupted`, `errored` ou absent avec un disque
   immobile = mort — `followup_task` s'il existe encore (il garde son
   contexte), sinon `close_agent` puis `spawn_agent` (jamais deux agents sur le
   même worktree). Tout message de relance porte l'état exact (commits
   présents, travail non commité vu par `git status` / `git diff` dans le
   worktree, verdicts de revue déjà reçus) et la consigne de continuer depuis
   là — jamais « reprends » à vide. Erreur « agent thread limit reached » :
   `close_agent` les agents `completed` dont tu as lu la réponse, puis
   réessaie. Chantier lancé dans une session que tu n'as pas ouverte (cas
   courant : goal prompt collé par l'utilisateur) : tu ne peux ni le fermer ni
   le relancer — la surveillance se limite à détecter et à escalader à
   l'utilisateur avec l'état disque.
<!-- /slot:watchdog-relance -->
