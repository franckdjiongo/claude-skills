/**
 * Script Google Apps Script utilisant l'API REST Google Forms
 * Permet des fonctionnalités avancées non disponibles dans FormApp
 * 
 * Configuration requise:
 * 1. Créer un projet Google Cloud Platform
 * 2. Activer Google Forms API
 * 3. Lier le projet Apps Script au projet GCP
 * 4. Ajouter les scopes OAuth dans appsscript.json (voir ci-dessous)
 * 
 * Scopes requis dans appsscript.json:
 * {
 *   "oauthScopes": [
 *     "https://www.googleapis.com/auth/forms.body",
 *     "https://www.googleapis.com/auth/script.external_request",
 *     "https://www.googleapis.com/auth/drive"
 *   ]
 * }
 */

/**
 * Créer un nouveau formulaire via l'API REST
 */
function createFormViaAPI() {
  const title = "Mon Formulaire via API";
  
  const response = UrlFetchApp.fetch("https://forms.googleapis.com/v1beta/forms", {
    method: "post",
    headers: {
      authorization: "Bearer " + ScriptApp.getOAuthToken()
    },
    contentType: "application/json",
    payload: JSON.stringify({
      info: {
        title: title,
        documentTitle: title
      }
    })
  });
  
  const form = JSON.parse(response.getContentText());
  Logger.log("Formulaire créé: " + form.formId);
  Logger.log("URL: " + form.responderUri);
  
  return form.formId;
}

/**
 * Ajouter des questions avec images via l'API
 * Permet d'ajouter des images aux titres de questions (impossible avec FormApp)
 */
function addQuestionsWithImages(formId) {
  // IDs des images sur Google Drive
  const imageFileId = "YOUR_IMAGE_FILE_ID";
  
  // Obtenir l'URL de l'image
  const imageUrl = Drive.Files.get(imageFileId, {
    fields: "thumbnailLink"
  }).thumbnailLink.replace("=s220", "=s500");
  
  const requests = [
    // Question à choix multiples avec image
    {
      createItem: {
        item: {
          title: "Question avec image",
          description: "Description de la question",
          questionItem: {
            question: {
              choiceQuestion: {
                type: "DROP_DOWN", // ou "RADIO" ou "CHECKBOX"
                options: [
                  { value: "Option 1" },
                  { value: "Option 2" },
                  { value: "Option 3" }
                ]
              }
            },
            image: {
              altText: "Image descriptive",
              sourceUri: imageUrl
            }
          }
        },
        location: {
          index: 0
        }
      }
    },
    
    // Question texte avec image
    {
      createItem: {
        item: {
          title: "Question texte avec image",
          questionItem: {
            question: {
              textQuestion: {
                paragraph: false
              }
            },
            image: {
              altText: "Description de l'image",
              sourceUri: imageUrl
            }
          }
        },
        location: {
          index: 1
        }
      }
    }
  ];
  
  batchUpdateForm(formId, requests);
}

/**
 * Créer un quiz avec mélange des choix
 * Le mélange des choix par question n'est possible que via l'API
 */
function createQuizWithShuffledChoices(formId) {
  const requests = [
    {
      updateSettings: {
        settings: {
          quizSettings: {
            isQuiz: true
          }
        },
        updateMask: "quizSettings.isQuiz"
      }
    },
    {
      createItem: {
        item: {
          title: "Quelle est la capitale du Canada ?",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: [
                  { value: "Ottawa" },
                  { value: "Toronto" },
                  { value: "Montreal" },
                  { value: "Vancouver" }
                ],
                shuffle: true // Mélanger les choix (API uniquement)
              },
              grading: {
                pointValue: 1,
                correctAnswers: {
                  answers: [{ value: "Ottawa" }]
                },
                whenRight: {
                  text: "Correct! Ottawa est la capitale du Canada."
                },
                whenWrong: {
                  text: "Incorrect. La bonne réponse est Ottawa."
                }
              }
            }
          }
        },
        location: {
          index: 0
        }
      }
    }
  ];
  
  batchUpdateForm(formId, requests);
}

/**
 * Batch update pour appliquer plusieurs modifications en une seule requête
 */
function batchUpdateForm(formId, requests) {
  const url = `https://forms.googleapis.com/v1beta/forms/${formId}:batchUpdate`;
  
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      authorization: "Bearer " + ScriptApp.getOAuthToken()
    },
    contentType: "application/json",
    payload: JSON.stringify({ requests: requests })
  });
  
  const result = JSON.parse(response.getContentText());
  Logger.log("Mise à jour réussie");
  return result;
}

/**
 * Obtenir un formulaire complet via l'API
 */
