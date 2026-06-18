# Framework — principes, template et garde-fous

Table des matières
1. État des modèles d'image OpenAI (ce qu'il faut savoir)
2. Ce qui rend un visuel « premium »
3. Le template de brief créatif (gabarit canonique)
4. Règles du texte visible dans l'image
5. Exclusions (contraintes négatives) ciblées
6. Ratios par usage
7. Contraste, lisibilité et dark mode
8. Garde-fous légaux & éthiques
9. Glossaire minimal
10. Liste de styles sûrs et professionnels
11. Erreurs de prompt fréquentes à éviter

---

## 1. État des modèles d'image OpenAI

- **gpt-image-2** : modèle de référence pour génération + édition (API). Tailles flexibles,
  entrées image haute fidélité. À privilégier pour visuels client-facing, photoréalisme,
  édition, texte dans l'image et workflows sensibles à la marque.
- **gpt-image-1.5 / gpt-image-1 / gpt-image-1-mini** : modèles précédents/anciens.
- **GPT-4o image generation** (dans ChatGPT) : génération nativement multimodale ; fort sur le
  texte dans l'image, le suivi d'instructions, l'usage d'images importées comme référence et la
  cohérence multi-tours (peut gérer ~10–20 objets). C'est ce que vise un « prompt à coller dans
  ChatGPT ».
- **ChatGPT Images 2.0** : disponible sur tous les forfaits. *Images with thinking* sur Plus/Pro/
  Business (arrivée Enterprise/Edu prévue).

Quatre modes à distinguer :
- **Génération simple** : partir de zéro.
- **Édition** : modifier une image existante (partielle/totale, avec masque possible).
- **Multi-tours** : affiner dans le même fil conversationnel (corrections successives).
- **Images de référence** : préserver identité/géométrie, transférer un style, ou composer
  plusieurs éléments. Toujours **indexer chaque image par rôle** : « image 1 = produit »,
  « image 2 = style », etc., puis dire ce qui doit être transféré / déplacé / conservé.

**Limites connues** (à compenser dans le prompt) : posters longs (cropping), petit texte dense,
rendu multilingue, hallucinations, graphing précis, binding complexe. Les sorties ne sont pas
garanties exactes ni uniques → **contrôle humain obligatoire avant diffusion**.

**Deux contradictions doc à coder comme garde-fous** :
- Fond transparent : annoncé côté ChatGPT, mais `background:"transparent"` non supporté
  actuellement côté API gpt-image-2. → Séparer « prompt ChatGPT » et « réglages API ».
- `input_fidelity` : présent dans d'anciens exemples, mais le guide API actuel demande de
  l'omettre (toutes les entrées sont déjà traitées en haute fidélité).

---

## 2. Ce qui rend un visuel « premium »

La convergence de décisions concrètes, pas un adjectif :
- **Hiérarchie claire** : un point focal évident, puis l'info secondaire, puis le CTA.
- **Contraste suffisant** et **espacement intentionnel** (marges généreuses).
- **Palette resserrée** (2–5 couleurs nommées ou codes si fournis).
- **Textures crédibles** + **lumière cohérente** (angle, source, douceur/dureté).
- **Composition non encombrée** + **espace négatif** assumé.
- **Typographie lisible** (kerning propre, lettres nettes, aucun mot tronqué).
- **Cohérence de marque** (codes visuels constants).

Pour le **photoréalisme** : parler comme d'une vraie prise de vue — angle, focale, texture de
peau, usure des surfaces, lumière, profondeur de champ, et **imperfections plausibles** pour
éviter le rendu « IA trop propre ». Interdire la finition sur-publicitaire si ce n'est pas le but.

Niveau de détail idéal : ni minimaliste, ni encyclopédique. Cinq blocs suffisent :
**intention commerciale · sujet principal · direction artistique · mise en page/texte visible ·
contraintes & critères de qualité.** Au-delà, on surcharge le modèle (surtout sur le texte).
Règle d'or : **itérer plutôt que surcharger**.

---

## 3. Template de brief créatif (gabarit canonique)

Remplir de façon **adaptative**, puis **retirer les blocs inutiles**. Cible : 120–260 mots pour
un actif marketing courant ; davantage seulement pour multi-panneaux ou cohérence de série.

