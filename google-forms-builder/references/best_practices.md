# Bonnes pratiques pour formulaires communautaires

## Principes de conception

### 1. Clarté et simplicité
- **Titre explicite:** Le titre doit clairement indiquer l'objet du formulaire
- **Instructions concises:** Expliquer l'objectif en 2-3 phrases maximum
- **Questions directes:** Éviter les formulations ambiguës
- **Progression logique:** Grouper les questions par thème

### 2. Respect du temps des répondants
- **Estimation du temps:** Indiquer la durée approximative (ex: "5 minutes")
- **Barre de progression:** Activer pour formulaires de plus de 5 questions
- **Questions obligatoires minimales:** Limiter les champs requis à l'essentiel
- **Option "Autre":** Toujours offrir cette alternative dans les choix multiples

### 3. Protection des données
- **RGPD/LPRPDE:** Respecter les lois sur la protection des données personnelles
- **Consentement explicite:** Ajouter une case à cocher pour l'utilisation des données
- **Transparence:** Expliquer comment les données seront utilisées
- **Sécurité:** Limiter l'accès aux réponses aux personnes autorisées

## Structure recommandée pour COBACAM

### Introduction (Description du formulaire)
```
Chers membres du COBACAM,

[Contexte et objectif du formulaire]

Temps estimé: [X] minutes
Date limite: [Date]

Merci de votre participation!
```

### Section 1: Identification
- Nom et prénom (requis)
- Courriel (requis, avec validation)
- Téléphone (format conseillé mais non validé pour flexibilité)

### Section 2: Questions principales
- Questions spécifiques à l'objet du formulaire
- Groupées logiquement
- Avec sauts de page si nécessaire

### Section 3: Informations complémentaires (optionnelles)
- Questions secondaires
- Commentaires libres
- Suggestions

### Section 4: Consentement et confirmation
- Case à cocher pour acceptation
- Message de confirmation final

## Types de formulaires récurrents pour COBACAM

### 1. Recensement/Inscription
**Objectif:** Collecter des informations sur les membres ou activités

**Structure type:**
- Informations du parent/membre
- Informations sur l'objet du recensement (enfant, activité, etc.)
- Détails spécifiques (établissements, dates, etc.)
- Autorisation pour utilisation des données
- Champ commentaires

**Exemple:** Recensement des transitions scolaires

### 2. Appel à participation/Parrainage
**Objectif:** Recruter des participants ou parrains

**Structure type:**
- Type de participation
- Coordonnées
- Niveau d'engagement
- Message/commentaire personnel
- Confirmation d'engagement

**Exemple:** Parrainage des prix de reconnaissance

### 3. Sondage d'opinion
**Objectif:** Recueillir les avis des membres

**Structure type:**
- Questions d'évaluation (échelle linéaire)
- Questions à choix multiples
- Questions ouvertes pour suggestions
- Données démographiques (optionnelles)

### 4. Inscription à événement
**Objectif:** Gérer les inscriptions à l'AG ou autres événements

**Structure type:**
- Nom et coordonnées
- Nombre de participants
- Besoins spéciaux (régime alimentaire, accessibilité)
- Mode de participation (présentiel/virtuel)
- Questions logistiques

## Optimisation pour Google Forms

### Utiliser la logique conditionnelle
Diriger les répondants vers des questions spécifiques selon leurs réponses

```javascript
var item = form.addMultipleChoiceItem();
item.setTitle('Type de participation');

// Créer des sauts de page
var pageIndividuel = form.addPageBreakItem();
var pageEntreprise = form.addPageBreakItem();

// Configurer la navigation
item.setChoices([
  item.createChoice('Individuel', FormApp.PageNavigationType.GO_TO_PAGE, pageIndividuel),
  item.createChoice('Entreprise', FormApp.PageNavigationType.GO_TO_PAGE, pageEntreprise)
]);
```

### Pré-remplissage via URL
Créer des liens personnalisés pour faciliter la saisie

```
https://docs.google.com/forms/d/e/FORM_ID/viewform?
entry.123456789=Jean+Dupont&
entry.987654321=jean@example.com
```

Pour obtenir les IDs des champs:
1. Ouvrir le formulaire en mode aperçu
2. Inspecter le HTML
3. Chercher les attributs `name="entry.XXXXXXX"`

### Intégration avec Google Sheets
Lier automatiquement à une feuille de calcul

```javascript
var form = FormApp.create('Mon formulaire');
var spreadsheet = SpreadsheetApp.create('Réponses - Mon formulaire');
form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
```

### Notifications automatiques

