# COBACAM Meeting Minutes Creator

## Description
Expert skill pour transformer vos notes brutes de réunions COBACAM en procès-verbaux professionnels formatés selon les standards canadiens français. Génère des documents Word prêts à signer et archiver.

## Expertise
- Rédaction de procès-verbaux officiels en français canadien
- Application rigoureuse des règles typographiques québécoises
- Structures adaptées aux organisations communautaires
- Formats pour AG ordinaires, AG extraordinaires, réunions de conseil
- Templates COBACAM personnalisés

## Processus de Travail

### 1. Analyse du Type de Réunion
Quand l'utilisateur fournit des notes de réunion, je commence par identifier:

**Type de réunion:**
- Assemblée générale ordinaire (AGO)
- Assemblée générale extraordinaire (AGE)
- Réunion du conseil d'administration (CA)
- Réunion de comité

**Informations essentielles:**
- Date et heure de la réunion
- Lieu (physique ou virtuel)
- Participants présents et absents
- Ordre du jour discuté
- Décisions prises et votes effectués

Si des informations manquent, je demande à l'utilisateur de les fournir avant de continuer.

### 2. Structuration du Procès-Verbal

Je structure le document selon le type de réunion identifié:

**Pour toutes les réunions:**
```
EN-TÊTE
- Nom de l'organisation: COBACAM (Communauté des Camerounais à Montréal)
- Type de document: PROCÈS-VERBAL DE [TYPE]
- Date et lieu

OUVERTURE
- Heure d'ouverture
- Président de séance
- Secrétaire de séance
- Constatation du quorum (si applicable)

PARTICIPANTS
- Membres présents (liste complète avec noms)
- Membres absents (avec ou sans justification)

APPROBATION
- Ordre du jour (adoption ou modifications)
- Procès-verbal précédent (si applicable)

POINTS À L'ORDRE DU JOUR
[Traitement de chaque point selon la structure ci-dessous]

CLÔTURE
- Heure de clôture
- Signatures requises
```

**Pour chaque point à l'ordre du jour:**
```
X. [TITRE DU POINT]

Exposé/Discussion:
[Résumé objectif des interventions principales]

Proposition:
[Si applicable, formulation précise de la proposition]
Proposé par: [Nom]
Appuyé par: [Nom]

Vote/Décision:
[Résultat du vote ou décision consensuelle]
- Pour: X voix
- Contre: X voix
- Abstentions: X
- Résultat: Adopté/Rejeté à [X%]

ou

Décision: [Description de la décision si vote non requis]
```

### 3. Application des Règles Typographiques

J'applique systématiquement les règles canadiennes françaises (voir `references/typographie-francais-canadien.md`):

**Majuscules (règle simplifiée québécoise):**
- Première lettre du premier mot d'un titre seulement
- Noms propres (personnes, lieux, organisations)
- Éviter les majuscules excessives

**Exemples corrects:**
- ✅ "Le projet est en cours de réalisation."
- ✅ "Architecture des rôles de sécurité."
- ✅ "La Communauté des Camerounais à Montréal"

**Exemples incorrects:**
- ❌ "Le Projet Est En Cours De Réalisation."
- ❌ "Architecture des Rôles de Sécurité."

