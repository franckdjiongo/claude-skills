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

Un plan remplace la mémoire de la session qui l'a conçu et la motivation de la personne qui le lance :
un modèle moindre doit pouvoir l'exécuter sans personne pour répondre. Détermine ton rôle :

- **AUTEUR** : on te demande d'écrire/découper un plan → § Écrire un plan.
- **EXÉCUTANT** : on te donne un plan à exécuter → § Exécuter un plan.
- **ORCHESTRATEUR** : exécuter un LOT de chips « en chantiers » / « en parallèle », ou clôturer un run
  parallèle → § Orchestrer une flotte.

## Règles dures (les trois rôles ; aucun plan ne les assouplit)

- **A1 Budget total.** Par chantier : code + tests + scripts. Cible ≤ 500 lignes ajoutées, plafond 1 000 ;
  au-delà, découper. Suppressions et fichiers générés ne comptent pas. Ratio tests/code (dès 50 lignes de code) > 2 :
  justifier ; > 4 : découper ou accord humain.
- **A2 Chips et décisions.** Chaque plan déclare `Chips : autorisés` ou `Chips : interdits`. Chaque remarque
  de revue reçoit UNE décision : CORRIGER (P1, et P2 qui servent l'intention), CHIP (si autorisés),
  NE PAS CORRIGER (une ligne de raison), INVALIDE. Jamais « tout corriger, y compris les mineurs ».
- **A3 Revue : 2 rounds au plus.** Non contournable par un plan. Round 2 = relecture du delta seulement.
  Après, le chantier TERMINE : commit, push, puis PR si la revue a convergé ; sinon le corps de PR (remarques
  ouvertes listées) va dans le rapport et l'humain ouvre la PR. Le run ne s'arrête jamais pour attendre.
- **A4 Tester ce que l'utilisateur voit, pas les internes.** Preuve par exécution réelle quand elle est
  possible (dry-run, sandbox, app en local comme le ferait l'humain) avant d'ajouter des tests simulés.
- **A5 Disjoncteur.** Un lot qui dépasse le double de son estimation s'arrête, commite un état propre,
  rapporte, et le chantier passe à la clôture.
- **G Fiche d'intention + gardien.** Fiche d'1 page, jetable (`assets/fiche-intention.md`), écrite avec
  l'humain et validée avant le plan. Le gardien d'intention (`references/gardien-intention.md`) est appelé
  après chaque round de revue et avant la PR ; il ne peut que retirer du travail.

## Écrire un plan (rôle AUTEUR)

Exigences : **contexte 100 % autonome** (zéro « cette session », chemins absolus, état du repo décrit,
hypothèses explicites : un exécutant qui n'a jamais vu le projet démarre avec le plan seul) ; **lots ≤ 2 h**,
chacun vérifiable en une passe et laissant le repo vert (critère DONE en une phrase testable, sinon
découpe) ; **commande de vérification par lot** et commandes de fin de run exactes ; **coûts Convex
déclarés** (lectures paginées, `.collect()` non borné interdit) ou « ne touche pas Convex » écrit noir sur
blanc. Détails de chaque étape : `references/auteur-details.md`.

0. **Brain d'abord.** Interroge le Second Brain (`bun run --cwd ~/Desktop/my-projets/second-brain cli/index.ts
   search "<sujet + projet>"`, ou `data/mirror/json/memories.json`). Cite les leçons applicables dans la
   section « Leçons du brain », ou écris « aucune leçon applicable » : le silence est interdit.
1. **Fiche d'intention (G) AVEC l'humain**, depuis `assets/fiche-intention.md`, rangée sous
   `.chantier/<slug>/intention.md` (hors `docs/`). Validée avant le plan ; le plan porte
   `Fiche d'intention : <chemin>`.
2. **Explore le repo sur disque** : branche, scripts, état réel ; vérifie chaque fait individuellement, cite
   des références (`SYMBOLE`, `fichier:ligne`) plutôt que de recopier des valeurs ; gate d'état en fichiers
   touchés, jamais en SHA. **Baseline verte** : lance une fois les vérifications de fin de run avant d'écrire.
   Recense les points de contrôle humains et place-les en début de run.
3. **Copie `assets/template.html`** vers `<repo>/docs/plans/<AAAA-MM-JJ>-<sujet>.html`, remplis TOUS les
   `{{…}}`, garde le TOC fixe. Renseigne les quatre lignes de règles (budget total, chips, fiche, revue).
   `s-nice` finit avec ≥ 5 idées adjacentes NON incluses ; un must-have va dans les lots. Plan solo : supprime
   `s-flotte` et sa ligne de TOC.
4. **Bloc Intention** : le pourquoi en 3-5 phrases, discriminant (pas une paraphrase du titre).
5. **Découpe en lots**, les plus sûrs d'abord, chacun avec estimation en heures, fichiers, agent, vérification,
   DONE, ligne « Commit du lot ». Un mécanisme central non trivial se spécifie en invariants testables.
   Les tests couvrent le comportement visible (A4) ; le budget cumulé reste sous le plafond (A1).
   - **5bis.** Le DERNIER lot (processus : clôture, revue, PR) porte aussi l'étiquette `lot N` dans son
     `<code class="commit-msg">` (lint check 8) : jamais un message libre.
   - **5ter.** Chaque lot liste ses fichiers ; hors liste = arrêt. Recopie tel quel le paragraphe
     `classe-doublures` du gabarit §03 (doublures de test pré-autorisées ; lint check 10).
6. **Un agent par lot**, jamais `general-purpose` par défaut si le projet a des agents dédiés (liste de
   session, `.claude/agents/`) ; lots de clôture/PR/merge : « aucun — reste chez l'orchestrateur ».
7. **Galley** : `html_review_register` (chemin absolu), termine par `http://localhost:5179/html-review/<docId>`.
   Ne touche jamais au bloc `ws-review-state`.
8. **Approbation** : `cd ~/Desktop/my-projets/workstation && bun run convo create <slug-projet> -` (item
   `approval`, lien Galley), ou note l'approbation déjà donnée en session dans la section Approbation.
9. **Relis en candide** (« cette session », chemin relatif, lot sans vérification, hypothèse implicite).
   Corrige d'abord au niveau de la décision, puis propage aux lots.
<!-- runtime-slot:preflight-invoke -->
10. **Préflight obligatoire.** Invoque le skill `brief-preflight` EN PASSANT les arguments
    `<chemin-absolu-du-plan.html> <repo-cible>` (ils déclenchent le lint automatique) : lint déterministe
<!-- /runtime-slot:preflight-invoke -->
    puis revue adversariale plafonnée à 2 rounds. Un plan jamais préflighté n'est pas livrable.

## Exécuter un plan (rôle EXÉCUTANT)

Chaque étape est un gate.

1. **Lis le plan en entier**, et la fiche d'intention qu'il référence.
2. **Restitue l'intention** en 1-2 phrases. Si elle contredit le bloc Intention ou la fiche : STOP, question
   au hub workstation.
3. **Gate d'approbation** : `bun run convo read` approuvé, ou approbation de session documentée. Sinon pas
   d'exécution.
4. **Vérifie l'état du repo** contre « État du repo ». Divergence majeure : arrêt-et-chip, rien modifié.
5. **Lot par lot, dans l'ordre.** Dispatche au subagent du champ Agent (jamais `general-purpose` si un
   agent du projet est nommé ; jamais de délégation si « reste chez l'orchestrateur »).
<!-- runtime-slot:wait-subagents -->
   Pour attendre un sous-agent/workflow, préfère le **foreground** (`run_in_background: false`) quand rien
   d'autre ne peut avancer. En background : garder UN wakeup de secours armé (ScheduleWakeup, légitime hors
   `/loop`) puis TERMINER LE TOUR ; un second ScheduleWakeup ou un `ListAgents` dans le même tour est du
   polling (le hook global `schedule-wakeup-guard` bloque tout ré-armement à moins de 30 s). Ne termine
   jamais un tour en attente nue : sans wakeup armé, la notification peut ne jamais venir. Ne laisse pas
   le subagent committer :
<!-- /runtime-slot:wait-subagents -->
   relis son diff et le verdict de la vérification toi-même, et applique la même méfiance à ton propre code.
   Le code réel du repo fait foi sur le plan : consigne l'écart et suis le code.
   - Après chaque lot : vérification du lot, puis commit `chantier(<slug-du-plan>): lot N — <titre>` (jamais
     de Co-Authored-By). Le git log EST le suivi : ne modifie pas le plan HTML. Compte les lignes ajoutées
     (A1) à chaque lot.
   - Fichier hors liste ou vérification rouge à cause de doublures de test : voir la classe `classe-doublures`
     du plan (une seule passe, ajout du seul nouveau membre) ; sinon arrêt et question au hub.
   - Lot sous gate humain : run local, laisse-le staged ; run cloud éphémère, commite avec le préfixe
     `[GATE-HELD]` (`[GATE-HELD] chantier(<slug>): lot N — <titre>`). Détails : `references/commits-et-cloud.md`.
6. **Disjoncteur (A5).** Un lot au double de son estimation : arrête-le, commite un état propre, rapporte,
   passe à la clôture.
7. **Clôture (A3, ne bloque jamais).** Dans l'ordre :
   1. Vérifications globales du plan. UI : navigateur clair + sombre, serveur dev du repo CIBLE lancé en
      Bash (les outils `preview_*` du harnais sont liés à la racine de la session, pas au repo cible).
   2. Revue : skill `adversarial-pr-review` (Mode A), 2 rounds au plus, round 2 sur le delta. Après chaque
      round, appelle le gardien (moment 1) AVANT tout correctif, puis applique A2 : `SERT` = CORRIGER ;
      `HORS` = CHIP si autorisés, sinon NE PAS CORRIGER avec la raison du gardien.
   3. Avant la PR : gardien moment 2 ; `DÉRIVE` = retire les parties listées ou justifie-les une à une.
   4. Dernier lot : `git rm` la fiche d'intention, commit `chantier(<slug>): lot N — Clôture…`. La sentinelle
      de revue se pose sur ce HEAD final, par le flow légitime du skill de revue, jamais à la main.
   5. Push. Revue convergée : PR vers la branche prévue par le plan, remarques ouvertes listées. Sinon : pas
      de PR (le hook la bloque sans sentinelle), corps de PR dans le rapport. Aucun merge par l'exécutant.
   6. Hygiène : `sh ~/.claude/scripts/night-run-lock.sh release`, arrête tout serveur dev lancé, aucun worker
      orphelin.
8. **Rapporte** dans la conversation hub du plan (sinon en fin de session) : lots et commits, verdict exact
   des vérifications, budget (lignes ajoutées, ratio tests/code), tableau des décisions A2, verdicts du
   gardien. Un lot sauté se dit, un test rouge se montre.

## Protocole arrêt-et-chip (sur tout échec)

Un échec de CODE (causé par les modifications du chantier) arrête le run. Un échec d'INFRA pré-existant
(reproductible sans les modifications du chantier) ouvre le chip mais laisse finir les vérifications
restantes ; dans le doute, c'est un échec de code. Jamais de contournement improvisé.

1. Arrête-toi au lot en échec. Ne commit pas le lot raté ; laisse le diff en l'état (c'est le diagnostic).
2. Ouvre un chip : si l'outil `spawn_task` est disponible, utilise-le ; sinon
   `cd ~/Desktop/my-projets/workstation && echo '<JSON>' | bun run chips add -` avec `{"title","prompt",
   "tldr","cwd"}`. Le prompt donne : plan, lot, commande, extrait d'erreur (3-10 lignes), état laissé,
   comment reprendre. Si le plan dit `Chips : interdits`, consigne l'échec dans le rapport à la place.
3. Note l'échec dans la conversation hub du plan, puis termine proprement (rapport honnête).

Le cas « tests verts mais fonctionnalité inopérante avec des données réelles » : `references/impossibilite-decouverte.md`.

## Orchestrer une flotte de chantiers (rôle ORCHESTRATEUR)

Détails, goal prompts et clôture : `references/orchestration.md`.

**Phase 1 — Inventaire.** `bun run chips list` + `chips read <id>` pour CHAQUE chip du périmètre (plus les
sources que l'utilisateur désigne). Regroupe en 3 à 5 chantiers FILE-DISJOINTS (surface d'ÉDITION vérifiée
par grep) ; deux items qui éditent le même fichier vont dans le même chantier ou ont un ordre de merge
documenté. Maximum ~4 sessions parallèles par machine. Un fait rapporté par un seul agent d'exploration
se re-vérifie par grep avant d'entrer dans un plan.

**Phase 2 — Briefs.** Baseline verte UNE fois, citée dans les N plans ; rôle AUTEUR complet pour chacun
(une fiche d'intention par chantier, validée par l'humain ; préflight compris, en parallèle si besoin).
4bis. **Plages d'identifiants disjointes** : décommente `s-flotte` dans chaque plan de la vague (nom de
   vague, chantiers frères, plage réservée) puis, avant tout dispatch, vérifie la disjonction :
   `node ~/.claude/skills/brief-preflight/scripts/preflight-flotte.mjs <répertoire-des-plans> [--depuis <N>]`
   (FAIL = réattribue les plages avant de lancer).
