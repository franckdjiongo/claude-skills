{
  "_comment": "CARTE CANONIQUE DES CHEMINS DOCS — {{PROJECT_NAME}}. Source unique de vérité pour (1) l'emplacement des documents canoniques (sources of truth), (2) les dossiers d'artefacts (specs, plans, qa, audits, décisions…), et (3) les conventions de nommage/placement. Les skills, agents et hooks LISENT CE FICHIER EN PRIORITÉ pour résoudre un chemin, puis retombent sur leur valeur codée en dur si le fichier est absent/illisible (fallback sûr). DÉPLACER UN DOC = mettre à jour SON entrée ici, puis lancer `node .claude/scripts/check-docs-map.mjs` qui vérifie que tous les chemins existent. Ne jamais ré-énumérer ces chemins ailleurs : pointer vers ce manifest.",
  "version": 1,
  "lastReviewed": "{{SCAFFOLD_DATE}}",
  "root": "{{DOCS_ROOT}}",
  "sourcesOfTruth": {
    "spec": "{{SPEC_DOC}}",
    "dataModel": "{{DATA_MODEL_DOC}}",
    "catalog": "{{CATALOG_DOC}}"
  },
  "artifactDirs": {
    "_comment": "Dossiers où les artefacts sont créés/rangés. Créés au bootstrap ; check-docs-map vérifie leur existence.",
    "specs": "{{DOCS_ROOT}}/specs",
    "plans": "{{DOCS_ROOT}}/plans",
    "qa": "{{DOCS_ROOT}}/qa",
    "audits": "{{DOCS_ROOT}}/audits",
    "decisions": "{{DOCS_ROOT}}/decisions",
    "composants": "{{DOCS_ROOT}}/composants",
    "architecture": "{{DOCS_ROOT}}/architecture"
  },
  "conventions": {
    "_format": "Tous les documents de {{DOCS_ROOT}}/ sont en HTML (plus aucun .md). Créer un nouveau doc via `node .claude/scripts/docs-html/scaffold.mjs <type> <chemin.html> \"<Titre>\"` (la coquille premium — thème, TOC, badge, métadonnées — est garantie).",
    "specFile": {
      "pattern": "{{DOCS_ROOT}}/specs/YYYY-MM-DD-<topic>-design.html",
      "scaffold": "node .claude/scripts/docs-html/scaffold.mjs spec {{DOCS_ROOT}}/specs/YYYY-MM-DD-<topic>-design.html \"<Titre>\""
    },
    "planFile": {
      "pattern": "{{DOCS_ROOT}}/plans/YYYY-MM-DD-<topic>-plan.html",
      "scaffold": "node .claude/scripts/docs-html/scaffold.mjs plan {{DOCS_ROOT}}/plans/YYYY-MM-DD-<topic>-plan.html \"<Titre>\""
    },
    "themedSubfolders": false
  }
}
