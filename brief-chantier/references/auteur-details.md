# Rôle AUTEUR — détails par étape

Complète les étapes 0 à 10 de `SKILL.md` § Écrire un plan. Rien ici n'assouplit les règles dures A1 à A5 et G.

## Étape 2 — Explorer, baseline, points de contrôle humains

- L'état du repo se constate sur disque, jamais de mémoire. Ce qui est écrit dans « État du repo » doit être
  vrai à la minute de l'écriture.
- Vérifie chaque fait INDIVIDUELLEMENT : un grep groupé multi-cibles (`a\|b\|c`) dit qu'au moins une cible
  matche, pas que chacune matche.
- Ne recopie jamais une énumération ou une valeur du code : cite sa référence (`SYMBOLE`, `fichier:ligne`),
  vérifiée en lisant le fichier à l'écriture. Une copie dérive dès que le code bouge, une référence non.
- Le gate d'état du repo s'exprime en fichiers touchés (« aucun fichier du chantier modifié depuis la
  baseline »), jamais en SHA exact de HEAD : les runs parallèles rendent un SHA épinglé périmé.
- Baseline verte : lance les commandes de fin de run sur l'état de départ AVANT d'écrire le plan. Une étape
  déjà rouge produit un faux échec la nuit : corrige-la, ou documente-la comme « rouge pré-existant connu »
  avec la conduite à tenir.
- Même exigence pour les DONNÉES : chaque vérification navigateur ou scénario prescrit doit être exerçable
  avec les données réellement présentes, sinon le plan prescrit le seed ou la fixture qui les crée.
- Points de contrôle humains (approbation hub, déploiement prod, action bloquée par le classificateur du mode
  auto) : recense-les dès l'écriture et séquence-les en DÉBUT de run. Toute écriture dans les fichiers de
  configuration des hooks de l'utilisateur est refusée à un agent, même avec autorisation écrite : le
  câblage d'un hook est un point de contrôle HUMAIN, à inscrire tel quel avec la commande à lancer.
- Lot sous gate humain avant commit : formule-le selon le mode du run (local : travail laissé staged ; cloud
  éphémère : commit préfixé `[GATE-HELD]`, voir `commits-et-cloud.md`).

## Étape 3 — Gabarit

- Chaque bloc de lot porte une ligne « Commit du lot » (`<code class="commit-msg">`) : remplis-la pour TOUS
  les lots, et impérativement pour le dernier.
- La section optionnelle « Flotte parallèle » (`id="s-flotte"`) est livrée en commentaire HTML avant la
  section des lots : seul le rôle ORCHESTRATEUR la décommente.
- Frontière nice-to-have / must-have : un must-have (la fonctionnalité est incomplète sans lui, ex. choix de
  la langue d'une voix dans une app bilingue) va dans les LOTS, jamais dans `s-nice`. L'exécutant
  n'implémente rien de `s-nice` : l'utilisateur arbitre à l'approbation (lots ou chips).
- Les lignes de règles du gabarit sont lues par le lint (check 11) : `Budget total`, `Chips`,
  `Fiche d'intention` (la ligne `Revue` est informative). Aucune formule du type « jusqu'à convergence » ni « y compris les mineurs ».

## Étape 5 — Lots

- Ordonne pour que chaque lot laisse un état livrable si le run s'arrête là : les plus sûrs d'abord, les
  risqués isolés en fin.
- Un mécanisme central non trivial (effets, synchronisation, concurrence, machine à états) se spécifie en
  INVARIANTS testables plus un sketch de référence ; envisage 30 minutes de prototype avant de figer.
  Déboguer un mécanisme écrit en prose par revue adversariale est le débogage le plus cher.
- Chaque lot donne son estimation en heures : c'est la base du disjoncteur A5 (arrêt au double).
- **5bis, dernier lot de PROCESSUS.** Écris en toutes lettres le message de commit exact du lot de clôture
  (`<convention-du-projet>: lot N — Clôture…`) et interdis un message libre du genre « correctifs de revue » :
  le run suivant d'une chaîne vérifie sa précondition par un `git log --grep` littéral sur l'étiquette.
  Forme contrôlée (lint check 8) : `<code class="commit-msg">` portant `lot N`, ou
  `<pre class="cmd">` contenant `git commit -m "…: lot N — …"`.
- **5ter, périmètre et doublures de test.** Tout besoin hors liste de fichiers est un arrêt et une question
  au hub, sauf la classe pré-autorisée du paragraphe `classe-doublures` (gabarit §03, à recopier tel quel) :
  ajout du seul nouveau membre dans des doublures, fixtures ou mocks ; aucune valeur existante, aucun
  snapshot, aucune assertion touchés ; aucun test sauté ; aucun fichier de production hors liste ; fichiers
  nommés avec leurs lignes ajoutées dans le commit et le rapport ; vérification par le relecteur ; une seule
  passe de réparation par lot. Tu peux restreindre la classe, jamais l'élargir (lint check 10).

## Étape 6 — Agents

Vérifie les subagents du projet (liste de la session, dossier d'agents du repo cible). Distingue le
mécanique/backend (implementer ou équivalent) du visuel (ui-implementer ou équivalent). `general-purpose`
est réservé aux projets sans agents dédiés. Remplis aussi la section « Agents du projet » du gabarit (§01).

## Étape 9 — Relecture en candide

Cherche « cette session », « comme convenu », un chemin relatif, un lot sans commande de vérification, une
hypothèse implicite, un lot sans agent. Chaque occurrence est un défaut. La relecture du document ENTIER se
refait après chaque lot de correctifs, préflight compris. Toute correction s'applique d'abord à la DÉCISION
(section architecture ou décisions) puis se propage aux lots : un patch local dans un seul lot crée les
contradictions que le round suivant remontera.