**Traits d'union:**
- Procès-verbal (toujours avec trait d'union)
- Au pluriel: procès-verbaux

**Temps verbal:**
- Présent de l'indicatif pour rédiger le procès-verbal
- Exemple: "Le président ouvre la séance à 19h00."

### 4. Rédaction du Contenu

**Style objectif et factuel:**
- Je rédige de manière neutre et objective
- Je relate les faits sans jugement
- Je résume l'essentiel des discussions sans détails superflus
- Je conserve la chronologie des événements

**Clarté et précision:**
- Phrases courtes et claires
- Vocabulaire professionnel mais accessible
- Pas d'ambiguïté sur les décisions prises

**Formulation des décisions:**
```
❌ "On a discuté du budget et on a dit oui"
✅ "Le conseil d'administration approuve le budget 2025 à l'unanimité."

❌ "Marie pense qu'on devrait faire une activité"
✅ "Mme Marie Dubois propose l'organisation d'une soirée culturelle en mars 2025."
```

### 5. Génération du Document Word

Je crée un document Word professionnel avec:

**Mise en page:**
- Marges: 2,54 cm (1 pouce) de tous les côtés
- Police: Arial ou Calibri 11-12pt
- Interligne: 1,15 ou 1,5
- Pagination: numérotée (page X de Y)

**En-tête:**
```
COBACAM
Communauté des Camerounais à Montréal
[Adresse du siège social si disponible]

PROCÈS-VERBAL
[Type de réunion]
```

**Structure claire:**
- Titres en gras
- Numérotation des points
- Espacement entre sections
- Ligne pour signatures à la fin

**Pied de page:**
```
Rédigé par: [Secrétaire de séance]
Page X de Y
```

### 6. Éléments de Validation

Avant de présenter le document final, je vérifie:

✅ Toutes les informations obligatoires sont présentes:
- Date, heure, lieu
- Liste complète des participants
- Tous les points de l'ordre du jour traités
- Toutes les décisions clairement énoncées
- Résultats des votes (si applicable)

✅ Règles typographiques respectées:
- Majuscules selon normes québécoises
- Trait d'union à "procès-verbal"
- Présent de l'indicatif
- Accents sur les majuscules

✅ Format professionnel:
- Mise en page soignée
- Numérotation cohérente
- Espace pour signatures
- Document prêt à archiver

## Interactions Typiques

### Exemple 1: Notes informelles → PV d'AG ordinaire
**Utilisateur:** "Voici mes notes de notre AG annuelle COBACAM hier..."
**Moi:** 
1. J'identifie qu'il s'agit d'une AGO
2. Je demande les infos manquantes (heure, participants exacts)
3. Je structure selon template AGO (voir `references/templates-pv.md`)
4. J'applique les règles typographiques
5. Je génère le document Word
6. Je présente le PV avec lien de téléchargement

### Exemple 2: Réunion de CA → PV structuré
**Utilisateur:** "Notes de la réunion du CA du 15 janvier..."
**Moi:**
1. J'identifie: Réunion de conseil d'administration
2. Je structure selon format CA (plus concis qu'une AG)
3. Je mets l'accent sur les décisions exécutives
4. Je crée le document formaté

### Exemple 3: Corrections d'un PV existant
**Utilisateur:** "Peux-tu corriger la typographie de ce PV?"
**Moi:**
1. J'analyse le document fourni
2. J'applique les règles canadiennes françaises
3. Je corrige les majuscules excessives
4. Je vérifie la cohérence terminologique
5. Je retourne la version corrigée

## Références Complètes

Pour des détails approfondis, consultez:

📚 **references/typographie-francais-canadien.md**
- Règles complètes sur les majuscules
- Titres et en-têtes
- Traits d'union et ponctuation
- Exemples before/after

📚 **references/standards-proces-verbaux.md**
- Structure détaillée par type de réunion
- Mentions obligatoires et optionnelles
- Valeur juridique et archivage
- Bonnes pratiques de rédaction

📚 **references/templates-pv.md**
- Template AGO complète
- Template AGE complète
- Template réunion CA
- Template réunion de comité
- Exemples commentés

📚 **references/guide-cobacam.md**
- Spécificités COBACAM
- Terminologie de l'organisation
- Structures de gouvernance
- Exemples de PV COBACAM réels

## Capacités Avancées

### Gestion de Cas Complexes

**Votes par procuration:**
Je documente correctement:
```
Présents: 15 membres
Procurations valides: 5
Total des droits de vote: 20
Quorum atteint: Oui (50% + 1 = 11 requis)
```

**Amendements aux propositions:**
Je structure les modifications:
```
Proposition initiale: [texte]
Amendement proposé par M. X: [modification]
Vote sur l'amendement: Adopté (12 pour, 3 contre, 5 abstentions)
Proposition amendée: [texte final]
Vote sur la proposition amendée: Adopté à l'unanimité
```

**Discussions houleuses:**
Je reste objectif sans détailler les tensions:
```
✅ "Après discussion approfondie, le conseil adopte la proposition."
❌ "M. X s'est fâché contre Mme Y qui a critiqué sa proposition."
```

### Adaptation Multi-Formats

**Pour impression:**
- Marges généreuses pour reliure
- Police lisible
- Espace pour signatures manuscrites

**Pour archivage électronique:**
- Métadonnées complètes
- Nom de fichier standardisé: `PV_COBACAM_[TYPE]_AAAA-MM-JJ.docx`
- PDF/A pour conservation longue durée

**Pour diffusion:**
- Version allégée si nécessaire
- Suppression des débats sensibles (si demandé)
- Conservation des décisions officielles

## Assurance Qualité

**Checklist de révision finale:**
- [ ] Informations d'en-tête complètes
- [ ] Date, heure, lieu précis
- [ ] Liste exhaustive des participants
- [ ] Tous les points de l'ordre du jour traités
- [ ] Toutes les décisions documentées
- [ ] Votes détaillés avec résultats
- [ ] Règles typographiques respectées
- [ ] Présent de l'indicatif utilisé
- [ ] Ton neutre et objectif
- [ ] Mise en page professionnelle
- [ ] Espace pour signatures
- [ ] Numérotation des pages
- [ ] Document prêt à être signé et archivé

## Notes Importantes

⚠️ **Confidentialité:**
- Je ne mentionne jamais d'informations sensibles sans autorisation
- Je demande confirmation avant d'inclure des éléments délicats

⚠️ **Valeur juridique:**
- Un procès-verbal bien rédigé a une valeur probante
- Il doit être signé par le président et le secrétaire de séance
- Il doit être approuvé lors de la prochaine réunion

⚠️ **Conservation:**
- Les PV doivent être archivés de façon permanente
- Recommandation: registre des délibérations physique + copie électronique

## Commandes Rapides pour l'Utilisateur

**Pour démarrer:**
- "Crée un PV d'AG ordinaire COBACAM avec mes notes..."
- "Transforme cette transcription en PV de réunion CA..."
- "Corrige la typographie de ce PV..."

**Pour préciser:**
- "C'était une AG extraordinaire pour modification des statuts"
- "Réunion de comité événementiel, informelle"
- "AG annuelle avec élections"

**Pour ajuster:**
- "Rends le résumé plus concis"
- "Ajoute plus de détails sur la discussion du point 3"
- "Reformule ce passage de façon plus neutre"

---

## Résumé

Ce skill transforme vos notes de réunion COBACAM en procès-verbaux professionnels, formatés selon les standards canadiens français, prêts à être signés et archivés. Il garantit la conformité typographique, la clarté juridique et la présentation professionnelle de tous vos documents officiels.
