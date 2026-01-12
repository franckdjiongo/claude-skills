# COBACAM Meeting Minutes Creator - README

## 📋 Vue d'Ensemble

Le **COBACAM Meeting Minutes Creator** est un skill Claude spécialisé qui transforme vos notes de réunion brutes en procès-verbaux professionnels formatés selon les standards canadiens français. Conçu spécifiquement pour la Communauté des Camerounais à Montréal (COBACAM), ce skill peut également être adapté pour toute organisation communautaire au Québec ou au Canada francophone.

**Version:** 1.0  
**Date de création:** Octobre 2025  
**Compatibilité:** Claude Sonnet 4.5+ avec accès à la création de fichiers

---

## 🎯 Capacités Principales

### Ce que ce skill peut faire:

✅ **Transformer notes brutes → PV professionnels**
- Prendre vos notes informelles de réunion
- Structurer selon les standards officiels
- Appliquer les règles typographiques canadiennes françaises
- Générer un document Word prêt à signer

✅ **Gestion de multiples types de réunions**
- Assemblées générales ordinaires (AGO)
- Assemblées générales extraordinaires (AGE)
- Réunions de conseil d'administration
- Réunions de comités
- Assemblées constitutives

✅ **Respect des normes québécoises**
- Règle simplifiée des majuscules (OQLF)
- Présent de l'indicatif
- Trait d'union à "procès-verbal"
- Accents sur majuscules obligatoires
- Terminologie française (pas d'anglicismes)

✅ **Formats professionnels**
- Mise en page soignée
- Structure claire et logique
- Documentation complète des décisions
- Espace pour signatures
- Prêt pour archivage

### Ce que ce skill NE fait PAS:

❌ Enregistrement audio de réunions  
❌ Transcription automatique  
❌ Traduction (français → anglais ou vice-versa)  
❌ Gestion de bases de données de PV  
❌ Envoi automatique par courriel  

---

## 📁 Structure du Dossier

```
cobacam-meeting-minutes-creator/
├── SKILL.md                                    # Instructions principales (concises)
├── README.md                                   # Ce fichier
└── references/
    ├── typographie-francais-canadien.md       # Règles typographiques complètes
    ├── standards-proces-verbaux.md            # Standards et bonnes pratiques
    ├── templates-pv.md                        # Templates pour chaque type de réunion
    └── guide-cobacam.md                       # Spécificités COBACAM
```

**Taille totale de documentation:** ~37,000 mots  
**Fichiers:** 5 (SKILL.md + README + 4 références)

---

## 🚀 Comment Utiliser Ce Skill

### Installation

1. **Télécharger le skill:**
   - Extraire `cobacam-meeting-minutes-creator.zip`
   - Conserver la structure de dossiers intacte

2. **Importer dans votre système de skills:**
   - Si vous utilisez Notion: Créer une page et y copier le contenu
   - Si vous utilisez un autre système: Adapter selon votre configuration

3. **Activer dans Claude:**
   - Charger le SKILL.md dans votre conversation avec Claude
   - Claude aura accès à toutes les références

### Utilisation Basique

**Scénario 1: Créer un PV d'AG ordinaire**

```
Vous: "Crée un PV d'AG ordinaire COBACAM avec mes notes:
- Réunion hier soir, 19h-21h30, salle communautaire
- 18 membres présents
- Rapport d'activités 2024 présenté par le président
- Budget 2025 approuvé: 15 000 $
- Élection: Marie Tremblay élue trésorière
[... vos autres notes]"

Claude: [Analyse les notes, demande infos manquantes si besoin]
        [Génère un PV structuré et professionnel]
        [Crée un document Word téléchargeable]
```

**Scénario 2: Corriger la typographie d'un PV existant**

```
Vous: [Télécharge un fichier PV existant]
"Peux-tu corriger la typographie de ce PV selon les normes canadiennes françaises?"

Claude: [Analyse le document]
        [Corrige les majuscules excessives]
        [Applique les règles de l'OQLF]
        [Vérifie traits d'union, accents, etc.]
        [Retourne la version corrigée]
```

**Scénario 3: Transformer une transcription en PV**

```
Vous: "Voici la transcription de notre réunion de CA. Transforme ça en PV structuré:
[Colle la transcription]"

Claude: [Identifie les points clés]
        [Structure selon format CA]
        [Rédige de façon objective]
        [Génère le document final]
```

### Utilisation Avancée

**Personnalisation pour votre organisation:**

Si vous n'êtes pas COBACAM, vous pouvez adapter le skill:

1. Ouvrir `references/guide-cobacam.md`
2. Remplacer les informations COBACAM par les vôtres:
   - Nom de l'organisation
   - Adresse
   - Structure de gouvernance
   - Terminologie spécifique

3. Dire à Claude:
```
"Utilise ce skill mais adapte-le pour [Nom de mon organisation].
Voici nos informations: [détails]"
```

---

## 📚 Documentation Détaillée

### SKILL.md (Instructions Principales)

**Contenu:** ~4,000 mots  
**Usage:** Instructions step-by-step pour Claude

Ce fichier contient:
- Processus de travail complet
- Règles de structuration
- Application des règles typographiques
- Génération de documents Word
- Interactions typiques
- Capacités avancées

**Quand le consulter:** C'est le fichier principal que Claude lit pour comprendre comment créer des PV.

### References

#### 1. typographie-francais-canadien.md

**Contenu:** ~6,500 mots  
**Sujet:** Règles complètes de typographie québécoise

Couvre:
- Majuscules (règle simplifiée OQLF)
- Noms propres, titres, fonctions
- Traits d'union
- Accents sur majuscules (obligatoires!)
- Temps verbal (présent de l'indicatif)
- Ponctuation et espacement
- Nombres et dates
- Sigles et acronymes
- Erreurs fréquentes
- Checklist de vérification

**Quand le consulter:** Pour toute question sur la typographie française canadienne.

#### 2. standards-proces-verbaux.md

**Contenu:** ~10,000 mots  
**Sujet:** Standards et bonnes pratiques des procès-verbaux

Couvre:
- Valeur juridique et importance
- Qui rédige et qui signe
- Structure générale
- Mentions obligatoires
- Étapes de rédaction
- Approbation et signatures
- Conservation et archivage
- PV vs compte rendu
- Cas particuliers
- Erreurs à éviter
- Formulations types

**Quand le consulter:** Pour comprendre les fondamentaux des procès-verbaux officiels.

#### 3. templates-pv.md

**Contenu:** ~9,500 mots  
**Sujet:** Templates complets pour chaque type de réunion

Contient:
- Template AGO complet
- Template AGE complet
- Template réunion CA
- Template réunion de comité
- Template AG constitutive
- Exemples commentés (votes, amendements, élections)

**Quand le consulter:** Pour voir la structure exacte d'un type de PV spécifique.

#### 4. guide-cobacam.md

**Contenu:** ~7,000 mots  
**Sujet:** Spécificités COBACAM

Couvre:
- Informations organisationnelles
- Structure de gouvernance
- Types de réunions COBACAM
- Terminologie spécifique
- Formatage COBACAM
- Sujets courants (activités culturelles, intégration, etc.)
- Exemples complets COBACAM
- Bonnes pratiques

**Quand le consulter:** Si vous êtes COBACAM ou voulez adapter pour votre organisation.

---

## 💡 Exemples d'Utilisation

### Exemple 1: Notes Informelles → PV Professionnel

**Entrée (vos notes):**
```
Réunion CA hier
- Jean ouvre 19h
- 6 présents, 2 absents
- Budget discuté, tout le monde ok avec 15k$
- Marie propose soirée culturelle mars, Paul d'accord
- Vote: 5 pour, 0 contre, 1 abstention
- Clôture 21h
```

**Sortie (PV généré):**
```
COBACAM
Communauté des Camerounais à Montréal

PROCÈS-VERBAL
Réunion du conseil d'administration

Date: Le [jour précédent] [date]
Heure: 19h00 à 21h00
Lieu: [À préciser]

1. OUVERTURE

Le président, M. Jean [Nom], ouvre la réunion à 19h00.

2. PRÉSENCES

Administrateurs présents (6/8):
- M. Jean [Nom], président
- Mme Marie [Nom]
- M. Paul [Nom]
[Liste complète]

Administrateurs absents (2):
- M. [Nom]
- Mme [Nom]

3. BUDGET 2025

Le trésorier présente le budget prévisionnel 2025 d'un montant de 15 000 $.

DÉCISION:
Le conseil d'administration approuve le budget 2025 de 15 000 $ à l'unanimité.

4. ORGANISATION SOIRÉE CULTURELLE

Mme Marie propose l'organisation d'une soirée culturelle en mars 2025.
La proposition est appuyée par M. Paul.

Vote:
Pour: 5 voix
Contre: 0
Abstentions: 1

Résultat: La proposition est adoptée à 83 % des voix exprimées.

5. CLÔTURE

La réunion est levée à 21h00.


Le président                              Le secrétaire

_______________                           _______________
[Nom]                                     [Nom]

Fait à Montréal, le [date]
```

### Exemple 2: Correction Typographique

**Avant (typographie incorrecte):**
```
Le Président Ouvre La Séance Et Présente l'Ordre Du Jour.
Le proces verbal de la dernière réunion est approuvé.
```

**Après (corrigé selon normes OQLF):**
```
Le président ouvre la séance et présente l'ordre du jour.
Le procès-verbal de la dernière réunion est approuvé.
```

---

## ✅ Checklist Qualité

Chaque PV généré par ce skill respecte:

**Contenu:**
- [ ] Toutes les informations obligatoires présentes
- [ ] Décisions clairement documentées
- [ ] Votes avec résultats précis
- [ ] Responsables et échéances identifiés

**Forme:**
- [ ] Typographie canadienne française respectée
- [ ] Présent de l'indicatif utilisé
- [ ] Ton neutre et objectif
- [ ] Mise en page professionnelle

**Format:**
- [ ] En-tête complet
- [ ] Structure logique
- [ ] Numérotation claire
- [ ] Espace pour signatures
- [ ] Prêt pour archivage

---

## 🔧 Dépannage

### Problème: Claude ne génère pas de document Word

**Solution:** 
- Vérifier que vous utilisez Claude avec accès aux outils de création de fichiers
- Claude doit avoir les permissions nécessaires pour créer des fichiers
- Essayer de demander explicitement: "Crée un document Word téléchargeable"

### Problème: Les règles typographiques ne sont pas appliquées

**Solution:**
- S'assurer que Claude a bien accès au fichier `typographie-francais-canadien.md`
- Mentionner explicitement: "Applique les règles typographiques canadiennes françaises"
- Pointer Claude vers la référence: "Consulte references/typographie-francais-canadien.md"

### Problème: Le PV manque d'informations

**Solution:**
- Fournir plus de détails dans vos notes initiales
- Claude demandera les informations manquantes - répondez-lui
- Inclure: date, heure, lieu, participants, points discutés, décisions

### Problème: Le format ne correspond pas à mes besoins

**Solution:**
- Demander un type spécifique: "Utilise le template AGO" ou "Format réunion de comité"
- Préciser vos besoins: "Je veux un format plus concis" ou "Ajoute une section pour [...]"
- Adapter les templates dans `references/templates-pv.md`

---

## 🎓 Meilleures Pratiques

### Pour de Meilleurs Résultats

**1. Préparez vos notes:**
- Incluez date, heure, lieu
- Listez tous les participants
- Notez les points discutés
- Documentez les votes et décisions

**2. Soyez spécifique:**
- Indiquez le type de réunion (AGO, CA, etc.)
- Mentionnez l'organisation (COBACAM ou autre)
- Précisez vos préférences de format si nécessaire

**3. Révisez le résultat:**
- Vérifiez les noms et titres
- Confirmez les chiffres et dates
- Relisez les décisions importantes
- Assurez-vous que rien n'est manquant

**4. Archivez correctement:**
- Nommez le fichier: `PV_[TYPE]_AAAA-MM-JJ.docx`
- Sauvegardez dans un dossier organisé
- Conservez une copie de sauvegarde

### Pour COBACAM Spécifiquement

**Avant la réunion:**
- Préparez l'ordre du jour
- Confirmez les présences attendues
- Rassemblez les documents à présenter

**Pendant la réunion:**
- Prenez des notes sur les points clés
- Notez textuellement les propositions
- Inscrivez les résultats de votes immédiatement

**Après la réunion:**
- Générez le PV dans les 48h
- Faites relire par le président
- Obtenez les signatures rapidement
- Diffusez aux membres concernés

---

## 🔄 Mises à Jour et Évolution

### Version Actuelle: 1.0 (Octobre 2025)

**Contenu:**
- ✅ 37,000 mots de documentation
- ✅ 4 fichiers de référence complets
- ✅ Templates pour 5 types de réunions
- ✅ Guide spécifique COBACAM
- ✅ Règles typographiques complètes
- ✅ Exemples commentés

### Améliorations Futures Possibles

**Fonctionnalités envisageables:**
- Templates additionnels pour d'autres types de réunions
- Guides pour d'autres organisations
- Intégration avec systèmes de gestion documentaire
- Support bilingue (français/anglais)
- Modèles de feuilles de présence
- Templates de convocations

**Pour Suggérer des Améliorations:**
- Documentez votre cas d'usage
- Identifiez ce qui manque
- Proposez des exemples concrets

---

## 📞 Support et Questions

### Ressources Officielles

**Office québécois de la langue française (OQLF)**
- Site: https://www.oqlf.gouv.qc.ca
- Banque de dépannage linguistique: https://bdl.oqlf.gouv.qc.ca

**Portail linguistique du Canada**
- Site: https://www.noslangues-ourlanguages.gc.ca

### Documentation de Référence

- Le français au bureau (OQLF)
- Le Ramat de la typographie
- Usito (dictionnaire québécois)

### Pour Questions Spécifiques à Ce Skill

Ce skill a été créé avec la méthodologie best practices pour Claude Skills, basé sur:
- Documentation officielle OQLF (Oct 2025)
- Standards de procès-verbaux canadiens et québécois
- Best practices d'associations communautaires
- Exemples réels de PV professionnels

---

## 📜 Licence et Utilisation

**Utilisation Libre:**
- Utilisez ce skill pour votre organisation
- Adaptez selon vos besoins
- Partagez avec d'autres organisations

**Attribution:**
- Créé pour COBACAM (Communauté des Camerounais à Montréal)
- Basé sur standards officiels OQLF et gouvernementaux canadiens

**Avertissement:**
Ce skill fournit une aide à la rédaction de procès-verbaux. Les utilisateurs doivent:
- Vérifier l'exactitude des informations
- Assurer la conformité avec leurs statuts spécifiques
- Obtenir les signatures appropriées
- Consulter un conseiller juridique si nécessaire

---

## 🌟 Remerciements

Ce skill a été créé grâce à:
- Standards de l'Office québécois de la langue française (OQLF)
- Guides de rédaction gouvernementaux canadiens
- Best practices d'associations communautaires
- Exemples de PV d'organisations québécoises
- Expérience terrain de COBACAM

---

## 📊 Statistiques

**Documentation totale:** ~37,000 mots  
**Fichiers:** 5  
**Templates:** 5 types de réunions  
**Exemples:** 10+ cas commentés  
**Règles typographiques:** 50+ règles documentées  
**Temps de création:** Session complète de recherche et rédaction  
**Qualité:** Production-ready, basé sur sources officielles Oct 2025  

---

**Date de création:** Octobre 2025  
**Version:** 1.0  
**Créé pour:** COBACAM (Communauté des Camerounais à Montréal)  
**Adaptable pour:** Toute organisation communautaire au Québec/Canada francophone  

**Pour commencer:** Chargez SKILL.md dans Claude et dites "Crée un PV avec mes notes..."

---

*Bonne rédaction de procès-verbaux professionnels!* 📝✨