function getFormViaAPI(formId) {
  const url = `https://forms.googleapis.com/v1beta/forms/${formId}`;
  
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      authorization: "Bearer " + ScriptApp.getOAuthToken()
    }
  });
  
  const form = JSON.parse(response.getContentText());
  Logger.log("Titre: " + form.info.title);
  Logger.log("Nombre de questions: " + (form.items ? form.items.length : 0));
  
  return form;
}

/**
 * Obtenir toutes les réponses d'un formulaire
 */
function getFormResponses(formId) {
  const url = `https://forms.googleapis.com/v1beta/forms/${formId}/responses`;
  
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      authorization: "Bearer " + ScriptApp.getOAuthToken()
    }
  });
  
  const responses = JSON.parse(response.getContentText());
  Logger.log("Nombre de réponses: " + (responses.responses ? responses.responses.length : 0));
  
  return responses;
}

/**
 * Exemple complet: Créer un formulaire COBACAM via API
 */
function createCOBACAMParrainageForm() {
  // 1. Créer le formulaire
  const formId = createFormViaAPI();
  
  // 2. Ajouter les questions
  const requests = [
    // Mettre à jour les infos du formulaire
    {
      updateFormInfo: {
        info: {
          title: "Parrainage des Prix de Reconnaissance Scolaire 2024-2025 - COBACAM",
          description: "Chers membres et partenaires du COBACAM,\n\n" +
                      "Merci de votre intérêt pour le parrainage des prix de reconnaissance de nos jeunes lauréats.\n\n" +
                      "Places disponibles : 9 prix\n" +
                      "Date limite : Dimanche 23 novembre 2025 à 22h"
        },
        updateMask: "title,description"
      }
    },
    
    // Type de parrainage
    {
      createItem: {
        item: {
          title: "Type de parrainage",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: [
                  { value: "Parrainage individuel" },
                  { value: "Parrainage entreprise" }
                ]
              }
            }
          }
        },
        location: { index: 0 }
      }
    },
    
    // Nom complet ou entreprise
    {
      createItem: {
        item: {
          title: "Nom complet (individuel) ou Nom de l'entreprise",
          questionItem: {
            question: {
              required: true,
              textQuestion: {
                paragraph: false
              }
            }
          }
        },
        location: { index: 1 }
      }
    },
    
    // Courriel
    {
      createItem: {
        item: {
          title: "Courriel",
          questionItem: {
            question: {
              required: true,
              textQuestion: {
                paragraph: false
              }
            }
          }
        },
        location: { index: 2 }
      }
    },
    
    // Nombre de prix
    {
      createItem: {
        item: {
          title: "Combien de prix souhaitez-vous parrainer ?",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: [
                  { value: "1 prix" },
                  { value: "2 prix" },
                  { value: "3 prix ou plus" }
                ]
              }
            }
          }
        },
        location: { index: 3 }
      }
    },
    
    // Message de félicitations
    {
      createItem: {
        item: {
          title: "Message de félicitations aux jeunes (optionnel, max 100 caractères)",
          description: "Ce message pourra être lu lors de la remise du prix",
          questionItem: {
            question: {
              required: false,
              textQuestion: {
                paragraph: true
              }
            }
          }
        },
        location: { index: 4 }
      }
    },
    
    // Confirmation
    {
      createItem: {
        item: {
          title: "Je confirme mon engagement à parrainer ce(s) prix et comprends que mon nom sera mentionné lors de l'AG du 29 novembre 2025.",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "CHECKBOX",
                options: [
                  { value: "Oui, je confirme" }
                ]
              }
            }
          }
        },
        location: { index: 5 }
      }
    }
  ];
  
  batchUpdateForm(formId, requests);
  
  // 3. Obtenir les URLs
  const form = getFormViaAPI(formId);
  Logger.log("Formulaire créé avec succès!");
  Logger.log("URL du formulaire: " + form.responderUri);
  
  return formId;
}

/**
 * Configurer les notifications par email
 */
function setupEmailNotifications(formId) {
  const form = FormApp.openById(formId);
  
  // Créer un déclencheur pour envoyer un email à chaque réponse
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
}

/**
 * Fonction déclenchée à chaque soumission
 */
function onFormSubmit(e) {
  const response = e.response;
  const itemResponses = response.getItemResponses();
  
  let emailBody = "Nouvelle réponse au formulaire:\n\n";
  
  for (let i = 0; i < itemResponses.length; i++) {
    const itemResponse = itemResponses[i];
    emailBody += itemResponse.getItem().getTitle() + ": " + 
                 itemResponse.getResponse() + "\n";
  }
  
  MailApp.sendEmail({
    to: "admin@cobacam.org",
    subject: "Nouvelle réponse au formulaire",
    body: emailBody
  });
}
