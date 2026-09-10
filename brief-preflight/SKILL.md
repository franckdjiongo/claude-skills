---
name: brief-preflight
description: >-
  Pré-analyse d'un plan brief-chantier AVANT exécution : lint déterministe
  (script auto-exécuté à l'invocation) puis rounds ultracode adversariaux
  (7 lentilles dont personas et projection dans le futur) jusqu'à zéro zone
  d'ombre, avec triage must-have / nice-to-have. Ne s'applique qu'aux plans
  au standard brief-chantier, pas aux documents libres.
when_to_use: >-
  Use this skill whenever un brief-chantier vient d'être écrit ou corrigé et
  doit être validé avant de livrer le goal prompt — triggers : « préflight »,
  « pré-analyse du brief », « zones d'ombre », « valide le brief-chantier »,
  « lance l'ultracode sur le plan » — et SYSTÉMATIQUEMENT en fin de rôle
  AUTEUR du skill brief-chantier (qui l'invoque comme étape 10 obligatoire,
  en passant le chemin du plan et le repo cible en arguments).
argument-hint: "<plan.html> <repo-cible> [--legacy]"
arguments: [plan, repo, flags]
allowed-tools:
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/preflight-lint.mjs *)
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/preflight-flotte.mjs *)
---

# Brief-preflight — zéro zone d'ombre avant exécution

Un brief-chantier est exécuté par un modèle moindre, une nuit, sans personne
à qui poser une question. Chaque ambiguïté, fait faux ou contradiction du plan
devient soit un run arrêté, soit — pire — un run qui « réussit » en livrant
autre chose. Ce skill valide le plan en DEUX couches, dans cet ordre :
d'abord tout ce qui peut se vérifier DÉTERMINISTIQUEMENT (un script, pas un
jugement), puis ce qui exige du jugement (rounds ultracode adversariaux).
L'invocation de ce skill par brief-chantier ou par l'utilisateur VAUT opt-in
ultracode pour les workflows décrits ici.

Leçon d'origine (chantier persistance-filtres-onglets, 08/2026) : 11 rounds
pour converger, dont ~40 % de défauts d'auteur évitables, ~20 % de régressions
introduites par les correctifs eux-mêmes, et ~30 % de débogage de conception
en prose. Ce skill existe pour ramener ça à 2-5 rounds.

## Modèles — épinglage volontairement asymétrique

- **Les 7 lentilles** tournent TOUJOURS en agents `model: 'sonnet'`,
  `effort: 'medium'` — épinglés dans les opts du Workflow (étape 1), donc
  indépendants du modèle de la session. L'alias `sonnet` suit automatiquement
  le dernier Sonnet publié (5.8, 5.9…) — ne jamais y mettre un id daté.
- **Le triage** (étape 2) reste au modèle de la SESSION — c'est voulu : le
  jugement des findings et la correction du plan reviennent au modèle fort
  qui fait l'authoring. Ne pas ajouter de `model:` au frontmatter de ce
  skill : il dégraderait le triage au niveau des lentilles.

## Étape 0 — Lint déterministe (auto-exécuté à l'invocation)

Le verdict ci-dessous a été produit par préprocessing AVANT que tu lises ces
lignes — c'est la sortie réelle du script sur le plan passé en argument :

!`node "${CLAUDE_SKILL_DIR}/scripts/preflight-lint.mjs" $plan $repo $flags 2>&1 || true`

Si le bloc ci-dessus montre un usage/erreur d'arguments (invocation sans
args), relance à la main :

```bash
node ${CLAUDE_SKILL_DIR}/scripts/preflight-lint.mjs <chemin-absolu-du-plan.html> <repo-cible> [--legacy]
```

Le script vérifie mécaniquement, dans cet ordre :

1. placeholders `{{…}}` résiduels ;
2. phrases interdites (« cette session », « comme convenu »…) ;
3. existence de chaque chemin absolu cité ;
4. existence de chaque script `bun run <x>` dans le package.json du repo cible ;
5. validité des ancres `fichier.ext:ligne` (fichier trouvable, ligne dans la plage) ;
6. structure du plan (sections obligatoires, chaque lot avec Agent + commande de
   vérification + critère DONE, TOC alignée sur les lots) ;
