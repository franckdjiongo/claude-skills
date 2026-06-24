---
name: pp-solution-sync
description: >
  Synchronise les exports de solutions Power Platform depuis ~/Downloads vers les dossiers du projet local.
  Utilise ce skill dès que l'utilisateur mentionne qu'il a téléchargé ou exporté une solution Power Platform,
  qu'il veut mettre à jour son projet avec une nouvelle version, syncer des fichiers depuis Downloads,
  ou appliquer les mises à jour d'une solution Power Platform dans son code. Même si l'utilisateur dit juste
  "j'ai exporté la solution" ou "j'ai téléchargé depuis Power Platform", déclenche ce skill.
---

# Synchronisation de solutions Power Platform

L'objectif est de mettre à jour les dossiers du projet avec les fichiers d'une export Power Platform fraîchement téléchargée, en respectant scrupuleusement la structure déjà en place dans le projet — ni plus, ni moins.

## Étape 1 — Collecter les informations

Pose ces deux questions à l'utilisateur (tu peux les poser ensemble) :

1. **Dossiers du projet** : "Quels sont les chemins des dossiers de projet à mettre à jour ? (tu peux en donner plusieurs)"
2. **Dossiers téléchargés** : "Quels sont les noms des dossiers dans ~/Downloads qui contiennent les nouvelles versions ?"

L'utilisateur te donnera :
- Un ou plusieurs chemins absolus vers des dossiers projet (ex: `/Users/x/projets/MonProjet/TempsChantier`)
- Un ou plusieurs noms de dossiers dans Downloads (ex: `TempsChantier_1_0_0_44`, `DonnesTransversesCore_1_0_0_11`)

**Association dossier download ↔ dossier projet** : Le nom d'un dossier téléchargé suit le pattern `NomSolution_X_Y_Z_Build`. Supprime le suffixe de version (`_X_Y_Z_Build`) pour obtenir le nom de base, puis fais correspondre au dossier projet dont le nom contient ce même nom de base. Si l'association n'est pas évidente, demande à l'utilisateur de confirmer.

## Étape 2 — Analyser la structure du projet

Pour chaque dossier projet fourni, liste tous ses fichiers et répertoires. L'objectif est de comprendre **quelles catégories d'artefacts existent déjà** dans ce projet, car c'est cette structure qui fait loi.

Identifie les catégories présentes en cherchant :

| Catégorie | Indicateur de présence dans le projet |
|-----------|--------------------------------------|
| Flows / Workflows | Présence d'un dossier `flows/` ou `Workflows/` |
| Fichiers connecteur | Fichiers `*_connectionparameters.json`, `*_openapidefinition.json`, etc. à la racine ou dans `Connector/` |
| Formulas | Fichiers `*-FormulaDefinitions.yaml` à la racine ou dans `Formulas/` |
| Variables d'environnement | Dossier `environmentvariabledefinitions/` |
| aiskillconfigs | Dossier `aiskillconfigs/` |
| WebResources | Dossier `WebResources/` |
| CanvasApps | Dossier `CanvasApps/` |

## Étape 3 — Construire le plan de synchronisation

Pour chaque fichier dans le dossier téléchargé, détermine ce qu'il faut en faire selon ces règles :

### Règle fondamentale
**Ne jamais introduire une catégorie qui n'existait pas dans le projet.** Si le projet n'avait pas de `aiskillconfigs/`, `WebResources/`, ou `CanvasApps/`, ces dossiers sont ignorés même s'ils sont dans le téléchargement.

### Mapping structurel

**Fichiers racine** (`[Content_Types].xml`, `customizations.xml`, `solution.xml`) → toujours mis à jour à la racine du projet.

**`Workflows/`** dans le téléchargement →
- Si le projet a `flows/` → copier dans `flows/`
- Si le projet a `Workflows/` → copier dans `Workflows/`
- Si ni l'un ni l'autre n'existe → créer `Workflows/` (c'est une nouvelle catégorie légitime)

**`Connector/`** dans le téléchargement →
- Si le projet a des fichiers connecteur à la racine → copier à la racine
- Si le projet a un dossier `Connector/` → copier dans `Connector/`
- Si absent du projet → ignorer

**`Formulas/`** dans le téléchargement →
- Si le projet a des fichiers `*-FormulaDefinitions.yaml` à la racine → copier à la racine
- Si le projet a un dossier `Formulas/` → copier dans `Formulas/`
- Si absent du projet → ignorer

**`environmentvariabledefinitions/`** → toujours mis à jour en conservant la même structure de sous-dossiers.

**`aiskillconfigs/`**, **`WebResources/`**, **`CanvasApps/`** → seulement si ces dossiers existent déjà dans le projet. Sinon, ignorer.

### Fichiers à supprimer
Dans chaque catégorie mappée, identifie les fichiers qui existaient dans le projet mais qui ne sont plus présents dans la nouvelle export. Ces fichiers ont été supprimés de la solution et doivent être retirés du projet.

## Étape 4 — Présenter le plan et demander confirmation

Avant d'exécuter quoi que ce soit, présente un résumé clair des changements prévus pour chaque dossier projet :

```
📁 TempsChantier
  ✏️  Mis à jour  : solution.xml, customizations.xml, [Content_Types].xml
  ✏️  Mis à jour  : flows/ChildFlow-DayforceDataverseAffectations-[...].json (12 flows mis à jour)
  ➕  Ajoutés     : flows/ChildFlow-DayforceDataversePeriodedepaie-[...].json (3 nouveaux flows)
  ➕  Ajoutés     : gg_codedegestion-FormulaDefinitions.yaml (nouvelle formula)
  ❌  Supprimés   : flows/ChildFlow-DayforceDataverseEmployeesWorkAssignment-[...].json
  ⏭️  Ignorés     : aiskillconfigs/ (53 fichiers) — catégorie absente du projet
  ⏭️  Ignorés     : WebResources/ (14 fichiers) — catégorie absente du projet

Confirmes-tu ces changements ?
```

Attends la confirmation de l'utilisateur avant de continuer.

## Étape 5 — Exécuter

Une fois confirmé, applique les changements dans l'ordre :
1. Créer les nouveaux dossiers nécessaires
2. Copier/écraser les fichiers mis à jour
3. Copier les nouveaux fichiers
4. Supprimer les fichiers obsolètes

Après l'exécution, confirme rapidement ce qui a été fait avec un bilan court.