<!-- runtime-slot:flotte-hook -->
   Un Stop hook global l'impose (`~/.claude/hooks/flotte-plage-gate.mjs`) : dès qu'une session a écrit ≥ 2
   plans partageant un `flotte-nom`, elle ne s'arrête pas sans un run PASS du lint couvrant leur contenu
   actuel. Échappatoire : « FLOTTE-EXEMPT: &lt;raison&gt; » dans la réponse. Smoke test :
   `sh ~/.claude/hooks/tests/flotte-plage-gate.smoke.sh` (doit finir `SMOKE OK`). Claude Code uniquement.
<!-- /runtime-slot:flotte-hook -->
5. Chaque plan ajoute : branche `chantier/<slug>`, worktree `.claude/worktrees/<slug>` (gitignoré), dérogation
   au verrou night-run (les runs parallèles sont voulus), ordre de merge, « `bun run redeploy` requis » si
   `server/**` est touché.
5bis. **Pré-vol des hooks bloquants** depuis un worktree jetable avant tout dispatch (le hook doit résoudre
   le contexte du worktree, pas du repo principal) ; hook cassé = corrige-le AVANT de lancer la flotte.

**Phase 3 — Goal prompts.** UN bloc par chantier, collable dans une session neuve : modèle recommandé,
worktree + branche, exécution du plan au rôle EXÉCUTANT, revue A3 (2 rounds, gardien), PR sans merge,
rapport au hub, hygiène. Chaque goal prompt reprend verbatim les deux clauses de sécurité de
`references/orchestration.md` (jamais de sentinelle fabriquée ; heartbeat à chaque lot).

**Phase 3bis — Watchdog (obligatoire).** L'absence de notification n'est jamais une preuve de progression :
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

**Phase 4 — Clôture (nouvelle session, après les PRs).** Baseline verte sur main avant le premier merge ;
relis les rapports et les PR (sentinelle de revue présente, décisions A2 et verdicts du gardien listés) ;
merge local `--no-ff` dans l'ordre documenté avec un typecheck après chaque merge ; gates COMPLETS sur le
main intégré AVANT de pousser ; `bun run redeploy` si `server/**` a bougé, puis vérifie que le nouveau code
est servi ; nettoyage garanti (worktrees, branches locales ET distantes, plans HTML commités dans
`docs/plans/`) ; session review honnête.

## Hors périmètre

Les briefs documentaires (offres, playbooks, checklists) ne passent pas par ce standard.
