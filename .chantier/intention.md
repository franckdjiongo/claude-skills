# Fiche d'intention — banc des trois projets fictifs

Validée par : Franck (dictée du 2026-10-06). Jetable : supprimée par le dernier lot.

## Pourquoi

Le premier test sur un dépôt bidon a révélé trois défauts que la relecture n'avait pas
vus (gabarit qui fait échouer le lint hors bun, flotte d'un plan solo, seuil du ratio).
Un seul test, petit et en français, ne couvre ni un chantier moyen, ni un gros chantier
qui doit être découpé, ni un projet en anglais. Or Franck travaille en anglais et en
français : un contrôle déterministe qui ne reconnaît que le français fait échouer à tort
un plan anglais.

## La journée de Franck, avant et après

Avant : un plan en anglais échoue au lint sur des libellés français ; un gros chantier
n'a jamais été éprouvé ; les défauts se découvrent pendant un vrai run de nuit.

Après : le système (brief-chantier, brief-preflight, adversarial-pr-review, gardien)
a tourné sur trois projets fictifs crédibles, petit, moyen et grand, dont au moins un
en anglais. Les défauts trouvés sont corrigés, les règles déterministes acceptent les
deux langues, et les copies installées (Claude Code, Codex, navette cloud) sont à jour
et vérifiées identiques à la source.

## Ce que ce chantier n'est PAS

- Pas une nouvelle fonctionnalité des skills : seulement corriger ce que le banc révèle.
- Pas de nouvel agent, pas de nouvelle étape de revue.
- Pas de traduction complète des skills en anglais : les libellés que le lint lit et
  les gabarits doivent accepter les deux langues, le reste du texte ne change pas.
- Pas de suppression des nice-to-have (décision de Franck : il veut toujours les voir).

## Ce qui prouve la livraison

1. Trois projets fictifs exécutés de bout en bout (auteur, lint, exécutant, revue
   2 rounds, gardien) ; un tableau de mesures par projet (lignes, rounds, remarques
   SERT / HORS, preuve réelle).
2. Un plan rédigé en anglais passe le lint sans contournement.
3. Les tests des skills sont verts, les variantes Codex se construisent, et les copies
   installées et la navette cloud sont identiques au build (diff vide).

## Règles du chantier

- Budget total : 400 / 800 lignes ajoutées (code + tests + scripts) dans claude-skills.
- Chips : autorisés.
- Revue : 2 rounds au plus. Uniquement des agents Sonnet.
