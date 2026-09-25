# Contrat de sortie — `results.json` (Banc d'essai)

**Ce fichier est la source de vérité du format que la routine cloud doit
produire.** Il est copié tel quel dans chaque cargo, sous
`contract/results-contract.md` — tu le lis donc DEPUIS le cargo, sans avoir
besoin d'accéder au dépôt `workstation`.

Le consommateur est `bun run evals import` (fichier
`server/cli/evalsReconciler.ts`, côté Mac). Il valide avec zod et **rejette
en bloc** tout ce qui ne correspond pas — pas de tolérance, pas de
récupération partielle. Un fichier invalide ou mal placé = verdict
`IMPORT_GAP` et **nuit entière perdue**.

---

## 1. Où déposer le fichier — chemin littéral

```
results.json
```

**À la RACINE de la branche `results/<AAAA-MM-JJ>`.** Rien d'autre.

L'import lit littéralement le blob `results.json` de la racine — fonction
`resolveBranchResults`, via le lecteur `readTextFile` de `fetchBranchContent`
qui fait `git show <sha>:<chemin>`. Il n'y a **aucun parcours d'arborescence
et aucun glob** pour le chemin canonique. Conséquence directe :

- `reviews/results.json` → **INVISIBLE**
- `output/results.json` → **INVISIBLE**
- `results.json` à la racine → lu.

**Un seul filet, et il ne t'autorise rien.** Si — et seulement si —
`results.json` est absent de la racine ou invalide, `resolveBranchResults`
tente un adaptateur de format HÉRITÉ (`legacyReviewPaths` +
`legacyReviewToImportItem`) qui reconstruit des items depuis les `.json`
trouvés sous un dossier `results/reviews/`. Ce filet existe pour récupérer
l'incident ci-dessous, pas pour ouvrir un second chemin : il **lève toujours
un écart** (conversation d'écart dans le hub, même quand la conversion
réussit parfaitement), il **dégrade** ce qu'il ne peut pas déduire sans
inventer (tout verdict hors énumération devient `unmeasured`, chaque
dimension héritée devient un finding `P3`), et il ne couvre AUCUN autre
chemin (`reviews/…`, `output/…` restent invisibles). Écrire ailleurs qu'à la
racine, c'est donc au mieux se faire signaler comme défectueux avec une note
dégradée. Écris `results.json` à la racine.

> **Incident du 2026-07-27 — à ne jamais reproduire.** La routine avait
> parfaitement travaillé, puis écrit ses verdicts dans
> `results/reviews/<jobId>.review.json`, en forme libre, avec un
> `finalScore: 82` sur 100. L'import n'a rien vu : `results.json` absent de la
> racine → `IMPORT_GAP`, tout le travail de la nuit jeté. Le chemin et la note
> sur 10 ne sont pas des détails de style, ce sont **le** contrat.

`<AAAA-MM-JJ>` = date UTC du jour d'exécution. Par défaut, `cmdImport` ne
regarde QUE la branche `results/<date du jour UTC>` (`todayUtcDate()`). Un
rattrapage explicite existe côté Mac — `bun run evals import --date
<AAAA-MM-JJ>` vise la branche d'une nuit passée — mais c'est une commande
humaine, jamais une raison d'écrire sur une autre date que le jour même :
la routine pousse toujours sur la date UTC de son exécution.

---

