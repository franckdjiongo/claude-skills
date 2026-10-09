# Fiche d'intention — Retour terrain P6-T98 appliqué au standard de chantier

Validée par : Franck, 2026-10-09. Hub : conversation claude-skills/2026-10-09-fiche-retour-terrain-standard, approuvée. Jetable (supprimée au dernier lot), `.chantier/retour-terrain-standard/intention.md`.

## Pourquoi

La première vraie nuit du nouveau système (Temps Chantier, 8 octobre) a tenu, mais elle a fui à trois endroits. Les lots ont coûté deux fois leur estimation, donc trois découpages improvisés et une pile de 6 PR. La revue Codex lancée après la PR verte a ouvert un troisième round de fait (789 lignes sur la PR 42, sans convergence). Aucune étape ne retire du code : 35 % des lignes de la nuit viennent de la revue, 61 % sont des tests. Franck le paie en nuits plus longues, en PR plus grosses et en fusions bloquées.

Demande de l'humain (citations exactes, hub du 9 octobre) :
- D1 « Codex dans le premier round »
- D2 « Compter les tests et essayer d'abord de retirer »
- D3 « Deux nombres par lot, le relecteur a le dernier mot »
- D4 « C'est le Brief chantier au départ qui doit pouvoir penser upfront. C'est ça qu'on doit vraiment improve. » et « ce qu'il a fait aujourd'hui ça me plaît »
- D5 « Le transformer en simplificateur, à l'essai »
- D6 « Écartée, sauf garantie sans preuve »
- D7 « Une PR de documents avant la nuit »

## La journée des consommateurs avant / après

Consommateurs : la session AUTEUR qui écrit un plan, le lint du préflight, la session EXÉCUTANT, le script de revue `review-run.mjs`, les mêmes skills côté Codex et la navette cloud de Temps Chantier.

Avant : l'auteur donne un seul nombre par lot et peut écarter l'estimation du relecteur. Le plan ne prévoit pas ses PR. Codex relit après la PR verte et un correctif refusé se retente. Un correctif de 300 lignes de tests passe la limite de 30 lignes. La revue peut exiger des tests sans défaut observé. Le gardien juge les remarques après chaque round sans jamais retirer de code. Design et plans voyagent dans la première PR de code.

Après :
- D3 : chaque lot porte « ≈ N code + M tests ». Le lint refuse un lot sans les deux nombres. Quand la lentille Règles estime plus haut que l'auteur, le plan se découpe avant la nuit.
- D4 : le plan déclare ses tranches (une PR par tranche, sa base, empilée ou depuis la branche par défaut) et marque un point de coupe après chaque lot à effet visible. L'exécutant garde la latitude de couper à un point de coupe et le consigne dans son journal de décisions, comme cette nuit.
- D1 : `cross` (Codex) tourne dans le round 1, en parallèle des relecteurs. Plus de passe externe après la PR verte.
- D2 : un correctif se mesure code + tests. Au-delà de 30 lignes, ou si le round fait grossir la PR de plus de 15 %, le correcteur essaie d'abord une version qui retire du code, sinon CHIP et PR en brouillon. Un correctif refusé par son vérificateur ne se retente pas.
- D6 : une remarque dont le seul correctif est un test, sans défaut observé, est WONT_FIX sauf si une garantie de la fiche n'a aucune preuve. `finalize` affiche code, tests, ratio et croissance due à la revue.
- D5 : le gardien devient un simplificateur, un seul passage avant la PR. Il retire le code et les tests qu'aucune garantie de la fiche n'exige, la validation reste verte, le diff diminue. À l'essai : le rapport de clôture donne les lignes retirées.
- D7 : design, plans et fiches arrivent dans la branche de base par une PR de documents avant la nuit.
- Inclus, mêmes fichiers : chaque preuve en direct nomme sa donnée, vérifiée au préflight (C2) ; le journal de décisions de l'exécutant devient une règle (C3).

## Ce que ce chantier n'est PAS

- Pas d'outil de calibration automatique des estimations (D3, option 2 non retenue).
- Pas de règle rigide imposée à l'exécutant (seuil de 75 %, pile de 3 PR) : D4 porte sur l'auteur.
- Pas de mutation testing, pas de nouvelle étape : le simplificateur remplace le gardien, Codex entre dans un round existant.
- Pas de changement de la sentinelle ni du hook `adversarial-pr-guard`.
- Les SKILL.md ne grossissent pas : nombre total de mots inférieur ou égal à avant.
- Le correctif de l'état de revue par branche (C1) reste un chip à part.

## Ce qui prouve la livraison

Rejouer la nuit P6-T98 contre les outils modifiés :
1. `preflight-lint.mjs` sur le plan du chantier 1 de la nuit : FAIL (un seul nombre par lot) ; sur sa copie avec deux nombres par lot : PASS.
2. `review-run.mjs` sur un clone jetable de Temps Chantier (round enregistré à `f1224566`, premier correctif X6 `246ab745`) : ce correctif (91 lignes de code + 273 de tests, PR +44 %) est refusé en FIX sans version qui retire ; un `cross` après le dernier round est refusé ; `finalize` affiche code, tests, ratio et croissance.
3. Les variantes Codex se construisent, les tests des trois skills passent, le nombre de mots des SKILL.md n'augmente pas.

## Règles du chantier

- Budget total : 600 / 800 lignes ajoutées (code + tests + scripts), relevé au préflight : l'estimation du relecteur l'emporte (D3).
- Chips : autorisés.
- Base : `main` de claude-skills APRÈS la fusion de `chore/c9-pr-brouillon` (mêmes fichiers).
- Revue : 2 rounds au plus, Codex dans le round 1 (on applique D1 à ce chantier même).
