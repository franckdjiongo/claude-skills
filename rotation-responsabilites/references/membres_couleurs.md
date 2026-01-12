# Référence des membres et couleurs

## Couleurs par défaut des membres COBACAM

| Membre | Couleur | Code RGB Excel |
|--------|---------|----------------|
| Julio Ngueno | Bleu moyen | FF64B5F6 |
| Armel Djiongo | Rouge | FFEF5350 |
| Franc Lekeuka | Vert | FF66BB6A |
| Martin Kana | Mauve | FFAB47BC |
| Jean De Dieu Dongmo | Orange | FFFF7043 |
| Joël Sobgoum | Gris | FF757575 |
| Chamberlin Momo | Cyan | FF26C6DA |
| Romuald Djoumetio | Rose | FFEC407A |
| Jean-Bosco Nguezet | Gris foncé | FF424242 |
| En ligne | Brun | FF8D6E63 |

## Palette de couleurs pour nouveaux membres

Quand de nouveaux membres sont ajoutés, utiliser ces couleurs dans l'ordre :

1. Jaune - FFFFA726
2. Lime - FF9CCC65
3. Teal - FF26A69A
4. Indigo - FF5C6BC0
5. Deep Orange - FFFF7043
6. Light Green - FF7CB342
7. Blue Grey - FF78909C
8. Amber - FFFFCA28

## Critères de sélection des couleurs

Pour garantir une bonne lisibilité avec texte noir sur fond coloré :
- Luminosité suffisante (ni trop claire ni trop foncée)
- Contraste avec les couleurs existantes
- Éviter les couleurs trop similaires entre membres

## Structure du dictionnaire Python

```python
couleurs = {
    'Julio Ngueno': 'FF64B5F6',
    'Armel Djiongo': 'FFEF5350',
    'Franc Lekeuka': 'FF66BB6A',
    'Martin Kana': 'FFAB47BC',
    'Jean De Dieu Dongmo': 'FFFF7043',
    'Joël Sobgoum': 'FF757575',
    'En ligne': 'FF8D6E63',
    'Chamberlin Momo': 'FF26C6DA',
    'Romuald Djoumetio': 'FFEC407A',
    'Jean-Bosco Nguezet': 'FF424242',
}
```

## Format des codes couleurs

Les codes couleurs Excel utilisent le format ARGB hexadécimal :
- Premiers 2 caractères (FF) : Canal alpha (opacité à 100%)
- 6 caractères suivants : Code RGB standard

Exemple : `FF64B5F6` = Opacité 100% + RGB #64B5F6
