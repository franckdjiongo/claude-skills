# Rôle EXÉCUTANT — détails des étapes 4 et 5

Complète `SKILL.md` § Exécuter un plan. Rien ici n'assouplit les règles dures.

## Étape 4 — Lot par lot

- Un lot se ferme quand tous ses checks (`<li data-check>` de sa liste `checks`) sortent 0, puis commit `chantier(<slug-du-plan>): lot N —
  <titre>` (jamais de Co-Authored-By) ; compte les lignes ajoutées. Le git log EST le suivi : ne modifie pas le
  plan HTML.
- Fichier hors liste, ou vérification rouge à cause de doublures de test : « règle standard » de
  `auteur-details.md` si le plan la déclare ; sinon arrêt et question au hub.
- Lot sous gate humain : run local, laisse-le staged ; run cloud éphémère, préfixe `[GATE-HELD]`
  (`commits-et-cloud.md`).

## Étape 5 — Clôture (A3, ne bloque jamais)

1. Vérifications globales du plan. UI : navigateur clair + sombre, serveur dev du repo CIBLE lancé en Bash,
   jamais par l'outil de prévisualisation intégré du harnais.
2. Revue : `adversarial-pr-review` (Mode A), 2 rounds, Codex (`cross`) au round 1 en parallèle des
   chasseurs (absent ou en échec : pas de nouvelle tentative, le rapport le dit). Round 2
   seulement si le round 1 a commité un correctif. Un seul correcteur par round, qui n'écrit que dans ce dépôt
   et seulement les remarques CORRIGER (« correctif minimal couvrant toute la famille du défaut, aucune
   validation hors du chemin modifié »). Un vérificateur frais est obligatoire pour chaque correctif du
   round 2.
3. Avant la PR : simplificateur (`simplificateur.md`), un seul passage : fiche, chemin absolu du dépôt, diff
   complet base...HEAD ; tu relis et commites `chantier(<slug>): lot N — simplificateur`, puis `finalize
   --simplifier <sha>|none`. Sans fiche : simplificateur sauté, le rapport le dit.
4. Dernier lot : `git rm` la fiche, commit `chantier(<slug>): lot N — Clôture…`. La sentinelle de revue se
   pose uniquement après convergence sur ce HEAD final par le flow légitime du skill de revue, jamais à la main, même sans remote.
5. Push. Revue convergée : PR vers la branche prévue, remarques ouvertes listées. Sinon : PR brouillon,
   défauts ouverts et dispositions listés, sans sentinelle ni ready/PR non-brouillon. Sans remote : branche
   locale livrable, corps de PR dans le rapport. Aucun merge par l'exécutant.
6. Hygiène : libère le verrou night-run seulement si ce run l'a pris ; arrête tout serveur dev lancé.
