# Template de charte — le prompt d'un run cloud

Une charte = le message unique que la routine reçoit. Le run n'a AUCUN autre
contexte : pas cette conversation, pas le working tree local, personne pour
répondre. Tout ce qui n'est pas dans la charte ou dans le repo n'existe pas.

Principes d'écriture, dans l'ordre d'importance :

1. **Pointer vers le repo, pas recopier.** « Lis CLAUDE.md puis
   .claude/skills/<X>/SKILL.md et SUIS-LE » vaut mieux que paraphraser le
   skill : le repo évolue, la charte est figée au moment du create.
2. **Chaque section a un mode d'échec couvert.** Précondition manquante →
   abort + rapport. Bootstrap cassé → abort + rapport. Session trop courte →
   commits incrémentaux déjà poussés.
3. **Une mission, un livrable, des critères de succès vérifiables.**

## Squelette (adapter les [PLACEHOLDERS], garder la structure)

```text
Tu es dans le repo [PROJET] ([github.com/OWNER/REPO]). Mission ONE-SHOT :
[MISSION EN UNE PHRASE — ex. « écrire le plan d'implémentation du design X »
/ « exécuter de bout en bout le plan Y »]. [Borne explicite : « Tu ÉCRIS le
plan, tu ne l'exécutes PAS » / « N'improvise JAMAIS un plan »…]

ÉTAPE 0 — PRÉCONDITIONS (abort propre si non remplies) :
1. git fetch origin [BRANCHE_AMONT]:refs/remotes/origin/[BRANCHE_AMONT] &&
   git checkout [BRANCHE_AMONT]
   [Run 1 : créer la branche de travail [BRANCHE_TRAVAIL] depuis l'amont.
    Runs suivants : checkout direct de [BRANCHE_TRAVAIL].]
2. Vérifie que [LIVRABLE DU RUN PRÉCÉDENT — chemin précis] existe.
   S'il n'existe pas : ARRÊTE-TOI et rapporte l'échec — n'improvise rien.

ÉTAPE 0b — BOOTSTRAP ENVIRONNEMENT :
1. node --version (>= [N] requis ; sinon nvm install [N] ; sinon rapporte).
2. [npm ci | équivalent lockfile]
3. [Si navette :]
   git fetch origin cloud/[NOM]-snapshot:refs/remotes/origin/cloud/[NOM]-snapshot
   git restore --source=origin/cloud/[NOM]-snapshot --worktree -- [DIR]
4. Sanité : [COMMANDE TYPECHECK] DOIT passer AVANT la mission ; sinon
   rapporte et arrête.
INTERDIT ABSOLU : committer [DIR] ou node_modules (jamais git add -f, jamais
git add -A ni git add .) ; toucher à la branche cloud/[NOM]-snapshot.

ÉTAPE 1 — MISSION :
1. Lis CLAUDE.md à la racine, puis [SKILL(S) DU REPO À SUIVRE] et SUIS-LES.
   Lis aussi [RÈGLES PERTINENTES — discipline de commit, protocoles…].
2. [Spécificités de la mission : ordre imposé, périmètre exclu, gates.]
3. Si l'outil de dispatch de subagents n'est pas disponible, exécute
   directement toi-même en honorant TOUTES les gates du pipeline.

ÉTAPE 2 — DISCIPLINE DE COMMIT (run autonome non assisté) :
1. Committe par tâche/groupe sur [BRANCHE_TRAVAIL] ; git push après chaque
   groupe (une session cloud peut mourir — ce qui est poussé survit).
2. [Conventions de message du projet — ex. jamais de Co-Authored-By.]
3. GATES HUMAINS : toute tâche marquée « validation humaine avant commit »
   est implémentée + testée + COMMITÉE avec le préfixe [GATE-HELD] dans le
   message, mais sa case de gate reste NON COCHÉE et le rapport final la
   liste « en attente de validation humaine ». (« Laisser staged » ne
   s'applique qu'aux runs locaux : ici le staged serait perdu.)

ÉTAPE 3 — CLÔTURE :
1. [COMMANDE VALIDATE] complète — PASS obligatoire ; corrige avant le
   dernier push ; ne laisse jamais la branche en état failing.
2. Si la session approche de ses limites : committe + pousse l'état courant
   (uniquement des tâches complètes) et résume précisément le restant.
3. Rapport final : accompli (avec hashes), verdicts des gates qualité,
   gates humains tenus, restant éventuel.

Rappels repo : [3-6 invariants non négociables du projet — formats de docs,
i18n, tokens, budgets de taille de fichier, scripts d'allocation d'IDs…]
```

## Variantes par type de run

- **Run planificateur** (écrit un plan/design) : interdire toute modification
  de code source ; livrable = le document commité ; critère = la commande de
  vérification documentaire du repo passe.
- **Run exécuteur** (implémente un plan) : précondition = le plan du run
  précédent ; première tâche imposée par le protocole du repo (ex. apply du
  delta de spec) ; gates humains exhaustivement listés.
- **Run vérificateur** (audit indépendant) : NE RIEN MODIFIER ; re-exécuter
  la vérification ; comparer les claims des rapports/commits aux faits ;
  livrable = rapport (commité ou non selon la convention du repo).

## Pièges connus (chacun observé en réel)

- Refspec explicite sur chaque fetch : les clones cloud peuvent être
  single-branch ; `git fetch origin <branche>` seul ne crée pas toujours la
  ref distante attendue.
- Donner le hash du commit amont attendu quand tu le connais : ça permet au
  run de détecter un amont pas à jour.
- L'heure du runner n'est pas le fuseau de l'utilisateur : toute logique
  date/heure de la mission doit être explicite, jamais « aujourd'hui ».
- allowed_tools de la routine : inclure l'outil de subagents si le repo
  l'utilise (sinon le fallback « exécute directement » de l'ÉTAPE 1 joue).
