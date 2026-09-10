# Audit de préparation — checklist et remèdes

Déroule les 7 vérifications dans l'ordre. B = bloquante (règle de refus),
R = recommandée (avertir, ne pas bloquer).

## 1. (B) Remote GitHub

```bash
git remote -v          # un remote origin github.com joignable
git status -sb         # la branche de départ existe et est poussée (ou poussable)
```

Le cloud clone depuis GitHub : pas de remote = pas de run. Remède : créer le
repo GitHub et pousser. Vérifie aussi que l'état de départ (design validé,
plan approuvé…) est COMMITÉ ET POUSSÉ — le cloud ne voit pas le working tree
local.

## 2. (B) Commande de vérification déterministe

Cherche dans l'ordre : script `validate` du package.json ; sinon compose
`typecheck` + `lint` + `test` + `build` ; sinon l'équivalent de l'écosystème
(`cargo test`, `pytest`, `make check`…). Elle doit sortir 0/1 sans
interaction. Sans elle, le run ne peut pas prouver son travail → refus
(même philosophie que `loop-autonomy`).

**Mesure sa durée, ne la suppose jamais.** Lance-la UNE fois, chronométrée,
sur l'état de départ du repo (ça vaut aussi baseline verte) :

```bash
/usr/bin/time -p <commande de vérification>    # note `real` ET `user`
```

Deux chiffres, tous deux nécessaires :

- **`real`** — la durée sur CETTE machine. C'est un plancher, pas une
  prédiction.
- **`user` + `sys`** — les **secondes-CPU** consommées. C'est le seul chiffre
  qui se transporte d'une machine à l'autre : le wall-clock d'un poste à N
  cœurs ne dit rien de ce que fera un conteneur qui n'en accorde que 2 ou 3.

Ordre de grandeur pour convertir : un runner cloud donne typiquement 2-3
cœurs utiles, individuellement plus lents qu'un cœur de poste récent. Une
commande consommant `S` secondes-CPU y prend donc grossièrement
`S / 2.5 × 1.8` secondes de wall-clock. Concrètement : une suite à 40 s-CPU
reste à quelques dizaines de secondes et ne demande aucun traitement
particulier ; une suite à 450 s-CPU passe de ~1 min en local à 5-7 min en
conteneur.

**Ce que tu en fais, et rien de plus :**

| Estimation cloud | Conséquence sur les chartes |
|---|---|
| < 2 min | Rien. N'encombre pas la charte — c'est le cas de la plupart des projets. |
| ≥ 2 min | La charte DOIT porter un timeout explicite (§ Étape 4 du skill) **et citer la durée mesurée**, pour que le run sache qu'une longue attente est normale et non une panne. |

Ne code JAMAIS en dur une durée héritée d'un autre projet. Le seuil qui
compte n'est pas « c'est lent », c'est « ça dépasse le timeout par défaut de
l'outil Bash », qui est de **2 minutes**.

Si la commande est trop longue pour être mesurée pendant l'audit, mesure une
sous-partie représentative (la suite de tests seule) et dis-le explicitement
dans la charte plutôt que d'extrapoler en silence.

## 3. (B) Environment claude.ai pour ce repo

```
RemoteTrigger { action: "list" }
```

Cherche un trigger existant dont `sources[].git_repository.url` correspond au
repo : réutilise son `environment_id`. Aucun trigger pour ce repo → demande à
l'utilisateur de créer une routine/environment une fois via l'UI claude.ai
(Code → environments), puis re-liste. Le skill ne peut pas créer
l'environment par API.

## 4. (B) Artefacts gitignorés critiques au build → navette

Détection :

```bash
cat .gitignore
# pour chaque dossier ignoré suspect (generated/, *.gen.*, config d'env…) :
git check-ignore <dir> && echo IGNORED
# le typecheck/build échouerait-il sans ce dossier ? (imports depuis src/)
grep -rn "from ['\"].*<dir>" src/ | head
```

Indices forts : un script de setup de worktree qui symlinke des dossiers
(c'est exactement la liste à faire voyager) ; un dossier `generated`/`sdk`
importé par `src/`.

**Pattern navette** (validé en production) : une branche
orpheline `cloud/<nom>-snapshot` contenant UNIQUEMENT le dossier, publiée
par un script de plumbing git qui ne touche ni le working tree ni l'index :

```js
// .claude/scripts/push-generated-snapshot.mjs — adapter BRANCH et DIR
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const BRANCH = "cloud/generated-snapshot";
const DIR = "src/generated";

function git(args, env = {}) {
  return execFileSync("git", args, { encoding: "utf-8", env: { ...process.env, ...env } }).trim();
}

process.chdir(git(["rev-parse", "--show-toplevel"]));
const tmp = mkdtempSync(join(tmpdir(), "snapshot-"));
try {
  const env = { GIT_INDEX_FILE: join(tmp, "index") };
  git(["add", "-f", DIR], env);
  const tree = git(["write-tree"], env);
  const commit = git(["commit-tree", tree, "-m",
    `snapshot ${DIR} — ${new Date().toISOString()} (depuis ${git(["rev-parse", "--short", "HEAD"])})`]);
  git(["push", "-f", "origin", `${commit}:refs/heads/${BRANCH}`]);
  console.log(`OK  ${BRANCH} -> ${commit}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
```

Côté cloud (à mettre dans la charte, refspec explicite car clone single-branch
possible) :

```bash
git fetch origin cloud/generated-snapshot:refs/remotes/origin/cloud/generated-snapshot
git restore --source=origin/cloud/generated-snapshot --worktree -- <dir>
```

`--worktree` écrit les fichiers sans les indexer, et le dossier étant
gitignoré, il ne peut pas atterrir dans un commit du run.

**Câblage obligatoire** : documente le rafraîchissement (« relancer le script
après toute régénération ») dans les surfaces du projet — CLAUDE.md/AGENTS.md,
la règle/skill qui régénère l'artefact. Une navette périmée = le cloud
typecheck contre un SDK obsolète, échec silencieux des nuits suivantes.

**Jamais de secrets par navette.** Un build qui exige un secret au runtime
cloud = échec de l'audit (repenser le build ou refuser).

## 5. (B) Étapes impossibles sur le cloud → gates

Liste ce qui exige une session authentifiée ou un humain (QA visuelle dans
une app authentifiée, approbation produit, device code…). Chacune devient un
gate `[GATE-HELD]` dans la charte — implémentée/testée/commitée mais non
cochée, listée au rapport. Si le CŒUR de la mission est intestable sans
humain, la mission n'est pas cloud-able : refuse ce run-là.

## 6. (R) Skills/conventions d'exécution dans le repo

Un repo avec ses propres skills (écriture de plan, exécution de plan, gates
qualité) donne des chartes courtes qui POINTENT vers eux. Sans ça, le run
reste possible mais la charte doit porter plus de discipline (TDD, revues,
commits) — préviens que la qualité dépendra davantage du modèle.

## 7. (R) Node/runtime et lockfile

`packageManager`/`engines`/`.nvmrc` vs ce qu'un runner standard offre. Pas
bloquant (les chartes vérifient `node --version` et signalent), mais un
lockfile commité (`package-lock.json`…) est requis pour un `npm ci`
reproductible.
