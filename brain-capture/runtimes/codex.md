Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:intro -->
Capturer les décisions, leçons, préférences et conventions qui doivent survivre
à cette session. Ne pas relire le transcript : la session est déjà en contexte.

**Exécution Codex, accès au Second Brain.** Les commandes CLI du Second Brain peuvent utiliser le trousseau macOS pour
l'authentification. Dans Codex, les exécuter avec une **escalade sandbox
ciblée**, demandée à l'utilisateur ou au mécanisme d'approbation configuré.
Ne jamais contourner cette exigence par `danger-full-access`, et ne jamais
copier, afficher ou relire une clé de déploiement. Si l'escalade est refusée,
consigner l'échec sans réessayer plus d'une fois par commande.
<!-- /slot:intro -->

<!-- slot:step1 -->
Choisir parmi `fait`, `préférence`, `décision`, `leçon`, `routine`, `convention`.
Ne retenir que ce qui aiderait une future session sans ce contexte. Ignorer les
appels d'outils routiniers, le bruit de débogage et les éléments déjà capturés.
Zéro candidat est normal; ne jamais remplir artificiellement le quota.

Ne jamais capturer une valeur secrète, un token, un mot de passe, un certificat
ou le contenu du Coffre.
<!-- /slot:step1 -->

<!-- slot:step2 -->
À partir du `cwd` donné par le hook :

```bash
bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts project list --limit 200
```

> Codex : demander l'escalade sandbox ciblée avant cette commande.

Un projet correspond si `repoPath` égale le `cwd`, ou si son `slug` correspond
au premier dossier sous `~/Desktop/my-projets`. En cas de match, reprendre son
scope et passer `--project <slug>`. Sans match : `--scope personnel`, sans
`--project`. Ne jamais élargir vers `public`/`professionnel` par supposition et
ne pas interrompre la capture pour demander une décision.
<!-- /slot:step2 -->

<!-- slot:step3 -->
Pour chaque candidat :

```bash
bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts remember "<texte>" \
  --kind <kind> --scope <scope> [--project <slug>] [--tags <csv>] [--confidence <0..1>]
```

> Codex : demander l'escalade sandbox ciblée avant chaque soumission.

Laisser le serveur gérer la déduplication sémantique. Ne pas réessayer plus
d'une fois après un échec; continuer avec le candidat suivant.
<!-- /slot:step3 -->

<!-- slot:step4 -->
Exécuter exactement une fois :

```bash
bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts capture-log \
  --candidates <N> --submitted <M> [--project <slug>]
```

> Codex : demander l'escalade sandbox ciblée avant le `capture-log`.

Compter dans `M` les issues `direct`, `pending` et `skipped_duplicate`, pas les
échecs durs. Après un `capture-log` réussi, exécuter exactement une fois :

```bash
touch ~/.codex/.capture-debounce/brain-last-run
```

Le profil Codex ciblé rend ce seul dossier d'état inscriptible. Si le touch
échoue, signaler l'échec une fois sans réessayer à l'identique.
<!-- /slot:step4 -->

<!-- slot:step5 -->
Une fois journalisé et le sentinel posé, terminer normalement; la garde de réentrée du
hook empêche une boucle immédiate.
<!-- /slot:step5 -->
