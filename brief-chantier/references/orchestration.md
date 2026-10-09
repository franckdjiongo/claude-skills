# Rôle ORCHESTRATEUR — détails des phases

Complète `SKILL.md` § Orchestrer une flotte. Rôle AUTEUR par plan (une fiche par chantier), exécution
EXÉCUTANT par session, règles A1 à A5, G et L inchangées pour chaque chantier.

## Phase 1 — Inventaire et regroupement

- `bun run chips list` + `chips read <id>` pour CHAQUE chip du périmètre ; regroupe en 3 à 5 chantiers
  FILE-DISJOINTS, ~4 sessions parallèles au plus.
- Surface d'ÉDITION = fichiers modifiés, vérifiés par grep, pas devinés : lire une API n'est pas un
  chevauchement, l'éditer en est un. Chaque plan liste ses « Fichiers touchés » et déclare `Dépend de`
  (`<slug>` ou `aucun`) ; deux chantiers qui éditent le même fichier sont fusionnés en un seul ou ordonnés.
- Un socle (chantier dont d'autres dépendent) ne se justifie que si les conflits évités coûtent plus qu'une
  fusion par l'orchestrateur. Son contrat vit dans son code (types, signatures, tests) ; les plans qui en
  dépendent y renvoient. Sa fiche, sans effet visible, nomme ses consommateurs et ce qu'ils appellent.
- Au-delà de ~4 sessions parallèles, la contention CPU produit des flakes de test.

## Phase 2 — Briefs

- Baseline verte UNE fois, citée dans les N plans ; rôle AUTEUR complet pour chacun. Une fiche d'intention par chantier. L'orchestrateur possède les fichiers partagés (README, index,
  registres) : les chantiers n'y touchent pas, il les met à jour à la clôture.
- Les préflights des N plans peuvent tourner en parallèle (un fan-out par plan).
- **Plages d'identifiants.** Un compteur global alloué par script (identifiants de backlog, migrations, IDs de
  règle) est aveugle aux branches sœurs : lis-le UNE fois, réserve une plage par chantier, écris-la dans
  chaque plan.
- **Lint de vague.** Décommente `s-flotte` dans chaque plan : nom de la vague (`flotte-nom`), chantiers
  frères (`flotte-freres`), plage réservée (`plage-ids`, `N-M` ou « aucun compteur global »), ligne de TOC.
  Avant tout dispatch : `node preflight-flotte.mjs <répertoire-des-plans> [--depuis <N>]` (script de
  `brief-preflight`). Il échoue sur un plan sans section flotte, une collision de plages, des noms de vague
  divergents, une plage sous `--depuis`, ou un fichier touché par deux chantiers sans `Dépend de`.
- **Branches.** Chaque chantier : worktree `.worktrees/<slug>` (gitignoré), branche `<type>/<slug>`. Une vague
  a sa branche `integration/<thème>` dans son propre worktree : les chantiers en partent, leurs PRs la ciblent, et
  sa PR seule cible main/master. Chaque plan documente aussi la dérogation au verrou night-run (reaper
  au démarrage) et l'ordre de merge.
- **Pré-vol des hooks bloquants.** Smoke-teste UNE fois chaque hook qui garde les chantiers (garde de PR,
  garde de commit) depuis un worktree jetable : il doit résoudre HEAD, git-dir et cwd du WORKTREE. Hook
  cassé = corrige-le avant de lancer la flotte.

## Phase 3 — Goal prompts

Un bloc par chantier, collable verbatim dans une session neuve. Un goal prompt énonce un OBJECTIF et une
CONDITION D'ARRÊT vérifiable (plan exécuté au rôle EXÉCUTANT, PR ouverte ou rapport livré, vérifications
vertes) ; jamais une méthode pas à pas, le plan et les règles dures la portent. Il nomme le plan, le worktree,
la branche et le modèle recommandé (alias résolu à l'usage, jamais un nom daté). Revue menée par des
SOUS-AGENTS parallèles. Chaque goal prompt contient verbatim ces deux clauses :

- **Interdiction absolue de fabriquer une sentinelle de revue.** Le fichier `.adversarial-review-passed` (ou
  tout autre témoin de gate) n'est posé QUE par le flow légitime du skill de revue, depuis le worktree avec
  un `cd` explicite, jamais à la main, jamais dans le `.git` partagé du repo principal. Un hook gate qui
  bloque alors que la revue a convergé sur ce HEAD exact est un échec d'INFRA : arrêt-et-chip et remontée à l'orchestrateur.
- **Heartbeat.** À chaque fin de lot, envoie un statut à l'orchestrateur par l'outil de message de ta
  session : un chantier silencieux est indistinguable d'un chantier mort.

## Phase 3bis — Watchdog

Règles communes : `watchdog.md`. Mécanique Codex (heartbeat, fichier de surveillance, relance) : `watchdog-codex.md`.

## Phase 4 — Clôture

- **Revue avant merge.** Baseline verte avant le premier merge. Lis les rapports hub et chaque PR : sentinelle
  de revue présente (pas de merge sans elle), décisions A2, chiffres de finalize, lignes retirées par le simplificateur. Recoupe les fichiers de
  doublures de test déclarés par chaque rapport ; un fichier cité par deux chantiers impose un ordre de
  fusion explicite. Spot-checke par lecture directe les invariants les plus porteurs.
- **Intégration par PR, jamais par merge local poussé.** Dans l'ordre documenté, chaque PR de chantier est
  mergée avec `ship-pr` (en la nommant) vers sa base : `integration/<thème>`, ou la branche par défaut pour un
  chantier seul. Puis `integration/<thème>` ouvre sa propre PR vers main/master, relue et mergée de la même
  façon : la revue de PR ne voit pas un merge poussé. Typecheck après CHAQUE merge (checkpoint
  de `ship-pr`). Avant la PR finale : main/master mergé dans `integration/<thème>`, puis gates COMPLETS sur cette
  branche : le « vert » des PRs n'est qu'auto-déclaré. Jamais de `git merge` local suivi d'un `git push` sur
  main/master.
- **Redéploiement** selon le dépôt si le code serveur a bougé, puis une vérification qui prouve que le NOUVEAU
  code est servi (appelle une route ajoutée par le run).
- **Nettoyage garanti** : worktrees retirés puis `prune`, branches locales ET distantes supprimées, plans HTML
  commités dans `docs/plans/`. Puis session review honnête et capture brain/frictions.
