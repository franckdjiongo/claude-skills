---
name: brief-chantier
description: |
  Standard for autonomous-execution work plans ("plans de chantier"). Three roles: AUTHOR a plan
  (an HTML plan that a lesser model or a future session can execute with zero memory of the current
  conversation), EXECUTE a plan (lot by lot, with verification gates), ORCHESTRATE a fleet (turn a
  batch of chips into file-disjoint chantiers executed in parallel in git worktrees, then
  merge/deploy/clean up). Use whenever the user asks to write/découper a "plan de chantier",
  "brief-chantier", "plan de finition", "liste de finition", a plan for "runs nocturnes" / "run
  autonome" / "exécution autonome", or to EXECUTE such a plan ("exécute le plan docs/plans/….html").
  ALSO use — role ORCHESTRATEUR — to execute a BATCH of chips/tasks as chantiers ("exécute les 12
  chips de tel projet", "chantiers parallèles", "exécute ça dans les worktrees") or to merge/close a
  finished parallel run. Also use when another skill says a development plan must follow "le
  standard brief-chantier". Development plans only: one-shot documents are out of scope.
---

# Brief-chantier — plans d'exécution autonome

Un plan remplace la mémoire de la session qui l'a conçu : un modèle moindre doit pouvoir l'exécuter sans
personne pour répondre. Détermine ton rôle :

- **AUTEUR** : on te demande d'écrire/découper un plan → § Écrire un plan.
- **EXÉCUTANT** : on te donne un plan à exécuter → § Exécuter un plan.
- **ORCHESTRATEUR** : exécuter un LOT de chips « en chantiers » / « en parallèle », ou clôturer un run
  parallèle → § Orchestrer une flotte.

## Règles dures (les trois rôles ; aucun plan ne les assouplit)

- **A1 Budget total.** Par chantier : lignes ajoutées de code + tests + scripts ; suppressions, fichiers
  générés, README et docs ne comptent pas. La cible est proportionnée au chantier, le plafond ≤ 1 000 ; au-delà, découper. Ratio tests/code > 2 :
  justifier ; > 4 : découper ou accord humain ; non applicable sous 50 lignes de code.
- **A2 Chips et décisions.** Chaque plan déclare `Chips : autorisés` ou `Chips : interdits`. Une décision par
  remarque (CORRIGER, CHIP si autorisés, NE PAS CORRIGER, INVALIDE) selon la règle 2 de
  `adversarial-pr-review` ; jamais « tout corriger, y compris les mineurs ».
- **A3 Revue à la clôture seulement, 2 rounds au plus**, aucune relecture par lot, non contournable par un
  plan. Round 2 = delta. Après, le chantier TERMINE (étape Clôture). Le run ne s'arrête jamais pour attendre.
- **A4 Un comportement se teste une fois**, au niveau le plus proche de l'utilisateur ou du consommateur,
  après exécution réelle de la preuve de la fiche (dry-run, sandbox, app en local). Un socle sans effet
  visible se prouve avec un consommateur jetable, de bout en bout.
- **A5 Disjoncteur.** Un lot au double de son estimation en lignes, ou un chantier au-delà de son plafond :
  arrêt, état propre commité, rapport. La revue n'a lieu que si un lot à effet visible est commité. Un
  dépassement moindre se consigne, le run continue. Revenir sous le plafond = retirer du code AVEC son test.
- **G Fiche d'intention + gardien.** Fiche d'1 page, jetable (`assets/fiche-intention.md`, EN :
  `assets/intent-sheet.md`), écrite avec l'humain et validée avant le plan. Le gardien
  (`references/gardien-intention.md`) est appelé après chaque round et avant la PR ; il ne peut que retirer du travail.
- **L Langue.** Plan et fiche dans la langue du projet (FR ou EN) ; le contrat de commit
  `chantier(<slug>): lot N` ne change pas.

## Écrire un plan (rôle AUTEUR)

Exigences : **contexte 100 % autonome** (zéro « cette session », chemins absolus, état du repo décrit,
hypothèses explicites) ; **lots ≤ 2 h**, vérifiables en une passe, repo vert, DONE testable en une phrase ;
**commande de vérification par lot** et de fin de run exactes ; **coûts Convex déclarés** ou « aucun ». Le
plan ne contient que le propre du chantier : texte figé = renvoi d'une ligne au skill, section sans objet =
« aucun », jamais vide. Détails : `references/auteur-details.md`.

0. **Brain d'abord.** `bun run --cwd ~/Desktop/my-projets/second-brain cli/index.ts search "<sujet + projet>"` ;
   cite les leçons dans « Leçons du brain », ou « aucune leçon applicable ».
1. **Fiche d'intention (G) AVEC l'humain**, sous `.chantier/<slug>/intention.md` (hors `docs/`), validée avant
   le plan. Tant qu'elle ne porte pas `Validée par : <nom>, <date>`, livre la fiche seule et arrête-toi.
   Pour un chantier technique, « Après » nomme ses consommateurs et ce qu'ils appellent.
2. **Explore le repo sur disque** : chaque fait vérifié et cité par référence, gate
   d'état en fichiers touchés, jamais en SHA. **Baseline verte** avant d'écrire. Points de contrôle humains
   en début de run.
3. **Copie `assets/template.html`** vers `<repo>/docs/plans/<AAAA-MM-JJ>-<sujet>.html`, remplis TOUS les
   `{{…}}`, garde le TOC fixe. Lignes de règles lues par le lint, FR ou EN : `Budget total : <cible> /
   <plafond>` | `Total budget:` ; `Chips : autorisés|interdits` | `Chips: allowed|forbidden` ;
   `Fiche d'intention : <chemin>` | `Intent sheet:` ; `Doublures de test : aucune|règle standard` |
   `Test doubles: none|standard rule` ; `Dépend de : <slug>|aucun` | `Depends on:` (vague).
   `s-nice` finit avec ≥ 5 idées adjacentes NON incluses ; un must-have va dans les lots.
4. **Bloc Intention** en 3 à 5 phrases. Chaque garantie de ce bloc et de la fiche cite la phrase de la demande
   humaine qui l'exige ; sans citation, elle va en nice-to-have et aucune lentille ni revue ne la durcit.
5. **Lots** : le lot 1 livre la tranche verticale minimale que la preuve de la fiche exécute ; chaque lot
   suivant ajoute une garantie en gardant cette preuve verte. Par lot : estimation en heures, fichiers touchés (hors liste = arrêt),
   agent, vérification, DONE, ligne « Commit du lot » `chantier(<slug>): lot N — <titre>`, DERNIER lot de processus
   compris (lint check 8). Mécanisme central non trivial = invariants testables.
6. **Un agent par lot**, jamais `general-purpose` par défaut si le projet a des agents dédiés (`.claude/agents/`) ;
   clôture/PR/merge : « aucun — reste chez l'orchestrateur ».
7. **Galley** : `html_review_register` (chemin absolu), termine par `http://localhost:5179/html-review/<docId>` ;
   jamais le bloc `ws-review-state`.
8. **Approbation** : la fiche signée « Validée par » fait foi ; hub disponible : convo `approval` avec le lien
   Galley (`bun run --cwd ~/Desktop/my-projets/workstation convo create <slug-projet> -`).
9. **Relis en candide** (« cette session », chemin relatif, lot sans vérification) ; corrige à la décision,
   puis propage aux lots.
<!-- runtime-slot:preflight-invoke -->
10. **Préflight obligatoire.** Invoque le skill `brief-preflight` EN PASSANT les arguments
    `<chemin-absolu-du-plan.html> <repo-cible>` (ils déclenchent le lint automatique) : lint déterministe
<!-- /runtime-slot:preflight-invoke -->
    puis revue adversariale (2 rounds ; lint seul si plafond ≤ 200 lignes). Plan non préflighté = non livrable.

## Exécuter un plan (rôle EXÉCUTANT)

Chaque étape est un gate.

1. **Lis le plan et sa fiche.** Chemin vide, `undefined` ou inexistant, fiche sans `Validée par : <nom>, <date>`
   (EN : `Approved by: <name>, <date>`), ou convo cité par le plan et refusé : `ABORT` en une ligne. Aucune
   étape aval (revue, gardien, vérificateur, clôture) sans commit de lot du chantier.
2. **Restitue l'intention** en 1-2 phrases ; si elle contredit le bloc Intention ou la fiche : STOP, question au hub.
3. **Vérifie l'état du repo** contre « État du repo » ; divergence majeure : arrêt-et-chip. Travaille dans un
   worktree `.worktrees/<slug>` sur une branche créée pour le chantier, jamais dans le checkout principal.
4. **Lot par lot, dans l'ordre.** Dispatche au subagent du champ Agent (jamais `general-purpose` si un agent
   du projet est nommé ; jamais de délégation si « reste chez l'orchestrateur »).
<!-- runtime-slot:wait-subagents -->
   Pour attendre un sous-agent/workflow, préfère le **foreground** (`run_in_background: false`). En
   background : UN wakeup de secours armé (ScheduleWakeup) puis TERMINER LE TOUR ; un second ScheduleWakeup
   ou un `ListAgents` dans le même tour est du polling (le hook `schedule-wakeup-guard` bloque tout
   ré-armement à moins de 30 s). Jamais d'attente nue sans wakeup armé. Ne laisse pas le subagent committer :
<!-- /runtime-slot:wait-subagents -->
   relis son diff et le verdict de la vérification toi-même. Le code réel fait foi sur le plan : consigne
   l'écart et suis le code.
   - Un lot se ferme par sa seule commande de vérification, puis commit `chantier(<slug-du-plan>): lot N —
     <titre>` (jamais de Co-Authored-By) ; compte les lignes ajoutées. Le git log EST le suivi : ne modifie
     pas le plan HTML.
   - Fichier hors liste, ou vérification rouge à cause de doublures de test : « règle standard » de
     `references/auteur-details.md` si le plan la déclare ; sinon arrêt et question au hub.
   - Lot sous gate humain : run local, laisse-le staged ; run cloud éphémère, préfixe `[GATE-HELD]`
     (`references/commits-et-cloud.md`).
5. **Clôture (A3, ne bloque jamais).** Dans l'ordre :
   1. Vérifications globales du plan. UI : navigateur clair + sombre, serveur dev du repo CIBLE lancé en
      Bash (les outils `preview_*` du harnais sont liés à la racine de la session, pas au repo cible).
   2. Revue : `adversarial-pr-review` (Mode A), 2 rounds. Après chaque round, appelle le gardien (moment 1)
      AVANT tout correctif : fiche, chemin absolu du dépôt, diff complet base...HEAD, remarques. Si les fichiers
      cités par les remarques ne sont pas dans ce diff, tout s'arrête sans écrire. Un seul correcteur par round,
      qui n'écrit que dans ce dépôt et seulement les remarques CORRIGER (« correctif minimal couvrant toute la
      famille du défaut, aucune validation hors du chemin modifié »). Un vérificateur frais est obligatoire pour
      chaque correctif du round 2. Sans fiche : gardien sauté, le rapport le dit.
   3. Avant la PR : gardien moment 2 (mêmes entrées).
   4. Dernier lot : `git rm` la fiche, commit `chantier(<slug>): lot N — Clôture…`. La sentinelle de revue se
      pose sur ce HEAD final par le flow légitime du skill de revue, jamais à la main, même sans remote.
   5. Push. Revue convergée : PR vers la branche prévue, remarques ouvertes listées. Sinon, ou sans remote :
      la branche locale est le livrable, corps de PR dans le rapport. Aucun merge par l'exécutant.
   6. Hygiène : `sh ~/.claude/scripts/night-run-lock.sh release`, arrête tout serveur dev lancé.
