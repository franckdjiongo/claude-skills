# Itération, références image, verrouillage de style & contrôle qualité

La première génération n'est jamais une garantie de qualité finale. Proposer
**automatiquement** un plan d'itération quand l'utilisateur demande un actif « premium ».

## Workflow itératif en 5 étapes

1. **Base** : générer un premier visuel avec le brief complet.
2. **Critique dirigée** : auditer l'image (prompt ci-dessous).
3. **Correction chirurgicale** : changer UNE seule variable importante.
4. **Variantes contrôlées** : produire des déclinaisons en conservant les invariants.
5. **Contrôle qualité** : passer la checklist avant diffusion.

Règle d'or : **corriger une variable à la fois**, ne jamais tout réécrire (sinon dérive).

## Trois micro-prompts à fournir

**Critique dirigée**
```text
Agis comme un directeur artistique senior. Audit cette image selon huit critères: lisibilité,
hiérarchie visuelle, contraste, cohérence de marque, posture/géométrie du sujet, qualité du
texte visible, niveau premium, risque d'artefacts. Donne un verdict bref puis les trois
corrections les plus rentables.
```

**Correction chirurgicale** (exemple : typographie)
```text
Édite l'image précédente. Change seulement la typographie du titre: lettres plus nettes,
meilleur contraste, espacement plus propre. Ne change rien d'autre: même composition, même
palette, même sujet, même ambiance, mêmes proportions.
```

**Variante contrôlée**
```text
Conserve exactement le même produit, la même palette, la même lumière et le même niveau premium.
Crée une variante plus minimale avec davantage d'espace négatif pour un usage en bannière web.
```

## Images de référence (mode « références structurées »)

Si l'utilisateur dispose déjà d'un visuel (produit, logo, mascotte, packaging, moodboard),
basculer du mode « text-only » au mode références. **Indexer chaque image par rôle** et dire ce
qui doit être préservé / transféré / déplacé :

```text
image 1 = produit à préserver (géométrie, étiquette, proportions intactes)
image 2 = direction artistique / style à transférer (lumière, ambiance, matières)
image 3 = contrainte de palette
Compose une nouvelle scène premium en gardant le produit de l'image 1 strictement identique,
en appliquant le style de l'image 2 et la palette de l'image 3. Ne déforme pas l'étiquette.
```

Pour les **mockups/édition**, énoncer explicitement les invariants : géométrie, étiquette,
proportions, perspective, matière, ombre, contexte ; et « do not change anything else ».

## Verrouillage de style / cohérence de marque (style locking)

Séparer **ce qui change** de **ce qui reste identique**, puis répéter les invariants à chaque
tour. Stocker et réutiliser un **bloc invariants** :

```text
INVARIANTS (à répéter dans chaque prompt de la série):
- palette: [couleurs]
- matériaux: [...]
- niveau de contraste: [...]
- type de lumière: [...]
- cadrage par défaut: [...]
- silhouette produit / traits du personnage: [...]
- style typographique: [...]
- densité visuelle: [...]
- ratio: [...]
- signature: "Créé par AutoMintech" + micro-ligne "automintech.com" en coin discret (sauf logos)
```

Pour une série : créer d'abord une **image d'ancrage**, puis générer les dérivés en collant le
bloc invariants en tête de chaque nouveau prompt.

## Checklist qualité (Bloc F — à utiliser après génération)

- **Respect du brief** : bon type d'actif, bon canal, bon ratio, bon public.
- **Lisibilité** : tous les mots visibles exacts, sans doublon ni troncature, contraste suffisant.
- **Hiérarchie** : point focal immédiat, puis info secondaire, puis CTA.
- **Composition** : alignements cohérents, espace négatif suffisant, équilibre, aucun remplissage.
- **Cohérence de marque** : palette, ton, matériaux, silhouettes, niveau de sophistication.
- **Qualité de rendu** : pas d'artefacts, anatomie correcte, géométrie crédible, label non déformé.
- **Niveau premium** : « conçu et monétisable », pas seulement « généré ».
- **Signature AutoMintech** : présente et discrète sur le marketing ; **absente** sur le logo/
  packshot marketplace (crédit hors-fichier).
- **Conformité** : pas de style d'artiste vivant, pas d'imitation de marque, pas de ressemblance
  non consentie, pas de contenu sensible.
- **Décision** : publier · corriger chirurgicalement · refaire depuis une base plus simple.

## Quand basculer en workflow hybride (Bloc G)

Recommander image conceptuelle + finalisation externe (Figma/InDesign/PowerPoint) quand :
- le texte visible dépasse ~25 mots, ou menu/tableau/brochure dense ;
- infographie chiffrée précise ou graphes exacts ;
- **logo final** → vectorisation indispensable (l'image reste raster) ;
- besoin d'un fond transparent fiable côté API (préférer fond opaque neutre + détourage en aval).
