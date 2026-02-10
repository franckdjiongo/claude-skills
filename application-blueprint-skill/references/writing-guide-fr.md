# Guide de rédaction — Français (Canada)

Ce guide établit le ton, le style et les standards de qualité pour la version française du dossier applicatif.

## Principe fondamental

Le document doit se lire comme s'il avait été rédigé par un analyste d'affaires chevronné qui comprend intimement l'application et son public. Il doit paraître écrit à la main, pas généré. Un lecteur ne devrait jamais penser « ce texte a été produit par une IA ».

**Le document français n'est PAS une traduction de la version anglaise.** Il est rédigé nativement en français, avec des tournures naturelles et idiomatiques propres au français canadien. Le contenu est le même, mais la formulation est pensée en français dès le départ.

## Voix et ton

- **Professionnel mais accessible.** Écrire comme dans un document d'affaires bien édité — clair, direct et assuré, mais ni rigide ni académique.
- **Informatif sans être condescendant.** Présumer que le lecteur est intelligent mais qu'il ne connaît pas nécessairement les termes techniques.
- **Voix active par défaut.** « Le système envoie un courriel de confirmation » et non « Un courriel de confirmation est envoyé par le système ».
- **Présent de l'indicatif pour décrire les fonctionnalités.** « Le tableau de bord affiche les indicateurs en temps réel » et non « Le tableau de bord affichera les indicateurs ».
- **Troisième personne pour décrire le système.** « L'application valide les données saisies » ou « Les utilisateurs peuvent filtrer les résultats par date ».

## Conventions typographiques québécoises et canadiennes

Ces règles sont obligatoires :

1. **Majuscules.** Seule la première lettre d'une phrase prend la majuscule. Les noms communs restent en minuscules, même dans les titres de sections. Les noms propres (personnes, lieux, institutions) prennent la majuscule.
   - ✅ « Gestion des utilisateurs et des rôles »
   - ❌ « Gestion Des Utilisateurs Et Des Rôles »

2. **Espaces insécables.** Placer une espace insécable avant les signes de ponctuation doubles ( : ; ? !) et à l'intérieur des guillemets français. En Markdown, utiliser simplement une espace normale (le rendu est acceptable).

3. **Guillemets français.** Utiliser « » et non " " pour les citations et les termes mis en évidence.
   - ✅ L'application utilise un « jeton d'authentification » pour vérifier l'identité.
   - ❌ L'application utilise un "jeton d'authentification" pour vérifier l'identité.

4. **Vocabulaire informatique francisé.** Privilégier les termes français officiels recommandés par l'OQLF (Office québécois de la langue française) :
   - courriel (pas email/e-mail)
   - mot de passe (pas password)
   - identifiant (pas login)
   - tableau de bord (pas dashboard)
   - base de données (pas database)
   - serveur (pas server — même terme, mais toujours en contexte français)
   - interface de programmation ou API (acceptable car universellement connu)
   - infonuagique (pas cloud computing, mais « nuage » ou « infonuagique » sont acceptés)
   - pare-feu (pas firewall)
   - fichier témoin (pas cookie, bien que « cookie » soit toléré dans un contexte informel)

5. **Traits d'union et accents.** Respecter rigoureusement l'orthographe française, incluant les accents sur les majuscules (À, É, È, etc.).

## Standards de langage clair

1. **Définir chaque terme technique à sa première apparition.** Exemple : « L'application utilise une API (une interface de programmation, c'est-à-dire un mécanisme standardisé qui permet à deux logiciels de communiquer entre eux) pour récupérer les données météorologiques. »

2. **Préférer les mots courants aux termes techniques.** Dire « enregistre » plutôt que « persiste », « envoie » plutôt que « dispatche », « vérifie » plutôt que « valide » (sauf si la validation a un sens précis dans le contexte).

3. **Utiliser des analogies pour les concepts complexes.** Exemple : « La file d'attente de messages fonctionne comme une boîte aux lettres — l'application y dépose un message, et le service destinataire le récupère quand il est prêt. »

4. **Une idée par phrase.** Découper les raisonnements complexes en plusieurs phrases courtes.

5. **Pas de sigles sans expansion.** Toujours développer à la première occurrence, même les sigles courants comme API, URL ou SSO.

6. **Aucun code dans le texte.** Ne jamais inclure d'extraits de code, de noms de variables ou de chemins de fichiers dans le corps du texte.

## Construction des phrases

- **Phrases courtes de préférence (15-25 mots)** comme base, avec des phrases plus longues occasionnellement pour les idées complexes.
- **Commencer par le sujet.** Éviter les subordonnées en tête de phrase quand c'est possible.
- **Éviter les nominalisations excessives.** « Le système effectue une vérification » → « Le système vérifie ».
- **Éliminer le remplissage.** Supprimer : « il convient de noter que », « il est important de mentionner », « fondamentalement », « essentiellement », « dans le but de » (utiliser « pour »), « en raison du fait que » (utiliser « parce que » ou « car »).

## Anti-modèles à éviter

Ces tournures sont caractéristiques des textes générés par IA. Les éliminer systématiquement :

- ❌ « Cette solution robuste et évolutive tire parti d'une technologie de pointe... »
- ❌ « Dans le paysage numérique actuel en constante évolution... »
- ❌ « Il convient de souligner que... »
- ❌ « Cette fonctionnalité puissante permet aux utilisateurs de... »
- ❌ Commencer des paragraphes consécutifs par « L' » ou « Cette »
- ❌ Abus de « permet », « assure », « garantit », « facilite », « optimise »
- ❌ Langage d'atténuation : « pourrait », « serait susceptible de » pour décrire des fonctionnalités réellement implémentées
- ❌ Répéter la même information sous des formulations différentes d'une section à l'autre
- ❌ Utiliser « exhaustif » ou « robuste » pour décrire quoi que ce soit
- ❌ Points d'exclamation dans le document

## Conventions de mise en forme

- **Titres :** Utiliser les niveaux Markdown (`#`, `##`, `###`). Les titres de sections sont en `##`, les sous-sections en `###`.
- **Gras :** Utiliser pour les termes clés à leur première introduction et pour les noms de fonctionnalités dans la section correspondante.
- **Italique :** Utiliser avec parcimonie pour l'emphase ou pour les termes en cours de définition.
- **Listes :** Utiliser `-` pour les listes non ordonnées. Réserver les listes numérotées aux étapes séquentielles.
- **Tableaux :** Utiliser les tableaux Markdown pour les comparaisons structurées (ex. : matrice de permissions par rôle).

## Critères de qualité

Un dossier applicatif bien rédigé doit :

- Être compréhensible par un cadre non technique qui le lit pour la première fois
- Permettre à un nouveau développeur de comprendre ce que fait l'application avant de lire le moindre code
- Servir de document de référence vers lequel les équipes peuvent pointer lors de discussions sur l'application
- Paraître cohérent — comme un document unique, pas comme une collection de sections isolées
- Être factuel — chaque affirmation est appuyée par un élément trouvé dans le code
- Sonner naturel en français canadien — pas comme une traduction de l'anglais
