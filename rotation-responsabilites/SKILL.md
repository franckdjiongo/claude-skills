---
name: rotation-responsabilites
description: Gère automatiquement la rotation des responsabilités pour AAFI (Association des Amis Fidèles). Crée et met à jour des plannings Excel avec trois rôles (Réception, Présidence, Secrétariat). Respecte des règles strictes de rotation, évite les conflits de rôles par mois, applique des couleurs personnalisées par membre, et maintient un formatage professionnel. Utiliser ce skill quand l'utilisateur demande de créer un nouveau planning annuel de rotation, ajouter de nouveaux membres au groupe et recalculer la rotation, modifier le nom d'un membre existant, ajuster le planning selon de nouvelles contraintes, ou régénérer automatiquement le calendrier pour une année future.
---

# Rotation automatique des responsabilités AAFI

## Vue d'ensemble

Ce skill gère la rotation automatique des responsabilités pour le groupe AAFI (Association des Amis Fidèles). Il génère des plannings Excel professionnels avec trois rôles principaux : **Réception**, **Présidence** et **Secrétariat**.

## Règles de rotation strictes

### Contraintes obligatoires

1. **Pas de conflit** : une personne ne peut pas occuper 2 rôles différents le même mois
2. **Réceptions en ligne** : les mois de juillet et décembre ont toujours « En ligne » pour la réception
3. **Ordre cyclique** : chaque rôle suit son propre ordre de rotation continu
4. **Continuité annuelle** : la rotation continue logiquement d'une année à l'autre
5. **Contrainte secrétariat — Djoumetio Romuald** : ne doit jamais occuper le rôle de secrétaire (il est comptable du groupe). L'algorithme doit le sauter automatiquement lors de l'assignation du secrétariat.
6. **Équité** : chaque membre doit avoir au moins un rôle dans l'année. Aucun membre ne doit cumuler un nombre disproportionné de rôles.
7. **Exposés** : colonne ignorée dans la génération automatique (gérée manuellement).

### Règle nouveau membre — réception

Lorsqu'un nouveau membre rejoint le groupe :

1. **Siège d'abord** chez la personne qui l'a introduit (son parrain/introducteur).
2. **Visite obligatoire** : le nouveau membre doit siéger chez tous les autres membres existants avant de pouvoir recevoir lui-même.
3. **Première réception** : une fois toutes les visites complétées, le nouveau membre reçoit au prochain tour disponible.
4. **Conséquence pour l'introducteur** : l'introducteur ne peut pas re-recevoir tant que le nouveau membre n'a pas siégé chez tous les autres membres.

Pour appliquer cette règle, Claude doit :
- Identifier l'introducteur et la date d'arrivée du nouveau membre
- Reconstituer la liste des membres visités à partir des réceptions passées (images ou fichiers fournis)
- Déterminer le premier mois où le nouveau membre a visité tout le monde
- Planifier sa première réception au mois suivant disponible

### Règle nouveau membre — priorité de rattrapage (présidence et secrétariat)

Un nouveau membre qui n'a jamais occupé un rôle de présidence ou de secrétariat est **prioritaire** sur les membres qui l'ont déjà occupé les années précédentes.

**Principe** : les membres existants ont déjà fait le tour des rôles au fil des années. Un nouveau membre doit rattraper ce retard en passant **avant** eux dans la rotation pour les rôles qu'il n'a jamais occupés.

**Comment appliquer** :
1. Analyser l'historique de l'année précédente (images ou fichiers fournis)
2. Identifier les rôles que le nouveau membre n'a jamais occupés
3. Le placer tôt dans l'ordre de rotation pour ces rôles, avant les membres qui ont déjà servi récemment
4. Un membre existant qui a déjà été président (ou secrétaire) l'année précédente ne doit pas repasser avant le nouveau membre
5. Respecter les autres contraintes (pas de conflit, contrainte secrétariat Djoumetio Romuald)

**Exemple concret** : Jean De Dieu Dongmo Lonfo a rejoint en août 2025. Il n'a jamais été président ni secrétaire. Sobgoum Armel était président en décembre 2025. En 2026, JDD obtient le secrétariat dès février et la présidence dès mars, avant que les membres ayant déjà servi ne reprennent ces rôles.

**Cette règle s'applique indépendamment de la règle réception** : même si le nouveau membre n'a pas encore visité tout le monde (donc ne peut pas recevoir), il peut et doit occuper la présidence et le secrétariat dès que possible.

