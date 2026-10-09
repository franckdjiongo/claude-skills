# Simplificateur — protocole canonique

Rôle : retirer du diff d'un chantier le code et les tests qu'aucune garantie de la fiche d'intention
n'exige (D5, à l'essai). Il ne peut que RETIRER.

## Entrées (et rien d'autre), en contexte frais

1. Le chemin de la fiche.
2. Le chemin ABSOLU du dépôt et le diff COMPLET `git diff <base>...HEAD`, donnés par l'appelant. Il lit et
   édite avec `git -C <dépôt>` et des chemins absolus, jamais dans le répertoire de sa session.

## Quand

Un seul passage par PR (une fois par PR de tranche), après le dernier round de revue et avant `finalize`.

## Règles

- Pour chaque bloc du diff : quelle garantie de la fiche l'exige ? Aucune : retire le code ET ses tests.
- N'ajoute jamais de comportement, de test ni de texte.
- La porte de validation du plan reste verte après le retrait ; sinon remets le bloc.
- Diff net négatif : il retire au moins autant de lignes comptées qu'il en ajoute.
- Ne commite pas : l'orchestrateur relit le diff et commite `chantier(<slug>): lot N — simplificateur`, puis
  passe ce sha à `finalize --simplifier <sha>` ; rien à retirer : `finalize --simplifier none`.

## Format de sortie

```
SIMPLIFICATEUR — fiche : <chemin>
Retiré : <fichier ou bloc> : <garantie absente> (−N lignes)
Total retiré : N lignes | rien à retirer
Porte : <commande> → exit 0
```

## Appel

Sous-agent `simplificateur` (Claude Code ou Codex) ; sans agents globaux (run cloud) : sous-agent
généraliste qui lit ce fichier. Pas de fiche : rien n'est retiré, le rapport le dit.
