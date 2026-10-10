# Fiche d'intention — Retrait de meta-govern

Validée par : Franck, 2026-10-09 (en chat : « Vas-y exécute le tout … travaille de manière autonome jusqu'à la fin », réponse à la liste A1 à A5 de l'analyse du même soir). Jetable (supprimée au dernier lot), `.chantier/retrait-meta-govern/intention.md`.

## Pourquoi

meta-govern ne sert plus : 3 appels en un mois, tous pour l'entretenir, aucun audit. Les 11 projets gouvernés sont tous en retard de version, les copies installées dans chaque projet ont divergé, et le skill existe en quatre copies à synchroniser. Il contredit la doctrine de Franck (instructions courtes, scripts qui portent la procédure, une source unique dans claude-skills). Seuls deux contrôles ont encore de la valeur : le coût Convex et les noms de modèles datés.

Demande de l'humain (citation exacte) : « Vas-y exécute le tout ». Le tout désigne A1 à A5 :
- A1 « Sortir les contrôles Convex dans un script autonome, branché dans le validate des projets Convex. »
- A2 « Ajouter la détection des noms de modèles datés à lint-skills.mjs. »
- A3 « Retirer le hook de démarrage meta-govern et sa liste d'exclusions. »
- A4 « Mettre à jour les renvois, côté Claude et côté Codex. »
- A5 « Archiver le repo sur GitHub (sans le supprimer), puis retirer les quatre copies et les 2 agents restants. »

## La journée de l'utilisateur (ou du script) avant / après

Avant : chaque session dans un projet gouverné reçoit un rappel « meta-govern en retard ». Les contrôles Convex ne tournent que pendant un audit que personne ne lance. Les agents lisent des renvois vers des fichiers meta-govern.

Après : plus de rappel. Le `validate` de chaque projet Convex lance `convex-checks.mjs` (source unique dans claude-skills) et échoue sur toute nouvelle infraction (cron sans justification, test contre un vrai déploiement, cast sur les arguments d'une mutation). Les infractions existantes sont listées dans une baseline par projet et remontées à Franck. `node scripts/lint-skills.mjs` signale les noms de modèles datés. Aucun fichier vivant ne pointe vers meta-govern. Le repo meta-govern est archivé sur GitHub.

## Ce que ce chantier n'est PAS

- Pas de correction des infractions Convex existantes (casts, crons, tests) : elles vont dans la baseline et dans le rapport.
- Pas de retrait des fonctions de la workstation qui lisaient meta-govern (état des projets, campagnes de migration, registre d'architecture) : elles se replient déjà quand meta-govern est absent. Leur suppression est une décision de Franck.
- Pas de retrait des autres skills du gabarit (write-plan, test-driven-development, brainstorm…) dans les projets, sauf la ligne qui pointe vers meta-govern.
- Pas de réécriture des documents historiques (docs/audits, docs/plans, journaux, index d'audits) ni des commentaires de provenance.
- Aucun changement dans temps-chantier-code-app ni TempsChantier (consigne de Franck), ni dans brillance-d-cor-inc (branche non fusionnée dans son checkout principal) et home-spectors (gelé, sans accès gh).
- Pas de contrôle Convex en CI ni en session cloud : sans claude-skills sur la machine, le contrôle s'annonce sauté.
- Pas de garde Convex dans les projets Convex jamais gouvernés (boussole, cobacam-management, portfolio-website) : A1 vise les projets qui perdent l'audit meta-govern.
- Pas de suppression de branche : les branches fusionnées attendent la confirmation de Franck.

## Ce qui prouve la livraison

1. `node <claude-skills>/scripts/convex-checks.mjs` dans chaque projet Convex sort 0 avec sa baseline, et 1 quand on ajoute un cron non justifié dans une copie jetable.
2. `git grep` des pointeurs (`skills/meta-govern`, `.meta-govern.json`, `govern-claude`, `govern-codex`) hors historique ne trouve rien dans les dépôts traités. Exception : la workstation garde ses propres skills govern-claude et govern-codex, et seuls leurs renvois à meta-govern partent.
3. Une nouvelle session ne reçoit plus le rappel meta-govern, et `~/.claude/settings.json` reste un JSON valide.
4. L'API de prod de la workstation (5179) répond sur l'état des projets après le retrait du dossier meta-govern.

## Règles du chantier

- Budget total : 600 / 1000 lignes ajoutées (code + tests + scripts), sur tout le run.
- Chips : autorisés.
