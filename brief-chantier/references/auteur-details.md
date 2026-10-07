# Rôle AUTEUR — détails par étape

Complète les étapes 0 à 10 de `SKILL.md` § Écrire un plan. Rien ici n'assouplit les règles dures.

## Étape 2 — Explorer, baseline, points de contrôle humains

- L'état du repo se constate sur disque, jamais de mémoire.
- Vérifie chaque fait INDIVIDUELLEMENT : un grep groupé (`a\|b\|c`) dit qu'au moins une cible matche, pas
  que chacune matche.
- Ne recopie jamais une énumération ou une valeur du code : cite sa référence (`SYMBOLE`, `fichier:ligne`).
  Une copie dérive avec le code, une référence non.
- Le gate d'état s'exprime en fichiers touchés (« aucun fichier du chantier modifié depuis la baseline »),
  jamais en SHA de HEAD : les runs parallèles le périment.
- Baseline verte : lance les commandes de fin de run sur l'état de départ AVANT d'écrire. Une étape déjà
  rouge est corrigée, ou documentée « rouge pré-existant connu » avec la conduite à tenir.
- Les DONNÉES aussi : chaque vérification navigateur ou scénario doit être exerçable avec les données
  réellement présentes, sinon le plan prescrit le seed ou la fixture.
- Points de contrôle humains (approbation hub, déploiement prod, action refusée par le mode auto, câblage
  d'un hook : un agent n'écrit jamais dans la configuration de hooks de l'utilisateur) : recensés dès
  l'écriture et placés en DÉBUT de run. Lot sous gate humain : voir `commits-et-cloud.md`.

## Étape 3 — Gabarit

- Lignes de règles lues par le lint (check 10), FR ou EN : `Budget total : <cible> / <plafond>` |
  `Total budget:` ; `Chips : autorisés|interdits` | `Chips: allowed|forbidden` ; `Fiche d'intention : <chemin>` |
  `Intent sheet:` ; `Doublures de test : aucune|règle standard` | `Test doubles: none|standard rule` ;
  `Dépend de : <slug>|aucun` | `Depends on:` (vague). La ligne « Revue » est informative.
- Frontière nice-to-have / must-have : un must-have (la fonctionnalité est incomplète sans lui) va dans les
  LOTS, jamais dans `s-nice`. L'exécutant n'implémente rien de `s-nice` ; l'utilisateur arbitre à
  l'approbation.
- `s-flotte` est livrée en commentaire : seul l'ORCHESTRATEUR la décommente.

## Étape 5 — Lots

- Lot 1 = tranche verticale minimale que la preuve de la fiche exécute ; chaque lot suivant ajoute une garantie
  en gardant cette preuve verte.
- Un mécanisme central non trivial (effets, concurrence, machine à états) se spécifie en INVARIANTS testables
  plus un sketch ; envisage 30 minutes de prototype avant de figer.
- L'estimation en heures donne l'estimation en lignes de chaque lot, dont le double déclenche le disjoncteur A5.
- **Dernier lot de PROCESSUS.** Écris en toutes lettres son message de commit (`chantier(<slug>): lot N —
  Clôture…`), jamais un message libre : le run suivant d'une chaîne le cherche par `git log --grep`. Forme
  contrôlée (lint check 8) : `<code class="commit-msg">` portant `lot N`.
- **Doublures de test.** La ligne `Doublures de test` du plan vaut `aucune` ou `règle standard`. Règle
  standard, écrite ici une seule fois : quand un changement du chantier (signature, contrat, membre
  obligatoire) casse d'anciens tests SEULEMENT parce que leurs doublures, fixtures ou mocks n'ont pas le
  nouveau membre, l'exécutant les complète, en UNE passe par lot, si (1) il ajoute le seul nouveau membre :
  aucune valeur existante, snapshot ou assertion modifiée, aucun test sauté ; (2) aucun fichier de production
  hors liste n'est touché ; (3) chaque fichier touché est nommé avec ses lignes ajoutées dans le commit et le
  rapport. Encore rouge, ou autre cause : arrêt-et-chip. Tout autre besoin hors liste : arrêt et question au
  hub. Un plan peut restreindre la règle, jamais l'élargir.

## Étape 6 — Agents

Vérifie les subagents du projet (liste de session, dossier d'agents du repo cible) : mécanique/backend
(implementer) distinct du visuel (ui-implementer). `general-purpose` est réservé aux projets sans agents
dédiés.

## Étape 9 — Relecture en candide

Cherche « cette session », « comme convenu », un chemin relatif, un lot sans check ni agent, une
hypothèse implicite : chaque occurrence est un défaut. Relis le document ENTIER après chaque lot de
correctifs, préflight compris. Corrige d'abord la DÉCISION (architecture ou décisions), puis propage aux lots :
un patch local dans un seul lot crée les contradictions que le round suivant remontera.
