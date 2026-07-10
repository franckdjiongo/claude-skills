---
name: brief-chantier
description: |
  Standard for autonomous-execution work plans ("plans de chantier"). Two roles:
  AUTHOR a plan (write an HTML plan that a lesser model or a future session can
  execute with zero memory of the current conversation) and EXECUTE a plan
  (run an existing brief-chantier plan lot by lot with verification gates).
  Use whenever the user asks to write/découper a "plan de chantier",
  "brief-chantier", "plan de finition", "liste de finition", a plan for "runs
  nocturnes" / "run autonome" / "exécution autonome", or asks to EXECUTE such
  a plan (e.g. "exécute le plan docs/plans/….html"). Also use when another
  brief or skill says a development plan must follow "le standard
  brief-chantier". Development plans only — one-shot documents (offers,
  playbooks, checklists) are out of scope.
---

# Brief-chantier — le standard des plans d'exécution autonome

Un plan de chantier remplace deux choses à la fois : la mémoire de la session
qui l'a conçu, et la motivation de la personne qui le lancera. Il doit donc
être exécutable par un modèle moindre, une nuit, sans personne pour répondre
aux questions. Chaque règle ci-dessous existe parce que son absence a un mode
d'échec précis : un chemin relatif casse quand le cwd change ; un lot trop gros
meurt au milieu sans état propre ; un critère DONE flou laisse un run « réussir »
sans rien livrer ; une lecture Convex non paginée a déjà coûté un incident
egress réel.

Deux rôles. Détermine le tien et lis la section correspondante :

- **AUTEUR** — on te demande d'écrire/découper un plan → § Écrire un plan.
- **EXÉCUTANT** — on te donne un plan existant à exécuter → § Exécuter un plan.

## Les quatre exigences (le cœur du standard)

1. **Contexte 100 % autonome.** Zéro référence à « cette session », « comme vu
   plus haut », ou à une conversation. Chemins absolus partout. L'état du repo
   est décrit (branche, HEAD, propreté, scripts de vérification exacts). Les
   hypothèses sont explicites — ce que le plan suppose vrai au démarrage.
   Test du candide : un exécutant qui n'a JAMAIS vu le projet doit pouvoir
   démarrer avec le plan seul.
2. **Lots ≤ 2 h.** Chaque lot est un sujet cohérent, exécutable et vérifiable
   en une passe, qui laisse le repo dans un état vert (commitable). Heuristique
   fiable : si le critère DONE du lot ne tient pas en une phrase testable, le
   lot est trop gros — découpe.
3. **Critères DONE testables + vérification obligatoire.** Chaque lot a sa
   commande de vérification ; le run entier a ses commandes de fin
   (`bun run typecheck && bun run build && bun test`, ou l'équivalent exact du
   projet, écrit dans le plan). Un échec de vérification déclenche le
   protocole arrêt-et-chip (§ ci-dessous) — jamais de « je continue quand même ».
4. **Coûts Convex déclarés.** Si le chantier touche Convex : estimation
   d'ordre de grandeur des lectures/écritures/egress par lot, et interdiction
   des lectures non paginées (`.collect()` sur une table non bornée est
   interdit — `.paginate()`, ou index + `.take(n)`). Si le chantier ne touche
   pas Convex, le plan le déclare explicitement — le silence est ambigu.

## Écrire un plan (rôle AUTEUR)

1. **Explore le repo cible d'abord.** L'état du repo se constate sur disque
   (branche, commits, scripts de package.json, TODO résiduels) — jamais de
   mémoire ni de suppositions. Ce que tu écris dans « État du repo » doit être
   vrai à la minute où tu l'écris. Vérifie chaque fait INDIVIDUELLEMENT : un
   grep groupé multi-cibles (`grep "a\|b\|c"`) dit qu'au moins une cible
   matche, pas que chacune matche — le premier test de survie a produit une
   hypothèse fausse exactement comme ça.
2. **Établis la baseline verte.** Lance une fois les commandes de vérification
   de fin de run sur l'état de départ du repo AVANT d'écrire le plan. Si une
   étape échoue déjà (accès manquant, environnement non configuré), le gate
   produira un faux échec la nuit : corrige d'abord, ou documente l'étape
   comme « rouge pré-existant connu » dans les hypothèses avec la conduite à
   tenir.
3. **Copie le template.** `assets/template.html` (dans ce skill) →
   `<repo-cible>/docs/plans/<AAAA-MM-JJ>-<sujet-kebab>.html`. Remplis TOUS les
   placeholders `{{…}}` ; le template est la structure obligatoire, pas une
   suggestion. Garde le TOC fixe (préférence utilisateur ferme sur tout
   document HTML long) — ajoute une entrée par lot.
4. **Bloc Intention.** Le pourquoi profond du chantier en 3-5 phrases. C'est
   le contrat d'intention : l'exécutant devra le restituer avant d'agir, et
   s'arrêter si sa restitution le contredit. Écris-le pour rendre ce test
   discriminant (pas une paraphrase du titre).
5. **Découpe les lots** selon les quatre exigences. Ordonne-les pour que
   chaque lot laisse un état livrable même si le run s'arrête là (les plus
   sûrs d'abord, les risqués isolés en fin).
