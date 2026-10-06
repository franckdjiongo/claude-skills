# Rôle ORCHESTRATEUR — détails des phases

Complète `SKILL.md` § Orchestrer une flotte. Rôle AUTEUR par plan (fiche d'intention incluse), exécution
EXÉCUTANT par session, règles A1 à A5 et G inchangées pour chaque chantier.

## Phase 1 — Regroupement

- Surface d'ÉDITION de chaque item = fichiers modifiés, vérifiés par grep, pas devinés. Lire une API n'est
  pas un chevauchement ; l'éditer, si. Deux chantiers qui éditent le même fichier ont un ORDRE DE MERGE
  documenté dans les deux plans.
- Respecte les exclusions explicites de l'utilisateur. Au-delà de ~4 sessions parallèles, la contention CPU
  produit des flakes de test dans la majorité des sessions.

## Phase 2 — Briefs

- Les rounds de préflight des N plans peuvent tourner en parallèle (un fan-out par plan, lentilles au
  niveau d'effort prévu par `brief-preflight`, jamais au modèle de la session).
- **4bis, plages d'identifiants.** Tout compteur global alloué par script au moment de l'écriture
  (identifiants de backlog, numéros de migration, IDs de règle) est aveugle aux branches sœurs non
  fusionnées : N chantiers partis du même socle reçoivent le même numéro. Lis le compteur UNE fois,
  réserve une plage par chantier (ex. A : 121-130, B : 131-140) et écris-la dans chaque plan. À défaut, le
  plan du run d'intégration contient un lot de détection et de renumérotation des collisions.
- Forme imposée (lint check 9) : décommente la section `id="s-flotte"` du gabarit (§02b) et remplis nom de
  la vague (`<span class="flotte-nom">`), chantiers frères (`<ul class="flotte-freres">`, ≥ 1 `<li>`),
  plage réservée à CE chantier (`<code class="plage-ids">`, `N-M` ou « aucun compteur global »), plus la
  ligne de TOC. Un plan solo supprime la section et sa ligne de TOC.
- Le lint mono-plan constate qu'une plage est déclarée, jamais qu'elle est disjointe. La disjonction se
  vérifie en prenant les plans ensemble, obligatoirement avant tout dispatch :
  `node preflight-flotte.mjs <répertoire-des-plans> [--depuis <N>]` (script du skill `brief-preflight`).
  Il échoue sur : un plan de la vague sans section flotte, une collision de plages, des noms de vague
  divergents, une plage sous le plancher `--depuis` (valeur du compteur lue UNE fois sur main).
- Chaque plan contient aussi : branche `chantier/<slug>`, worktree gitignoré, dérogation documentée au
  verrou night-run (reaper au démarrage, relance unique d'une suite qui flake seule), ordre de merge,
  « redeploy requis après merge » si le code serveur est touché.
- **5bis, pré-vol des hooks bloquants.** Chaque hook gate sur le chemin des chantiers (garde de PR de revue,
  garde de commit) se smoke-teste UNE fois depuis un worktree jetable : il doit résoudre HEAD, git-dir et
  cwd du WORKTREE, pas du repo principal. Un hook incompatible worktree bloque N chantiers au même endroit
  et pousse chaque agent à contourner. Hook cassé = corrige le hook avant de lancer la flotte.

## Phase 3 — Goal prompts

Un bloc par chantier, collable verbatim dans une session neuve. Contenu : modèle et effort recommandés
(résolus à l'usage, jamais un nom de modèle daté), création du worktree et de la branche, exécution du plan au
rôle EXÉCUTANT, revue A3 (2 rounds au plus, round 2 sur le delta, gardien après chaque round et avant la
PR), menée par des SOUS-AGENTS parallèles (jamais un moteur de revue qui redemande une confirmation humaine à
chaque lancement), PR sans merge de l'exécutant, rapport dans la conversation hub du plan, chips clos ou
créés (si autorisés), hygiène machine. Un goal prompt énonce un objectif et une condition d'arrêt
vérifiable, jamais une méthode pas à pas. Chaque goal prompt contient verbatim ces deux clauses :

- **Interdiction absolue de fabriquer une sentinelle de revue.** Le fichier `.adversarial-review-passed` (ou
  tout autre témoin de gate) n'est posé QUE par le flow légitime du skill de revue, depuis le worktree avec
  un `cd` explicite, jamais écrit à la main, jamais dans le `.git` partagé du repo principal. Si un hook
  gate bloque alors que la revue a eu lieu, c'est un échec d'INFRA : arrêt-et-chip et remontée à
  l'orchestrateur. Contourner un garde-fou est un incident de sécurité.
- **Heartbeat.** Au minimum à chaque fin de lot, envoie un statut à l'orchestrateur par l'outil de message
  de ta session : un chantier silencieux est indistinguable d'un chantier mort.

## Phase 4 — Clôture

- **Revue avant merge.** Baseline verte sur main (typecheck + build + test) AVANT le premier merge. Lis les
  rapports hub des N sessions et la description de chaque PR. Recoupe les fichiers de doublures de test que
  chaque rapport déclare : hors listes, ils échappent au contrôle de disjonction ; un fichier cité par deux
  chantiers impose un ordre de fusion explicite. Vérifie la sentinelle de revue (pas de merge sans elle),
  les décisions A2 et le verdict du gardien de chaque PR ; spot-checke par lecture directe les invariants
  les plus porteurs de chaque plan.
- **Merge local** dans l'ordre documenté (`git merge --no-ff`, message « Merge pull request #N … »), avec au
  minimum un typecheck après CHAQUE merge, puis gates COMPLETS sur le main intégré AVANT de pousser : c'est
  la première fois que les N diffs coexistent et le « vert » des PRs n'est qu'auto-déclaré.
- **Redéploiement** si le code serveur a bougé, puis vérification santé qui prouve que le NOUVEAU code est
  servi (appelle une route ajoutée par le run, pas seulement la racine).
- **Nettoyage garanti** : worktrees retirés puis `prune`, branches locales ET distantes supprimées, plans
  HTML commités dans `docs/plans/` du main. Puis session review honnête (rounds, écarts, temps par chantier)
  et capture brain/frictions.