## 2. L'enveloppe — exacte

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-27T04:12:00.000Z",
  "results": []
}
```

| Champ | Type zod | Contrainte |
|---|---|---|
| `schemaVersion` | `z.literal(1)` | **exactement le nombre `1`** (pas `"1"`, pas `2`) |
| `generatedAt` | `z.string().datetime()` | ISO 8601 **UTC avec `Z`** |
| `results` | `z.array(ImportResultItemSchema)` | peut être vide, jamais absent |

Source : le schéma zod `ImportResultsSchema` (`server/cli/evalsReconciler.ts`).

**`generatedAt` — piège concret.** zod v4 refuse par défaut les décalages de
fuseau. `2026-07-27T04:12:00+02:00` est **REJETÉ**. Utiliser
`2026-07-27T04:12:00Z` ou `2026-07-27T04:12:00.000Z`.

Aucune clé supplémentaire n'est attendue au niveau de l'enveloppe (elles sont
ignorées, mais ne comptent sur aucune d'elles pour transporter de
l'information — rien ne les lira).

---

## 3. Le schéma d'un item de `results[]`

Source : le schéma zod `ImportResultItemSchema`
(`server/cli/evalsReconciler.ts`).

```
kind             enum, REQUIS : 'skillJobGrade' | 'sessionReview'
                                | 'improvementDiff' | 'note'
jobId?           string non vide
sessionId?       string non vide
skill?           string non vide
grade?           number, 0 ≤ grade ≤ 10          ← SUR 10, PAS SUR 100
verdict?         enum : 'ok' | 'improvement_candidate' | 'unmeasured'
findings?        tableau de findings (voir 3.1)
sessionState?    enum : 'reviewed' | 'skipped_trivial' | 'skipped_stale'
                        | 'reviewer_run' | 'unreviewable' | 'local_only'
