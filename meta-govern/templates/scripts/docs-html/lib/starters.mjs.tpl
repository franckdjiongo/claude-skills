// starters.mjs — Corps HTML de DÉMARRAGE par type de document.
//
// Utilisé par scaffold.mjs pour créer un NOUVEAU document HTML conforme. Les
// titres <h2 id> alimentent automatiquement la TOC. Les agents/skills
// remplacent le contenu des sections ; ils NE touchent PAS à la coquille.
// Chaque section porte un commentaire-guide <!-- … --> à remplacer.

const guide = (txt) => `      <p><!-- ${txt} --></p>\n`;
const h2 = (id, label) => `      <h2 id="${id}"><a class="header-anchor" href="#${id}" aria-hidden="true">#</a> ${label}</h2>\n`;

/**
 * @param {string} type  id de DOC_TYPES (cf. lib/docs-config.mjs)
 * @param {string} title
 * @returns {string} corps HTML
 * Chaque section est `[id, label, hint]` ou `[id, label, hint, rawHtml]`.
 * Quand `rawHtml` est fourni, il remplace le commentaire-guide (utilisé pour
 * pré-remplir un plan avec de VRAIES cases à cocher task-list, cf. PLAN_SECTIONS).
 */
export function starterBody(type, title) {
  const sections = SECTIONS[type] || SECTIONS.generic;
  let body = `      <h1>${title}</h1>\n`;
  body += `      <p><strong>Statut :</strong> brouillon &nbsp; <strong>Date :</strong> AAAA-MM-JJ</p>\n`;
  for (const [id, label, hint, rawHtml] of sections) {
    body += h2(id, label) + (rawHtml != null ? rawHtml : guide(hint));
  }
  return body;
}

// Cases à cocher task-list — markup IDENTIQUE à la sortie du convertisseur
// (markdown-it-task-lists), donc stylé par docs-theme.css et basculable par
// l'outillage. Décochée = pas de `checked`. NE JAMAIS écrire `[ ]` / `[x]` :
// le dossier docs/ est 100 % HTML.
const taskItem = (txt) =>
  `<li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" type="checkbox"> ${txt}</label></li>`;
const taskList = (items) =>
  `      <ul class="contains-task-list">\n${items.map((t) => `        ${taskItem(t)}`).join('\n')}\n      </ul>\n`;

// Pipeline d'exécution pré-remplie : une vraie liste task-list à cocher au fil
// de l'exécution. Remplacer les exemples par les étapes réelles du plan.
const pipelineBody =
  `      <p><!-- Pipeline d'exécution : une case par étape, cochée au fil de l'exécution.\n` +
  `           Cocher = ajouter l'attribut checked="" à l'input correspondant.\n` +
  `           NE PAS écrire [ ]/[x] (le doc est en HTML). Remplacer les exemples ci-dessous. --></p>\n` +
  taskList([
    'Task 1 — &lt;intitulé&gt;',
    'Task 1 — commit',
    'Task 2 — &lt;intitulé&gt;',
    'Task 2 — commit',
  ]);

// Gabarit d'UNE tâche. Dupliquer la <section> par tâche réelle du plan.
const taskTemplateBody =
  `      <!-- Une <section class="plan-task"> par tâche. Dupliquer ce gabarit. -->\n` +
  `      <section class="plan-task">\n` +
  `      <h3 id="task-1" data-status="todo"><a class="header-anchor" href="#task-1" aria-hidden="true">#</a> Task 1 : &lt;nom court&gt;</h3>\n` +
  `      <p><strong>Fichiers :</strong> Modifier <code>src/…</code> · Test <code>src/…</code></p>\n` +
  `      <p><strong>Références :</strong> IDs de spec couverts (FUNC/RA/VAL…) · docs/…</p>\n` +
  taskList([
    'Step 1 (RED) : écrire le test qui échoue',
    'Step 2 : lancer le test ciblé et vérifier l’échec attendu',
    'Step 3 (GREEN) : implémenter le minimum',
    'Step 4 : relancer les tests ciblés',
    'Step 5 : validation complète du projet',
  ]) +
  `      </section>\n`;

