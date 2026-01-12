# Référence complète: Types de questions Google Forms

## Types de questions disponibles

### 1. Texte court (Short Answer)
**Usage:** Réponses brèves (nom, numéro de téléphone, etc.)
**FormApp:** `form.addTextItem()`
**API:** `textQuestion: { paragraph: false }`
**Validations possibles:**
- Email
- URL
- Nombre
- Longueur (min/max)
- Expression régulière

```javascript
var item = form.addTextItem();
item.setTitle('Nom complet');
item.setRequired(true);

// Avec validation email
var validation = FormApp.createTextValidation()
  .requireTextIsEmail()
  .build();
item.setValidation(validation);
```

### 2. Paragraphe (Paragraph Text)
**Usage:** Réponses longues (commentaires, descriptions)
**FormApp:** `form.addParagraphTextItem()`
**API:** `textQuestion: { paragraph: true }`

```javascript
var item = form.addParagraphTextItem();
item.setTitle('Commentaires supplémentaires');
item.setHelpText('Partagez vos réflexions');
```

### 3. Choix multiples (Multiple Choice)
**Usage:** Sélection unique parmi plusieurs options (radio buttons)
**FormApp:** `form.addMultipleChoiceItem()`
**API:** `choiceQuestion: { type: "RADIO" }`

```javascript
var item = form.addMultipleChoiceItem();
item.setTitle('Quelle est votre préférence ?');
item.setChoices([
  item.createChoice('Option 1'),
  item.createChoice('Option 2'),
  item.createChoice('Option 3')
]);
item.showOtherOption(true); // Ajouter option "Autre"
```

### 4. Cases à cocher (Checkboxes)
**Usage:** Sélection multiple
**FormApp:** `form.addCheckboxItem()`
**API:** `choiceQuestion: { type: "CHECKBOX" }`

```javascript
var item = form.addCheckboxItem();
item.setTitle('Sélectionnez toutes les options applicables');
item.setChoices([
  item.createChoice('Choix A'),
  item.createChoice('Choix B'),
  item.createChoice('Choix C')
]);
```

### 5. Liste déroulante (Dropdown)
**Usage:** Sélection unique dans une liste longue
**FormApp:** `form.addListItem()`
**API:** `choiceQuestion: { type: "DROP_DOWN" }`

```javascript
var item = form.addListItem();
item.setTitle('Sélectionnez votre ville');
item.setChoices([
  item.createChoice('Montreal'),
  item.createChoice('Quebec'),
  item.createChoice('Ottawa')
]);
```

### 6. Échelle linéaire (Linear Scale)
**Usage:** Évaluation numérique
**FormApp:** `form.addScaleItem()`
**API:** `scaleQuestion: { low: 1, high: 5 }`

```javascript
var item = form.addScaleItem();
item.setTitle('Niveau de satisfaction');
item.setBounds(1, 5);
item.setLabels('Pas satisfait', 'Très satisfait');
```

### 7. Grille à choix multiples (Multiple Choice Grid)
**Usage:** Matrice de questions avec choix unique par ligne
**FormApp:** `form.addGridItem()`
**API:** `questionGroupItem: { grid: {...} }`

```javascript
var item = form.addGridItem();
item.setTitle('Évaluez les aspects suivants');
item.setRows(['Qualité', 'Prix', 'Service']);
item.setColumns(['Faible', 'Moyen', 'Élevé']);
```

### 8. Grille de cases à cocher (Checkbox Grid)
**Usage:** Matrice avec sélections multiples par ligne
**FormApp:** `form.addCheckboxGridItem()`
**API:** `questionGroupItem: { grid: {...} }`

```javascript
var item = form.addCheckboxGridItem();
item.setTitle('Disponibilités');
item.setRows(['Lundi', 'Mardi', 'Mercredi']);
item.setColumns(['Matin', 'Après-midi', 'Soir']);
```

### 9. Date
**Usage:** Sélection de date
**FormApp:** `form.addDateItem()`
**API:** `dateQuestion: { includeTime: false }`

```javascript
var item = form.addDateItem();
item.setTitle('Date de naissance');
```

### 10. Heure (Time)
**Usage:** Sélection d'heure
**FormApp:** `form.addTimeItem()`
**API:** `timeQuestion: { duration: false }`

```javascript
var item = form.addTimeItem();
item.setTitle('Heure préférée');
```

### 11. Durée (Duration)
**Usage:** Durée en heures et minutes
**FormApp:** `form.addDurationItem()`
**API:** `timeQuestion: { duration: true }`

