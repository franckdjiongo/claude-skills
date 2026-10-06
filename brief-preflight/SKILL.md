---
name: brief-preflight
description: >-
  Pré-analyse d'un plan brief-chantier AVANT exécution : lint déterministe
  (script auto-exécuté à l'invocation, dont les règles dures budget total,
  chips, fiche d'intention et revue bornée) puis au plus 2 rounds de revue
  adversariale multi-agents, avec triage must-have / nice-to-have. Ne
  s'applique qu'aux plans au standard brief-chantier, pas aux documents libres.
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

# Brief-preflight — valider un plan avant exécution autonome

Un brief-chantier est exécuté sans personne à qui poser une question : une ambiguïté, un fait faux ou une contradiction devient un run arrêté, ou un run qui livre autre chose. Deux couches, dans cet ordre : le DÉTERMINISTE (un script), puis le JUGEMENT (revue multi-agents). L'invocation de ce skill par brief-chantier ou par l'utilisateur VAUT opt-in ultracode pour les workflows décrits ici.

## Règles dures

1. **Revue de jugement : 2 rounds au plus**, non contournable par un plan. Round 1 = revue complète, round 2 = relecture du DELTA corrigé seulement. Après, on s'arrête : les findings restants sont listés ouverts dans la sortie.
2. **Une décision par finding** : CORRIGER (bloquant ou majeur qui sert l'intention du plan), NICE-TO-HAVE, NE PAS CORRIGER (une ligne de raison), INVALIDE. Jamais « tout corriger, y compris les mineurs ».
3. **Le plan respecte A1-A5 et G** : budget total chiffré, chips déclarés, revue plafonnée, preuve par exécution réelle, disjoncteur de lot, fiche d'intention pertinente. Le lint impose la forme, la lentille « Règles & process » le fond.
4. **Déterminisme d'abord, jugement ensuite** : un round coûte ~600 k tokens, jamais un round sur ce qu'un script attrape gratuitement.

## Étape 0 — Lint déterministe (auto-exécuté à l'invocation)

<!-- runtime-slot:etape0-run -->
Le verdict ci-dessous est la sortie réelle du script sur le plan passé en argument, produite par préprocessing AVANT que tu lises ces lignes :

!`node "${CLAUDE_SKILL_DIR}/scripts/preflight-lint.mjs" $plan $repo $flags 2>&1 || true`

Si ce bloc montre une erreur d'arguments, relance à la main :

```bash
node ${CLAUDE_SKILL_DIR}/scripts/preflight-lint.mjs <chemin-absolu-du-plan.html> <repo-cible> [--legacy]
```
<!-- /runtime-slot:etape0-run -->

Le script vérifie, sans jugement : placeholders et phrases interdites ; chemins absolus, scripts `bun run` et ancres `fichier:ligne` ; structure (sections, chaque lot avec Agent + commande de vérification + DONE, TOC) ; section « Nice-to-have proposés » (≥ 5 items) ; message de commit du lot de clôture étiqueté `lot N` ; section flotte `s-flotte` si présente (plage DÉCLARÉE, jamais prouvée disjointe) ; paragraphe `classe-doublures`, clause par clause ; et les **règles dures A1-A5 et G** (libellés figés) :

- bloquant, toujours : « jusqu'à convergence », « jusqu'au critère de convergence », « y compris les mineurs » ;
- `Budget total :` suivi d'au moins un nombre ; `Chips : autorisés` ou `Chips : interdits` ; `Fiche d'intention :` suivi d'un chemin.

`--legacy` rétrograde en avertissement les conventions postérieures au plan : Nice-to-have, message du lot de clôture, absence du paragraphe des doublures, budget / chips / fiche. Jamais rétrogradés : les clauses de revue sans fin, la section flotte, un paragraphe des doublures amputé d'une clause.

VERDICT FAIL = corrige TOUTES les erreurs avant le moindre round, puis relance le lint après CHAQUE lot de correctifs.

## Étape 0bis — Lint de VAGUE (chantiers parallèles uniquement)

Le lint mono-plan ne voit ni un plan de la vague sans section flotte, ni deux plans qui déclarent la MÊME plage. Ce script prend les N plans ENSEMBLE ; à lancer par l'ORCHESTRATEUR en fin de Phase 2, **avant de dispatcher la flotte** (il refuse de tourner sur un seul plan) :

```bash
node ${CLAUDE_SKILL_DIR}/scripts/preflight-flotte.mjs <plan1.html> <plan2.html> …
node ${CLAUDE_SKILL_DIR}/scripts/preflight-flotte.mjs <répertoire-de-plans> [--depuis <N>]
```

Erreurs : plan sans section flotte ; plage non déclarée ou illisible ; **collision de plages sur un même compteur** ; noms de vague divergents ; plage sous le plancher `--depuis <N>`. Avertissements : frères incomplets, trous entre plages. Deux compteurs différents ne sont PAS une collision.

<!-- runtime-slot:flotte-proof -->
Un run PASS enregistre sa preuve (contenu-adressée) dans `~/.claude/.flotte-lint-runs.json`, et le Stop hook global `~/.claude/hooks/flotte-plage-gate.mjs` empêche toute session ayant écrit ≥ 2 plans d'une même vague de s'arrêter tant que cette preuve manque ou ne correspond plus au contenu actuel des plans.
<!-- /runtime-slot:flotte-proof -->

## Étape 1 — Revue de jugement (round 1)

<!-- runtime-slot:models -->
- **Les lentilles** tournent TOUJOURS en agents `model: 'sonnet'`, `effort: 'medium'`, épinglés dans les opts du Workflow. L'alias `sonnet` suit le dernier Sonnet publié : jamais d'id daté.
- **Le triage** (étape 2) reste au modèle de la SESSION : le jugement et la correction du plan reviennent au modèle fort de l'authoring. Ne pas ajouter de `model:` au frontmatter de ce skill.
<!-- /runtime-slot:models -->

<!-- runtime-slot:etape1-intro -->
Un Workflow lance EN PARALLÈLE un agent par lentille (findings structurés : titre, sévérité bloquant/majeur/mineur, zone du plan, détail, fix proposé). Chaque agent lit le plan EN ENTIER + le repo cible : vérifier dans le code avant d'affirmer, rendre une liste VIDE plutôt que des findings cosmétiques, ignorer ce qui est hors périmètre. Le script du Workflow DOIT `throw` si le chemin du plan ou le repo cible est `undefined`/vide.
<!-- /runtime-slot:etape1-intro -->

Quatre lentilles de base :

1. **Candide** : exécuter le plan ce soir sans personne. Chaque commande lançable telle quelle, chaque DONE testable, scénarios du ticket couverts avec la séquence exacte ? Où faudrait-il deviner ? Deux sections se contredisent-elles ?
2. **Fact-check** : CHAQUE affirmation technique (fichier:ligne, noms d'état, scripts, clés, valeurs recopiées) confrontée au code réel ; toute divergence est un finding avec le fait constaté.
3. **Mécanique du domaine** : le design tient-il techniquement ? Où le plan est silencieux sur un comportement runtime réel (double-invocation, courses, ordre d'initialisation, écrivains concurrents, état dérivé d'un paramètre de route à re-dériver en place) ? Tout artefact NEUF hérite des invariants imposés à l'existant.
4. **Règles & process** : A1-A5 et G. Budget total réaliste, chips cohérents, fiche d'intention PERTINENTE (le plan sert son « pourquoi » et ne sort pas de son « ce que ce n'est pas »), preuve réelle avant tout test simulé, aucune clause de revue sans fin reformulée. Puis cohérence avec CLAUDE.md : lots ≤ 2 h à état vert, gates complets.

Lentilles **optionnelles** (sur demande, jamais par défaut ; elles alimentent le nice-to-have) : **Personas** (chaque rôle réel ou plausible : langues, thème sombre, mobile, accessibilité, états vides) et **Futur** (volume, deuxième consommateur, migration).

## Étape 2 — Triage et correction (par l'auteur, modèle de la session)

Les agents proposent, tu disposes. Une décision par finding :

- **CORRIGER** (bloquant ou majeur, vérifiable : ancré `fichier:ligne` ou comportement démontrable) : corrige TOUJOURS la DÉCISION (section architecture) d'abord, puis propage aux lots. Jamais un patch local dans un seul lot : il devient sinon le finding du round suivant.
- **NICE-TO-HAVE** : ne gonfle PAS les lots. Ajoute l'item à la section « Nice-to-have proposés » (≥ 5, exigé par le lint) ; l'utilisateur arbitre : intégrer, ou chip si les chips sont autorisés.
- **NE PAS CORRIGER** (style, hors périmètre, hors fiche) : une ligne de raison dans ta sortie, pas dans le plan. **INVALIDE** (faux) : rejette.

Après les correctifs : relecture CANDIDE du plan entier (les incohérences inter-sections sont le mode d'échec n° 1 des corrections), puis relance du lint.

## Étape 3 — Round 2 (delta seulement), arrêt, sortie

Si le round 1 a produit une correction, lance UN round 2 : les lentilles concernées relisent uniquement les passages modifiés et ce qui en dépend. Même triage, relance du lint, puis **STOP**. Un bloquant encore présent après le round 2 se signale à l'utilisateur, jamais par un round 3 (un mécanisme central sous-spécifié se débogue mieux en prototype qu'en prose).

Rends compte : rounds (≤ 2), findings par décision, bloquants tués, findings restés ouverts, état du nice-to-have, verdict final du lint, et « le plan est prêt pour exécution » ou ce qui l'en empêche. Le plan corrigé reste la seule sortie qui compte.