const PLAN_SECTIONS = [
  ['execution-strategy', "Stratégie d'exécution", "Ordre d'exécution, groupes de tâches, parallélisme éventuel."],
  ['pipeline-task-list', "Pipeline d'exécution", null, pipelineBody],
  ['taches', 'Tâches', null, taskTemplateBody],
  ['spec-refs', 'Références de spec', 'IDs de spec (FUNC/RA/VAL…) couverts par ce plan.'],
  ['risques', 'Risques & rollback', 'Risques identifiés et plan de repli.'],
];

const SECTIONS = {
  spec: [
    ['contexte', 'Contexte', 'Problème, objectif, références sources de vérité.'],
    ['decisions', 'Décisions de design', 'Choix retenus et alternatives écartées.'],
    ['specifications', 'Spécifications (FUNC / RA / VAL)', 'Comportements détaillés, IDs traçables.'],
    ['hors-perimetre', 'Hors-périmètre', 'Ce qui N’EST PAS couvert ici → backlog.'],
  ],
  plan: PLAN_SECTIONS,
  qa: [
    ['portee', 'Portée du test', 'Fonctionnalités couvertes / hors portée.'],
    ['prerequis', 'Prérequis de test', 'Environnement, viewport, données.'],
    ['scenarios', 'Scénarios', 'TC-xxx : étapes, attendu, résultat.'],
    ['resume', 'Résumé et résultats', 'Verdict global, anomalies.'],
  ],
  audit: [
    ['perimetre', 'Périmètre de l’audit', 'Ce qui a été audité et pourquoi.'],
    ['constats', 'Constats', 'Findings sévérité-taggés.'],
    ['recommandations', 'Recommandations', 'Actions proposées (non appliquées).'],
  ],
  lexique: [
    ['vue-ensemble', 'Vue d’ensemble', 'Périmètre de cette section du lexique.'],
    ['tables', 'Tables', 'Schéma, colonnes, types, relations.'],
    ['conventions', 'Conventions & patterns', 'Conventions de nommage, patterns de requête.'],
  ],
  synthese: [
    ['participants', 'Participants & contexte', 'Qui, quand, objet de la rencontre.'],
    ['points-cles', 'Points clés', 'Points discutés, constats.'],
    ['decisions', 'Décisions', 'Décisions prises en séance.'],
    ['actions', 'Actions de suivi', 'Qui fait quoi, pour quand.'],
  ],
  architecture: [
    ['contexte', 'Contexte', 'Problème architectural, périmètre.'],
    ['vue-ensemble', 'Vue d’ensemble', 'Schéma, contextes, frontières.'],
    ['decisions', 'Décisions structurantes', 'Choix et justifications (→ ADR si besoin).'],
  ],
  adr: [
    ['statut', 'Statut', 'proposé / accepté / déprécié / remplacé par …'],
    ['contexte', 'Contexte', 'Forces en présence, contraintes, problème.'],
    ['decision', 'Décision', 'La décision prise, formulée à l’indicatif.'],
    ['consequences', 'Conséquences', 'Effets positifs, négatifs, dettes acceptées.'],
    ['alternatives', 'Alternatives considérées', 'Options écartées et pourquoi.'],
  ],
  playbook: [
    ['objectif', 'Objectif', 'Ce que ce playbook permet d’accomplir.'],
    ['procedure', 'Procédure', 'Étapes ordonnées, commandes exactes.'],
    ['verification', 'Vérification', 'Comment vérifier que tout a fonctionné.'],
  ],
  backlog: [
    ['items', 'Items différés', 'Une entrée datée par amélioration différée.'],
  ],
  generic: [['introduction', 'Introduction', 'Contenu du document.']],
};