changedPaths?    tableau de strings (chemins relatifs)
note?            string
graderSessionId? string non vide
rubricVersion?   string non vide
```

**Règle `refine` (obligatoire — le `.refine(…)` porté par
`ImportResultItemSchema`)** :

> `jobId` **ou** `sessionId` est requis — SAUF pour `kind: "note"` et
> `kind: "improvementDiff"`, qui sont identifiés par `skill`.

Message d'erreur exact en cas de violation :
`jobId ou sessionId requis (sauf kind="note"/"improvementDiff", identifiés par skill)`.

Il n'existe **aucun autre champ**. En particulier : pas de `dimensions{}`, pas
de `finalScore`, pas de `score`, pas de `summary`, pas de `rationale`, pas de
`confidence`. Tout ce que tu veux dire en prose et qui n'entre pas dans
`findings[].evidence` va dans `note` (string libre) — ou dans le rapport HTML
du matin (§ 7).

### 3.1 `findings[]`

Source : les schémas zod `SkillJobFindingSchema` et `FindingSeveritySchema`
(`src/types/review.ts`).

```
category   string non vide   REQUIS
evidence   string non vide   REQUIS
severity   'P1' | 'P2' | 'P3'  REQUIS
```

Les trois champs sont **obligatoires** dans chaque finding. `evidence` doit
citer une preuve précise et vérifiable (fichier, commande, décision de code)
— **jamais** de contenu métier ou personnel.

### 3.2 `verdict`

Source : le schéma zod `ReviewVerdictSchema` (`src/types/review.ts`).

`'ok'` · `'improvement_candidate'` · `'unmeasured'`

`unmeasured` a un sens précis : il est **exclu** de la médiane du degré de
généralisation — c'est le verdict à poser quand la dimension n'a pas pu être
mesurée, pas quand elle est mauvaise.

Si `verdict` est omis, l'import le déduit : `grade < 8` →
`improvement_candidate`, sinon `ok` (fonction `applyResultSideEffects`, même
règle sur les deux rails). **Le fournir
explicitement** reste préférable — la déduction est un filet, pas une
intention.

### 3.3 `sessionState` — zod n'est PAS le dernier mot

**Règle courte : le SEUL `sessionState` légal en sortie d'une review de
session, cloud ou juge local, est `"reviewed"`.** Les cinq autres valeurs du
schéma existent pour le TRIAGE nocturne côté local (enrôlement, parcage
80/20, dispositions terminales de confidentialité) — ce sont des états que le
tampon peut déjà porter AVANT ta review, jamais des verdicts que tu poses.

Source : le schéma zod `SessionReviewStateSchema` (`src/types/review.ts`).
Les six valeurs `'reviewed'` · `'skipped_trivial'` · `'skipped_stale'` ·
`'reviewer_run'` · `'unreviewable'` · `'local_only'` passent la validation.

**Mais zod n'est que le premier filtre.** Une fois l'item validé,
`applyResultSideEffects` appelle `updateSessionStamp`, qui applique une
machine à états (`SESSION_STAMP_TRANSITIONS`, `server/services/reviews/store.ts`).
Une transition hors graphe lève `ReviewStateTransitionError`, et l'écriture
entière est annulée : **la note, les findings et le verdict du même item
partent avec elle**. Pire, le marqueur d'idempotence de l'import est écrit
AVANT l'effet de bord (`writeMarker`) : l'item échoué est signalé comme écart
mais **ne sera PAS rejoué** à l'import suivant. Un `sessionState` mal choisi
ne dégrade donc pas le résultat — il le perd.

Arêtes légales du graphe :

| État de départ du tampon | Cibles légales |
|---|---|
| `reviewer_run` | `reviewed`, `skipped_trivial`, `unreviewable`, `local_only`, `skipped_stale` |
| `skipped_stale` | `reviewer_run`, `reviewed` |
| `reviewed`, `skipped_trivial`, `unreviewable`, `local_only` | aucune (terminal) |

`reviewer_run -> skipped_stale` existe pour PARQUER un candidat frais que le
quota 80/20 d'une nuit d'export n'a pas retenu (triage du réconciliateur
nocturne, `classifyStaleSession`) — ce n'est pas un verdict de grading. Un
cloud/juge qui vient de REVIEWER une session n'a aucune raison légitime
d'émettre `sessionState: "skipped_stale"` : la garde ci-dessous reste valable
malgré l'ouverture de l'arête.

Un item de session exporté part avec un tampon en `reviewer_run` **ou** en
`skipped_stale` — et le `manifest.json` **ne transporte pas** cet état, donc
tu ne peux pas le connaître depuis le cargo.

→ **Une seule valeur est sûre dans tous les cas : `"reviewed"`.** C'est la
seule cible légale depuis les deux états de départ possibles.

- `skipped_trivial` / `unreviewable` : légales **seulement** si le tampon
  était en `reviewer_run`. Depuis `skipped_stale`, elles font perdre l'item.
- `skipped_stale` : légale depuis `reviewer_run` mais réservée au triage de
  scheduling (parcage hors quota), jamais à un verdict de review — ne l'émets
  pas depuis un résultat de grading (cloud ou juge local).
- `reviewer_run` : légale seulement depuis `skipped_stale` — ne l'émets pas.
- `local_only` : à ne **jamais** émettre depuis le cloud. C'est un état
  terminal réservé au local pour un contenu trop sensible pour partir au
  cargo ; le local lui-même refuse d'y faire transiter `state` et porte le
  blocage dans le champ `localOnlyReason` justement pour ne pas condamner la
  session à ne plus jamais être notée.

Si tu n'as pas pu reviewer une session, **ne cherche pas l'état exact** :
émets l'item avec `verdict: "unmeasured"` et la raison dans `note`, sans
`sessionState`. Un item sans `sessionState` ne tente aucune transition.

### 3.4 `graderSessionId` / `rubricVersion`

Tous deux **optionnels**. Quand ils sont absents, l'import retombe sur
`graderSessionId: 'cloud-reviewer'` et `rubricVersion: 'v1'` — mêmes replis
sur les deux rails de `applyResultSideEffects` (`skillJobGrade` et
`sessionReview`). **Cette valeur de repli EST la marque de provenance
« cloud »** : elle distingue une note du cloud d'une note du juge local (qui,
lui, pose toujours `graderSessionId: 'local-judge'`).

→ Par défaut, **ne renseigne PAS `graderSessionId`** côté cloud.

→ Pour `rubricVersion` : la version n'est **pas** dans un front-matter YAML —
les rubriques du cargo n'en ont pas. Elle est déclarée en clair sur une ligne
du corps, juste sous le titre du fichier (`rubrics/<skill>.md`), sous la forme
`rubricVersion: v1`, et c'est du texte lu par un humain — aucun code ne le
parse. Reprends cette valeur telle quelle si elle diffère de `v1` ; sinon
omets le champ, le repli donne déjà `v1`.

---

## 4. Les quatre `kind`, et ce que chacun déclenche

### `skillJobGrade` — noter un `SkillJob`

Requiert `jobId`. Le `jobId` doit correspondre **exactement** à un `id` du
`manifest.json` du cargo (contrôle de complétude dans `cmdImport`). L'import
charge le job local (`getSkillJob`) et **échoue** s'il ne le trouve pas :
`SkillJob <id> introuvable localement`.

Effet : le job passe à l'état `graded`, avec `grade`, `findings`, `verdict`.

**Attention** : c'est bien `jobId` — et lui seul — qui arme cet effet. Un
`skillJobGrade` portant uniquement un `sessionId` passe la validation zod
(la règle `refine` est satisfaite) mais ne correspond à **aucune** branche de
`applyResultSideEffects` : il est ingéré, compté comme succès, et **n'écrit
rien**.

### `sessionReview` — poser le verdict d'une session

**Ce résultat est désormais ATTENDU par session exportée.** Le producteur
local `enrolCapturedSessions` (`server/cli/evalsReconciler.ts`) alimente la
file de sessions automatiquement — un manifeste PEUT donc porter des items
`kind: "session"` `disposition: "export"` n'importe quelle nuit, pas
seulement quand quelqu'un a posé un tampon à la main via `evals stamp`. Pour
chaque tel item, produis un `sessionReview` (voir § « Complétude » plus bas :
son absence est signalée comme un écart, au même titre qu'un `skillJobGrade`
manquant pour un job exporté).

Requiert `sessionId`, correspondant lui aussi à un `id` du manifeste. L'import
charge le tampon local (`getSessionStamp`) et **échoue** s'il n'existe pas :
`SessionReviewStamp <id> introuvable localement`.

**Rien n'est écrit sans détail.** `applyResultSideEffects` n'écrit que si
l'item change l'état OU porte un détail de revue (`hasReviewDetail` = au
moins un de `grade`, `verdict`, `findings` non vide, `graderSessionId`,
`rubricVersion`). Un `sessionReview` réduit à `{ kind, sessionId }` — ou même
à `{ kind, sessionId, sessionState }` répétant l'état déjà en place — est
**accepté par zod, compté comme ingéré, et n'écrit rien du tout**. Il ne
produit ni erreur ni écart : rien ne te dira que ton verdict a disparu.

Une vraie session-review fournit au minimum `sessionState: "reviewed"` et
`grade` (relis le § 3.3 avant de choisir un autre `sessionState`).

### `improvementDiff` — proposer un correctif de skill

Identifié par `skill` (pas de `jobId`/`sessionId` nécessaire). Fournir
`skill`, `changedPaths[]` (la liste des fichiers touchés, **pas** un patch
unifié brut — l'import ne parse aucun diff) et `note` (la description).

**Un scope-lint déterministe rejette l'item** (fonctions `scopeLintViolation`
et `isTraversalOrAbsolute`) si :

- un chemin est absolu (`/etc/passwd`) ou remonte hors du périmètre
  (`../…`, y compris après normalisation d'un `skill/../../…`) ;
- pour un skill ordinaire : un chemin ne commence pas par `<skill>/` ;
- pour `meta-govern` : un chemin est sous `hooks/` ou vaut
  `.claude/settings.json`.

Effet : un chip est créé localement pour qu'une session humaine reprenne —
aucune application automatique.

### `note` — information libre

Ni `jobId` ni `sessionId` requis. **N'écrit rien, nulle part** : aucune
branche de `applyResultSideEffects` ne traite `note`, l'item n'existe que
comme ligne de sortie de la commande d'import (`<clé> : ingéré (note)`).
Rien n'est persisté, aucun fichier, aucune conversation, aucune alerte.

C'est le véhicule pour tout ce que le schéma ne prévoit pas — notamment le
**signal « limite d'usage atteinte »** et toute limite/dégradé rencontré
pendant la nuit. Mais il ne DÉCLENCHE rien : un `note` est lu par l'humain
qui regarde la sortie de l'import (ou le rapport du matin), pas par une
mécanique. Ne compte jamais sur un `note` pour qu'une décision soit prise
côté local ; si un résultat doit être enregistré, il lui faut son propre
`skillJobGrade` / `sessionReview`.

### Complétude — un résultat par item exporté

L'import croise `results.json` avec le `manifest.json` du cargo (bloc de
complétude de `cmdImport`) : **tout item du manifeste dont la `disposition`
vaut `export` doit avoir un item de résultat portant le même id** (`jobId` ou
`sessionId`). Un item exporté sans résultat correspondant est signalé comme
écart : `item exporté "<id>" sans résultat cloud correspondant`.

Corollaire : si un item exporté n'a pas pu être traité (transcript illisible,
budget épuisé, limite d'usage), **produis quand même un item pour lui** —
avec `verdict: "unmeasured"` et la raison dans `note`, et **sans**
`sessionState` pour une session (§ 3.3 : une transition d'état devinée fait
perdre l'item entier). Le silence est lu comme un trou, jamais comme une
décision.

---

## 5. Exemple complet et valide — copiable tel quel

Il illustre la FORME de chaque `kind`, pas ce qu'il faut produire ce soir :
n'émets un item que pour un id réellement présent dans le `manifest.json` du
cargo. En particulier, l'item `sessionReview` ci-dessous n'a de sens que si le
manifeste porte des items `kind: "session"` — sinon, ne le reproduis pas.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-27T04:12:00.000Z",
  "results": [
    {
      "kind": "skillJobGrade",
      "jobId": "job-2026-07-26-workstation-a1b2c3d",
      "skill": "adversarial-pr-review",
      "grade": 7.5,
      "verdict": "improvement_candidate",
      "rubricVersion": "v1",
      "findings": [
        {
          "category": "class-sweep",
          "evidence": "Le sweep du round 2 annonce « tous les jumeaux balayés » sans table d'énumération : seuls 3 des 5 appels à computeStatus() de server/services/ sont cités (conversationStore.ts:88, :204, watcher.ts:61) — les occurrences de reviewStore.ts ne sont ni listées ni écartées.",
          "severity": "P2"
        },
        {
          "category": "gate-b",
          "evidence": "La Gate B est appliquée : le transcript montre l'attente explicite des commentaires bot avant le commit de correction (git commit après la lecture de gh pr view --json comments).",
          "severity": "P3"
        },
        {
          "category": "portabilite-runtime",
          "evidence": "Aucune vérification Codex : la correction touche .claude/settings.json sans contrôle symétrique du côté Codex, alors que la règle de gouvernance impose la parité multi-runtime.",
          "severity": "P1"
        }
      ]
    },
    {
      "kind": "sessionReview",
      "sessionId": "e7f3a911-4c02-4d55-9a18-2b6d0c4e8f71",
      "sessionState": "reviewed",
      "grade": 8,
      "verdict": "ok",
      "rubricVersion": "v1",
      "findings": [
        {
          "category": "honnetete",
          "evidence": "La session déclare explicitement n'avoir pas pu vérifier le comportement launchd (« hypothèse non vérifiée ») au lieu de l'affirmer — conforme à l'exigence de non-escalade d'une hypothèse.",
          "severity": "P3"
        }
      ],
      "note": "Les .claude/agents/ du projet ne sont pas visibles côté cloud : la revue des sous-agents invoqués est dégradée pour cette session."
    },
    {
      "kind": "note",
      "note": "Aucune limite d'usage atteinte cette nuit. Cargo traité : 1 job + 1 session. Scorecards présents pour tous les jobs notés."
    }
  ]
}
```

