# Impossibilité découverte : tests verts, fonctionnalité inopérante

Cas distinct de l'arrêt-et-chip : le lot passe tous ses tests, mais la fonctionnalité ne peut pas marcher
avec des données réelles (tests sur entrées synthétiques, dépendance non résoluble dans le périmètre :
référentiel, droit d'accès, colonne, service tiers).

Test à chaque lot touchant un chemin de bout en bout : *si on livrait ça aujourd'hui, l'utilisateur final
pourrait-il s'en servir ?* Si non :

1. **Consigne l'impossibilité au lot où elle est découverte**, pas à la clôture : chip si `Chips : autorisés`,
   sinon section dédiée du rapport et de la PR. Un commentaire dans le code n'est pas une disposition.
2. **Nomme-la en tête du rapport**, pas noyée dans la liste des remarques.
3. **Pas plus de deux lots par-dessus sans réévaluer** : si les lots suivants n'ont de valeur que si la
   fonctionnalité marche, arrêt-et-chip.
4. **Le rapport final le dit en une phrase** : « livré et vert, mais inopérant tant que X n'est pas résolu ».

Aucun lint ne l'attrape : c'est la vigilance de l'exécutant et les lentilles « mécanique du domaine » et
« candide » du préflight.
