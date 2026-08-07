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

Le script vérifie mécaniquement : placeholders `{{…}}` résiduels, phrases
interdites (« cette session », « comme convenu »…), existence de chaque chemin
absolu cité, existence de chaque script `bun run <x>` dans le package.json du
repo cible, validité des ancres `fichier.ext:ligne` (fichier trouvable, ligne
dans la plage), structure du plan (sections obligatoires, chaque lot avec
Agent + commande de vérification + critère DONE, TOC alignée sur les lots),
et présence de la section « Nice-to-have proposés » avec ≥ 5 items
(`--legacy` la rétrograde en avertissement pour les plans antérieurs à la
convention). VERDICT FAIL = corrige TOUTES les erreurs avant de lancer le
moindre round — un round ultracode coûte ~600 k tokens ; gaspiller un round
sur ce qu'un script attrape gratuitement est exactement ce que ce skill
interdit. Le lint se relance après CHAQUE lot de correctifs, y compris ceux
issus des rounds.

Ce que le lint ne peut PAS voir (et que les rounds voient) : une valeur
recopiée qui a dérivé de sa source, une ambiguïté d'exécution, un mécanisme
qui casse sous StrictMode, un besoin utilisateur oublié. Déterminisme d'abord,
jugement ensuite — jamais l'un à la place de l'autre.

## Étape 1 — Rounds ultracode (7 lentilles, agents sonnet effort medium)

Chaque round = un Workflow qui lance EN PARALLÈLE 7 agents (modèle `sonnet`,
effort `medium`, schéma de findings structuré : titre, sévérité
bloquant/majeur/mineur, zone du plan, détail, fix proposé). Chaque agent lit
le plan EN ENTIER + le repo cible, et a pour consigne : vérifier dans le code
avant d'affirmer, rendre une liste VIDE plutôt que des findings cosmétiques,
ignorer ce qui est déclaré hors périmètre. Les 7 lentilles :

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
   sessionStorage entre projets via le CommandPalette).
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

Boucle jusqu'à ce qu'UN round complet ne remonte AUCUN finding recevable qui
change la substance du plan. Attendu avec un plan bien écrit : 2-5 rounds
(~600 k tokens chacun — annonce le coût si l'utilisateur suit la session).
Au-delà de 6 rounds, arrête-toi et demande-toi si le problème n'est pas un
mécanisme central sous-spécifié qui se déboguerait mieux en prototype qu'en
prose (règle « mécanisme central » du skill brief-chantier) — le signaler à
l'utilisateur vaut mieux qu'un 9ᵉ round.

## Étape 4 — Sortie

Rends compte : nombre de rounds et trajectoire des findings, bloquants tués,
état de la section nice-to-have (≥ 5 items, prêts pour arbitrage
intégrer/chips), verdict final du lint, et la déclaration explicite : « le
plan est prêt pour exécution » ou ce qui l'en empêche. Le plan corrigé reste
la seule sortie qui compte — pas le rapport.
