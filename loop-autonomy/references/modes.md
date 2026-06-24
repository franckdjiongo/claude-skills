# Modes d'exécution — détail opérationnel

Trois modes, du plus simple au plus isolé. Tous partagent la discipline par
item du SKILL.md ; ce fichier ne décrit que le MOTEUR de chaque mode (ce qui
déclenche l'item suivant et ce qui arrête la boucle).

## Mode A — Session + /goal (l'utilisateur est présent)

Tu es l'orchestrateur : tu boucles toi-même sur la file jusqu'à épuisement ou
caps. Le risque connu de ce mode est l'arrêt prématuré (tu déclares « terminé »
trop tôt) — c'est exactement ce que `/goal` corrige : un évaluateur
indépendant (petit modèle séparé) vérifie ta condition après CHAQUE tour et te
force à continuer si elle n'est pas atteinte.

`/goal` est une commande UTILISATEUR — tu ne peux pas l'invoquer toi-même.
Au lancement, imprime la ligne exacte à coller, construite sur ce gabarit :

```
/goal node <chemin>/loop-queue.mjs report ne montre plus aucun item PENDING,
OU les caps du run sont atteints (<maxItemsPerRun> items / <maxMinutes> min) ;
chaque item DONE a un commit cité dans le rapport et <validate> est sorti à 0 ;
les items DECISION_PENDING/QUARANTINED/PLAN_REQUIRED comptent comme terminaux.
```

Deux pièges à éviter dans la condition :
- **Les états terminaux non-DONE doivent être acceptables** (DECISION_PENDING,
  QUARANTINED, caps atteints), sinon l'évaluateur te fait tourner à vide sur
  des items que tu ne peux pas résoudre.
- **L'évaluateur ne voit que la conversation** : affiche le `report` de la
  file à la fin de chaque item, sinon il juge à l'aveugle.

## Mode B — Session + /loop rythmé (étaler la consommation)

Même boucle que le mode A, mais UN item par tick au lieu d'enchaîner. La
raison d'être : sur souscription, la contrainte réelle est la **limite d'usage
par fenêtre de 5 h** — enchaîner 8 items peut te coller au plafond ; un item
toutes les 20-30 minutes étale la charge sur la nuit.

Invoque le skill `loop` (celui-là, tu PEUX l'invoquer) avec un prompt qui
traite exactement un item :

```
/loop 25m traite le PROCHAIN item PENDING de <queue> selon la discipline
loop-autonomy (un subagent frais, validate foreground, un commit, mark) puis
affiche le report. Si plus aucun PENDING ou caps atteints : écris le rapport
final et ARRÊTE la boucle.
```

Combine avec `/goal` (mode A) si l'utilisateur veut la double sécurité.
Limites honnêtes du mode : tout vit dans UNE session (le contexte s'use —
au-delà de ~10-12 items, préfère le mode C), la session doit rester ouverte,
et les tâches `/loop` expirent après 7 jours.

## Mode C — Tâches planifiées Desktop (nuit / absence)

Le plus proche d'un driver externe : chaque tick ouvre une session FRAÎCHE qui
traite UN item puis se termine. Contexte vierge par item, et bonus : la
session N+1 commence par re-vérifier l'item de la session N en contexte neuf —
meilleure séparation implémenteur/vérificateur que tout autre mode.

**Avant de créer quoi que ce soit : confirmation explicite de l'utilisateur**
(les tâches planifiées survivent à la session et tournent sur sa machine).

Crée la tâche avec `mcp__scheduled-tasks__create_scheduled_task` (intervalle
20-40 min, selon la taille des items), avec un prompt construit sur ce
gabarit — chaque élément a une raison d'être, n'en retire pas :

```
Tu exécutes UN tick de la boucle loop-autonomy du projet <chemin>.
0. GARDES D'ENTRÉE : si <queue-dir>/STOP existe, sors immédiatement (arrêt
   d'urgence demandé par l'utilisateur). Vérifie que tu es sur la branche
   loop/* avec un arbre git propre — sinon sors en le signalant, ne répare pas.
1. LOCK : si <queue-dir>/loop.lock existe et a moins de 90 min, sors
   immédiatement (un tick précédent tourne encore). Sinon crée-le.
2. VÉRIF DIFFÉRÉE : si le report montre un item marqué DONE au tick précédent,
   re-lance <validate> et vérifie son commit ; s'il ment, re-marque FAILED et
   reset. (Tu es en contexte vierge : ta vérification vaut plus que la sienne.)
3. UN ITEM : prends le prochain PENDING (node <chemin>/loop-queue.mjs next),
   applique la discipline par item du skill loop-autonomy (re-triage, subagent
   frais, validate foreground, un commit, mark).
4. CLÔTURE : affiche le report, supprime le lock, termine. Si plus aucun
   PENDING ou caps atteints : écris le rapport final <queue-dir>/loop-report-
   <date>.md et DEMANDE la mise en pause de cette tâche planifiée dans ta
   réponse.
Ne traite JAMAIS plus d'un item. Jamais claude -p. Jamais git add -A.
```

Contraintes réelles à annoncer à l'utilisateur : le Mac doit rester éveillé
(`caffeinate -d` ou réglages d'alimentation) et l'app Claude Code Desktop
ouverte ; le mode permissions de la tâche doit couvrir les commandes du projet
(sinon le tick échoue proprement — c'est préférable à un bypass). Arrêt
d'urgence : `touch <queue-dir>/STOP` (checké en garde d'entrée de chaque tick)
puis mettre la tâche planifiée en pause.

## Choisir (et combiner)

- Présent et pressé → **A**. Présent mais limites d'usage serrées → **B**.
- Nuit, absence, ou file > 10 items → **C**.
- Les modes se combinent dans le temps : A pour le dry-run du premier item
  (toujours recommandé), C pour le reste de la file.
