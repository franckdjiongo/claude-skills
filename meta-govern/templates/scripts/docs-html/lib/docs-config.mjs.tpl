// docs-config.mjs — CONFIGURATION PROJET du toolkit docs-html.
//
// SEUL module du toolkit qui connaît le projet : tous les autres scripts
// (template, doc-types, scaffold, make-index, convert, verify, guards…)
// importent CE fichier et ne hardcodent RIEN. Pour adapter le toolkit —
// renommer le projet, déplacer le dossier docs, ajouter un type de document,
// activer la facette « contexte » du hub — éditez UNIQUEMENT ce module.
//
// Généré au bootstrap par meta-govern (les valeurs ci-dessous sont rendues
// depuis l'interview projet). Dépendance-free (ESM pur Node).

/* ----------------------------- Identité projet ---------------------------- */

export const PROJECT_NAME = "{{PROJECT_NAME}}";
export const PROJECT_SLUG = "{{PROJECT_SLUG}}";

/** Langue des documents générés (attribut lang des pages HTML). */
export const LANG = "{{LANG}}";

/** Clé localStorage du thème light/dark — DOIT égaler celle de docs-toc.js. */
export const THEME_STORAGE_KEY = "{{THEME_STORAGE_KEY}}";

/** Dossier racine de la documentation, relatif à la racine du repo (sans slash final). */
export const DOCS_ROOT = "{{DOCS_ROOT}}";

/** Titre du hub de navigation (index.html). */
export const HUB_TITLE = "{{HUB_TITLE}}";

/* ------------------------- Chaînes dérivées (shell) ----------------------- */

export const GENERATOR = `docs-html (${PROJECT_NAME})`;
export const FOOTER_BRAND = `${PROJECT_NAME} — Documentation`;
export const TITLE_SUFFIX = ` · ${PROJECT_NAME}`;

/* ----------------------------- Types de documents ------------------------- */

/**
 * Registre canonique des TYPES de documents. Chaque type pilote :
 *   - le BADGE coloré + l'icône de l'en-tête HTML,
 *   - l'ACCENT (barre de titre, TOC active, cartes du hub),
 *   - la métadonnée machine `<meta name="doc-type">` lue par les agents.
 * Ajouter un type = ajouter une entrée ICI (les scripts suivent).
 * @typedef {{ id:string, label:string, icon:string, accent:string, blurb:string }} DocType
 * @type {DocType[]}
 */
export const DOC_TYPES = [
  { id: 'spec',         label: 'Spécification / Design', icon: '◆', accent: '#6D28D9', blurb: 'Design fonctionnel & technique' },
  { id: 'plan',         label: "Plan d'implémentation",  icon: '▣', accent: '#2563EB', blurb: 'Plan exécutable, tâches & pipeline' },
  { id: 'qa',           label: 'Plan de QA',             icon: '✓', accent: '#10B981', blurb: 'Plan de test manuel / vérification' },
  { id: 'audit',        label: 'Audit',                  icon: '◉', accent: '#F59E0B', blurb: 'Audit / revue technique' },
  { id: 'lexique',      label: 'Lexique de données',     icon: '▦', accent: '#0F766E', blurb: 'Modèle de données (source de vérité)' },
  { id: 'synthese',     label: 'Synthèse de rencontre',  icon: '❖', accent: '#B45309', blurb: 'Compte-rendu / synthèse de réunion' },
  { id: 'architecture', label: 'Architecture',           icon: '▲', accent: '#0E7490', blurb: 'Architecture, contextes, vues structurantes' },
  { id: 'adr',          label: 'Décision (ADR)',         icon: '◈', accent: '#7C3AED', blurb: 'Architecture Decision Record' },
  { id: 'playbook',     label: 'Playbook',               icon: '☰', accent: '#334155', blurb: 'Guide opératoire (agents & équipe)' },
  { id: 'backlog',      label: 'Backlog différé',        icon: '◇', accent: '#9333EA', blurb: 'Améliorations différées' },
  { id: 'generic',      label: 'Document',               icon: '○', accent: '{{BRAND_PRIMARY}}', blurb: 'Document de projet' },
];

/**
 * Override MANUEL basename(sans extension) → id de DOC_TYPES, pour des documents
 * rangés à la RACINE de DOCS_ROOT (non classables par dossier) qui ne sont PAS
 * déjà des sources de vérité du registre docs-map.json — celles-ci (spec, modèle
 * de données, catalogue) sont typées AUTOMATIQUEMENT par doc-types.mjs depuis
 * docs-map.json. Vide par défaut ; consulté AVANT tout le reste. Exemple :
 *   { 'glossaire': 'lexique', 'feuille-de-route': 'plan' }
 * @type {Record<string, string>}
 */
export const TYPE_FILES = {};

/**
 * Map dossier (1er segment sous DOCS_ROOT) → id de DOC_TYPES.
 * Sert à typeForPath() pour classer un doc d'après son emplacement.
 * @type {Record<string, string>}
 */
export const TYPE_FOLDERS = {
  specs: 'spec',
  plans: 'plan',
  qa: 'qa',
  audits: 'audit',
  lexique: 'lexique',
  composants: 'lexique',
  architecture: 'architecture',
  decisions: 'adr',
  synthese: 'synthese',
  backlog: 'backlog',
};

/* --------------------------- Facette contexte (hub) ----------------------- */

/**
 * Buckets de CONTEXTE pour la 2e facette du hub (à côté de la facette type).
 * VIDE par défaut → la facette est DÉSACTIVÉE. Pour l'activer, déclarez des
 * buckets ; `match` = sous-chaînes de chemin (insensibles à la casse) qui
 * rattachent un doc au bucket, testées dans l'ordre de la liste.
 * Exemple :
 *   { id: 'interne', label: 'Interne', match: ['/interne/'] }
 * @typedef {{ id:string, label:string, match?:string[] }} ContextBucket
 * @type {ContextBucket[]}
 */
export const CONTEXT_BUCKETS = [];