7. section « Nice-to-have proposés » avec ≥ 5 items ;
8. **lot de CLÔTURE — message de commit étiqueté.** Le DERNIER lot du plan doit
   écrire noir sur blanc son message de commit, portant l'étiquette `lot N` :
   soit un marqueur dédié `<code class="commit-msg">…lot N…</code>`, soit un
   `<code>`/`<pre class="cmd">` contenant `git commit … lot N`. Rend le
   contrôle déterministe de l'étape 5bis du rôle AUTEUR de `brief-chantier`.
   Mode d'échec couvert : un lot de clôture commité « correctifs de revue » fait
   compter zéro au `git log --grep` LITTÉRAL du run aval, qui conclut à tort que
   l'amont a échoué (observé le 15/08/2026 : 2 chantiers sur 5) ;
9. **flotte parallèle — plage d'identifiants déclarée.** Section OPTIONNELLE
   `id="s-flotte"` : absente (plan solo) = check totalement silencieux. Présente,
   elle doit déclarer le nom de la vague (`class="flotte-nom"`), les chantiers
   frères (`<ul class="flotte-freres">`, ≥ 1 `<li>`) et la plage réservée à CE
   chantier (`class="plage-ids"` : `N-M`, ou « aucun compteur global »). Rend le
   contrôle déterministe de l'étape 4bis du rôle ORCHESTRATEUR de
   `brief-chantier`. Ce check ne voit qu'UN plan : il constate qu'une plage est
   DÉCLARÉE, jamais qu'elle est DISJOINTE. La disjonction est vérifiée par le
   lint de vague ci-dessous, que ce check rappelle en avertissement dès qu'un
   plan se déclare membre d'une vague.

## Étape 0bis — Lint de VAGUE (chantiers parallèles uniquement)

Le lint mono-plan laisse deux trous qu'aucun contrôle sur un seul document ne
peut fermer : un plan de la vague qui n'a jamais décommenté sa section flotte
est traité comme solo (donc silencieux), et deux plans peuvent parfaitement
déclarer chacun une plage… identique. Ce second script prend les N plans
ENSEMBLE :

```bash
node ${CLAUDE_SKILL_DIR}/scripts/preflight-flotte.mjs <plan1.html> <plan2.html> …
node ${CLAUDE_SKILL_DIR}/scripts/preflight-flotte.mjs <répertoire-de-plans> [--depuis <N>]
```

Erreurs : un plan de la vague sans section flotte ; une plage non déclarée ou
illisible ; **une collision de plages sur un même compteur** (le mode d'échec du
15/08/2026) ; des noms de vague divergents ; une plage démarrant sous le
plancher `--depuis <N>` (identifiants déjà alloués sur main). Avertissements :
liste de frères incomplète, trous entre plages. Deux compteurs différents
(`DEFERRED 121-130` vs `MIGRATION 121-130`) ne sont PAS une collision.

À lancer par l'ORCHESTRATEUR en fin de Phase 2, **avant de dispatcher la
flotte** — après, la collision ne se découvre plus qu'à la fusion. Sans objet
pour un plan solo (le script refuse d'ailleurs de tourner sur un seul plan et
renvoie vers `preflight-lint.mjs`).

**Ce lint n'est pas laissé à la mémoire de l'orchestrateur.** Un run PASS
enregistre sa preuve (contenu-adressée) dans `~/.claude/.flotte-lint-runs.json`,
et le Stop hook global `~/.claude/hooks/flotte-plage-gate.mjs` empêche toute
session ayant écrit ≥ 2 plans d'une même vague de s'arrêter tant que cette preuve
manque ou ne correspond plus au contenu actuel des plans. Motif : une vague se
prépare pour un run nocturne, sans personne pour se souvenir de lancer quoi que
ce soit — c'est exactement ainsi que la règle du message de commit a été ratée
par 2 chantiers sur 5 alors qu'elle était écrite dans le standard.

