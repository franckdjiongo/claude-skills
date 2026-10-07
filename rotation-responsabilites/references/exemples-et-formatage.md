# Exemples d'utilisation et formatage Excel

## Exemples

**Créer le planning 2027.** Utiliser les membres et couleurs par défaut, continuer l'ordre de rotation de 2026 (si fichier fourni), générer le fichier, présenter le tableau récapitulatif.

**Ajouter un membre** (« Sophie Laurent, introduite par Kana Martin, siège depuis mars 2027 »):
1. Introducteur: Kana Martin.
2. Reconstituer les visites de Sophie depuis mars 2027.
3. Calculer quand elle aura visité tout le monde. Sa première réception est le mois suivant.
4. Bloquer la réception de Kana Martin jusqu'à ce que Sophie ait tout visité.
5. Sophie n'a jamais été présidente ni secrétaire: la placer tôt dans ces rotations.
6. Couleur automatique, régénérer le planning.

**Correction en cours d'année** (« la réception de février est en ligne, décaler les suivantes »): passer février en « En ligne », décaler le membre prévu au mois suivant en cascade, vérifier l'absence de conflit, régénérer.

**Contrainte spéciale** (« Djoumetio Romuald ne doit jamais être secrétaire »): l'ajouter à `exclusions_secretariat`. Il reste éligible à la réception et à la présidence.

## Formatage généré par le script

- Calibri 11-13, texte noir ou blanc selon la luminosité du fond.
- Centré horizontal et vertical, retour à la ligne activé, bordures fines partout.
- Titre et sous-titre en gras, en-têtes sur fond bleu-gris avec texte blanc, cellules de rôles colorées par membre.
- Légende des couleurs et section de notes rappelant les contraintes.
- Ligne 1: titre de l'association. Ligne 2: sous-titre avec l'année. Ligne 4: en-têtes (Année, Réception, Présidence, Secrétariat). Ligne 5 et suivantes: données mensuelles.
- Couleurs au format ARGB hexadécimal Excel (FFxxxxxx). Sortie `.xlsx` dans `/mnt/user-data/outputs/`. Le script installe `openpyxl` si nécessaire.
