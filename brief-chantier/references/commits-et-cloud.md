# Commits de lot, gates humains, runs cloud

## Commits

- Un commit par lot après sa commande de vérification : `chantier(<slug-du-plan>): lot N — <titre>`, jamais
  de Co-Authored-By ni d'attribution IA. Le DERNIER lot (clôture, revue, PR/rapport) porte aussi `lot N` : le
  run suivant d'une chaîne vérifie sa précondition par un `git log --grep 'chantier(<slug>): lot N'`
  littéral, un message libre compte zéro. Ne « corrige » jamais une précondition qui te paraît trop basse et
  ne complète jamais le travail d'un run amont : arrête-toi et rapporte.
- Le git log est le suivi : le plan HTML ne se modifie pas pendant l'exécution.

## Lot sous gate humain

- Run LOCAL : laisse le lot staged et signale-le.
- Run CLOUD ÉPHÉMÈRE : le staged meurt avec la session. Commite avec le préfixe `[GATE-HELD]` devant le
  message normal (`[GATE-HELD] chantier(<slug>): lot N — <titre>`) ; `git log --grep "GATE-HELD"` les retrouve
  et le rapport les liste. Ne décris jamais un tel travail comme vérifié à l'exécution.

## Runs cloud

- Clone éphémère, sans skills ni hooks globaux, sans dépendances : `git push` après CHAQUE lot.
- Le nom de branche imposé par la charte est un contrat : `git checkout -B <nom-exact> origin/<amont>`,
  vérifié par `git branch --show-current`, en ignorant la branche suffixée de l'environnement.
- Stage par chemins explicites, jamais `git add -A` ni `git add .`.
- Pas de question possible : applique la charte ou avorte avec un rapport.
- La revue (A3) porte sur le PUSH FINAL, pas sur la PR : sans canal de PR, la branche poussée est le
  livrable. Le rapport donne les rounds, le verdict du gardien, le SHA de la sentinelle et le HEAD poussé
  (ils coïncident).
- Les sous-agents parallèles mènent la revue : un moteur qui redemande une confirmation humaine à chaque
  lancement bloque un run non supervisé.
