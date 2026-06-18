# Signature AutoMintech — politique et injection dans le prompt

L'utilisateur produit des visuels pour ses clients **via son entreprise AutoMintech**. La
signature est donc une marque d'atelier obligatoire sur le marketing, **pas** un watermark
parasite. Les logos font exception (livrés propres).

## Décisions verrouillées (choix de l'utilisateur)

- **Format** : wordmark **« AutoMintech »** + ligne de crédit, plus contact optionnel.
- **Libellé exact de la signature** : **« Créé par AutoMintech »**.
- **Logos** : visuel logo **100 % propre**, crédit AutoMintech **hors-fichier** (planche de
  présentation / mockup uniquement).
- **Contact** : **automintech.com** (site officiel) → à inclure **par défaut** sur une
  micro-ligne sous la signature, encore plus petite et discrète. (Mettre à jour ici si un autre
  contact / handle est souhaité.)

## Bloc de signature à injecter (visuels marketing)

Insérer ce bloc dans la section **texte visible exact** du prompt, juste après le texte du
client, en français ou en anglais selon la langue du prompt :

```text
Signature d'atelier discrète (intentionnelle, ce n'est PAS un watermark parasite):
placer en pied de visuel ou dans un coin, petite taille, nette, fort contraste, non dominante,
sans gêner la lecture du message principal:
"Créé par AutoMintech"
"automintech.com"  (micro-ligne sous la signature, encore plus petite et discrète)
```

Et dans les **exclusions**, remplacer tout « No watermark » par :

```text
No watermark or stray text other than the intentional "Créé par AutoMintech" studio credit.
```

> Pourquoi : un « No watermark » seul pousserait ChatGPT à supprimer la signature voulue. On
> qualifie donc le crédit d'élément de marque **intentionnel**.

## Placement recommandé par type d'actif

| Type d'actif | Placement de la signature |
|---|---|
| Flyer / affiche / poster | pied de page, petit, centré ou coin inférieur droit |
| Bannière web | coin inférieur droit, très discret |
| Publicité / hero image | coin inférieur (ne pas croiser le sujet ni le CTA) |
| Social (1:1 / 4:5) | coin inférieur ; story 9:16 → bas, au-dessus de la zone UI |
| Brochure spread | pied de la page de droite, discret |
| Menu short-form | bas de page, sous le contenu |
| Slide cover / corporate | coin inférieur (gauche ou droite selon la composition) |
| Infographie | pied de l'infographie, ligne de crédit |
| Mockup produit / packaging | coin de la scène, hors de l'étiquette produit |
| Visuel e-commerce lifestyle | coin discret |
| Visuel éditorial | coin inférieur, très discret pour préserver l'esthétique |

Règle générale : la signature ne croise jamais le point focal, ni le titre, ni le CTA, ni
l'étiquette d'un produit. Petite, nette, lisible, secondaire.

## Logos : crédit hors-fichier (jamais sur le logo)

Pour toute demande de logo / monogramme / badge / icône de marque :

1. Le **prompt du logo NE contient AUCUNE mention AutoMintech**. Le signe reste vierge,
   centré sur fond neutre, prêt à être vectorisé.
2. Proposer en plus un **prompt de planche de présentation** (mockup) qui, lui, peut porter le
   crédit AutoMintech discret — c'est ce qu'on montre au client, pas le fichier final.

Exemple de bloc additionnel à fournir avec un logo :

```text
(Optionnel — planche de présentation du logo, pour montrer au client)
Crée une planche de présentation premium du logo "[NOM]" sur fond neutre élégant:
le logo centré en grand, deux déclinaisons plus petites (version monochrome + version sur
fond sombre), beaucoup d'espace négatif, rendu studio.
Crédit d'atelier discret en pied de planche: "Créé par AutoMintech" — "automintech.com".
No clutter. No busy mockup scene. No watermark other than the AutoMintech credit.
```

## Exception e-commerce / marketplace

Un **packshot pur** destiné à une marketplace (Amazon, Etsy, etc.) ne doit **pas** porter de
signature visible : ces plateformes rejettent les watermarks. Dans ce cas :
- traiter comme un logo (visuel propre, crédit **hors-fichier**),
- **le signaler explicitement** à l'utilisateur dans le Bloc B (Hypothèses) ou G (Note).
Les visuels e-commerce **lifestyle / campagne** (pas des packshots marketplace) gardent la
signature discrète.