`--legacy` rétrograde en avertissement les conventions POSTÉRIEURES au plan
linté — la section Nice-to-have (7) et le message de commit du lot de clôture
(8) — pour les plans écrits avant ces conventions. Le check 9 n'est jamais
rétrogradé : la section flotte est opt-in, un plan qui la porte l'a écrite après
la convention.

VERDICT FAIL = corrige TOUTES les erreurs avant de lancer le moindre round — un
round ultracode coûte ~600 k tokens ; gaspiller un round sur ce qu'un script
attrape gratuitement est exactement ce que ce skill interdit. Le lint se relance
après CHAQUE lot de correctifs, y compris ceux issus des rounds.

Ce que le lint ne peut PAS voir (et que les rounds voient) : une valeur
recopiée qui a dérivé de sa source, une ambiguïté d'exécution, un mécanisme
qui casse sous StrictMode, un besoin utilisateur oublié. Déterminisme d'abord,
jugement ensuite — jamais l'un à la place de l'autre.

**Non linlintable, assumé.** La règle « impossibilité découverte » du protocole
arrêt-et-chip de `brief-chantier` (un lot dont tous les tests passent alors que
la fonctionnalité ne peut pas marcher avec des données réelles) décrit un
comportement d'EXÉCUTION, pas une propriété du document. Aucun contrôle statique
sur un plan ne peut l'attraper — elle reste de la doctrine, portée par les
lentilles « mécanique du domaine » et « candide » de l'étape 1. Ne pas tenter de
l'ajouter au lint.

## Étape 1 — Rounds ultracode (7 lentilles, agents sonnet effort medium)

Chaque round = un Workflow qui lance EN PARALLÈLE 7 agents (modèle `sonnet`,
effort `medium`, schéma de findings structuré : titre, sévérité
bloquant/majeur/mineur, zone du plan, détail, fix proposé). Chaque agent lit
le plan EN ENTIER + le repo cible, et a pour consigne : vérifier dans le code
avant d'affirmer, rendre une liste VIDE plutôt que des findings cosmétiques,
ignorer ce qui est déclaré hors périmètre. Avant de lancer le moindre agent,
le script du Workflow DOIT valider ses arguments et `throw` si le chemin du
plan ou le repo cible est `undefined`/vide — 4 workflows (~800 k tokens) ont
déjà tourné sur « Plan à analyser : undefined » faute de cette garde.

**Jeu de lentilles dégressif.** Rounds 1-2 : les 7 lentilles ci-dessous.
Rounds 3+ : seulement 4 — fact-check, candide, mécanique du domaine,
scénarios & mobile. Les lentilles personas, futur et process sont gelées
après le round 2 (leur production alimente de toute façon le nice-to-have,
arbitré par Franck, pas la convergence). Les 7 lentilles :

1. **Candide** — exécuter le plan ce soir sans personne : chaque commande
   lançable telle quelle ? chaque étape actionnable ? chaque DONE testable
   sans jugement subjectif ? où faudrait-il deviner ?
2. **Fact-check** — CHAQUE affirmation technique (fichier:ligne, noms d'état,
   défauts, scripts, clés de storage, énumérations) confrontée au code réel,
   individuellement. Toute divergence = finding avec le fait constaté.
3. **Mécanique du domaine** — le design tient-il techniquement ? (adapter au
   chantier : React/router/effets, SQL, concurrence, API…) Chercher les cas
   où le plan est silencieux ou ambigu sur un comportement runtime réel :
   double-invocation StrictMode, courses d'effets, ordre d'initialisation,
   sémantique replace/back, écrivains concurrents d'une même ressource, et
   le REKEY : une route dynamique (`/x/:param`) ne se remonte PAS quand seul
   le paramètre change — tout état/clé dérivé du paramètre doit se re-dériver
   en place (bug réel échappé au préflight du chantier persistance-ui,
   attrapé seulement en revue post-implémentation : corruption croisée de
   sessionStorage entre projets via le CommandPalette). Vérifie aussi
   explicitement que TOUT artefact NEUF créé par le plan (nouveau store,
   nouvelle route, nouvel événement) hérite des invariants que le plan
   impose à l'existant (verrous d'écriture, sérialisation, garde
   d'exhaustivité) — le préflight a déjà laissé passer 2 P2 parce qu'il
   durcissait l'existant sans protéger le neuf.
