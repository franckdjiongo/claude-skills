/**
 * Script Google Apps Script pour créer des formulaires Google Forms
 * Ce script utilise FormApp (Google Forms Service)
 * 
 * Usage:
 * 1. Copier ce code dans l'éditeur Apps Script (script.google.com)
 * 2. Modifier les paramètres du formulaire selon vos besoins
 * 3. Exécuter la fonction createCompleteForm()
 */

function createCompleteForm() {
  // Configuration du formulaire
  const config = {
    title: "Titre du formulaire",
    description: "Description du formulaire qui apparaîtra en haut",
    isPublished: false, // false = brouillon, true = publié
    collectEmail: true, // Collecter les adresses courriel
    requireLogin: false, // Nécessite une connexion Google
    allowResponseEdits: true, // Permettre aux répondants de modifier leurs réponses
    limitOneResponsePerUser: false, // Limiter à une réponse par utilisateur
    shuffleQuestions: false, // Mélanger les questions
    showProgressBar: true, // Afficher la barre de progression
    confirmationMessage: "Merci pour votre participation !" // Message de confirmation
  };

  // Créer le formulaire
  var form = FormApp.create(config.title, config.isPublished);
  
  // Configurer les paramètres
  form.setDescription(config.description);
  form.setCollectEmail(config.collectEmail);
  form.setRequireLogin(config.requireLogin);
  form.setAllowResponseEdits(config.allowResponseEdits);
  form.setLimitOneResponsePerUser(config.limitOneResponsePerUser);
  form.setShuffleQuestions(config.shuffleQuestions);
  form.setProgressBar(config.showProgressBar);
  form.setConfirmationMessage(config.confirmationMessage);

  // Ajouter les questions
  addQuestions(form);

  // Publier et partager
  if (config.isPublished) {
    form.setPublished(true);
    // form.addPublishedReaders(['email@example.com']); // Optionnel
  }

  // Afficher les URLs
  Logger.log('Formulaire créé avec succès !');
  Logger.log('URL de modification : ' + form.getEditUrl());
  Logger.log('URL de publication : ' + form.getPublishedUrl());
  Logger.log('ID du formulaire : ' + form.getId());
  
  return form;
}

/**
 * Ajouter toutes les questions au formulaire
 */
function addQuestions(form) {
  
  // 1. TEXTE COURT (Short Answer)
  var shortText = form.addTextItem();
  shortText.setTitle('Nom et prénom');
  shortText.setHelpText('Entrez votre nom complet');
  shortText.setRequired(true);
  
  // 2. TEXTE LONG (Paragraph)
  var paragraphText = form.addParagraphTextItem();
  paragraphText.setTitle('Commentaires additionnels');
  paragraphText.setHelpText('Partagez vos commentaires (optionnel)');
  paragraphText.setRequired(false);
  
  // 3. CHOIX MULTIPLES (Multiple Choice - Radio buttons)
  var multipleChoice = form.addMultipleChoiceItem();
  multipleChoice.setTitle('Quelle est votre préférence ?');
  multipleChoice.setChoices([
    multipleChoice.createChoice('Option 1'),
    multipleChoice.createChoice('Option 2'),
    multipleChoice.createChoice('Option 3'),
    multipleChoice.createChoice('Autre', FormApp.PageNavigationType.CONTINUE) // Avec navigation
  ]);
  multipleChoice.showOtherOption(true); // Permettre "Autre" avec champ texte
  multipleChoice.setRequired(true);
  
  // 4. CASES À COCHER (Checkboxes)
  var checkbox = form.addCheckboxItem();
  checkbox.setTitle('Sélectionnez toutes les options qui s\'appliquent');
  checkbox.setChoices([
    checkbox.createChoice('Choix A'),
    checkbox.createChoice('Choix B'),
    checkbox.createChoice('Choix C')
  ]);
  checkbox.setRequired(false);
  
  // 5. LISTE DÉROULANTE (Dropdown)
  var dropdown = form.addListItem();
  dropdown.setTitle('Sélectionnez votre ville');
  dropdown.setChoices([
    dropdown.createChoice('Montreal'),
    dropdown.createChoice('Quebec'),
    dropdown.createChoice('Ottawa'),
    dropdown.createChoice('Toronto')
  ]);
  dropdown.setRequired(true);
  
  // 6. ÉCHELLE LINÉAIRE (Linear Scale)
  var scale = form.addScaleItem();
  scale.setTitle('Sur une échelle de 1 à 5, comment évaluez-vous... ?');
  scale.setBounds(1, 5);
  scale.setLabels('Pas satisfait', 'Très satisfait');
  scale.setRequired(true);
  
  // 7. GRILLE À CHOIX MULTIPLES (Multiple Choice Grid)
  var grid = form.addGridItem();
  grid.setTitle('Évaluez les aspects suivants');
  grid.setRows(['Aspect 1', 'Aspect 2', 'Aspect 3']);
  grid.setColumns(['Faible', 'Moyen', 'Élevé']);
  grid.setRequired(true);
  
  // 8. GRILLE DE CASES À COCHER (Checkbox Grid)
  var checkboxGrid = form.addCheckboxGridItem();
  checkboxGrid.setTitle('Sélectionnez toutes les options applicables');
  checkboxGrid.setRows(['Critère 1', 'Critère 2', 'Critère 3']);
  checkboxGrid.setColumns(['Lundi', 'Mardi', 'Mercredi']);
  checkboxGrid.setRequired(false);
  
  // 9. DATE
  var dateItem = form.addDateItem();
  dateItem.setTitle('Quelle est la date ?');
  dateItem.setRequired(true);
  
  // 10. HEURE (Time)
  var timeItem = form.addTimeItem();
  timeItem.setTitle('À quelle heure ?');
  timeItem.setRequired(false);
  
  // 11. DURÉE (Duration)
  var durationItem = form.addDurationItem();
  durationItem.setTitle('Combien de temps ?');
  durationItem.setRequired(false);
  
  // 12. SAUT DE PAGE (Page Break)
  var pageBreak = form.addPageBreakItem();
  pageBreak.setTitle('Section 2');
  pageBreak.setHelpText('Vous êtes à la deuxième section');
  
  // 13. SECTION HEADER (Title and Description)
  var sectionHeader = form.addSectionHeaderItem();
  sectionHeader.setTitle('Informations supplémentaires');
  sectionHeader.setHelpText('Cette section contient des questions complémentaires');
  
  // 14. IMAGE (nécessite une image hébergée)
  // var imageItem = form.addImageItem();
  // imageItem.setImage(DriveApp.getFileById('FILE_ID'));
  // imageItem.setTitle('Titre de l\'image');
  // imageItem.setHelpText('Description de l\'image');
  
  // 15. VIDEO (nécessite une URL YouTube)
  // var videoItem = form.addVideoItem();
  // videoItem.setVideoUrl('https://www.youtube.com/watch?v=VIDEO_ID');
  // videoItem.setTitle('Titre de la vidéo');
}