Cet exemple passe `ImportResultsSchema` tel quel.

---

## 6. Pièges à éviter — liste courte

1. **Note sur 100 au lieu de 10.** `grade` est borné `0 ≤ grade ≤ 10`
   (champ `grade` de `ImportResultItemSchema`). Un `82` fait échouer la
   validation de tout le fichier — pas seulement de cet item.
2. **Fichier ailleurs qu'à la racine.** `reviews/…` et `output/…` sont
   invisibles. `results/reviews/*.json` n'est ramassé que par l'adaptateur
   hérité, qui lève TOUJOURS un écart et dégrade les verdicts (§ 1) — ce
   n'est pas un chemin autorisé, c'est un constat de panne. Un seul chemin
   correct : `results.json` à la racine.
3. **Forme libre non prévue par le schéma.** Pas de `dimensions{}`, pas de
   `finalScore`, pas de `score`, pas de `rationale`. La prose va dans
   `findings[].evidence` ou dans `note`.
4. **`generatedAt` non ISO / avec décalage de fuseau.** `+02:00` est rejeté :
   il faut le suffixe `Z`.
5. **`schemaVersion` en chaîne** (`"1"`) au lieu du nombre `1`.
6. **`jobId`/`sessionId` inventé ou reformaté.** Il doit être byte-identique à
   l'`id` de l'item correspondant du `manifest.json` du cargo, sinon l'import
   ne trouve pas l'objet local et l'item échoue.