### 12. Téléversement de fichier (File Upload)
**Usage:** Upload de fichiers (nécessite connexion Google)
**FormApp:** `form.addFileUploadItem()`
**API:** `fileUploadQuestion: {...}`
**Note:** Nécessite que le formulaire collecte les emails

```javascript
var item = form.addFileUploadItem();
item.setTitle('Téléversez votre document');
item.setRequired(true);
```

### 13. Notation (Rating) - API uniquement
**Usage:** Évaluation avec étoiles ou cœurs
**API uniquement:** `ratingQuestion: { ratingType: "STAR" }`

## Éléments structurels

### Saut de page (Page Break)
Divise le formulaire en plusieurs pages

```javascript
var pageBreak = form.addPageBreakItem();
pageBreak.setTitle('Section 2');
pageBreak.setHelpText('Description de la section');
```

### En-tête de section (Section Header)
Titre et description sans saut de page

```javascript
var header = form.addSectionHeaderItem();
header.setTitle('Informations personnelles');
header.setHelpText('Veuillez remplir les champs suivants');
```

### Image
Afficher une image dans le formulaire

```javascript
var image = form.addImageItem();
image.setImage(DriveApp.getFileById('FILE_ID'));
image.setTitle('Titre de l\'image');
```

### Vidéo
Intégrer une vidéo YouTube

```javascript
var video = form.addVideoItem();
video.setVideoUrl('https://www.youtube.com/watch?v=VIDEO_ID');
video.setTitle('Regardez cette vidéo');
```

## Validations disponibles

### Texte
- Email: `requireTextIsEmail()`
- URL: `requireTextIsUrl()`
- Contient: `requireTextContainsPattern(pattern)`
- Ne contient pas: `requireTextDoesNotContainPattern(pattern)`
- Correspond à: `requireTextMatchesPattern(pattern)`
- Longueur: `requireTextLengthLessThanOrEqualTo(max)`

### Nombre
- Entre: `requireNumberBetween(min, max)`
- Plus grand que: `requireNumberGreaterThan(min)`
- Plus petit que: `requireNumberLessThan(max)`
- Entier: `requireWholeNumber()`

### Checkbox
- Sélectionner au moins: `requireSelectAtLeast(min)`
- Sélectionner au plus: `requireSelectAtMost(max)`
- Sélectionner exactement: `requireSelectExactly(count)`

## Configuration du formulaire

### Paramètres de base

```javascript
form.setTitle('Titre du formulaire');
form.setDescription('Description complète');
form.setConfirmationMessage('Merci pour votre participation!');
```

### Paramètres de collecte

```javascript
form.setCollectEmail(true);           // Collecter les emails
form.setRequireLogin(false);          // Nécessite connexion Google
form.setLimitOneResponsePerUser(true); // Une réponse par utilisateur
form.setAllowResponseEdits(true);     // Permettre modification
```

### Paramètres d'affichage

```javascript
form.setShowLinkToRespondAgain(true); // Afficher lien pour répondre à nouveau
form.setProgressBar(true);            // Barre de progression
form.setShuffleQuestions(false);      // Mélanger les questions
```

### Destination des réponses

```javascript
// Créer une feuille de calcul liée
form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheetId);

// Dissocier la feuille
form.removeDestination();
```

## Fonctionnalités avancées (API uniquement)

### Mélanger les choix par question

```javascript
// Via API REST uniquement
choiceQuestion: {
  type: "RADIO",
  options: [...],
  shuffle: true  // Mélange les choix pour chaque répondant
}
```

### Ajouter des images aux questions

```javascript
// Via API REST uniquement
questionItem: {
  question: {...},
  image: {
    altText: "Description",
    sourceUri: "https://..."
  }
}
```

### Quiz avec notation automatique

```javascript
// Via API REST
grading: {
  pointValue: 2,
  correctAnswers: {
    answers: [{ value: "Réponse correcte" }]
  },
  whenRight: { text: "Bravo!" },
  whenWrong: { text: "Essayez encore" }
}
```

## Limites et quotas

- **Texte court:** 500 caractères max
- **Paragraphe:** 5000 caractères max
- **Choix multiples:** 1000 options max
- **Grille:** 100 lignes × 20 colonnes max
- **Fichiers:** 1 GB par fichier, 10 GB total par utilisateur
- **Réponses:** Pas de limite fixe, mais performance peut diminuer après 50,000 réponses

## Bonnes pratiques

1. **Titre clair et descriptif** pour chaque question
2. **Help text** pour clarifier les attentes
3. **Validation** pour assurer la qualité des données
4. **Regroupement logique** avec sauts de page
5. **Barre de progression** pour formulaires longs
6. **Message de confirmation** personnalisé
7. **Test approfondi** avant distribution