### Algorithme de sélection

Pour chaque mois, sélectionner les personnes selon l'ordre cyclique de chaque rôle en vérifiant :
- Pas de conflit (personne déjà assignée ce mois)
- Contrainte secrétariat (Djoumetio Romuald exclu du secrétariat)
- Contrainte nouveau membre — réception (pas de réception avant toutes les visites complétées)
- Priorité nouveau membre — présidence/secrétariat (passe avant les membres ayant déjà servi)

Utiliser la fonction `get_next_person()` du script pour obtenir le prochain candidat disponible.

## Workflow principal

### 1. Analyser la demande

Identifier le type de requête :
- Créer un nouveau planning pour une année
- Ajouter de nouveaux membres
- Modifier un nom existant
- Ajuster des contraintes spécifiques
- Appliquer des corrections (ex. réception annulée → en ligne, décalages)

### 2. Préparer les données

- **Fichier existant / images** : si l'utilisateur a fourni un fichier Excel ou des images des calendriers précédents, les lire pour extraire l'ordre de rotation actuel et l'historique des rôles
- **Nouveaux membres** : si ajout de membres, préparer la liste des noms et identifier l'introducteur
- **Visites** : reconstituer l'historique des visites du nouveau membre pour appliquer la règle de première réception
- **Historique rôles** : vérifier quels rôles le nouveau membre n'a jamais occupés pour appliquer la priorité de rattrapage
- **Couleurs** : charger les couleurs depuis `references/membres_couleurs.md` ou assigner automatiquement pour nouveaux membres
- **Positions** : déterminer les positions de départ dans les ordres de rotation

### 3. Générer le planning

Utiliser le script `scripts/generer_rotation.py` :

```python
from scripts.generer_rotation import creer_rotation_responsabilites

output_path, planning, couleurs = creer_rotation_responsabilites(
    annee=2027,
    fichier_entree='/mnt/user-data/uploads/rotation_2026.xlsx',  # optionnel
    nouveaux_membres=['Marie Dupont'],  # optionnel
    exclusions_secretariat=['Djoumetio Romuald'],  # membres interdits de secrétariat
    ordre_reception=None,  # ou liste personnalisée
    ordre_presidence=None,  # ou liste personnalisée
    ordre_secretariat=None,  # ou liste personnalisée
    positions_initiales={'reception': 0, 'presidence': 0, 'secretariat': 0}  # optionnel
)
```

**Note importante** : pour les cas complexes impliquant la règle de priorité nouveau membre, il est souvent plus fiable de construire le planning manuellement en analysant l'historique, puis de passer les ordres personnalisés au script. Le script gère les conflits et la contrainte secrétariat automatiquement, mais la logique de priorité de rattrapage nécessite l'analyse humaine de l'historique.

### 4. Présenter le résultat

Afficher :
1. Lien de téléchargement du fichier Excel
2. Tableau récapitulatif en markdown avec colonnes : Mois | Réception | Présidence | Secrétariat
3. Confirmation que toutes les règles ont été respectées (aucun conflit détecté)
4. Liste des nouveaux membres ajoutés avec leurs couleurs assignées (si applicable)

## Formatage Excel

Le script génère automatiquement un fichier avec :

- **Font** : Calibri, taille 11-13, texte noir ou blanc selon luminosité du fond
- **Alignement** : centré horizontal et vertical, wrap text activé
- **Bordures** : lignes fines sur toutes les cellules
- **Styles spéciaux** :
  - Titre et sous-titre en gras
  - En-têtes sur fond sombre (bleu-gris) avec texte blanc
  - Cellules de rôles colorées selon le membre assigné
  - Couleur de texte automatique (noir sur fond clair, blanc sur fond foncé)
- **Légende** : section avec toutes les couleurs des membres
- **Notes** : section rappelant les contraintes appliquées
- **Structure** :
  - Row 1 : titre de l'association
  - Row 2 : sous-titre avec année
  - Row 4 : en-têtes (Année, Réception, Présidence, Secrétariat)
  - Row 5+ : données mensuelles

## Gestion des membres

### Membres actuels (2026)