4. **Scénarios & mobile** — les scénarios du ticket sont-ils couverts sans
   trou, avec la séquence EXACTE à exécuter (libellés réels de l'UI, viewport,
   données de test qui existent vraiment) ?
5. **Process & gates** — cohérence avec CLAUDE.md et les règles du repo :
   lots ≤ 2 h à état vert, gates complets, protocole d'échec applicable,
   interdits non contradictoires, ordre PR/merge/redeploy, working tree.
6. **Personas** — lire les sources de vérité du projet cible (docs/spec,
   CLAUDE.md, catalogue) ; recenser les rôles réels s'ils y sont, sinon
   SIMULER les personas plausibles (y compris ceux auxquels le demandeur n'a
   pas pensé). Parcourir la fonctionnalité dans la peau de chacun et chercher
   ce qui manque : langues de l'app (une app FR/EN qui gagne une voix doit
   choisir la langue de la voix), thème sombre, mobile, accessibilité,
   états vides, volumes réels. Chaque manque est classé must-have
   (la fonctionnalité est incomplète sans) ou nice-to-have.
7. **Futur** — projeter la fonctionnalité à 6 mois, 1 an, 2-3 ans : volume de
   données, deuxième consommateur, migration, suppression, maintenance. Ce qui
   coûtera 10× plus cher à intégrer plus tard qu'aujourd'hui remonte comme
   finding must-have ; le reste comme nice-to-have.

## Étape 2 — Triage et correction (par l'auteur, modèle de la session)

Toi (l'auteur) juges chaque finding — les agents proposent, tu disposes :

- **Recevable + must-have** → corrige le plan. TOUJOURS au niveau de la
  DÉCISION (section architecture/décisions) d'abord, puis propagation aux
  lots concernés — jamais un patch local dans un seul lot : c'est comme ça
  que les correctifs d'un round deviennent les findings du suivant.
- **Recevable + nice-to-have** → NE gonfle PAS les lots. Ajoute l'item à la
  section « Nice-to-have proposés » du plan (l'utilisateur arbitrera :
  intégrer au chantier ou créer un chip). À convergence la section doit en
  compter au moins 5 — les lentilles personas et futur en produisent
  naturellement.
- **Non recevable** (préférence de style, hors périmètre déclaré, faux) →
  rejette, en te justifiant dans ta tête, pas dans le plan.

Après chaque lot de correctifs : relecture CANDIDE du plan entier (les
incohérences inter-sections sont le mode d'échec n° 1 des corrections), puis
relance du lint (étape 0), puis round suivant.

## Étape 3 — Critère de convergence

Arrête la boucle dès qu'un round rend 0 finding bloquant + 0 finding majeur
recevable et VÉRIFIABLE (ancré `fichier:ligne` ou comportement démontrable),
confirmé par un round LÉGER à 3 lentilles (fact-check, candide, mécanique du
domaine) plutôt qu'un round complet. Borne de rounds indexée sur le
périmètre : **4 rounds max** pour un plan mono-repo, **6 rounds max** pour un
plan cross-repo ou touchant la prod (~600 k tokens par round complet —
annonce le coût si l'utilisateur suit la session). Au-delà de la borne
applicable, arrête-toi et demande-toi si le problème n'est pas un mécanisme
central sous-spécifié qui se déboguerait mieux en prototype qu'en prose
(règle « mécanisme central » du skill brief-chantier) — le signaler à
l'utilisateur vaut mieux qu'un round de plus.

Si Franck signale une contrainte de budget en cours de préflight, bascule
immédiatement en configuration minimale (lentilles dégressives dès le round
courant + borne basse à 4 rounds) — ne continue jamais plein régime.

## Étape 4 — Sortie

Rends compte : nombre de rounds et trajectoire des findings, bloquants tués,
état de la section nice-to-have (≥ 5 items, prêts pour arbitrage
intégrer/chips), verdict final du lint, et la déclaration explicite : « le
plan est prêt pour exécution » ou ce qui l'en empêche. Le plan corrigé reste
la seule sortie qui compte — pas le rapport.
