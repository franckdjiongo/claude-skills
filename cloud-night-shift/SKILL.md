---
name: cloud-night-shift
description: >
  Orchestrate chained autonomous overnight CLOUD runs (claude.ai routines via
  the RemoteTrigger API) for any project: interview the user, audit project
  readiness (with a refusal rule), set up a shuttle branch for gitignored
  build-critical artifacts, write one self-contained charter per run, schedule
  one-shot triggers (run_once_at, UTC), and hand the user a morning
  verification + merge protocol. Use this skill whenever the user wants work
  executed overnight ON THE CLOUD rather than on the local machine: "travaille
  cette nuit sur le cloud", "schedule un run cloud", "lance le plan cette nuit
  sur le cloud", "night shift", "routine claude.ai", "je veux me réveiller
  avec le plan écrit ET implémenté", chaining a plan-writing run with an
  implementation run, or ANY request to create/update claude.ai remote
  triggers for autonomous work. If the user says "overnight" or "cette nuit"
  WITHOUT saying where, ask local-vs-cloud first: local queue → loop-autonomy,
  local timed session → schedule-plan-execution, cloud → this skill.
---

# Cloud Night Shift — nuits autonomes sur le cloud claude.ai

Tu vas préparer une nuit de travail autonome exécutée par des routines cloud
claude.ai, chaînées par branche git. Le contrat qui rend ça fiable :

> **Un run = une charte autonome = une mission bornée = des préconditions qui
> avortent proprement = des commits poussés = un rapport. Le matin, l'humain
> vérifie et merge — jamais l'inverse.**

Pourquoi cette forme : une session cloud est **éphémère** (tout travail non
poussé meurt avec elle), **aveugle** (personne ne répond à ses questions) et
**clonée depuis GitHub** (elle n'a ni tes node_modules, ni tes artefacts
gitignorés, ni tes sessions authentifiées). Chaque étape ci-dessous ferme un
de ces trois trous.

Positionnement vis-à-vis des skills sœurs — choisis AVANT de continuer :

| Besoin | Skill |
|---|---|
| File d'items traitée en local, session interactive/subagents | `loop-autonomy` |
| Session locale planifiée à heure fixe (app Desktop ouverte) | `schedule-plan-execution` |
| Runs cloud chaînés pendant la nuit, machine éteinte possible | **ce skill** |

## Étape 1 — Audit de préparation (et règle de refus)