```text
objectif
Créer un(e) [type d'actif] premium pour [marque / offre / campagne].

usage final
Support: [flyer / affiche / logo / bannière / hero image / slide cover / brochure spread / mockup / e-commerce / infographie]
Canal: [web / impression / social / présentation / marketplace / packaging]
Ratio ou orientation: [1:1 / 4:5 / 16:9 / 9:16 / portrait / paysage / A-series]

public cible
Le visuel doit parler à [public] et transmettre [émotion / perception recherchée].

message
Idée principale: [promesse / thème / bénéfice]
Niveau de sophistication: [sobre / premium / luxe / éditorial / corporate]

sujet principal
Montrer [sujet, produit, personne, scène, objet] avec [détails critiques obligatoires].

direction artistique
Style: [photoréaliste / illustration éditoriale / 3D glossy / flat vector-like / cinématographique / minimalisme luxe / dark mode corporate]
Références stylistiques sûres: [descripteurs génériques — PAS d'artiste vivant, PAS de marque copiée]
Matériaux / textures: [papier texturé / aluminium brossé / verre fumé / coton / grain film / encre sérigraphique]
Lumière: [soft diffuse / high contrast / golden hour / studio softbox / néon contrôlé]
Palette: [2 à 5 couleurs nommées ou codes]

composition
Plan: [close-up / medium / wide / top-down / flat lay / hero]
Angle: [eye level / low angle / 3/4 / overhead]
Hiérarchie: [élément principal, secondaire, CTA, zone de respiration]
Placement: [titre en haut à gauche, produit centré, espace négatif à droite, etc.]
Grille: [alignement fort, marges généreuses, rythme visuel clair]

texte visible exact
Render text exactly as written, once only, with no extra text.
Titre: "[...]"
Sous-titre: "[...]"
CTA / prix / mention courte: "[...]"
Typographie: [sans serif géométrique / serif éditoriale / grotesque condensée / humanist sans]
Lisibilité: contraste fort, kerning propre, lettres nettes, aucun mot tronqué

signature de marque (AutoMintech — SAUF logos)
Crédit discret en pied/coin, petit, net, non dominant: "Créé par AutoMintech"
+ micro-ligne plus petite encore: "automintech.com". Voir references/automintech-branding.md.

contraintes de marque
Conserver: [palette, ton, formes, produit, silhouette, personnage, style de surface]
Éviter toute dérive vers: [cheap / stock image / look générique / surchargé / trop cartoon]

éléments à éviter
No watermark other than the AutoMintech credit. No unrelated logos or trademarks.
No malformed anatomy / broken geometry. No spelling mistakes. No duplicated objects. No clutter.

critères de qualité
Le résultat doit sembler [commercialisable / campaign-ready / premium / éditorial / corporate].
Priorité à: [lisibilité, cohérence de marque, réalisme, élégance, espace négatif, netteté produit].
Si arbitrage nécessaire, privilégier [lisibilité / composition / produit / marque].
```

Ordre d'information stable et recommandé : **scène/contexte → sujet → détails critiques →
contraintes → texte visible → exclusions.** Toujours indiquer **l'usage final** tôt (il active
le bon « mode » visuel du modèle).

---

## 4. Règles du texte visible dans l'image

- Fournir la **copie exacte entre guillemets** ; limiter le nombre de mots ; indiquer
  emplacement, casse, couleur, style typo ; exiger **« une seule occurrence, sans texte
  additionnel »**.
- Mot difficile / nom de marque / acronyme : **l'épeler lettre par lettre**.
- Classification du volume de texte :
  - **Court (1–8 mots)** : peut rester dans l'image.
  - **Moyen (9–25 mots)** : faisable, à surveiller et simplifier.
  - **Long (>25 mots)** : proposer une image avec placeholders / mise en page semi-éditoriale,
    puis **finaliser le texte hors image** (Figma / InDesign / PowerPoint). Prévenir l'utilisateur.
- Panneaux denses, menus complets, tableaux comparatifs, brochures multipages → générer l'axe
  visuel, finaliser le texte ailleurs.