/**
 * Exemple de validation de réponses
 */
function addValidatedQuestion(form) {
  var textValidation = FormApp.createTextValidation()
    .requireTextIsEmail()
    .build();
  
  var emailItem = form.addTextItem();
  emailItem.setTitle('Adresse courriel');
  emailItem.setValidation(textValidation);
  emailItem.setRequired(true);
}

/**
 * Créer un formulaire à partir d'un tableau de questions
 * Usage: Définir les questions dans une structure JSON
 */
function createFormFromConfig() {
  var formConfig = {
    title: "Recensement COBACAM",
    description: "Formulaire de recensement pour la communauté",
    isPublished: false,
    questions: [
      {
        type: "text",
        title: "Nom et prénom du parent",
        required: true
      },
      {
        type: "text",
        title: "Courriel",
        required: true,
        validation: "email"
      },
      {
        type: "text",
        title: "Téléphone",
        required: true
      },
      {
        type: "multipleChoice",
        title: "Quelle transition votre enfant a-t-il effectuée ?",
        required: true,
        choices: [
          "Primaire → Secondaire",
          "Secondaire → Cégep",
          "Cégep → Université",
          "Autre (précisez)"
        ],
        hasOther: true
      }
    ]
  };
  
  var form = FormApp.create(formConfig.title, formConfig.isPublished);
  form.setDescription(formConfig.description);
  
  formConfig.questions.forEach(function(q) {
    addQuestionFromConfig(form, q);
  });
  
  Logger.log('URL de modification : ' + form.getEditUrl());
  Logger.log('URL de publication : ' + form.getPublishedUrl());
  
  return form;
}

function addQuestionFromConfig(form, questionConfig) {
  var item;
  
  switch(questionConfig.type) {
    case "text":
      item = form.addTextItem();
      item.setTitle(questionConfig.title);
      
      // Ajouter validation email si nécessaire
      if (questionConfig.validation === "email") {
        var validation = FormApp.createTextValidation()
          .requireTextIsEmail()
          .build();
        item.setValidation(validation);
      }
      break;
      
    case "paragraph":
      item = form.addParagraphTextItem();
      item.setTitle(questionConfig.title);
      break;
      
    case "multipleChoice":
      item = form.addMultipleChoiceItem();
      item.setTitle(questionConfig.title);
      var choices = questionConfig.choices.map(function(choice) {
        return item.createChoice(choice);
      });
      item.setChoices(choices);
      if (questionConfig.hasOther) {
        item.showOtherOption(true);
      }
      break;
      
    case "checkbox":
      item = form.addCheckboxItem();
      item.setTitle(questionConfig.title);
      var checkboxChoices = questionConfig.choices.map(function(choice) {
        return item.createChoice(choice);
      });
      item.setChoices(checkboxChoices);
      break;
      
    case "dropdown":
      item = form.addListItem();
      item.setTitle(questionConfig.title);
      var dropdownChoices = questionConfig.choices.map(function(choice) {
        return item.createChoice(choice);
      });
      item.setChoices(dropdownChoices);
      break;
      
    case "date":
      item = form.addDateItem();
      item.setTitle(questionConfig.title);
      break;
      
    case "scale":
      item = form.addScaleItem();
      item.setTitle(questionConfig.title);
      item.setBounds(questionConfig.min || 1, questionConfig.max || 5);
      if (questionConfig.labels) {
        item.setLabels(questionConfig.labels[0], questionConfig.labels[1]);
      }
      break;
  }
  
  if (item && questionConfig.required) {
    item.setRequired(true);
  }
  
  if (item && questionConfig.helpText) {
    item.setHelpText(questionConfig.helpText);
  }
}