7. **Un `finding` incomplet.** Les trois champs `category`, `evidence`,
   `severity` sont obligatoires, et `severity` ∈ `P1|P2|P3` uniquement.
8. **Les trois formes acceptées mais SANS EFFET.** Elles passent zod, sont
   comptées « ingérées », et n'écrivent rien — aucun message ne t'avertit :
   - un `sessionReview` sans changement d'état ET sans aucun détail de revue
     (§ 4) ;
   - un `skillJobGrade` portant `sessionId` au lieu de `jobId` (§ 4) ;
   - un `note`, par construction (§ 4) — informatif seulement.
9. **Un `sessionState` hors du graphe de transitions.** Accepté par zod, mais
   il fait échouer l'écriture ENTIÈRE de l'item (note et findings compris) et
   l'item ne sera pas rejoué. En cas de doute : `"reviewed"`, ou pas de
   `sessionState` du tout (§ 3.3).

---

## 7. Le reste de la branche — rapport et écarts

Le rapport HTML du matin et une éventuelle note d'écarts vont sur la **même
branche `results/<AAAA-MM-JJ>`**, à côté de `results.json`. Ils ne sont **pas**
validés par zod, ne sont lus par aucun schéma, et **ne peuvent rien bloquer**
— mais leurs chemins sont conventionnels et stables, pour qu'un humain (et un
futur outil) sache toujours où regarder :

| Contenu | Chemin conventionnel |
|---|---|
| Rapport HTML du matin (lisible sur téléphone) | `report/rapport-matin-<AAAA-MM-JJ>.html` |
| Note d'écarts / limites rencontrées | `notes/deviations-<AAAA-MM-JJ>.md` |

Un écart qui doit **déclencher** quelque chose côté local ne peut PAS se
contenter de `notes/…` : il doit aussi apparaître comme un item
`kind: "note"` dans `results.json`, seul fichier que l'import lit.

---

## 8. Rappel de la frontière

Ce contrat ne concerne QUE des fichiers poussés sur la branche
`results/<AAAA-MM-JJ>` du dépôt `workstation-night-cargo`. La routine ne
commite jamais sur `main`, d'aucun dépôt. Toute intégration est faite par
`bun run evals import`, localement.
