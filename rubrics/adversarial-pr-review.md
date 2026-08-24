# Rubrique — `adversarial-pr-review`

rubricVersion: v1 (figée — ce n'est pas un brouillon)

Cette rubrique est la source de vérité utilisée par le Banc d'essai pour noter
chaque `SkillJob` du skill `adversarial-pr-review` (voir `src/types/review.ts`,
champ `SkillJobReview.rubricVersion`). Elle vit dans le repo `workstation`,
séparée du skill lui-même, pour que les notes restent comparables quand le
skill évolue (§ 07 du design — un skill ne se réécrit jamais lui-même une note
qui l'évalue).

La note /10 n'est crédible que si elle est **ancrée**. Le scorecard
déterministe (script bun, zéro token, versionné par ce `rubricVersion`)
calcule tout ce qui est calculable ; Fable 5 ne juge que le résidu qualitatif,
en citant ses preuves. La rubrique dérive directement des anti-patterns que le
skill lui-même documente — on note le skill contre sa propre doctrine.

## Dimensions

| Dimension | Signal | Qui mesure |
|---|---|---|
| Efficacité réelle (le juge de paix) | Trouvailles du bot après le preflight (via `gh api` sur la PR), rounds Mode B nécessaires, re-flags d'une même classe | script |
| Convergence | Nombre de rounds fix→re-verify, findings par round décroissants ? | script (transcript) |
| Échelle du fan-out | Taille du diff (tier du tableau « Scaling & cost ») vs nombre d'agents réellement lancés — a-t-on 30-agenté un typo ? | script |
| Dédup | Findings même fichier/ligne fusionnés avant fix ? | script |
| Discipline sentinelle | Sentinelle écrite après le commit reviewé, jamais pour contourner | script |
| Coût | Tokens/temps consommés vs tier du diff (champs usage du transcript) | script |
| Qualité des class-sweeps | Table d'énumération présente et réelle (sites listés vs diff), twins structurels cherchés ? | fable 5 |
| Application de la Gate B | Un finding convention/scalabilité a-t-il été rejeté pour « works today » ? | fable 5 |
| Honnêteté | Note de risque résiduel véridique ? Claims comportementaux vérifiés ? | fable 5 |
| Portabilité runtime | Le skill a-t-il bien fonctionné sur le runtime utilisé (Claude avec ultracode, Codex sans Workflow tool, Gemini…) ? Un échec de portabilité est une amélioration du skill, pas une faute du runtime — la note en tient compte. | fable 5 |

### Leçon obligatoire — class-sweeps

> Un class-sweep sans table d'énumération opposable est une assertion, pas une
> preuve — pénaliser tout sweep qui ne liste pas explicitement les sites
> vérifiés.

(Leçon adversarial-review `personal-budget-app` T28→T31, encodée telle quelle
dans la dimension « Qualité des class-sweeps » ci-dessus — c'est un critère de
disqualification du bonus, pas une nuance optionnelle : un sweep qui affirme
« vérifié partout » sans lister les sites contrôlés doit être noté comme s'il
n'avait rien vérifié.)

## Bande de note et calibration

Le scorecard propose une **bande** de note (pas un chiffre unique) à partir des
dimensions « script » ci-dessus. Le juge (Fable 5) fixe la note finale **dans
la bande**, ±1 avec justification citée — jamais en dehors de la bande sans
justifier explicitement pourquoi le résidu qualitatif (class-sweeps, Gate B,
honnêteté, portabilité) déplace le curseur.

Un job n'est jugé que **mûr** : PR mergée/fermée, ou ≥ 24 h d'âge — sinon on
re-note trop tôt, sans la vérité terrain (le bot de revue n'a pas eu le temps
de réagir, ou la PR peut encore changer).

## Definition of Done / Definition of Good

Trois niveaux de mesure, tous déterministes dans leur déclenchement :

| Niveau | Définition mesurable |
|---|---|
| **DoD d'un job** (une exécution) | Critères binaires du scorecard : quality gate verte avant PR, sentinelle posée **après** le commit reviewé, rounds ≤ cap du tier, dédup faite, PR ouverte. Un job qui les remplit est « fait dans les règles » — c'est le plancher, pas la note. |
| **DoG du skill** (fenêtre glissante de 5 jobs mûrs) | Médiane ≥ 8, aucun job < 6, et zéro finding P1 du bot après preflight. Tant que ça tient, le skill est « déjà bon » et on n'y touche pas — l'anti-churn est une feature. Ça casse → candidats d'amélioration (voir le design § 07). |
| **Baseline d'étalonnage** | La toute première fenêtre notée (Lot 0) sert de point de départ : « vu l'état actuel du skill, est-il déjà bon ? » — avec un chiffre, pas une impression. La rubrique est figée en v1 juste après cet étalonnage, pour que tout ce qui suit reste comparable. |

Récapitulatif des règles :

- **DoD d'un job (une exécution)** : critères binaires du scorecard — quality
  gate verte avant PR, sentinelle posée APRÈS le commit reviewé, rounds ≤ cap
  du tier, dédup faite, PR ouverte.
- **DoG du skill (fenêtre glissante de 5 jobs mûrs)** : médiane ≥ 8, aucun job
  < 6, zéro finding P1 du bot après preflight. Tant que ça tient, on ne touche
  pas au skill (anti-churn = feature).
- Le scorecard propose une bande de note ; le juge (Fable 5) fixe la note
  finale dans la bande (±1 avec justification citée).
- Un job n'est jugé que MÛR : PR mergée/fermée, ou ≥ 24 h d'âge.