6. **Enregistre dans Galley** (`html_review_register` avec le chemin absolu du
   plan) pour que l'utilisateur puisse annoter. Termine ton message par le
   lien direct `http://localhost:5179/html-review/<docId>`. Ne touche JAMAIS
   au bloc `ws-review-state` d'un plan déjà enregistré.
7. **Crée la conversation d'approbation au hub** (`cd
   ~/Desktop/my-projets/workstation && bun run convo create <slug-projet> -`,
   item `approval` avec le contexte et le lien Galley), puis lance
   `bun run convo watch <slug> <id>` en tâche de fond. Exception : si
   l'utilisateur a déjà approuvé le lancement explicitement dans la session,
   note-le dans la section Approbation du plan (qui a approuvé, quand, où) au
   lieu de bloquer sur une conversation.
8. **Relis en candide** avant de livrer : cherche « cette session », « comme
   convenu », un chemin relatif, un lot sans commande de vérification, une
   hypothèse implicite. Chaque occurrence est un défaut à corriger.

## Exécuter un plan (rôle EXÉCUTANT)

Étape par étape, dans cet ordre — chaque étape est un gate :

1. **Lis le plan en entier** avant la moindre action.
2. **Contrat d'intention.** Restitue l'intention en 1-2 phrases au tout début
   de ton travail. Si ta restitution contredit le bloc Intention du plan,
   STOP — pose la question au hub workstation au lieu d'exécuter de travers.
3. **Gate d'approbation.** Vérifie le statut indiqué dans la section
   Approbation (conversation hub approuvée via `bun run convo read`, ou
   approbation en session documentée). Pas d'approbation = pas d'exécution.
4. **Vérifie l'état du repo** contre la section « État du repo ». Divergence
   majeure (branche différente, fichiers modifiés inattendus, scripts
   manquants) = les hypothèses du plan sont cassées → protocole
   arrêt-et-chip, sans rien modifier.
5. **Exécute lot par lot, dans l'ordre.** Après chaque lot : lance la commande
   de vérification du lot ; si elle passe, commit —
   `chantier(<slug-du-plan>): lot N — <titre du lot>` (jamais de ligne
   Co-Authored-By). Le git log EST le suivi d'avancement : ne modifie pas le
   plan HTML pour cocher des cases (il peut être annoté dans Galley au même
   moment).
6. **Fin de run.** Lance les commandes de vérification globales du plan. Si le
   chantier touche l'UI : vérification navigateur clair + sombre avant de
   conclure — lance le dev server du repo CIBLE en Bash (`bun run dev` dans le
   repo du plan) ; les outils `preview_*` du harnais sont liés à la racine de
   la session, pas au repo cible, et démarreraient le mauvais serveur. Puis
   hygiène machine : arrête tout serveur dev que tu as lancé, ne laisse aucun
   worker orphelin.
7. **Rapporte.** Réponds dans la conversation hub du plan si elle existe
   (lots faits, commits, verdict des vérifications) ; sinon résume en fin de
   session. Rapporte fidèlement — un lot sauté se dit, un test rouge se montre.

## Protocole arrêt-et-chip (sur tout échec)

Un run qui échoue s'arrête — il n'improvise pas de contournement, parce qu'un
contournement nocturne non supervisé transforme un échec local en incident
global. Une seule distinction est permise avant d'arrêter : un échec de CODE
(la vérification échoue à cause des modifications du chantier) déclenche
l'arrêt immédiat ci-dessous ; un échec d'INFRA pré-existant (accès refusé,
auth expirée, prompt interactif impossible — reproductible à l'identique SANS
les modifications du chantier) ouvre le chip mais laisse le run terminer les
vérifications restantes et livrer son rapport, en y nommant l'échec verbatim.
Dans le doute, traite-le comme un échec de code. Concrètement :

1. **Arrête le run** au lot en échec. Ne commit PAS le lot raté ; laisse les
   modifications non commitées en l'état (le diff est le diagnostic — le
   détruire ferait perdre l'information).
2. **Ouvre un chip** : si l'outil `spawn_task` est disponible, utilise-le ;
   sinon, la CLI déterministe :
   ```bash
   cd ~/Desktop/my-projets/workstation && echo '{
     "title": "Chantier <slug> : lot N en échec",
     "prompt": "Plan : <chemin absolu du plan>. Lot N (<titre>) a échoué à la vérification.\nCommande : <commande>\nErreur (extrait) : <3-10 lignes>\nÉtat laissé : lots 1..N-1 commités, modifications du lot N non commitées sur <branche>.\nReprendre : diagnostiquer, corriger, relancer la vérification du lot, puis poursuivre le plan au lot N+1.",
     "tldr": "Le run autonome du chantier <slug> s est arrêté au lot N ; diagnostic et reprise nécessaires.",
     "cwd": "<chemin absolu du repo cible>"
   }' | bun run chips add -
   ```
3. **Note l'échec** dans la conversation hub du plan si elle existe, puis
   termine le run proprement (serveurs arrêtés, rapport honnête).

## Hors périmètre

Les briefs documentaires (offres, playbooks, checklists, recherches) ne
passent pas par ce standard — ils n'ont ni lots ni runs nocturnes. Ne force
pas un plan de chantier là où une page suffit.