| Nom dans le planning | Couleur |
|---|---|
| Julio Ngueno | Jaune |
| Sobgoum Armel | Rouge |
| Lekeuka Franc | Bleu |
| Kana Martin | Magenta |
| Sobgoum Joël | Orange |
| Djiolo Chamberlin | Gris |
| Djoumetio Romuald | Violet |
| Nguezet Jean Bosco | Jaune doré |
| Jean De Dieu Dongmo Lonfo | Vert |
| En ligne | Beige |

**Note** : les noms dans le planning utilisent le format « Nom Prénom » tel qu'affiché dans les calendriers historiques. Toujours vérifier la cohérence avec les fichiers précédents.

### Ajout de nouveaux membres

Lors de l'ajout de nouveaux membres :
1. Identifier l'introducteur (membre qui l'a amené)
2. Reconstituer les visites effectuées (pour la règle réception)
3. Analyser l'historique des rôles de l'année précédente (pour la priorité présidence/secrétariat)
4. Assigner automatiquement une couleur de la palette disponible
5. Intégrer dans les trois ordres de rotation en respectant toutes les règles
6. Recalculer le planning complet

### Modification de noms

Pour modifier un nom :
1. Charger le fichier Excel existant
2. Mettre à jour le nom dans le dictionnaire de couleurs
3. Régénérer le planning avec les mêmes ordres de rotation

## Exemples d'utilisation

### Exemple 1 : créer planning 2027

**Requête** : « Crée le planning de rotation pour 2027 »

**Actions** :
1. Utiliser les membres actuels et couleurs par défaut
2. Continuer l'ordre de rotation de 2026 (si fichier fourni)
3. Générer le fichier Excel
4. Présenter le tableau récapitulatif

### Exemple 2 : ajouter un nouveau membre

**Requête** : « Nouveau membre : Sophie Laurent, introduite par Kana Martin, a commencé à siéger en mars 2027 »

**Actions** :
1. Identifier Kana Martin comme introducteur
2. Reconstituer les visites de Sophie depuis mars 2027
3. Calculer quand elle aura visité tous les membres → première réception au mois suivant
4. Bloquer la réception de Kana Martin jusqu'à ce que Sophie ait tout visité
5. Vérifier l'historique des rôles : Sophie n'a jamais été présidente ni secrétaire → la placer tôt dans ces rotations (avant les membres ayant déjà servi)
6. Assigner couleur automatique et régénérer le planning

### Exemple 3 : correction en cours d'année

**Requête** : « La réception de février se fait finalement en ligne, décaler les réceptions suivantes »

**Actions** :
1. Passer février en « En ligne »
2. Décaler le membre prévu en février vers le mois suivant
3. Cascade des décalages sur les mois suivants
4. Vérifier aucun conflit
5. Régénérer le fichier Excel

### Exemple 4 : contrainte spéciale

**Requête** : « Djoumetio Romuald ne doit jamais être secrétaire »

**Actions** :
1. Ajouter Djoumetio Romuald à la liste `exclusions_secretariat`
2. L'algorithme le sautera automatiquement pour le secrétariat
3. Il reste éligible pour réception et présidence

## Validation et vérification

Après génération, toujours vérifier :
- ✅ Aucun conflit (personne avec 2 rôles le même mois)
- ✅ Juillet et décembre = « En ligne » pour réception
- ✅ Djoumetio Romuald jamais secrétaire
- ✅ Nouveau membre ne reçoit qu'après avoir visité tous les autres
- ✅ Nouveau membre prioritaire pour présidence/secrétariat s'il n'a jamais servi
- ✅ Tous les membres apparaissent équitablement
- ✅ Couleurs correctement appliquées
- ✅ Formatage professionnel (font, bordures, alignement)

## Ressources

- **Script principal** : `scripts/generer_rotation.py` — contient toute la logique de génération
- **Référence couleurs** : `references/membres_couleurs.md` — liste des membres avec couleurs et palette pour nouveaux membres

## Notes importantes

- Le script installe automatiquement `openpyxl` si nécessaire
- Les fichiers sont toujours sauvegardés dans `/mnt/user-data/outputs/`
- Le format de sortie est compatible Excel (.xlsx)
- Les couleurs utilisent le format ARGB hexadécimal Excel (FFxxxxxx)
- La couleur du texte s'adapte automatiquement à la luminosité du fond
- Pour les cas complexes (nouveau membre + priorité de rattrapage), privilégier la construction manuelle du planning avec analyse de l'historique, puis utiliser le script pour le formatage Excel