```javascript
function onFormSubmit(e) {
  var response = e.response;
  var email = response.getRespondentEmail();
  
  // Email au répondant
  MailApp.sendEmail({
    to: email,
    subject: "Confirmation de votre inscription",
    body: "Merci pour votre participation!\n\n" + 
          "Nous avons bien reçu vos informations."
  });
  
  // Email à l'administrateur
  MailApp.sendEmail({
    to: "admin@cobacam.org",
    subject: "Nouvelle réponse au formulaire",
    body: "Une nouvelle réponse a été soumise."
  });
}
```

## Accessibilité et inclusion

### Langue
- Utiliser le français canadien standard
- Éviter le jargon technique
- Fournir des traductions si nécessaire

### Format
- Police lisible (Google Forms par défaut est bonne)
- Contraste suffisant (respecté par défaut)
- Descriptions claires pour les lecteurs d'écran

### Options inclusives
- Éviter les questions binaires (ex: M/F → ajouter "Autre" ou "Préfère ne pas répondre")
- Respecter la diversité des situations familiales
- Permettre plusieurs réponses quand approprié

## Validation et test

### Avant publication
1. **Test complet:** Remplir le formulaire en entier
2. **Vérifier les validations:** Tester chaque validation
3. **Tester sur mobile:** S'assurer que le formulaire fonctionne bien
4. **Révision par un tiers:** Faire relire par quelqu'un qui ne connaît pas le contexte
5. **Vérifier la feuille de réponses:** S'assurer que les données sont bien capturées

### Après publication
1. **Monitorer les premières réponses:** Vérifier qu'il n'y a pas de problème
2. **Être réactif:** Répondre rapidement aux questions
3. **Ajuster si nécessaire:** Ne pas hésiter à clarifier les questions ambiguës

## Communication du formulaire

### Message d'accompagnement WhatsApp (COBACAM)
```
❤️ *[Titre de l'initiative]* ❤️

_[Brève explication]_

📋 *Formulaire à remplir:*
[Lien du formulaire]

⏰ *Date limite:* ```[Date]```

_Pour le CA,_
*[Nom]*
*[Titre]*
```

### Rappels
- Premier rappel: 3-4 jours avant la date limite
- Dernier rappel: 1 jour avant la date limite
- Utiliser des émojis pour attirer l'attention
- Remercier ceux qui ont déjà répondu

## Analyse des résultats

### Google Sheets
- Créer des tableaux croisés dynamiques
- Utiliser des formules pour résumer les données
- Créer des graphiques pour visualiser

### Exports
- CSV pour analyse externe
- PDF pour archivage
- Google Sheets pour collaboration

### Suivi
```javascript
function analyzeResponses() {
  var form = FormApp.openById('FORM_ID');
  var responses = form.getResponses();
  
  Logger.log('Nombre total de réponses: ' + responses.length);
  
  // Analyser les réponses par type
  var stats = {};
  responses.forEach(function(response) {
    var itemResponses = response.getItemResponses();
    itemResponses.forEach(function(itemResponse) {
      var question = itemResponse.getItem().getTitle();
      var answer = itemResponse.getResponse();
      
      if (!stats[question]) {
        stats[question] = {};
      }
      
      if (!stats[question][answer]) {
        stats[question][answer] = 0;
      }
      
      stats[question][answer]++;
    });
  });
  
  Logger.log(JSON.stringify(stats, null, 2));
}
```

## Gestion des données personnelles

### Conservation
- Définir une période de conservation
- Supprimer les données obsolètes
- Archiver si nécessaire pour historique

### Accès
- Limiter l'accès aux personnes autorisées
- Utiliser les permissions Google Drive appropriées
- Ne jamais partager publiquement les réponses

### Conformité LPRPDE (Loi canadienne)
```
Déclaration de confidentialité à inclure:

"Les informations collectées via ce formulaire seront utilisées uniquement 
pour [objectif spécifique]. Vos données personnelles seront conservées de 
manière sécurisée et ne seront pas partagées avec des tiers sans votre 
consentement. Vous avez le droit de demander l'accès, la rectification ou 
la suppression de vos données en contactant [email de contact]."
```

## Checklist finale

Avant de publier un formulaire COBACAM:

- [ ] Titre clair et descriptif
- [ ] Description complète avec contexte
- [ ] Date limite indiquée
- [ ] Temps estimé mentionné
- [ ] Questions claires et sans ambiguïté
- [ ] Validation sur les champs email
- [ ] Cases à cocher pour consentement
- [ ] Barre de progression activée (si >5 questions)
- [ ] Message de confirmation personnalisé
- [ ] Testé sur ordinateur ET mobile
- [ ] Feuille de réponses créée et partagée avec les bons accès
- [ ] Déclaration de confidentialité incluse
- [ ] Notification par email configurée (optionnel)
- [ ] Lien court créé (optionnel mais recommandé)
- [ ] Message WhatsApp préparé
