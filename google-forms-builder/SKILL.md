---
name: google-forms-builder
description: Outil de création et génération de formulaires Google Forms pour la communauté COBACAM et autres besoins. Supporte deux approches - (1) Conception structurelle où Claude crée la structure détaillée du formulaire en markdown pour création manuelle par l'utilisateur dans Google Forms, ou (2) Génération programmatique via Google Apps Script pour automatisation complète. Utiliser ce skill quand l'utilisateur demande de créer, concevoir, générer ou structurer un formulaire Google Forms, particulièrement pour des cas d'usage communautaires (recensements, inscriptions, sondages, appels à participation), des formulaires récurrents nécessitant automatisation, ou quand l'utilisateur mentionne explicitement Google Forms, Apps Script, ou la nécessité d'un formulaire. Le skill est optimisé pour le contexte français canadien et les bonnes pratiques de la communauté COBACAM.
---

# Google Forms Builder

Skill spécialisé pour créer et générer des formulaires Google Forms, principalement pour la communauté COBACAM, avec support de deux modes: conception structurelle (manuel) et génération programmatique (Apps Script).

## Approches disponibles

### 1. Conception structurelle (Approche manuelle)
Créer une structure détaillée du formulaire en markdown que l'utilisateur implémente manuellement dans Google Forms.

**Utiliser cette approche quand:**
- Le formulaire est simple ou ponctuel
- L'utilisateur préfère le contrôle visuel de Google Forms UI
- Pas besoin d'automatisation ou de création répétée
- L'utilisateur n'est pas familier avec Apps Script

**Processus:**
1. Analyser les besoins de l'utilisateur
2. Créer une structure complète en markdown incluant:
   - Titre et description du formulaire
   - Tous les champs avec leurs types exacts
   - Options de choix multiples/checkboxes/dropdown
   - Indications de champs obligatoires
   - Validations nécessaires (email, téléphone, etc.)
   - Paramètres recommandés (barre de progression, message de confirmation, etc.)
   - Sections logiques si approprié
3. Fournir le texte en français, formaté clairement
4. Ajouter des notes de configuration si nécessaire

**Format de sortie:**
```markdown
# [Titre du formulaire]

**Description:**
[Texte de description complet]

**Paramètres recommandés:**
- Collecter les adresses courriel: [Oui/Non]
- Limiter à une réponse par utilisateur: [Oui/Non]
- Permettre la modification des réponses: [Oui/Non]
- Afficher la barre de progression: [Oui/Non]
- Message de confirmation: "[Texte du message]"

---

## Champs du formulaire

1. **[Titre du champ]** *
   - Type: [text/paragraph/multiple choice/checkbox/dropdown/date/etc.]
   - [Détails spécifiques: validation, options, etc.]
   
2. **[Titre du champ 2]**
   - Type: [...]
   - [...]

[...]
```

### 2. Génération programmatique (Apps Script)
Générer du code Google Apps Script complet pour créer le formulaire automatiquement.

**Utiliser cette approche quand:**
- Le formulaire est complexe ou doit être créé de manière répétée
- L'utilisateur veut automatiser la création
- Le formulaire nécessite des fonctionnalités avancées (API REST)
- L'utilisateur mentionne explicitement Apps Script ou automatisation

**Processus:**
1. Analyser les besoins et déterminer si FormApp suffit ou si l'API REST est nécessaire
2. Choisir le script de base approprié:
   - `scripts/create_form_complete.gs`: FormApp (Google Forms Service) - standard
   - `scripts/create_form_api.gs`: API REST - fonctionnalités avancées
3. Adapter le code aux besoins spécifiques
4. Fournir les instructions d'utilisation complètes

**Quand utiliser l'API REST plutôt que FormApp:**
- Besoin d'ajouter des images aux titres de questions
- Mélanger les choix par question (shuffle)
- Créer des quiz avec notation automatique sophistiquée
- Notifications push via Cloud Pub/Sub
- Batch updates massifs

## Utilisation des références

Le skill contient deux fichiers de référence essentiels:

### 1. Question Types Reference
**Fichier:** `references/question_types.md`

**Consulter pour:**
- Liste complète des types de questions disponibles
- Syntaxe exacte FormApp et API REST
- Exemples de code pour chaque type
- Validations possibles
- Limites et quotas

**Quand le lire:**
- Avant de générer du code Apps Script
- Pour vérifier les types de questions disponibles
- Pour comprendre les différences entre FormApp et API REST

### 2. Best Practices Reference
**Fichier:** `references/best_practices.md`

**Consulter pour:**
- Bonnes pratiques de conception de formulaires communautaires
- Structures recommandées pour COBACAM
- Optimisations Google Forms (logique conditionnelle, pré-remplissage)
- Gestion des données personnelles (LPRPDE)
- Checklist de publication

**Quand le lire:**
- Avant de concevoir un formulaire COBACAM
- Pour valider la structure d'un formulaire
- Pour des conseils sur accessibilité et inclusion

## Utilisation des scripts

### Script 1: create_form_complete.gs
**Fichier:** `scripts/create_form_complete.gs`

**Usage:**
- Création de formulaires via FormApp (Google Forms Service)
- Approche standard, simple et directe
- Couvre tous les types de questions de base

**Fonctions principales:**
- `createCompleteForm()`: Crée un formulaire complet avec toutes les configurations
- `createFormFromConfig()`: Crée un formulaire à partir d'une configuration JSON
- `addQuestions()`: Ajoute tous les types de questions possibles
- `addValidatedQuestion()`: Exemple de validation