---

## 5. Exclusions ciblées

5 à 7 maximum, focalisées sur les **échecs probables** du cas précis : faute d'orthographe,
watermark non désiré, logos non liés, surcharge, artefacts, perspective incohérente, texte
dupliqué. Une longue liste générique dilue le signal. **Important AutoMintech** : ne jamais
écrire « no watermark » seul sur un visuel signé — utiliser « **no watermark other than the
AutoMintech credit** » pour ne pas supprimer la signature voulue.

---

## 6. Ratios par usage

Raisonner d'abord en **usage**, puis en ratio :
- `1:1` — post carré, fiche produit, visuel simple.
- `4:5` — flyer digital, post premium, pub sociale verticale courte.
- `9:16` — story, reel, plein écran mobile.
- `16:9` — slide cover, hero web, bannière, keynote.
- **A-series portrait** (proportion `1:√2`) — poster imprimé, couverture brochure, affiche print.

---

## 7. Contraste, lisibilité et dark mode

Pour tout support corporate, pitch, bannière, slide cover (surtout dark mode), exiger dans le
prompt : « fond sombre stable, texte clair à fort contraste, taille généreuse, pas de gris
moyens sur noir, pas de glow faible qui réduit la lecture ». Repère d'accessibilité (WCAG) :
contraste min `4.5:1` pour le texte standard, `3:1` pour le grand texte — y compris quand le
texte est intégré dans une image.

---

## 8. Garde-fous légaux & éthiques

- **Propriété** : les sorties appartiennent à l'utilisateur (dans la limite du droit), mais
  peuvent ne pas être uniques.
- **Style d'artiste vivant** : interdit → reformuler en descripteurs visuels génériques sûrs
  (voir §10).
- **Marques protégées** : pas d'imitation directe ; créer un signe original non contrefaisant.
- **Personnes réelles** : ressemblance non consentie interdite si confusion possible → exiger
  consentement/droits ou une référence légitime fournie par l'utilisateur.
- **Contenus sensibles** : refuser deepfakes sexuels, contenu impliquant des mineurs, etc.
- Toujours rappeler le **contrôle humain** avant diffusion.

---

## 9. Glossaire minimal

- **hero image** : visuel principal d'une page/campagne, pensé pour l'impact initial.
- **espace négatif** : zone vide servant respiration, hiérarchie et lisibilité.
- **silhouette** : forme globale lisible d'un objet/logo, même en petit.
- **contact shadow** : ombre légère au point d'appui d'un produit (clé du réalisme).
- **style locking** : répétition explicite des invariants pour éviter la dérive.
- **anchor image** : image maîtresse, référence stable d'une série.
- **vector-like** : rendu graphique simple/propre évoquant un futur tracé vectoriel (sans
  promettre un vrai fichier vectoriel).
- **editorial** : esthétique de magazine/campagne, plus narrative et composée qu'un packshot.

---

## 10. Liste de styles sûrs et professionnels

photographie de luxe minimaliste · illustration éditoriale pastel · dark mode corporate premium ·
publicité beauté studio soft light · photo produit marketplace haut de gamme · rendu 3D glossy
contrôlé · flat design vector-like · visuel cinématographique sobre · modernisme géométrique ·
brutalism éditorial maîtrisé · élégance serif contemporaine · ambiance chaleureuse minérale ·
matière papier texturé · campagne mode urbaine premium · interface SaaS très propre et crédible.

(Formulés pour éviter toute référence à un artiste vivant ou une marque protégée.)

---

## 11. Erreurs de prompt fréquentes à éviter

- Demander « quelque chose de moderne et beau » sans hiérarchie ni usage final.
- Surcharger d'effets sans point focal.
- Trop de texte visible dans une seule image.
- Oublier le ratio / le support.
- Oublier de préciser ce qui doit rester invariant.
- Demander un logo « très détaillé » au lieu d'un signe simple et scalable.
- Demander une brochure complète au lieu d'une page / double page.
- Lister 20 exclusions génériques au lieu de 5 risques réels.
- Référencer un artiste vivant ou une marque à copier.
- Itérer en changeant tout au lieu d'une variable à la fois.
