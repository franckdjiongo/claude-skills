# Impossibilité découverte : tests verts, fonctionnalité inopérante

Le protocole arrêt-et-chip se déclenche quand une vérification ÉCHOUE. Ce cas est différent : le lot passe
tous ses tests, et pourtant la fonctionnalité qu'il construit ne peut pas fonctionner avec des données
réelles. Typiquement, les tests l'exercent avec des entrées synthétiques alors qu'une dépendance nécessaire
(référentiel, droit d'accès, colonne, service tiers) n'est pas résoluble dans le périmètre de fichiers du
chantier.

Le test à poser à chaque lot qui touche un chemin de bout en bout : *si on livrait ça aujourd'hui,
l'utilisateur final pourrait-il s'en servir ?* Si non alors que les tests sont verts, applique ceci :

1. **Consigne l'impossibilité IMMÉDIATEMENT**, au lot où elle est découverte, pas à la clôture : chip si
   `Chips : autorisés`, sinon section dédiée du rapport et de la PR. Un commentaire de tête dans le code
   n'est PAS une disposition : il est invisible pour qui n'ouvre pas ce fichier.
2. **Nomme-la en tête du rapport du run**, pas noyée dans la liste des remarques.
3. **Ne construis pas plus de deux lots par-dessus sans réévaluer.** Si les lots suivants n'ont de valeur que
   si la fonctionnalité marche, arrête-toi (arrêt-et-chip) : continuer produit du code vert que personne ne
   peut utiliser.
4. **Le rapport final le dit en une phrase** : « livré et vert, mais inopérant tant que X n'est pas résolu ».

Cette règle décrit un comportement d'EXÉCUTION : aucun lint ne peut l'attraper sur un plan. Elle repose sur
la vigilance de l'exécutant et sur les lentilles « mécanique du domaine » et « candide » du préflight.
