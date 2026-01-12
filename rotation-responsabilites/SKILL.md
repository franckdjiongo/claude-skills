---
name: rotation-responsabilites
description: Gère automatiquement la rotation des responsabilités pour COBACAM. Crée et met à jour des plannings Excel avec trois rôles (Réception, Présidence, Secrétariat). Respecte des règles strictes de rotation, évite les conflits de rôles par mois, applique des couleurs personnalisées par membre, et maintient un formatage professionnel. Utiliser ce skill quand l'utilisateur demande de créer un nouveau planning annuel de rotation, ajouter de nouveaux membres au groupe et recalculer la rotation, modifier le nom d'un membre existant, ajuster le planning selon de nouvelles contraintes, ou régénérer automatiquement le calendrier pour une année future.
---

# Rotation automatique des responsabilités COBACAM

## Vue d'ensemble

Ce skill gère la rotation automatique des responsabilités pour le groupe COBACAM (Communauté camerounaise au Canada). Il génère des plannings Excel professionnels avec trois rôles principaux : **Réception**, **Présidence** et **Secrétariat**.

## Règles de rotation strictes

### Contraintes obligatoires

1. **Pas de conflit** : Une personne ne peut pas occuper 2 rôles différents le même mois
2. **Réceptions en ligne** : Les mois de juillet et décembre ont toujours "En ligne" pour la réception
3. **Ordre cyclique** : Chaque rôle suit son propre ordre de rotation continu
4. **Continuité annuelle** : La rotation continue logiquement d'une année à l'autre

### Algorithme de sélection

Pour chaque mois, sélectionner les personnes selon l'ordre cyclique de chaque rôle en vérifiant qu'il n'y a pas de conflit. Utiliser la fonction `get_next_person()` du script pour obtenir le prochain candidat disponible.

## Workflow principal

### 1. Analyser la demande

Identifier le type de requête :
- Créer un nouveau planning pour une année
- Ajouter de nouveaux membres
- Modifier un nom existant
- Ajuster des contraintes spécifiques

### 2. Préparer les données

- **Fichier existant** : Si l'utilisateur a fourni un fichier Excel, le lire pour extraire l'ordre de rotation actuel
- **Nouveaux membres** : Si ajout de membres, préparer la liste des noms
- **Couleurs** : Charger les couleurs depuis `references/membres_couleurs.md` ou assigner automatiquement pour nouveaux membres
- **Positions** : Déterminer les positions de départ dans les ordres de rotation

### 3. Générer le planning

Utiliser le script `scripts/generer_rotation.py` :

```python
from scripts.generer_rotation import creer_rotation_responsabilites

output_path, planning, couleurs = creer_rotation_responsabilites(
    annee=2027,
    fichier_entree='/mnt/user-data/uploads/rotation_2026.xlsx',  # optionnel
    nouveaux_membres=['Marie Dupont', 'Pierre Martin'],  # optionnel
    ordre_reception=None,  # ou liste personnalisée
    ordre_presidence=None,  # ou liste personnalisée
    ordre_secretariat=None,  # ou liste personnalisée
    positions_initiales={'reception': 0, 'presidence': 0, 'secretariat': 0}  # optionnel
)
```

### 4. Présenter le résultat

Afficher :
1. Lien de téléchargement du fichier Excel : `computer:///mnt/user-data/outputs/Rotation_responsabilites_YYYY.xlsx`
2. Tableau récapitulatif en Markdown avec colonnes : Mois | Réception | Présidence | Secrétariat
3. Confirmation que toutes les règles ont été respectées (aucun conflit détecté)
4. Liste des nouveaux membres ajoutés avec leurs couleurs assignées (si applicable)

## Formatage Excel

Le script génère automatiquement un fichier avec :

- **Font** : Calibri, taille 14, texte noir
- **Alignement** : Centré horizontal et vertical
- **Bordures** : Lignes fines sur toutes les cellules
- **Styles spéciaux** :
  - Année et mois en gras (Bold)
  - Cellules de rôles colorées selon le membre assigné
- **Structure** :
  - Row 3 : En-têtes (Année, Réception, Présidence, Secrétariat, Exposé)
  - Row 4+ : Données par année (1 ligne année + 12 lignes mois)

## Gestion des membres

### Membres actuels

Les 10 membres actuels ont des couleurs prédéfinies (voir `references/membres_couleurs.md`).

### Ajout de nouveaux membres

Lors de l'ajout de nouveaux membres :
1. Assigner automatiquement une couleur de la palette disponible
2. Intégrer équitablement dans les trois ordres de rotation
3. Recalculer le planning complet

### Modification de noms

Pour modifier un nom :
1. Charger le fichier Excel existant
2. Mettre à jour le nom dans le dictionnaire de couleurs
3. Régénérer le planning avec les mêmes ordres de rotation

## Exemples d'utilisation

### Exemple 1 : Créer planning 2027

**Requête** : "Crée le planning de rotation pour 2027"

**Actions** :
1. Utiliser les membres actuels et couleurs par défaut
2. Continuer l'ordre de rotation de 2026 (si fichier fourni)
3. Générer le fichier Excel
4. Présenter le tableau récapitulatif

### Exemple 2 : Ajouter nouveaux membres

**Requête** : "J'ai 2 nouveaux membres : Sophie Laurent et Marc Dubois. Refais le calendrier 2027."

**Actions** :
1. Ajouter Sophie Laurent et Marc Dubois avec couleurs automatiques
2. Les intégrer dans tous les ordres de rotation
3. Régénérer le planning 2027
4. Indiquer les couleurs assignées

### Exemple 3 : Modifier un nom

**Requête** : "Change Jean-Bosco Nguezet en Jean-Bosco Nguezet-Mbarga"

**Actions** :
1. Charger le fichier existant
2. Mettre à jour le nom dans le dictionnaire
3. Régénérer avec même ordre
4. Confirmer la modification

### Exemple 4 : Contraintes spéciales

**Requête** : "Refais 2027 mais Marie doit avoir sa première réception en mars maximum"

**Actions** :
1. Ajuster l'ordre de rotation pour réception
2. Vérifier que Marie est assignée en janvier, février ou mars
3. Générer le planning
4. Confirmer que la contrainte est respectée

## Validation et vérification

Après génération, toujours vérifier :
- ✅ Aucun conflit (personne avec 2 rôles le même mois)
- ✅ Juillet et décembre = "En ligne" pour réception
- ✅ Tous les membres apparaissent équitablement
- ✅ Couleurs correctement appliquées
- ✅ Formatage professionnel (font, bordures, alignement)

## Ressources

- **Script principal** : `scripts/generer_rotation.py` - Contient toute la logique de génération
- **Référence couleurs** : `references/membres_couleurs.md` - Liste des membres avec couleurs et palette pour nouveaux membres

## Notes importantes

- Le script installe automatiquement `openpyxl` si nécessaire
- Les fichiers sont toujours sauvegardés dans `/mnt/user-data/outputs/`
- Le format de sortie est compatible Excel (.xlsx)
- Les couleurs utilisent le format ARGB hexadécimal Excel (FFxxxxxx)
