---
name: brief-chantier
description: |
  Standard for autonomous-execution work plans ("plans de chantier"). Three
  roles: AUTHOR a plan (write an HTML plan that a lesser model or a future
  session can execute with zero memory of the current conversation), EXECUTE
  a plan (run an existing brief-chantier plan lot by lot with verification
  gates), and ORCHESTRATE a fleet (turn a batch of chips/backlog items into
  several file-disjoint chantiers executed IN PARALLEL in git worktrees by
  other sessions, then merge/deploy/clean up afterwards).
  Use whenever the user asks to write/découper a "plan de chantier",
  "brief-chantier", "plan de finition", "liste de finition", a plan for "runs
  nocturnes" / "run autonome" / "exécution autonome", or asks to EXECUTE such
  a plan (e.g. "exécute le plan docs/plans/….html"). ALSO use — role
  ORCHESTRATEUR — whenever the user asks to execute a BATCH of chips/tasks as
  chantiers (e.g. "exécute les 12 chips de tel projet", "fais les chips en
  chantiers", "chantiers parallèles", "exécute ça dans les worktrees"), or to
  merge/close a finished parallel run. Also use when another brief or skill
  says a development plan must follow "le standard brief-chantier".
  Development plans only — one-shot documents (offers, playbooks, checklists)
  are out of scope.
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

Trois rôles. Détermine le tien et lis la section correspondante :

- **AUTEUR** — on te demande d'écrire/découper un plan → § Écrire un plan.
- **EXÉCUTANT** — on te donne un plan existant à exécuter → § Exécuter un plan.
- **ORCHESTRATEUR** — on te demande d'exécuter un LOT de chips/tâches « en
  chantiers » / « en parallèle » / « dans les worktrees », ou de clôturer un
  run parallèle terminé → § Orchestrer une flotte de chantiers.

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

0. **Interroge le brain d'abord — obligatoire.** Avant d'écrire quoi que ce
   soit : les leçons et décisions du projet ET de l'utilisateur. Outils déjà
   en prod, au choix : `memory_search` / `lessons_list_validated` du MCP
   workstation-bus, la CLI (`bun run --cwd
   ~/Desktop/my-projets/second-brain cli/index.ts search "<sujet + projet>"`),
   ou le miroir local
   (`~/Desktop/my-projets/second-brain/data/mirror/json/memories.json`).
   Cite dans le plan (section « Leçons du brain » du template) ce qui
   s'applique, ou écris « aucune leçon applicable » — le silence est
   interdit : une leçon déjà payée qui ne ressort pas ici sera payée deux
   fois, et c'est exactement l'échec que cette étape existe pour empêcher.
1. **Explore le repo cible ensuite.** L'état du repo se constate sur disque
   (branche, commits, scripts de package.json, TODO résiduels) — jamais de
   mémoire ni de suppositions. Ce que tu écris dans « État du repo » doit être
   vrai à la minute où tu l'écris. Vérifie chaque fait INDIVIDUELLEMENT : un
   grep groupé multi-cibles (`grep "a\|b\|c"`) dit qu'au moins une cible
   matche, pas que chacune matche — le premier test de survie a produit une
   hypothèse fausse exactement comme ça. Et ne RECOPIE jamais une
   énumération/valeur du code dans le plan : cite sa référence
   (`SYMBOLE`, `fichier:ligne`), vérifiée en LISANT le fichier au moment de
   l'écriture — une copie dérive dès que le code bouge, une référence non
   (leçon persistance-ui : « days = 7/30/90/365 » recopié de tête, le code
   disait `[7, 14, 30, 90]`). Exprime le gate d'état du repo en critère de
   FICHIERS touchés (« aucun fichier du chantier modifié depuis la
   baseline »), jamais en SHA exact de HEAD — le standard autorise des runs
   parallèles, un SHA épinglé est toujours périmé.
2. **Établis la baseline verte.** Lance une fois les commandes de vérification
   de fin de run sur l'état de départ du repo AVANT d'écrire le plan. Si une
   étape échoue déjà (accès manquant, environnement non configuré), le gate
   produira un faux échec la nuit : corrige d'abord, ou documente l'étape
   comme « rouge pré-existant connu » dans les hypothèses avec la conduite à
   tenir. Même exigence pour les DONNÉES : chaque vérification
   navigateur/scénario prescrite par le plan doit être exerçable avec les
   données réellement présentes dans l'environnement de test — vérifie-le
   maintenant, ou prescris explicitement le seed/fixture qui les crée (un
   filtre testé sur une liste vide est un scénario invérifiable, découvert à
   2 h du matin). Recense aussi dès l'écriture tout point de contrôle humain
   (approbation hub, déploiement prod, action bloquée par le classificateur
   en mode auto — en particulier TOUTE écriture dans `~/.claude/settings.json`
   ou `~/.codex/hooks.json`, refusée à un agent même avec l'autorisation
   écrite de Franck, observé le 2026-09-09 : le câblage d'un hook est donc un
   point de contrôle HUMAIN, à inscrire tel quel avec la commande à lancer)
   et séquence-le en DÉBUT de run, ou pré-négocie-le — un lot
   « autonome » qui exige une action interactive est une contradiction à
   résoudre avant livraison du plan. Si un lot garde malgré tout un gate de
   validation humaine explicite avant commit, formule-le MODE-AWARE dans le
   plan : run local → travail laissé staged jusqu'à validation ; run cloud
   éphémère → lot commité avec le préfixe `[GATE-HELD]` devant son message
   normal (convention détaillée au rôle EXÉCUTANT, étape 5).
3. **Copie le template.** `assets/template.html` (dans ce skill) →
   `<repo-cible>/docs/plans/<AAAA-MM-JJ>-<sujet-kebab>.html`. Remplis TOUS les
   placeholders `{{…}}` ; le template est la structure obligatoire, pas une
   suggestion. Garde le TOC fixe (préférence utilisateur ferme sur tout
   document HTML long) — ajoute une entrée par lot. Chaque bloc de lot porte
   une ligne « Commit du lot » (`<code class="commit-msg">`) : remplis-la pour
   TOUS les lots, et impérativement pour le dernier (voir 5bis). Le gabarit
   contient aussi, en commentaire HTML juste avant la section des lots, une
   section optionnelle « Flotte parallèle » (`id="s-flotte"`) : laisse-la
   commentée pour un plan solo — seul le rôle ORCHESTRATEUR la décommente
   (Phase 2, étape 4bis). La section
   « Nice-to-have proposés » (`id="s-nice"`) doit finir avec AU MOINS 5
   sous-fonctionnalités adjacentes NON incluses dans les lots — l'utilisateur
   arbitrera à l'approbation : intégrer au chantier ou créer des chips.
   Attention à la frontière : un MUST-HAVE (la fonctionnalité est incomplète
   sans lui — ex. une app bilingue FR/EN qui gagne des annonces vocales doit
   offrir le choix de la langue de la voix) va dans les LOTS, jamais dans
   cette section.
4. **Bloc Intention.** Le pourquoi profond du chantier en 3-5 phrases. C'est
   le contrat d'intention : l'exécutant devra le restituer avant d'agir, et
   s'arrêter si sa restitution le contredit. Écris-le pour rendre ce test
   discriminant (pas une paraphrase du titre).
5. **Découpe les lots** selon les quatre exigences. Ordonne-les pour que
   chaque lot laisse un état livrable même si le run s'arrête là (les plus
   sûrs d'abord, les risqués isolés en fin). Si le chantier repose sur UN
   mécanisme central non trivial (effets, synchronisation, concurrence,
   machine à états), spécifie-le en INVARIANTS testables + un sketch de
   référence dans le plan, et envisage 30 minutes de prototype avant de
   figer : déboguer un mécanisme en prose par revue adversariale est le mode
   de débogage le plus cher qui existe (leçon persistance-ui : 4 rounds
   d'ultracode sur un seul hook).
5bis. **Le dernier lot est un lot de PROCESSUS — impose-lui le même format de
   message que les autres.** Un plan finit typiquement par un lot « clôture,
   revue, PR/rapport » qui ne produit pas de fonctionnalité. Écris dans le
   plan, en toutes lettres, le message de commit exact attendu pour CE lot
   (`<convention-du-projet>: lot N — Clôture…`), avec la mention que le
   travail de clôture ne doit PAS être commité sous un message libre du genre
   « correctifs de revue ». Raison : dans une chaîne de chantiers, le run
   suivant vérifie sa précondition par un `git log --grep` LITTÉRAL sur cette
   étiquette. Observé le 15/08/2026 : sur cinq chantiers, deux ont exécuté
   leur lot de clôture correctement mais l'ont commité sous un message libre
   — le run aval a compté zéro et aurait conclu que l'amont avait échoué. La
   substance était là, seule l'étiquette manquait.
   **Forme imposée (contrôlée par le lint du préflight, check 8, sévérité
   ERREUR)** : dans le dernier lot, un `<code class="commit-msg">` contenant
   le message avec l'étiquette `lot N` — le gabarit porte déjà la ligne
   « Commit du lot » dans son bloc de lot. Forme alternative acceptée : un
   `<pre class="cmd">` contenant `git commit -m "…: lot N — …"`. Un message
   dépourvu de l'étiquette `lot N` fait échouer le préflight, en citant le
   message libre trouvé à sa place.
6. **Assigne un agent par lot — jamais general-purpose par défaut.** Vérifie
   les subagents disponibles pour ce projet (liste d'agents de la session, ou
   `.claude/agents/` du repo cible). Si le projet en a déjà (implementer,
   ui-implementer, reviewer spécialisé…), chaque lot précise dans son champ
   Agent lequel dispatcher, en distinguant ce qui est mécanique/backend
   (implementer ou équivalent) de ce qui produit un changement visuel
   (ui-implementer ou équivalent). `general-purpose` est réservé aux projets
   qui n'ont PAS encore d'agents dédiés — ne l'utilise jamais par défaut si un
   agent du projet couvre déjà la tâche. Les lots qui engagent le run entier
   (clôture, PR, merge) restent explicitement chez l'orchestrateur : marque-les
   « aucun — reste chez l'orchestrateur ». Remplis aussi la section « Agents
   du projet » du template (§01).
7. **Enregistre dans Galley** (`html_review_register` avec le chemin absolu du
   plan) pour que l'utilisateur puisse annoter. Termine ton message par le
   lien direct `http://localhost:5179/html-review/<docId>`. Ne touche JAMAIS
   au bloc `ws-review-state` d'un plan déjà enregistré.
8. **Crée la conversation d'approbation au hub** (`cd
   ~/Desktop/my-projets/workstation && bun run convo create <slug-projet> -`,
   item `approval` avec le contexte et le lien Galley), puis lance
   `bun run convo watch <slug> <id>` en tâche de fond. Exception : si
   l'utilisateur a déjà approuvé le lancement explicitement dans la session,
   note-le dans la section Approbation du plan (qui a approuvé, quand, où) au
   lieu de bloquer sur une conversation.
9. **Relis en candide** avant de livrer : cherche « cette session », « comme
   convenu », un chemin relatif, un lot sans commande de vérification, une
   hypothèse implicite, un lot sans agent assigné. Chaque occurrence est un
   défaut à corriger. Cette relecture du document ENTIER se refait après
   CHAQUE lot de correctifs ultérieur (préflight compris) — et toute
   correction s'applique d'abord au niveau de la DÉCISION (section
   architecture/décisions) puis se propage aux lots concernés : un patch
   local dans un seul lot crée les contradictions que le round suivant
   remontera (leçon persistance-ui : ~20 % des findings étaient des
   régressions introduites par les correctifs eux-mêmes).
10. **Préflight obligatoire.** Invoque le skill `brief-preflight` EN PASSANT
    les arguments `<chemin-absolu-du-plan.html> <repo-cible>` (c'est ce qui
    déclenche le lint automatique en préprocessing) : lint déterministe
    (placeholders, chemins, scripts, ancres, structure, section
    nice-to-have, message de commit du lot de clôture, plage d'identifiants
    de la section flotte si elle existe), puis rounds ultracode adversariaux (7 lentilles, dont
    personas et projection à 6 mois/1 an/3 ans) jusqu'à ce qu'un round
    complet ne remonte plus rien qui change la substance du plan. Un plan
    jamais préflighté n'est pas livrable — c'est là que meurent les zones
    d'ombre, pas pendant le run.

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
5. **Exécute lot par lot, dans l'ordre.** Dispatche le travail du lot au
   subagent précisé dans son champ Agent — jamais `general-purpose` si le lot
   nomme un agent du projet, et jamais délégué du tout si le lot dit « reste
   chez l'orchestrateur ». Quand tu attends un sous-agent/workflow :
   préfère le **foreground** (`run_in_background: false`) quand rien d'autre
   ne peut avancer pendant l'attente — le résultat revient dans le même tour,
   sans polling. Si l'attente est en background, arme **UN SEUL**
   ScheduleWakeup de fallback (légitime hors mode `/loop`) puis **TERMINE LE
   TOUR** : la notification de fin de tâche ou le réveil te ré-invoque ; un
   second ScheduleWakeup (ou un `ListAgents`) dans le même tour est une boucle
   de polling, pas une attente (incident 2026-09-01, session 4b9a0b40 :
   132 réveils en 30 min, 126 à moins de 30 s d'écart, pendant que deux
   agents de correctif tournaient — le hook global
   `~/.claude/hooks/schedule-wakeup-guard.mjs` bloque désormais tout
   ré-armement à moins de 30 s). Ne termine JAMAIS un tour en attente nue non
   plus — sans fallback armé, surtout après un signal « no active task », la
   notification peut ne jamais venir (incident : 2 h 46 gelées, débloquées
   par un humain). La règle tient en une ligne : un réveil armé, puis fin de
   tour. Ne laisse pas le subagent committer :
   relis son diff et le verdict de la commande de vérification toi-même — et
   applique la même méfiance à ton PROPRE code (correctifs de rounds de
   revue, optimisations de ton cru) : il subit la même revue que celui des
   sous-agents, round suivant ou sous-agent relecteur ; les seuls bugs
   committés du run du 06/08 venaient de là. Si le code réel du repo
   contredit une affirmation du plan (patron, signature, comportement), le
   code fait foi — consigne l'écart et suis le code (un exécutant a recopié
   une « double condition » du plan alors qu'il avait le patron réel à TROIS
   branches sous les yeux). Après chaque lot : lance la commande de
   vérification du lot ; si elle passe, commit —
   `chantier(<slug-du-plan>): lot N — <titre du lot>` (jamais de ligne
   Co-Authored-By). Le git log EST le suivi d'avancement : ne modifie pas le
   plan HTML pour cocher des cases (il peut être annoté dans Galley au même
   moment). **Lot sous gate humain explicite** (validation User avant
   commit) : en run LOCAL, laisse le lot staged et signale-le ; en run CLOUD
   ÉPHÉMÈRE (routine claude.ai), le staged meurt avec la session — commite
   avec le préfixe `[GATE-HELD]` devant le message normal
   (`[GATE-HELD] chantier(<slug>): lot N — <titre>`). Le git log est alors le
   carrier de l'état « en attente de validation humaine » — un plan
   brief-chantier n'a pas de case à cocher et ne se modifie pas pendant
   l'exécution : la relecture du matin retrouve les gates par
   `git log --grep "GATE-HELD"`, et le rapport final les liste. Le préfixe
   préserve le `git log --grep 'chantier(<slug>): lot N'` des runs aval.
6. **Fin de run.** Lance les commandes de vérification globales du plan. Si le
   chantier touche l'UI : vérification navigateur clair + sombre avant de
   conclure — lance le dev server du repo CIBLE en Bash (`bun run dev` dans le
   repo du plan) ; les outils `preview_*` du harnais sont liés à la racine de
   la session, pas au repo cible, et démarreraient le mauvais serveur. Puis
   hygiène machine : relâche le verrou global (`sh ~/.claude/scripts/night-run-lock.sh release`
   — oublié par le run Opus du 2026-09-08, seule violation de protocole de
   la nuit), arrête tout serveur dev que tu as lancé, ne laisse aucun
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

### Le cas que « échec de vérification » ne couvre pas : l'impossibilité découverte

Le protocole ci-dessus se déclenche quand une vérification ÉCHOUE. Il existe
un mode d'échec plus coûteux qu'il ne couvre pas : **le lot passe tous ses
tests, et pourtant la fonctionnalité qu'il construit ne peut pas fonctionner
avec des données réelles.** Typiquement parce que les tests l'exercent avec
des entrées synthétiques, alors qu'une dépendance nécessaire (référentiel,
droit d'accès, colonne, service tiers) n'est pas résoluble dans le périmètre
de fichiers du chantier.

Observé le 15/08/2026 sur une vague de chantiers parallèles : un lot a établi
qu'un validateur rejetterait TOUTE donnée réelle, l'a honnêtement écrit dans
un commentaire de tête du fichier… et cinq lots ont été construits par-dessus.
La dette n'a été consignée au backlog que deux vagues plus tard, par le
chantier d'intégration. Le run n'avait rien violé : le standard ne prévoyait
pas ce cas. C'est le trou que cette section ferme.

Dès qu'un lot établit une impossibilité fonctionnelle :

1. **Écris l'entrée de backlog IMMÉDIATEMENT**, au lot où la découverte est
   faite — pas à la clôture. Un commentaire de tête dans le code n'est PAS
   une disposition : il est invisible pour quiconque n'ouvre pas ce fichier.
2. **Nomme-la en tête du rapport du run**, pas noyée dans la liste des
   findings.
3. **Ne construis pas plus de deux lots supplémentaires par-dessus sans
   réévaluer.** Si les lots suivants n'ont de valeur QUE si la fonctionnalité
   marche, arrête-toi et ouvre un chip : continuer produit du code vert que
   personne ne peut utiliser, et le coût de la découverte est payé deux fois.
4. **Le rapport final le dit en une phrase actionnable** : « livré et vert,
   mais inopérant tant que X n'est pas résolu ».

Le test qui tranche, à poser à chaque lot qui touche un chemin de bout en
bout : *si on livrait ça aujourd'hui, l'utilisateur final pourrait-il s'en
servir ?* Si la réponse est non alors que tes tests sont verts, tu es
exactement dans ce cas — et « mes tests passent » n'est pas une réponse.

Contrairement aux règles 5bis (message de commit du lot de clôture) et 4bis
(plages d'identifiants), celle-ci n'est PAS contrôlée par le lint du préflight
et ne le sera pas : elle décrit un comportement d'EXÉCUTION, pas une propriété
du document. Aucun contrôle statique sur un plan ne peut l'attraper. Elle reste
de la doctrine pure, portée par ta vigilance à l'exécution et par les lentilles
« mécanique du domaine » et « candide » du préflight.

## Orchestrer une flotte de chantiers (rôle ORCHESTRATEUR)

Protocole validé de bout en bout le 06/08/2026 sur workstation : 4 chantiers
file-disjoints (13 chips) exécutés en parallèle en ~2 h 30 wall-clock (vs
~7 h 45 en séquentiel), 4 PRs, zéro conflit de merge, revues convergées en
≤ 3 rounds chacune, gates verts sur le main intégré. Chaque étape ci-dessous
existe parce que son absence a un mode d'échec observé.

### Phase 1 — Inventaire et regroupement

1. **Inventaire complet.** `bun run chips list` + `chips read <id>` pour CHAQUE
   chip du périmètre ; si l'utilisateur désigne d'autres sources (reminders —
   `bun run remind list` —, notes du hub, annotations Galley), lis-les
   intégralement. Respecte les exclusions explicites de l'utilisateur.
2. **Regroupe en chantiers FILE-DISJOINTS.** Identifie la surface d'ÉDITION de
   chaque item (les fichiers modifiés, vérifiés par grep — pas devinés). Deux
   items qui éditent le même fichier vont dans le MÊME chantier, ou dans deux
   chantiers avec un ORDRE DE MERGE documenté dans les deux plans. Consommer
   une API en lecture n'est pas un chevauchement — l'éditer, si. 3 à 5
   chantiers ; maximum ~4 sessions parallèles par machine (au-delà, la
   contention CPU produit des flakes de test dans la majorité des sessions).
3. **Un fait rapporté par UN seul agent d'exploration se re-vérifie par grep
   direct avant d'entrer dans un plan** (deux erreurs réelles d'un explorateur
   sont passées dans un plan le 05/08 : entrée de backlog déclarée
   inexistante, liste d'importeurs fausse).

### Phase 2 — Authoring des briefs (rôle AUTEUR × N)

4. Établis la **baseline verte UNE fois** (commandes de fin de run sur main),
   cite le même commit/verdict dans les N plans. Puis déroule le rôle AUTEUR
   complet pour chaque plan — les 10 étapes, préflight compris. Les rounds de
   préflight des N plans peuvent tourner EN PARALLÈLE (un Workflow par plan,
   lentilles sonnet/medium — jamais le modèle de session pour les lentilles).
4bis. **Alloue des PLAGES d'identifiants disjointes à chaque chantier, avant
   de lancer.** Tout compteur global alloué par script au moment de l'écriture
   (identifiants de backlog différé, numéros de migration, IDs de règle…) est
   aveugle aux branches sœurs non fusionnées : N chantiers parallèles partis
   du même socle appelleront l'allocateur et recevront tous LE MÊME numéro.
   Observé le 15/08/2026 : trois chantiers parallèles ont chacun alloué le
   même identifiant de backlog à trois findings différents, et la collision
   n'est apparue qu'à la fusion. Ce n'est la faute d'aucun run — c'est une
   faille structurelle du parallélisme. Donc : lis le compteur UNE fois,
   réserve une plage par chantier (ex. chantier A : 121-130, B : 131-140), et
   écris la plage attribuée dans chaque plan. À défaut, le plan du run
   d'INTÉGRATION doit contenir un lot explicite de détection et de
   renumérotation des collisions, exécuté après les merges et avant son gate.
   **Forme imposée (contrôlée par le lint du préflight, check 9, sévérité
   ERREUR)** : décommente dans chaque plan de la vague la section optionnelle
   `id="s-flotte"` du gabarit (§02b, livrée en commentaire HTML, juste avant
   la section des lots) et remplis ses trois marqueurs — nom de la vague
   (`<span class="flotte-nom">`), chantiers frères
   (`<ul class="flotte-freres">`, ≥ 1 `<li>`), et plage réservée à CE chantier
   (`<code class="plage-ids">`, une plage bornée `N-M`, ou littéralement
   « aucun compteur global » si ce chantier n'alloue aucun identifiant par
   script). Décommente aussi la ligne de TOC correspondante. Un plan SOLO
   laisse la section commentée : le check est alors totalement silencieux.
   **Puis vérifie la DISJONCTION avec le lint de vague — obligatoire, avant
   tout dispatch.** Le lint mono-plan ne voit qu'un document : il constate
   qu'une plage est déclarée, jamais qu'elle est disjointe, et un plan qui a
   « oublié » de décommenter sa section passe pour solo. Les deux trous se
   ferment en prenant les N plans ensemble :
   ```bash
   node ~/.claude/skills/brief-preflight/scripts/preflight-flotte.mjs <répertoire-des-plans> [--depuis <N>]
   ```
   Il échoue sur : un plan de la vague sans section flotte, une collision de
   plages sur un même compteur, des noms de vague divergents, une plage
   démarrant sous le plancher `--depuis <N>` (identifiants déjà pris sur main).
   `--depuis` = la valeur du compteur lue UNE fois sur main à l'étape ci-dessus.
   VERDICT FAIL = réattribue les plages avant de lancer quoi que ce soit : après
   dispatch, la collision ne se découvre plus qu'à la fusion, quand les deux
   identifiants sont déjà écrits dans deux backlogs. Le lot de renumérotation du
   run d'intégration reste le filet de dernier recours, pas le contrôle
   principal.
   **Ce n'est pas facultatif : un Stop hook global l'impose** (`~/.claude/hooks/
   flotte-plage-gate.mjs`). Dès qu'une session a écrit ≥ 2 plans partageant un
   `flotte-nom`, elle ne peut pas s'arrêter tant qu'un run PASS de
   `preflight-flotte.mjs` ne couvre pas ces plans À LEUR CONTENU ACTUEL — rééditer
   un plan après coup périme la preuve. Le hook ne vérifie rien lui-même : il exige
   la preuve, toute la logique vit dans le lint. Échappatoire si le contrôle ne
   s'applique vraiment pas (plans d'exemple, vague déjà dispatchée) : écrire
   « FLOTTE-EXEMPT: &lt;raison&gt; » dans la réponse. Smoke test rejouable :
   `sh ~/.claude/hooks/tests/flotte-plage-gate.smoke.sh` (11 scénarios, doit finir
   `SMOKE OK`). Hook Claude Code uniquement — pas de miroir Codex à ce jour.
5. Chaque plan contient en plus, obligatoirement : la branche
   (`chantier/<slug>`), le worktree (`.claude/worktrees/<slug>`, gitignoré),
   la dérogation documentée au verrou night-run (les runs parallèles sont
   VOULUS : reaper au démarrage, machine-guard en filet, re-lancer une suite
   qui flake SEULE une fois avant de conclure), l'ordre de merge si un
   chevauchement existe, et « `bun run redeploy` requis après merge » si
   `server/**` est touché.
5bis. **Pré-vol des hooks bloquants depuis un worktree — avant tout
   dispatch.**
   Chaque hook gate qui s'interposera sur le chemin des chantiers (ex.
   `adversarial-pr-guard.mjs` sur `gh pr create`, guards de commit) se
   smoke-teste UNE fois depuis un worktree jetable (ou le premier worktree
   créé) : simule l'appel (payload minimal sur stdin, ou la commande gardée
   en dry-run) et vérifie que le hook résout bien le contexte du WORKTREE
   (HEAD, git-dir, cwd) et non celui du repo principal. Un hook incompatible
   worktree bloquera N chantiers au même endroit et mettra chaque agent sous
   pression de contournement — c'est exactement l'incident du 14/08/2026
   (hook résolvant HEAD via le cwd du repo principal →
   gate insatisfiable → sous-agent qui fabrique un faux sentinel dans le
   `.git` partagé). Hook cassé = on corrige le hook AVANT de lancer la
   flotte, jamais l'inverse. Pour `adversarial-pr-guard`, un smoke-test
   rejouable existe : `sh ~/.claude/hooks/tests/adversarial-pr-guard.smoke.sh`
   (4 scénarios, dont celui de l'incident) — il doit finir `SMOKE OK`.

### Phase 3 — Goal prompts (livrable de la session d'authoring)

6. Termine par UN bloc de goal prompt PAR chantier, collable verbatim dans une
   session neuve : modèle recommandé (défaut : orchestrateur Sonnet high +
   implémenteur Sonnet medium ; sécurité/concurrence sensible : Opus high),
   création du worktree + branche, exécution du plan au rôle EXÉCUTANT, revue
   adversariale post-implémentation (skill `adversarial-pr-review`) jusqu'à un
   round vide, **menée par des SOUS-AGENTS parallèles et non par l'outil
   `Workflow`/ultracode dès que le run est NON SUPERVISÉ** (l'outil de
   workflow redemande une confirmation humaine explicite à chaque lancement,
   y compris sous un mode de permission permissif : observé le 15/08/2026, un
   chantier sur trois s'est bloqué là où les deux autres, en sous-agents
   parallèles, ont mené la même revue sans une seule interruption — même
   instruction, trois lectures, parce que l'outil n'était pas nommé), PR
   (jamais de merge par l'exécutant), rapport dans la
   conversation hub du plan, chips clos/créés, hygiène machine. Chaque goal
   prompt contient aussi, verbatim, ces deux clauses de sécurité :
   - **Interdiction absolue de fabriquer un sentinel de revue.** Le fichier
     `.adversarial-review-passed` (ou tout autre sentinel de gate) n'est posé
     QUE par le flow légitime du skill de revue, depuis le worktree avec un
     `cd` explicite — jamais écrit à la main, jamais dans le `.git` partagé
     du repo principal. Si un hook gate bloque alors que la revue a réellement
     été faite, c'est un échec d'INFRA : protocole arrêt-et-chip + remontée à
     l'orchestrateur — un contournement de garde-fou est un incident de
     sécurité, pas une solution (incident T77, 14/08/2026 : faux sentinel au
     SHA de master écrit dans le `.git` partagé, contaminant potentiellement
     les 3 chantiers).
   - **Heartbeat.** Au minimum à chaque fin de tâche/lot, envoyer un statut à
     l'orchestrateur (SendMessage) — un chantier silencieux est indistinguable
     d'un chantier mort.

### Phase 3bis — Surveillance du run (watchdog — obligatoire)

Dès que les chantiers tournent en arrière-plan, l'orchestrateur ne « attend »
pas : il surveille. L'absence de notification n'est JAMAIS une preuve de
progression — les sessions d'arrière-plan peuvent être tuées (limite de
session, 529) sans réémettre de notification (incident T89, 14/08/2026 :
295 min de silence total, détecté par l'HUMAIN, bénéfice du parallélisme
détruit).

1. **Tick périodique (30-45 min)** — ScheduleWakeup ou Monitor armé en
   permanence tant qu'au moins un chantier n'a pas livré sa PR. À chaque
   tick, pour CHAQUE chantier : vérité disque du worktree (`git -C <worktree>
   log --oneline -1` + mtime des fichiers récents) comparée au dernier point
   connu, et présence dans `ListAgents`. Écris la consigne de surveillance
   COMPLÈTE (chantiers, worktrees, quoi vérifier, quand relancer) dans le
   `prompt` du ScheduleWakeup lui-même — ce texte est réinjecté à chaque
   réveil et SURVIT à la compaction, contrairement au présent skill (une
   session-orchestrateur nocturne compacte : celle du 14/08 l'a fait 2 fois).
2. **Disque immobile + absent de ListAgents = mort.** Relance par SendMessage
   avec l'état exact vérifié sur disque (commits présents, travail non
   commité, verdicts de revue déjà reçus) — jamais « reprends » à vide.
3. **Vérification post-relance (≤ 10 min).** Une réponse « resumed » n'est pas
   une preuve : re-vérifier que le disque bouge (nouveau mtime/commit) dans
   les 10 min qui suivent toute relance ; sinon re-relancer ou escalader à
   l'utilisateur. (Les relances « resumed from transcript » de T89 n'avaient
   relancé aucun travail réel.)
4. **Journal de surveillance.** Chaque tick loggue une ligne d'état par
   chantier (dernier commit, âge du dernier mtime) — c'est ce qui permet de
   répondre « où en est X ? » sans fouiller, et de détecter la dérive de
   cadence entre chantiers censés finir ensemble.

### Phase 4 — Clôture du run parallèle (nouvelle session, après les PRs)

7. **Revue avant merge.** Établis une baseline verte sur main (typecheck +
   build + test) AVANT le premier merge. Lis les rapports hub des N sessions
   ET le rapport final / la description de chaque PR (vérifie le sentinel de
   revue adversariale avant de merger — pas de merge sur une PR qui ne l'a
   pas) ; vérifie PRs/branches/worktrees ; spot-checke par lecture directe les
   invariants les plus porteurs de chaque plan dans le code livré.
8. **Merge local dans l'ordre documenté** (`git merge --no-ff`, message
   « Merge pull request #N … »), avec AU MINIMUM un typecheck après CHAQUE
   merge (attribution des régressions au bon diff), puis **rejoue les gates
   COMPLETS sur le main intégré AVANT de pousser** — obligatoire : c'est la
   première fois que les N diffs coexistent, et sans CI GitHub le « vert » des
   PRs n'est qu'auto-déclaré. Push (marque les PRs merged).
9. **`bun run redeploy` si `server/**` a bougé**, puis vérification santé qui
   prouve que le NOUVEAU code est servi (appelle une route ajoutée par le
   run, pas juste `/`).
10. **Nettoyage garanti** : `git worktree remove` × N + `prune`, suppression
    des branches locales ET distantes, commit des plans HTML dans
    `docs/plans/` du main. Puis session review honnête (rounds, écarts,
    temps par chantier) et capture brain/frictions.

## Hors périmètre

Les briefs documentaires (offres, playbooks, checklists, recherches) ne
passent pas par ce standard — ils n'ont ni lots ni runs nocturnes. Ne force
pas un plan de chantier là où une page suffit.
