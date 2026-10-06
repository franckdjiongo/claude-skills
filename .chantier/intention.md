# Fiche d'intention — gardien d'intention et allègement des skills de chantier

Validée par : Franck (dictée du 2026-10-06, « tu as tout ce qu'il faut pour exécuter »).
Jetable : supprimée par le dernier lot, jamais archivée.

## Pourquoi

La vague socle de Temps Chantier (R1 à R5, 5-6 octobre 2026) a montré que le temps
ne se perd pas à coder mais dans la revue de fin. R1 : 15 rounds et 11 h 39 sur un
lot prévu à 2 h, à durcir un lecteur Markdown hors de l'intention du chantier. R3 :
745 lignes de code pour 2 218 lignes de tests. R4 : 18 h et toujours en cours. Trois
clauses de plan rendaient la revue sans sortie (« jusqu'à convergence », « corrige
tout, y compris les mineurs », « zéro chip »), les tests n'avaient aucun budget, et
personne ne relisait l'intention après le départ du chantier. Les skills qui portent
ces règles font 585 à 805 lignes : leurs règles écrites (plafond de 2 rounds, pas
d'attribution IA) sont pourtant violées.

## La journée de Franck, avant et après

Avant : Franck écrit 5 plans le soir, lance les runs la nuit, et le lendemain R1 et R4
tournent encore. Il passe sa journée à arbitrer des revues qui ne convergent pas au
lieu d'écrire de nouvelles fonctionnalités. Les PR font 3 000 à 15 000 lignes.

Après : Franck écrit avec un agent une fiche d'intention d'une page (pourquoi, journée
de l'utilisateur avant/après, ce que ce n'est pas, preuve réelle), la valide, et lance
le chantier. L'exécutant code dans un budget total (code + tests + scripts). La revue
fait au plus 2 rounds ; chaque remarque reçoit une décision ; le gardien d'intention
écarte tout correctif qui ne sert pas la fiche. Le chantier finit toujours : PR
ouverte (brouillon s'il reste un P1) avec les remarques ouvertes listées. Codex et
Claude lisent des skills courts dont les règles dures sont en tête.

## Ce que ce chantier n'est PAS

- Pas un nouvel agent de revue qui trouve des problèmes : le gardien ne peut que
  RETIRER du travail, jamais proposer du code.
- Pas d'agent simplificateur, pas de mutation testing, pas de contrôle de taille en CI.
- Pas une réécriture du mécanisme de sentinelle, des hooks globaux, du lint de vague
  ni du builder de variantes Codex : on les garde tels quels.
- Pas un changement de Temps Chantier : seuls les skills globaux et les agents globaux.

## Ce qui prouve la livraison

1. Les trois SKILL.md sont nettement plus courts, leurs règles dures en tête, et les
   tests existants des skills passent.
2. Les variantes Codex se construisent (`build-runtime-variant --check`) et les copies
   installées (`~/.claude/skills`, `~/.agents/skills`) sont à jour.
3. Le lint de préflight refuse un plan qui contient « jusqu'à convergence » ou « y
   compris les mineurs », ou qui n'a ni budget total, ni déclaration de chips, ni fiche.
4. Un test réel sur un dépôt bidon : un sous-agent écrit une fiche et un plan, un
   autre l'exécute, la revue tourne avec le gardien. On mesure : rounds ≤ 2, budget
   respecté, au moins une remarque écartée par le gardien avec sa raison.

## Règles de ce chantier

- Budget total : ajouts ≤ 1 200 lignes (skills, références, agents, lint, tests) ;
  le solde net doit être négatif (on retire plus qu'on n'ajoute).
- Chips : autorisés (via `spawn_task`).
- Revue : 2 rounds au plus, puis on termine.
