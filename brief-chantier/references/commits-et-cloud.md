# Messages de commit, gates humains, runs cloud

## Format des commits de lot

- Un commit par lot après sa vérification : `chantier(<slug-du-plan>): lot N — <titre du lot>`, jamais de
  ligne Co-Authored-By ni d'attribution IA.
- Le DERNIER lot (clôture, revue, PR/rapport) suit le même format et porte `lot N` : le run suivant d'une
  chaîne de chantiers vérifie sa précondition par un `git log --grep 'chantier(<slug>): lot N'` littéral.
  Un message libre (« correctifs de revue ») fait compter zéro et conclure à tort à l'échec de l'amont.
  Ne « corrige » jamais une précondition qui te paraît trop basse et ne complète jamais le travail d'un
  run amont : arrête-toi et rapporte ce que tu as trouvé.
- Le git log est le suivi d'avancement : le plan HTML ne se modifie pas pendant l'exécution (il peut être
  annoté dans Galley au même moment).

## Lot sous gate humain explicite (validation avant commit)

- Run LOCAL : laisse le lot staged et signale-le.
- Run CLOUD ÉPHÉMÈRE (routine ou tâche cloud) : le staged meurt avec la session. Commite avec le préfixe
  `[GATE-HELD]` devant le message normal : `[GATE-HELD] chantier(<slug>): lot N — <titre>`. Le préfixe
  préserve le `git log --grep` des runs aval. Le git log porte l'état « en attente de validation humaine » :
  la relecture retrouve les gates par `git log --grep "GATE-HELD"`, et le rapport final les liste. Ne décris
  jamais un tel travail comme vérifié à l'exécution.

## Runs cloud

- Une session cloud est un clone éphémère : sans skills globaux, sans hooks globaux, sans dépendances, sans
  session authentifiée. Tout travail non poussé meurt avec elle : `git push` après CHAQUE lot.
- Le nom de branche imposé par la charte du run est un contrat : crée-le exactement (`git checkout -B
  <nom-exact> origin/<amont>`), vérifie-le avec `git branch --show-current`, ignore la branche suffixée
  automatiquement par l'environnement.
- Stage par chemins explicites, jamais `git add -A` ni `git add .`. Ne commite ni dépendances installées ni
  fichiers générés restaurés par navette.
- Pas de question possible : applique la charte ou avorte proprement avec un rapport.
- L'obligation de revue (A3) porte sur le PUSH FINAL, pas sur l'ouverture de la PR : sans canal de PR, la
  branche poussée est le livrable et le rapport le dit. Le rapport donne le nombre de rounds, le verdict du
  gardien, le SHA de la sentinelle et le HEAD poussé (ils coïncident).
- Les sous-agents parallèles mènent la revue : un moteur de revue qui redemande une confirmation humaine à
  chaque lancement bloque un run non supervisé.