**Instructions d'utilisation:**
1. Copier le code dans l'éditeur Apps Script (script.google.com)
2. Modifier la configuration ou les questions selon les besoins
3. Exécuter la fonction appropriée
4. Copier les URLs générées

### Script 2: create_form_api.gs
**Fichier:** `scripts/create_form_api.gs`

**Usage:**
- Création via API REST pour fonctionnalités avancées
- Nécessite configuration GCP

**Fonctions principales:**
- `createFormViaAPI()`: Crée un formulaire via l'API REST
- `addQuestionsWithImages()`: Ajoute des images aux questions
- `createQuizWithShuffledChoices()`: Crée un quiz avec choix mélangés
- `batchUpdateForm()`: Effectue des mises à jour groupées
- `createCOBACAMParrainageForm()`: Exemple complet COBACAM

**Configuration requise:**
1. Créer un projet Google Cloud Platform
2. Activer Google Forms API
3. Lier le projet Apps Script au projet GCP
4. Ajouter les scopes OAuth dans `appsscript.json`:
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

## Workflow recommandé

### Pour un formulaire simple (approche manuelle)
1. Demander les détails du formulaire à l'utilisateur
2. Consulter `references/best_practices.md` pour la structure recommandée
3. Créer la structure markdown complète
4. Fournir les instructions de création manuelle

### Pour un formulaire complexe ou récurrent (Apps Script)
1. Déterminer si FormApp suffit ou si l'API REST est nécessaire
2. Lire le script approprié (`create_form_complete.gs` ou `create_form_api.gs`)
3. Consulter `references/question_types.md` pour la syntaxe exacte
4. Adapter le code aux besoins spécifiques
5. Fournir le code complet avec instructions d'utilisation

### Pour un formulaire COBACAM
1. Consulter `references/best_practices.md` section "Types de formulaires récurrents"
2. Identifier le type (recensement, appel à participation, sondage, etc.)
3. Appliquer la structure type correspondante
4. Ajouter les éléments spécifiques COBACAM:
   - Déclaration de confidentialité
   - Message de confirmation en français
   - Format adapté pour WhatsApp si nécessaire
5. Vérifier contre la checklist finale

## Exemples d'utilisation

### Exemple 1: Formulaire de recensement simple
**Requête utilisateur:** "Crée-moi un formulaire pour recenser les transitions scolaires"

**Action:**
1. Utiliser l'approche manuelle (structurelle)
2. Consulter `references/best_practices.md` pour structure de recensement
3. Créer structure markdown complète avec:
   - Informations du parent
   - Informations de l'enfant
   - Type de transition
   - Établissements
   - Autorisation pour reconnaissance publique

### Exemple 2: Formulaire de parrainage avec code
**Requête utilisateur:** "Génère le code Apps Script pour créer un formulaire de parrainage"

**Action:**
1. Lire `scripts/create_form_complete.gs`
2. Adapter la fonction `createFormFromConfig()`
3. Créer la configuration spécifique au parrainage
4. Fournir le code complet avec instructions

### Exemple 3: Quiz avec images (avancé)
**Requête utilisateur:** "Je veux créer un quiz avec des images dans les questions"

**Action:**
1. Identifier le besoin d'API REST (images dans questions)
2. Lire `scripts/create_form_api.gs`
3. Consulter `references/question_types.md` pour syntaxe API
4. Adapter `addQuestionsWithImages()` et `createQuizWithShuffledChoices()`
5. Fournir les instructions de configuration GCP

## Contexte spécifique COBACAM

COBACAM est une communauté camerounaise au Canada. Les formulaires créés doivent:
- Être en français canadien
- Respecter les typographies canadiennes-françaises
- Inclure des déclarations de confidentialité conformes à la LPRPDE
- Utiliser un ton professionnel mais chaleureux
- Être adaptés pour distribution via WhatsApp
- Inclure des émojis appropriés dans les messages d'accompagnement

**Formats de communication WhatsApp typiques:**
```
❤️ *[Titre de l'initiative]* ❤️
_[Brève explication]_
📋 *Formulaire:* [Lien]
⏰ *Date limite:* ```[Date]```
_Pour le CA,_
*[Nom]*
*[Titre]*
```

## Notes importantes

- Toujours valider les champs email avec la validation appropriée
- Pour les formulaires COBACAM, inclure systématiquement une case de consentement
- Privilégier la simplicité: un formulaire court est mieux rempli
- Tester sur mobile avant publication
- Créer une feuille de réponses Google Sheets liée pour faciliter l'analyse
- Respecter les limites de Google Forms (voir `references/question_types.md`)

## Décision entre approches

**Utiliser l'approche manuelle si:**
- Formulaire simple (<10 questions)
- Usage ponctuel
- Pas de besoin d'automatisation
- Utilisateur préfère le contrôle visuel

**Utiliser Apps Script/FormApp si:**
- Formulaire complexe ou répétitif
- Besoin de créer rapidement plusieurs formulaires similaires
- Automatisation souhaitée
- Utilisateur à l'aise avec le code

**Utiliser Apps Script/API REST si:**
- Besoin de fonctionnalités avancées (images, shuffle, quiz sophistiqué)
- Intégration avec d'autres systèmes
- Notifications push requises
- Batch operations sur formulaires existants
