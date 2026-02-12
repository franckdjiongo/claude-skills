# Référence des membres et couleurs

## Couleurs par défaut des membres AAFI

| Membre | Couleur | Code RGB Excel |
|--------|---------|----------------|
| Julio Ngueno | Jaune | FFFFF176 |
| Sobgoum Armel | Rouge | FFEF5350 |
| Lekeuka Franc | Bleu | FF64B5F6 |
| Kana Martin | Magenta | FFEC407A |
| Sobgoum Joël | Orange | FFFF8A65 |
| Djiolo Chamberlin | Gris | FFBDBDBD |
| Djoumetio Romuald | Violet | FFCE93D8 |
| Nguezet Jean Bosco | Jaune doré | FFFFD54F |
| Jean De Dieu Dongmo Lonfo | Vert | FF66BB6A |
| En ligne | Beige | FFD7CCC8 |

## Palette de couleurs pour nouveaux membres

Quand de nouveaux membres sont ajoutés, utiliser ces couleurs dans l'ordre :

1. Cyan - FF26C6DA
2. Teal - FF26A69A
3. Indigo - FF5C6BC0
4. Lime - FF9CCC65
5. Deep Orange - FFFF7043
6. Light Green - FF7CB342
7. Blue Grey - FF78909C
8. Amber - FFFFCA28

## Contraintes par membre

| Membre | Contrainte | Raison |
|--------|-----------|--------|
| Djoumetio Romuald | Jamais secrétaire | Comptable du groupe |

## Historique des nouveaux membres

| Membre | Introducteur | Date d'arrivée | Première réception |
|--------|-------------|----------------|-------------------|
| Jean De Dieu Dongmo Lonfo | Sobgoum Joël | Août 2025 | Juin 2026 |

## Critères de sélection des couleurs

Pour garantir une bonne lisibilité avec texte adaptatif :
- Le script calcule automatiquement la luminosité du fond
- Texte noir sur fond clair (luminance > 128)
- Texte blanc sur fond foncé (luminance ≤ 128)
- Contraste suffisant entre les couleurs des membres

## Structure du dictionnaire Python

```python
couleurs = {
    'Julio Ngueno': 'FFFFF176',
    'Sobgoum Armel': 'FFEF5350',
    'Lekeuka Franc': 'FF64B5F6',
    'Kana Martin': 'FFEC407A',
    'Sobgoum Joël': 'FFFF8A65',
    'Djiolo Chamberlin': 'FFBDBDBD',
    'Djoumetio Romuald': 'FFCE93D8',
    'Nguezet Jean Bosco': 'FFFFD54F',
    'Jean De Dieu Dongmo Lonfo': 'FF66BB6A',
    'En ligne': 'FFD7CCC8',
}

# Membres interdits de secrétariat
exclusions_secretariat = ['Djoumetio Romuald']
```

## Format des codes couleurs

Les codes couleurs Excel utilisent le format ARGB hexadécimal :
- Premiers 2 caractères (FF) : canal alpha (opacité à 100%)
- 6 caractères suivants : code RGB standard

Exemple : `FFFFF176` = opacité 100% + RGB #FFF176