Lis `references/readiness-checklist.md` et déroule les 7 vérifications sur le
projet cible. Les bloquantes : remote GitHub joignable, commande de
vérification déterministe (`validate` ou équivalent) **dont tu MESURES la
durée et le coût CPU** (§2 de la checklist — cette mesure décide seule si les
chartes ont besoin d'un timeout explicite ; ne présume jamais qu'un gate est
lent ou rapide sur la foi d'un autre projet), environment claude.ai existant
pour ce repo, artefacts gitignorés critiques au build identifiés et couverts
par une navette.

**Règle de refus.** Si une vérification bloquante échoue et ne peut pas être
réparée séance tenante, n'arme RIEN. Explique ce qui manque et comment le
créer. Un run cloud sans gate déterministe ou sans SDK restaurable produira
du travail cassé À GRANDE VITESSE pendant que l'utilisateur dort — c'est
pire que pas de run du tout.

## Étape 2 — Interview et design de la chaîne

Pose les questions dont tu n'as pas déjà la réponse dans la conversation :

1. **Quoi** — un design à planifier ? un plan à exécuter ? les deux chaînés ?
   une suite de tâches indépendantes ?
2. **Découpage en runs** — propose toi-même le découpage : un run = une
   mission homogène avec un livrable vérifiable (ex. 18h « écrire le plan »,
   22h « exécuter le plan », 2h « vérification indépendante »). Espace les
   runs pour que le précédent ait fini ET poussé (2-4h d'écart selon la
   taille). Ne chaîne pas plus de 3 runs la première nuit d'un projet.
3. **Branches** — une branche de départ (l'état validé), une branche de
   travail créée par le premier run, consommée par les suivants. Le matin,
   l'utilisateur merge la branche de travail dans une branche intermédiaire
   (JAMAIS master directement avant la QA live).
4. **Heures** — demande le fuseau si inconnu. L'API est en UTC : convertis et
   RELAIE l'heure locale interprétée par le serveur pour confirmation.

## Étape 3 — La navette d'artefacts (si l'audit l'exige)

Tout dossier gitignoré indispensable au build/typecheck/tests (SDK généré,
config d'environnement non secrète…) doit voyager par une **branche-navette
orpheline** : `cloud/<nom>-snapshot`. Mets en place le script local de
publication et son câblage (rafraîchir après chaque régénération) en suivant
`references/readiness-checklist.md` § Navette. Les secrets ne voyagent
JAMAIS par navette — si le build exige un secret, c'est un échec de l'audit.

## Étape 4 — Chartes et triggers

Écris UNE charte par run depuis `references/charter-template.md`, puis crée
les triggers en suivant `references/remotetrigger-api.md` (one-shot
`run_once_at`, jamais de cron détourné en one-shot). Les invariants des
chartes — chacun a été appris d'un run réel :

- **Préconditions + abort propre** : le run N+1 vérifie que le livrable du
  run N existe (branche + fichier) et S'ARRÊTE avec un rapport sinon. Jamais
  d'improvisation de secours.
- **Bootstrap explicite** : `npm ci` (ou équivalent), restauration navette,
  puis un sanity check (typecheck) AVANT la mission. Un échec de bootstrap =
  rapport et arrêt, pas de bricolage.
- **Pointer vers un fichier du repo, ne jamais recopier.** Le message d'un
  trigger est FIGÉ à la création ; un fichier du repo vit avec le code. Donc :
  écris les invariants communs à tous les runs dans UN fichier de règles du
  repo cible (protocole commun), et que chaque charte se contente de dire
  « lis ce fichier EN ENTIER et applique-le » avant sa mission propre. C'est
  ce qui rend une chaîne déjà armée corrigeable : le 15/08/2026, trois
  correctifs de fond ont été poussés sur une chaîne de 7 runs — dont un qui
  aurait tué la vague entière — sans ré-armer un seul trigger. Sans ce
  fichier, chaque correctif est une réécriture de N chartes.
- **Le nom de branche de la charte est un CONTRAT, pas une suggestion.**
  L'environnement dépose le run sur une branche **suffixée automatiquement**
  (`<branche-demandée>-<6 caractères>`), créée depuis la branche par défaut du
  repo — observé sur 3 sondes sur 3 le 15/08/2026. Elle est propre, elle
  existe déjà, la réutiliser paraît inoffensif : c'est le piège. Les runs
  suivants vérifient leurs préconditions par un `git fetch` + `git log` sur la
  ref EXACTE ; un seul caractère d'écart et l'aval conclut que l'amont a
  échoué. Toute charte impose donc un checkout explicite suivi d'une
  vérification, avant la moindre ligne de code :
  `git checkout -B <NOM-EXACT> origin/<AMONT>` puis `git branch --show-current`
  qui DOIT afficher le nom sans suffixe.
- **Une précondition se vérifie sur ce que l'amont PRODUIT, jamais sur ce que
  son plan ANNONCE.** Dériver un `git log --grep 'lot N'` du nombre de lots
  d'un plan produit un gate faux par construction : le dernier lot est souvent
  un lot de processus que les runs commitent sous un message libre. Écris la
  précondition à partir de la convention de message réelle, et **teste-la
  contre le dépôt avant d'armer** — un `git log --grep` qui renvoie 0 au
  moment de l'écriture est un gate mort. Erreur commise le 15/08/2026, clonée
  dans deux chartes, rattrapée 30 min avant le tir.
- **Pas d'outil de workflow/ultracode dans un run non supervisé.** Il redemande
  une confirmation humaine à chaque lancement, y compris sous un mode de
  permission permissif — et personne ne répondra. Nomme explicitement dans la
  charte l'outil à utiliser pour toute étape de revue ou de fan-out : des
  sous-agents parallèles. Observé le 15/08/2026 : sur trois runs recevant la
  même instruction non outillée, un s'est bloqué, deux ont abouti.
- **Timeout explicite sur les commandes longues — issu de la MESURE de
  l'audit** (§ Étape 1), jamais d'un chiffre hérité d'un autre projet. Si la
  commande de vérification a été estimée sous 2 min pour ce projet, ne mets
  rien : la charte reste courte. Si elle dépasse, la charte porte le paramètre
  `timeout` explicite ET la durée mesurée, avec la phrase qui évite le
  contresens : *une commande qui prend N minutes ici est NORMALE, ce n'est pas
  une panne ; si elle est coupée, c'est le timeout par défaut de 2 minutes, pas
  un échec du code.* Un run qui prend une coupure pour un échec repart corriger
  un code sain — bien plus cher que l'attente qu'il croyait éviter.
- **Convention de gates cloud** : une tâche marquée « validation humaine
  avant commit » est implémentée + testée + COMMITÉE (préfixe de message
  `[GATE-HELD]`), mais sa case de gate reste non cochée et le rapport final
  la liste. « Laisser staged » est une convention LOCALE : en session cloud
  éphémère, du staged non commité est PERDU.
- **Commits incrémentaux poussés** par tâche/groupe : si la session meurt à
  80 %, les 80 % survivent.
- **Clôture** : commande de vérification complète PASS obligatoire avant le
  dernier push ; rapport final structuré (fait / commits / gates tenus /
  restant).

## Étape 5 — Protocole du matin (à remettre à l'utilisateur)

Termine TOUJOURS en remettant à l'utilisateur ce protocole, adapté au projet :

1. Lancer une session locale de vérification indépendante : « analyse ce qui
   a été fait cette nuit, sans rien modifier » — re-exécuter la commande de
   vérification, comparer les claims des rapports aux faits, lister les
   régressions et les findings.
2. Faire les validations humaines en attente (gates `[GATE-HELD]`).
3. Merger la branche de travail dans la branche intermédiaire convenue ;
   master attend que la QA live soit passée.
4. Vérifier que les triggers one-shot sont bien morts (`ended_reason:
   run_once_fired`) ; supprimer les déchets.

## Limites à annoncer honnêtement

- L'API RemoteTrigger n'est pas documentée publiquement : elle peut changer.
  Si `create` échoue, replie-toi sur la création manuelle d'une routine dans
  l'UI claude.ai en fournissant la charte prête à coller.
- L'environment claude.ai d'un repo se crée via l'UI (une fois par repo) —
  le skill le détecte mais ne peut pas le créer.
- Les sessions cloud ont des limites de durée : c'est la raison des commits
  incrémentaux et du chaînage en missions bornées.
- Coût : des runs nocturnes sur un grand modèle consomment du quota réel.
  Dimensionne la chaîne à ce que le matin peut absorber en revue.
