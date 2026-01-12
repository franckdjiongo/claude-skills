# Contexte du Projet Temps Chantier

## Vue d'ensemble

Le projet "Temps Chantier" vise à numériser la saisie et la validation des temps de chantier (main-d'œuvre et équipements) avec intégration vers les systèmes de paie (Dayforce) et de comptabilité (AS400).

## Objectif MVP

Numériser la saisie quotidienne du temps de chantier par les contremaîtres, avec validation et export hebdomadaire vers la paie (Dayforce).

## Systèmes impliqués

### Dayforce (HCM/Paie)
- Source de vérité pour employés et affectations
- Système de destination pour l'export des temps de main-d'œuvre

### AS400 (ERP)
- Gestion des projets/contrats
- Codes de gestion
- Imputations comptables
- Système de destination pour les temps machine sans opérateur

### MIR (Équipements)
- Parc d'équipements
- Mobilisation par chantier

### Dataverse (Application cible)
- Saisie et validation des temps
- Référentiels synchronisés avec les systèmes sources

## Acteurs principaux

### Contremaîtres
- Saisie des temps par chantier
- Validation quotidienne des temps

### Paie
- Vérification et correction des temps
- Déclenchement de l'export hebdomadaire

### RH/Admin Dayforce
- Gestion des affectations
- Paramétrage des quarts de travail

### Ops/TI
- Gouvernance des sources de vérité équipements

## Règles d'affaires clés

### Éligibilité employés
- Basée sur affectations actives au chantier dans Dayforce
- Un employé ne peut saisir que s'il est affecté

### Quarts de travail
- Paramétrés au niveau du contrat (jour/soir/nuit)
- Spécifiques à chaque chantier

### Arrondi des heures
- Arrondi à 0,25 h (15 minutes) pour l'export paie
- Obligatoire pour l'intégration Dayforce

### Filtres contextuels
- Contrats et codes de gestion filtrés par compagnie/chantier
- Équipements visibles seulement s'ils sont mobilisés au chantier

### Temps machine
- **Avec opérateur**: Exporté vers Dayforce (lié à l'employé)
- **Sans opérateur**: Exporté vers AS400 (comptabilité uniquement)

## Données principales

### Journal de chantier
- Unité de saisie par jour et par site
- Contient tous les temps employés et machines du jour

### Temps Employé
- Employé concerné
- Affectation (lien Dayforce)
- Code de gestion (WBS/CBS)
- Quart de travail
- Heures travaillées

### Temps Machine
- Équipement utilisé
- Code de gestion (WBS/CBS)
- Heures d'utilisation
- Lien optionnel avec l'opérateur

## Référentiels synchronisés

- Contrat/Projet
- Code de gestion (WBS/CBS)
- Affectation (Work Assignment)
- Équipement
- Quarts autorisés (Shifts)
