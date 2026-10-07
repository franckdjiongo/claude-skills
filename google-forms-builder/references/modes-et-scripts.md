# Modes de création, scripts et exemples

## Format de sortie du mode manuel (markdown)

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
```

Contenu attendu: titre et description, champs avec types exacts, options des choix, champs obligatoires (*), validations (courriel, téléphone), paramètres recommandés, sections logiques, notes de configuration.

## Scripts Apps Script

### `scripts/create_form_complete.gs` (FormApp, standard)
- `createCompleteForm()`: formulaire complet avec toutes les configurations.
- `createFormFromConfig()`: formulaire à partir d'une configuration JSON.
- `addQuestions()`: tous les types de questions.
- `addValidatedQuestion()`: exemple de validation.

Usage: copier le code dans script.google.com, adapter la configuration ou les questions, exécuter la fonction, copier les URLs générées.

### `scripts/create_form_api.gs` (API REST, avancé)
- `createFormViaAPI()`, `addQuestionsWithImages()`, `createQuizWithShuffledChoices()`, `batchUpdateForm()`, `createCOBACAMParrainageForm()` (exemple complet COBACAM).

Configuration requise: projet GCP, Google Forms API activée, projet Apps Script lié au projet GCP, scopes dans `appsscript.json`:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

### FormApp ou API REST

L'API REST est nécessaire pour: images dans les titres de questions, choix mélangés par question, quiz à notation sophistiquée, notifications push Cloud Pub/Sub, mises à jour groupées massives, intégration avec d'autres systèmes. Sinon FormApp.

## Exemples

1. **Recensement simple** (« formulaire pour recenser les transitions scolaires »): mode manuel, structure de recensement de `best_practices.md`: parent, enfant, type de transition, établissements, autorisation de reconnaissance publique.
2. **Parrainage avec code** : lire `create_form_complete.gs`, adapter `createFormFromConfig()` avec la configuration de parrainage, fournir le code et les instructions.
3. **Quiz avec images** : besoin d'API REST, lire `create_form_api.gs`, syntaxe dans `question_types.md`, adapter `addQuestionsWithImages()` et `createQuizWithShuffledChoices()`, donner la configuration GCP.

## Message WhatsApp d'accompagnement COBACAM

```
❤️ *[Titre de l'initiative]* ❤️
_[Brève explication]_
📋 *Formulaire:* [Lien]
⏰ *Date limite:* ```[Date]```
_Pour le CA,_
*[Nom]*
*[Titre]*
```
