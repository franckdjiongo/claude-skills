# Translation Guidelines: French (Canadian) & English

## Table of Contents

1. [General Principles](#general-principles)
2. [French Canadian Standards](#french-canadian-standards)
3. [Common Translation Patterns](#common-translation-patterns)
4. [UI Element Translations](#ui-element-translations)
5. [Error Messages](#error-messages)
6. [Formatting Differences](#formatting-differences)
7. [Common Pitfalls](#common-pitfalls)

---

## General Principles

### Consistency

- Maintain terminology consistency across the entire application
- Create a glossary for project-specific terms
- Same source term = same target term throughout

### Natural Language

- Translate for meaning, not word-for-word
- Use expressions natural to the target language
- Adapt idioms appropriately

### Context Awareness

- Consider where the text appears (button, title, error, etc.)
- Shorter text for buttons, more complete sentences for descriptions
- Account for space constraints in UI

### Length Considerations

French text is typically **20-30% longer** than English. Plan layouts accordingly.

| English | French | Expansion |
|---------|--------|-----------|
| Submit | Soumettre | +28% |
| Settings | Paramètres | +50% |
| Download | Télécharger | +50% |

---

## French Canadian Standards

### Typography Rules

- **Capitalization**: Only first letter of sentences and proper nouns
  - ❌ "Enregistrer Les Modifications"
  - ✅ "Enregistrer les modifications"

- **Spaces before punctuation**: Add non-breaking space before `:`, `;`, `!`, `?`
  - ❌ "Erreur: le fichier est invalide"
  - ✅ "Erreur : le fichier est invalide"

- **Guillemets** for quotes: « » with non-breaking spaces
  - ❌ "Cliquez sur "Enregistrer""
  - ✅ "Cliquez sur « Enregistrer »"

### Formal vs Informal (Vous vs Tu)

**Use "vous" (formal)** for:
- Professional/business applications
- Government/institutional contexts
- When uncertain

**Use "tu" (informal)** for:
- Casual consumer apps
- Gaming
- Social platforms targeting youth

Be consistent—never mix tu/vous in the same interface.

### Gender-Inclusive Language

Use inclusive writing where appropriate:
- "Utilisateur·rice" or "Utilisateur/trice"
- "les employé·es" or avoid gendered terms when possible
- Consider context and audience

---

## Common Translation Patterns

### Action Verbs (Buttons)

| English | French (Infinitive) | French (Imperative) |
|---------|---------------------|---------------------|
| Save | Enregistrer | Enregistrez |
| Cancel | Annuler | Annulez |
| Delete | Supprimer | Supprimez |
| Edit | Modifier | Modifiez |
| Submit | Soumettre | Soumettez |
| Send | Envoyer | Envoyez |
| Download | Télécharger | Téléchargez |
| Upload | Téléverser | Téléversez |
| Sign in | Se connecter | Connectez-vous |
| Sign out | Se déconnecter | Déconnectez-vous |
| Sign up | S'inscrire | Inscrivez-vous |
| Continue | Continuer | Continuez |
| Back | Retour | — |
| Next | Suivant | — |
| Previous | Précédent | — |

**Convention**: Use infinitive for buttons (shorter, neutral tone).

### Navigation

| English | French |
|---------|--------|
| Home | Accueil |
| About | À propos |
| Contact | Contact / Nous joindre |
| Services | Services |
| Products | Produits |
| Blog | Blogue |
| Help | Aide |
| Support | Soutien |
| Settings | Paramètres |
| Profile | Profil |
| Dashboard | Tableau de bord |
| Search | Recherche / Rechercher |

### Status & States

| English | French |
|---------|--------|
| Active | Actif |
| Inactive | Inactif |
| Pending | En attente |
| Completed | Terminé |
| In Progress | En cours |
| Draft | Brouillon |
| Published | Publié |
| Approved | Approuvé |
| Rejected | Refusé |
| Cancelled | Annulé |
| Loading... | Chargement... |
| Processing... | Traitement en cours... |

---

## UI Element Translations

### Form Labels

| English | French |
|---------|--------|
| First name | Prénom |
| Last name | Nom de famille |
| Email address | Adresse courriel |
| Phone number | Numéro de téléphone |
| Password | Mot de passe |
| Confirm password | Confirmer le mot de passe |
| Address | Adresse |
| City | Ville |
| Province/State | Province |
| Postal code | Code postal |
| Country | Pays |
| Date of birth | Date de naissance |
| Company | Entreprise |
| Job title | Titre du poste |

### Placeholders

| English | French |
|---------|--------|
| Enter your email | Entrez votre adresse courriel |
| Search... | Rechercher... |
| Type here... | Saisissez ici... |
| Select an option | Sélectionnez une option |

---

## Error Messages

### Validation Errors

| English | French |
|---------|--------|
| This field is required | Ce champ est obligatoire |
| Invalid email address | Adresse courriel invalide |
| Password must be at least 8 characters | Le mot de passe doit contenir au moins 8 caractères |
| Passwords do not match | Les mots de passe ne correspondent pas |
| Invalid phone number | Numéro de téléphone invalide |
| Please select an option | Veuillez sélectionner une option |
| File size exceeds limit | La taille du fichier dépasse la limite |
| Invalid date format | Format de date invalide |

### System Errors

| English | French |
|---------|--------|
| Something went wrong | Une erreur s'est produite |
| Please try again later | Veuillez réessayer plus tard |
| Connection lost | Connexion perdue |
| Page not found | Page introuvable |
| Access denied | Accès refusé |
| Session expired | Session expirée |

---

## Formatting Differences

### Dates

| Format | English | French (Canada) |
|--------|---------|-----------------|
| Short | 12/24/2024 | 2024-12-24 |
| Long | December 24, 2024 | 24 décembre 2024 |
| With day | Tuesday, December 24 | mardi 24 décembre |

**Note**: French months and days are lowercase.

### Numbers

| Type | English | French (Canada) |
|------|---------|-----------------|
| Decimal | 1,234.56 | 1 234,56 |
| Currency | $1,234.56 | 1 234,56 $ |
| Percentage | 75% | 75 % |

### Time

| English | French |
|---------|--------|
| 3:30 PM | 15 h 30 |
| 9:00 AM | 9 h 00 |

---

## Common Pitfalls

### False Friends (Faux Amis)

| English | Wrong French | Correct French |
|---------|--------------|----------------|
| Actually | Actuellement ❌ | En fait |
| Eventually | Éventuellement ❌ | Finalement |
| Library | Librairie ❌ | Bibliothèque |
| To attend | Attendre ❌ | Assister à |
| Delay | Délai ❌ | Retard |

### Anglicisms to Avoid

| Anglicism | Correct French |
|-----------|----------------|
| Checker | Vérifier |
| Canceller | Annuler |
| Email | Courriel |
| Click | Cliquer |
| Feedback | Rétroaction / Commentaires |
| Upload | Téléverser |
| Download | Télécharger |

### Interpolation Order

Word order may change between languages:

```json
// English
"welcome": "Welcome, {{name}}!"

// French - name position changes
"welcome": "Bienvenue, {{name}} !"
```

### Pluralization

Use ICU format for proper pluralization:

```json
// English
"items": "{count, plural, =0 {No items} one {# item} other {# items}}"

// French
"items": "{count, plural, =0 {Aucun élément} one {# élément} other {# éléments}}"
```

### Gender Agreement

Plan for gendered nouns when interpolating:

```json
// Problematic - gender unknown
"created": "{{item}} créé"

// Better - use gender-neutral structure
"created": "Création de {{item}} réussie"
```