6. **Rapporte** dans la conversation hub du plan : lots et commits, verdict exact des vérifications, budget
   (lignes, ratio), décisions A2, verdicts du gardien. Un lot sauté se dit, un test rouge se montre.

## Protocole arrêt-et-chip (sur tout échec)

Un échec de CODE arrête le run. Un échec d'INFRA pré-existant (reproductible sans les modifications du
chantier) ouvre le chip mais laisse finir les vérifications ; dans le doute, c'est du code. Jamais de
contournement improvisé.

1. Arrête-toi au lot en échec, ne commite pas le lot raté, laisse le diff en l'état.
2. Ouvre un chip : si l'outil `spawn_task` est disponible, utilise-le ; sinon `cd ~/Desktop/my-projets/workstation && echo '<JSON>' |
   bun run chips add -` avec `{"title","prompt","tldr","cwd"}` (plan, lot, commande, extrait d'erreur de 3-10
   lignes, état laissé, comment reprendre). Plan `Chips : interdits` : consigne l'échec dans le rapport.
3. Note l'échec dans la conversation hub du plan, puis termine (rapport honnête).

Tests verts mais fonctionnalité inopérante avec des données réelles : `references/impossibilite-decouverte.md`.

## Orchestrer une flotte de chantiers (rôle ORCHESTRATEUR)

Détails, goal prompts et clôture : `references/orchestration.md`.

**Phase 1 — Inventaire.** `bun run chips list` + `chips read <id>` pour CHAQUE chip du périmètre. Regroupe
en 3 à 5 chantiers FILE-DISJOINTS (surface d'ÉDITION vérifiée par grep), ~4 sessions parallèles au plus par
machine. Chaque chantier déclare `Dépend de` et ses « Fichiers touchés ».

**Phase 2 — Briefs.** Baseline verte UNE fois, citée dans les N plans ; rôle AUTEUR complet pour chacun,
UNE fiche d'intention par chantier. L'orchestrateur possède les fichiers partagés (README, index).
4bis. **Lint de vague avant tout dispatch** : décommente `s-flotte` dans chaque plan (nom de vague, chantiers
   frères, plage d'identifiants réservée), puis
   `node ~/.claude/skills/brief-preflight/scripts/preflight-flotte.mjs <répertoire-des-plans> [--depuis <N>]`
   (plages disjointes ET fichiers touchés disjoints ; FAIL = corrige avant de lancer).
5. Worktree `.worktrees/<slug>` sur la branche `<type>/<slug>` ; une vague a sa branche `integration/<thème>`.
   Dérogation au verrou night-run et ordre de merge dans chaque plan.
5bis. **Pré-vol des hooks bloquants** depuis un worktree jetable avant tout dispatch.

**Phase 3 — Goal prompts.** UN bloc par chantier, collable dans une session neuve : objectif + condition
d'arrêt vérifiable, jamais une méthode ; plus modèle, worktree, branche, plan. Il reprend verbatim les deux
clauses de sécurité de `references/orchestration.md`.

**Phase 3bis — Watchdog (obligatoire).** Le silence ne prouve pas la progression :
une session d'arrière-plan peut mourir sans rien émettre.
<!-- runtime-slot:watchdog-tick -->
1. **Tick périodique (30-45 min)**, armé tant qu'un chantier n'a pas livré sa PR (ScheduleWakeup ou Monitor).
   À chaque tick, pour CHAQUE chantier : vérité disque du worktree (`git -C <worktree> log --oneline -1` +
   mtime des fichiers récents) comparée au dernier point connu, et présence dans `ListAgents`. Écris la
   consigne COMPLÈTE de surveillance dans le `prompt` du ScheduleWakeup : il est réinjecté à chaque réveil
   et survit à la compaction, contrairement au présent skill.
<!-- /runtime-slot:watchdog-tick -->
<!-- runtime-slot:watchdog-relance -->
2. **Disque immobile + absent de ListAgents = mort.** Relance par SendMessage avec l'état exact vérifié sur
   disque (commits, travail non commité, verdicts de revue reçus), jamais « reprends » à vide.
<!-- /runtime-slot:watchdog-relance -->
3. **Vérification post-relance (≤ 10 min)** : une réponse « resumed » ne prouve rien, le disque doit bouger ;
   sinon re-relance ou escalade à l'utilisateur.
4. **Journal** : une ligne par chantier et par tick (dernier commit, âge du dernier mtime).

**Phase 4 — Clôture (nouvelle session, après les PRs).** Baseline verte avant le premier merge ; relis rapports
et PR ; merge `--no-ff` dans l'ordre documenté, typecheck après chaque merge ; gates COMPLETS sur l'intégré
AVANT de pousser ; redéploiement si le code serveur a bougé, puis vérifie que le nouveau code est servi ;
nettoyage garanti (worktrees, branches locales ET distantes, plans HTML commités dans
`docs/plans/`) ; session review honnête.
