# Nuits planifiées : sessions locales programmées et routines cloud

Pour lancer l'exécution d'un plan à une heure donnée. Le commit, les gates humains et le nom de branche d'un
run cloud restent dans `commits-et-cloud.md`. Ici : le planning et le pré-vol.

## Local ou cloud

« Cette nuit » sans lieu précisé : demande local ou cloud. File d'items en local : `loop-autonomy`.
Session locale à heure fixe (app Desktop ouverte, machine allumée) : `mcp__scheduled-tasks__create_scheduled_task`.
Cloud (routine cloud via `RemoteTrigger`, machine éteinte possible) : section Cloud plus bas.

## Session locale programmée

- Le prompt est auto-suffisant : la session démarre sans historique. Il nomme le plan, la branche, les agents et
  modèles par groupe, la commande de vérification, les règles du CLAUDE.md du repo.
- Les exigences périphériques (gitignore, docs, redeploy) vont dans la liste d'acceptation du lot, pas en prose :
  la prose se fait sauter.
- `fireAt` en ISO 8601 avec décalage horaire. Budget de durée : estimation du contenu x 1,5, pas 5 h par défaut.
- Un lot partiel exécute les checks du lot ; la clôture complète (`typecheck && build && test…`)
  appartient au DERNIER lot. Le prompt écrit laquelle est REQUISE.
- Anti-chevauchement DANS le prompt, jamais seulement dans les horaires : au rattrapage après sommeil de la
  machine, toutes les tâches en retard partent ensemble. Démarrage : `sh ~/.claude/scripts/night-run-reaper.sh`
  puis `~/.claude/scripts/night-run-lock.sh acquire <id>` (verrou tenu et frais : écrire dans HANDOFF.md et
  sortir sans toucher au repo ; verrou périmé : récupérer le travail non commité avant de le reprendre). `touch`
  pendant le travail. Sortie, y compris en échec : `release` et arrêt de tout serveur dev lancé.
- Chaînage sur fin de tâche (`update_scheduled_task` avec `fireAt` = maintenant + 5 min) : optimisation de
  latence seulement. L'approbation de l'outil ne se contourne pas, même en bypass. Les `fireAt` de repli
  espacés sont la vraie garantie. Une session lancée par une tâche programmée ne ré-arme pas.
- Dire à l'utilisateur de pré-accorder les permissions (bypass ou un « Run now » test) et, après toute édition
  manuelle de la tâche, de vérifier que `fireAt` et `enabled` ont survécu.

## Cloud : pré-vol

Refuse d'armer si une vérification bloquante échoue et ne se répare pas sur le champ.

1. Remote GitHub joignable et état de départ commité ET poussé (le cloud ne voit pas le working tree).
2. Commande de vérification déterministe (exit 0/1, sans interaction). MESURE-la une fois avec
   `/usr/bin/time -p` : les secondes-CPU (`user`+`sys`) se transportent, le wall-clock non. Un conteneur
   donne 2-3 cœurs lents : wall cloud ≈ CPU / 2,5 x 1,8. Sous 2 min estimées : rien dans la charte. Au-dessus,
   la charte porte un `timeout` explicite, la durée mesurée et « cette durée est normale, ce n'est pas une
   panne » (le défaut de l'outil Bash est 2 min).
3. Environment cloud existant pour ce repo : `RemoteTrigger list`, réutiliser `job_config.ccr.environment_id`
   d'un trigger du même `sources[].git_repository.url`. Sinon, l'utilisateur en crée un via l'UI.
4. Dossier gitignoré indispensable au build (SDK généré…) : branche-navette orpheline `cloud/<nom>-snapshot`
   publiée par plumbing git (`GIT_INDEX_FILE` temporaire, `add -f`, `write-tree`, `commit-tree`, `push -f`),
   restaurée dans la charte par `git restore --source=origin/cloud/<nom>-snapshot --worktree -- <dir>`. Le
   rafraîchissement après chaque régénération est documenté dans le repo. Aucun secret par navette.
5. Étapes impossibles sans humain (QA authentifiée, approbation produit) : gates `[GATE-HELD]`. Si le coeur de
   la mission en dépend, la mission n'est pas cloud-able.

## Cloud : chartes et triggers

- Une charte par run : une mission, un livrable vérifiable, un abort propre si la précondition manque,
  bootstrap (`npm ci`, navette, typecheck) avant la mission. Pas plus de 3 runs chaînés la première nuit
  d'un projet.
- Le message d'un trigger est figé à la création : la charte dit « lis ce fichier du repo EN ENTIER et
  applique-le ». Les invariants communs vivent dans UN fichier de règles du repo, ce qui rend une chaîne déjà
  armée corrigeable sans ré-armer.
- Précondition d'un run N+1 : testée contre le dépôt avant l'armement, sur ce que l'amont produit réellement
  (convention de message de commit), jamais sur ce que son plan annonce.
- Pas d'outil workflow multi-agents dans un run non supervisé : la charte nomme des sous-agents parallèles.
- Trigger : `RemoteTrigger create` avec `run_once_at` (UTC, jamais un cron détourné) et `job_config.ccr`
  (`environment_id`, `events[0].data.message.content` = la charte, `session_context.sources` avec
  `allow_unrestricted_git_push`, `outcomes` avec la branche attendue). L'API n'est pas documentée : si `create`
  rejette le body, fournis la charte prête à coller pour une routine créée dans l'UI. Convertis l'heure locale en
  UTC et montre l'heure parsée par le serveur pour confirmation. Espace les runs de 2-4 h ; le filet reste la
  précondition d'abort.
- Lancement immédiat : create sans planning (`enabled: false`) puis `run`. `update` est partiel.

## Matin

1. Session locale de vérification indépendante, sans rien modifier : relancer la commande de vérification,
   comparer les claims des rapports aux faits.
2. Faire les validations humaines en attente (`git log --grep GATE-HELD`).
3. Intégrer la branche de travail par une PR vers une branche intermédiaire (`gh pr merge`), jamais directement vers master avant la QA live ; l'intermédiaire rejoint master par une PR mergée comme en phase 4 de `orchestration.md`.
4. `RemoteTrigger list` : chaque one-shot doit montrer `ended_reason: run_once_fired` et `enabled: false`.
   Aucun trigger actif non désiré ne reste.
