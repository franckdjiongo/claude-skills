#!/usr/bin/env node
// scripts/migrate-project.mjs
// Incremental migration from one meta-govern version to another, OR palier promotion.
//
// Usage:
//   node migrate-project.mjs <project-path> --target=palier-N [--dry-run]
//   node migrate-project.mjs <project-path> --target=palier-4 --ci-policy=server-ci
//   node migrate-project.mjs <project-path> --target=v1.1.0 [--dry-run]
//   node migrate-project.mjs <project-path> --target=v1.2.0 --archetype=B --architecture-pattern=framework-native-feature-first
//   node migrate-project.mjs <project-path> --target=html-docs [--dry-run]
//
// --ci-policy=<local-compensation|server-ci> : décision CI tracée à la promotion
//   palier 4 (leçon 7). Défaut 'local-compensation' (CI serveur = option recommandée,
//   compensée localement par predeploy-check.mjs + gate Stop durci).
//
// Produces a step-by-step plan; applies steps with checkpoint commits between.
// NEVER bulk-migrates. One step at a time.
// Forward-compat: unknown keys in .claude/.meta-govern.json are preserved across runs.
// L'action 'command' n'exécute QUE des scripts du projet cible situés sous
// .claude/scripts/ (allowlist par préfixe de chemin résolu).

import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { detectProject, writeMetaGovernState } from './lib/project-detection.mjs';
import { renderToFile } from './lib/template-renderer.mjs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const SKILL_DIR = path.dirname(path.dirname(new URL(import.meta.url).pathname));

const args = process.argv.slice(2);
let target = null;
let migrateTarget = null;
let dryRun = false;
let archetype = null;
let architecturePattern = null;
let ciPolicy = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') dryRun = true;
  else if (a.startsWith('--target=')) migrateTarget = a.slice('--target='.length);
  else if (a === '--target' && args[i + 1]) migrateTarget = args[++i];
  else if (a.startsWith('--archetype=')) archetype = a.slice('--archetype='.length);
  else if (a === '--archetype' && args[i + 1]) archetype = args[++i];
  else if (a.startsWith('--architecture-pattern=')) architecturePattern = a.slice('--architecture-pattern='.length);
  else if (a === '--architecture-pattern' && args[i + 1]) architecturePattern = args[++i];
  else if (a.startsWith('--ci-policy=')) ciPolicy = a.slice('--ci-policy='.length);
  else if (a === '--ci-policy' && args[i + 1]) ciPolicy = args[++i];
  else if (!a.startsWith('--')) target = a;
}

if (ciPolicy !== null && ciPolicy !== 'local-compensation' && ciPolicy !== 'server-ci') {
  process.stderr.write(`--ci-policy invalide « ${ciPolicy} » — attendu: local-compensation | server-ci\n`);
  process.exit(2);
}

if (!target || !migrateTarget) {
  process.stderr.write(`Usage: migrate-project.mjs <project-path> --target=<palier-N|vX.Y.Z|html-docs> [--dry-run]\n`);
  process.exit(2);
}

const projectDir = path.resolve(target);
const detection = detectProject(projectDir);

const metaGovernVersion = readMetaGovernVersion();
const currentVersion = detection.metaGovernState?.metaGovernVersion || '0.0.0';
const currentPalier = detection.palier;

const plan = buildMigrationPlan(detection, migrateTarget, currentVersion, metaGovernVersion);

const report = {
  projectDir,
  currentVersion,
  currentPalier,
  targetVersion: migrateTarget,
  metaGovernVersion,
  steps: plan,
  applied: 0,
  errors: [],
};

// Stale-state precheck (L1, v1.14.0): a metaGovernVersion/palier bump written to
// .claude/.meta-govern.json falsifies any hardcoded literal still in the project's
// CLAUDE.md / AGENTS.md (durable-only doctrine, v1.9.0). Read-only warning — the
// script never rewrites CLAUDE.md prose; the parent pointerizes each hit in the SAME
// change-set as the bump. Populated before the dry-run exit so it surfaces in both.
report.staleStateWarnings = scanStaleStateLiterals(projectDir);
for (const w of report.staleStateWarnings) {
  process.stderr.write(`⚠ stale-state: ${w.file}:${w.line} « ${w.match} » — pointeriser vers .claude/.meta-govern.json dans le même change-set que le bump\n`);
}

if (dryRun) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

// Préflight html-docs: le step convert.mjs s'exécute dans CE run — le kit
// markdown-it doit donc être résolvable depuis le projet AVANT de commencer
// (échec rapide, aucune mutation). La note du plan n'est pas actionnable
// au milieu d'un run non interactif.
if (migrateTarget === 'html-docs') {
  const missingKit = checkMarkdownKit(projectDir);
  if (missingKit.length > 0) {
    process.stderr.write(
      `✗ Kit de migration markdown-it absent du projet (${missingKit.join(', ')}).\n` +
      `  À installer AVANT le run réel (jamais en dépendance permanente):\n` +
      `    cd ${projectDir} && npm i --no-save markdown-it markdown-it-anchor markdown-it-task-lists markdown-it-footnote\n` +
      `  Puis relancer la migration. (Un run --dry-run permet d'inspecter le plan sans ce prérequis.)\n`
    );
    process.exit(2);
  }
}

for (const step of plan) {
  process.stderr.write(`\n→ Step: ${step.title}\n`);
  if (step.action === 'render-file') {
    try {
      const from = path.resolve(SKILL_DIR, step.template);
      const to = path.resolve(projectDir, step.outputPath);
      const result = renderToFile(from, to, step.variables || {}, step.flags || {}, { overwrite: step.overwrite || false });
      if (result.written) {
        report.applied++;
        process.stderr.write(`  ✓ ${step.outputPath}\n`);
      } else {
        process.stderr.write(`  • ${step.outputPath} (${result.reason})\n`);
      }
    } catch (err) {
      report.errors.push({ step: step.title, error: err.message });
      process.stderr.write(`  ✗ ${step.title}: ${err.message}\n`);
    }
  } else if (step.action === 'command') {
    // Exécute un script Node DU PROJET CIBLE — uniquement sous .claude/scripts/ (allowlist).
    const result = runProjectCommand(projectDir, step);
    if (result.output) process.stderr.write(result.output);
    if (result.ok) {
      report.applied++;
      process.stderr.write(`  ✓ ${step.script}\n`);
    } else if (step.bestEffort) {
      process.stderr.write(`  • ${step.script} (non bloquant): ${result.error}\n`);
    } else {
      report.errors.push({ step: step.title, error: result.error });
      process.stderr.write(`  ✗ ${step.title}: ${result.error}\n`);
    }
  } else if (step.action === 'merge-settings-hooks') {
    const result = mergeSettingsHooks(projectDir);
    if (result.ok) {
      report.applied++;
      process.stderr.write(
        result.added.length
          ? `  ✓ hooks câblés dans .claude/settings.json: ${result.added.join(', ')}\n`
          : `  ✓ hooks déjà câblés dans .claude/settings.json\n`
      );
    } else {
      report.errors.push({ step: step.title, error: result.error });
      process.stderr.write(`  ✗ ${step.title}: ${result.error}\n`);
    }
  } else if (step.action === 'merge-npm-scripts') {
    const result = mergeNpmScripts(projectDir);
    if (result.ok) {
      report.applied++;
      process.stderr.write(
        result.ajoutes.length
          ? `  ✓ scripts npm docs ajoutés à package.json: ${result.ajoutes.join(', ')}\n`
          : `  ✓ scripts npm docs déjà présents (ou package.json absent: ${result.raison || 'n/a'})\n`
      );
    } else if (step.bestEffort) {
      process.stderr.write(`  • ${step.title} (non bloquant): ${result.error}\n`);
    } else {
      report.errors.push({ step: step.title, error: result.error });
      process.stderr.write(`  ✗ ${step.title}: ${result.error}\n`);
    }
  } else if (step.action === 'sync-docs-map') {
    const result = syncDocsMap(projectDir, step);
    if (result.ok) {
      report.applied++;
      if (result.created.length) process.stderr.write(`  ✓ dossiers d'artefacts créés (+ .gitkeep): ${result.created.join(', ')}\n`);
      if (result.dropped.length) process.stderr.write(`  ✓ sources de vérité inexistantes retirées du registre: ${result.dropped.join(', ')}\n`);
      if (!result.created.length && !result.dropped.length) process.stderr.write(`  ✓ docs-map.json déjà aligné\n`);
    } else if (step.bestEffort) {
      process.stderr.write(`  • ${step.title} (non bloquant): ${result.error}\n`);
    } else {
      report.errors.push({ step: step.title, error: result.error });
      process.stderr.write(`  ✗ ${step.title}: ${result.error}\n`);
    }
  } else if (step.action === 'wire-husky-parity') {
    const result = wireHuskyParity(projectDir);
    if (result.ok) {
      report.applied++;
      process.stderr.write(
        result.added
          ? `  ✓ .husky/pre-commit câblé → check-runtime-parity.mjs\n`
          : `  ✓ .husky/pre-commit déjà câblé (check-runtime-parity)\n`
      );
    } else if (step.bestEffort) {
      process.stderr.write(`  • ${step.title} (non bloquant): ${result.error}\n`);
    } else {
      report.errors.push({ step: step.title, error: result.error });
      process.stderr.write(`  ✗ ${step.title}: ${result.error}\n`);
    }
  } else if (step.action === 'note') {
    process.stderr.write(`  [note] ${step.message}\n`);
  } else if (step.action === 'manual') {
    process.stderr.write(`  [manual] ${step.message}\n`);
  }
}

// Update state file
// Forward-compat: spread existing state first so any unknown keys
// written by a newer meta-govern version are preserved across migrations.
if (report.errors.length === 0) {
  const newState = {
    ...detection.metaGovernState,
    metaGovernVersion,
    lastAudit: new Date().toISOString().slice(0, 10),
    palier: parseTargetPalier(migrateTarget) ?? currentPalier,
  };
  if (archetype) newState.archetype = archetype;
  if (architecturePattern) newState.architecturePattern = architecturePattern;
  if (migrateTarget === 'html-docs') newState.docsDoctrine = 'html';
  // Leçon 7 (§9): la promotion qui atteint le palier 4 trace la décision CI dans
  // ciPolicy. Le flag --ci-policy l'emporte ; sinon on préserve une décision
  // antérieure ; sinon défaut 'local-compensation' (predeploy-check.mjs installé).
  const targetPalierNum = parseTargetPalier(migrateTarget);
  if (targetPalierNum !== null && currentPalier < 4 && targetPalierNum >= 4) {
    newState.ciPolicy = ciPolicy || detection.metaGovernState?.ciPolicy || 'local-compensation';
  }
  writeMetaGovernState(projectDir, newState);
}

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(report.errors.length > 0 ? 1 : 0);

function readMetaGovernVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'version.json'), 'utf8')).version;
  } catch { return '0.0.0'; }
}

function parseTargetPalier(targetStr) {
  const match = targetStr.match(/^palier-?(\d)$/);
  return match ? parseInt(match[1], 10) : null;
}

function buildMigrationPlan(detection, targetStr, currentVersion, latestVersion) {
  const plan = [];
  const targetPalier = parseTargetPalier(targetStr);

  if (targetPalier !== null) {
    return buildPalierPromotionPlan(detection, detection.palier, targetPalier);
  }

  // Migration doctrine docs HTML: installe le toolkit puis convertit docs/*.md → .html.
  if (targetStr === 'html-docs') {
    return buildHtmlDocsPlan(detection, latestVersion);
  }

  // Version-based migration: read changelog from version.json
  if (targetStr.startsWith('v')) {
    const targetVer = targetStr.slice(1);
    plan.push({
      action: 'note',
      title: `Version migration ${currentVersion} → ${targetVer}`,
      message: `Read ~/.claude/skills/meta-govern/version.json changelog for breaking changes between versions. Apply diffs from changelog.breakingChanges.`,
    });
    return plan;
  }

  return plan;
}

function buildPalierPromotionPlan(detection, currentPalier, targetPalier) {
  const plan = [];
  // Tests co-localisés (L3): un palier qui installe un hook/garde installe aussi
  // son .test.mjs frère — uniquement quand le projet embarque vitest (les tests du
  // canon sont écrits en vitest).
  const hasVitest = detection.stack.testFramework === 'vitest';
  const pm = detection.stack.packageManager || 'npm';
  const pmRunPrefix = pm === 'bun' ? 'bun run' : pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run';
  const variables = {
    PROJECT_NAME: detection.projectName,
    PROJECT_SLUG: detection.projectName,
    PACKAGE_MANAGER: detection.stack.packageManager,
    // predeploy-check.mjs (palier 4) lance cette commande comme moitié « compensation locale ».
    VALIDATE_COMMAND: `${pmRunPrefix} validate`,
    META_GOVERN_VERSION: '1.0.0',
  };
  const flags = {
    // Full computed stack flag set (IF_STACK_REACT / _POWER_PLATFORM / _CONVEX /
    // _TYPESCRIPT / _NO_I18N / …) — mirrors bootstrap-project.mjs's spread so a
    // MIGRATE run resolves the same conditionals a fresh BOOTSTRAP would.
    ...detection.flags,
    IF_STACK_REACT: detection.stack.isReact,
    IF_STACK_HAS_UI: detection.stack.hasUI,
    IF_STACK_HAS_I18N: detection.stack.hasI18n,
    IF_STACK_NO_I18N: !detection.stack.hasI18n,
    IF_STACK_HAS_DATA_LAYER: detection.stack.hasDataLayer,
    IF_PALIER_GTE_2: targetPalier >= 2,
    IF_PALIER_GTE_3: targetPalier >= 3,
    IF_PALIER_GTE_4: targetPalier >= 4,
    IF_PALIER_GTE_5: targetPalier >= 5,
  };

  if (currentPalier >= targetPalier) {
    plan.push({ action: 'note', title: 'No-op', message: `Already at palier ${currentPalier}; target is ${targetPalier}.` });
    return plan;
  }

  for (let p = currentPalier + 1; p <= targetPalier; p++) {
    if (p === 2) {
      plan.push({
        action: 'manual',
        title: 'Palier 2: install spec-tracer + qa-plan skills',
        message: 'These skills are not yet templated by meta-govern v1.0.0. Use skill-creator to scaffold them following Temps Chantier patterns.',
      });
    } else if (p === 3) {
      plan.push({
        action: 'manual',
        title: 'Palier 3: split spec-reviewer agent + add subagent-plan-edit-guard hook',
        message: 'Use create-subagent to scaffold spec-reviewer.md (split from reviewer). Add subagent-plan-edit-guard.mjs hook (modeled from Temps Chantier).',
      });
    } else if (p === 4) {
      // Leçon 7 (v1.15.0): la CI GitHub Actions + branch protection ne sont plus un
      // manquement bloquant mais une OPTION recommandée. La moitié « compensation
      // locale » est posée par défaut ici — predeploy-check.mjs (barrière humaine
      // avant déploiement) — l'autre moitié (gate Stop durci MG_HEADLESS_RUN) étant
      // déjà en place depuis le palier 1. La décision est tracée dans
      // .claude/.meta-govern.json → ciPolicy à la fin du run (défaut local-compensation ;
      // --ci-policy=server-ci pour l'opt-in pipeline serveur).
      const resolvedCi = ciPolicy || 'local-compensation';
      plan.push({
        action: 'render-file',
        title: 'Palier 4: compensation locale — installer predeploy-check.mjs',
        template: 'templates/scripts/predeploy-check.mjs.tpl',
        outputPath: '.claude/scripts/predeploy-check.mjs',
        variables,
        flags,
      });
      plan.push({
        action: 'note',
        title: 'Palier 4: politique CI enregistrée',
        message: `ciPolicy=${resolvedCi} sera écrit dans .claude/.meta-govern.json à la fin du run. Compensation locale = predeploy-check.mjs (à lancer par l'humain avant déploiement) + gate Stop durci (MG_HEADLESS_RUN exige validate sur les runs autonomes). Relancer avec --ci-policy=server-ci pour tracer le choix d'un pipeline serveur.`,
      });
      plan.push({
        action: 'manual',
        title: 'Palier 4 (option recommandée): CI serveur + release-notes',
        message: resolvedCi === 'server-ci'
          ? 'Choix serveur tracé: ajouter .github/workflows/lint-typecheck-test.yml (lint + typecheck + test sur PR) et activer la branch protection (checks requis avant merge). Utiliser skill-creator pour la skill release-notes.'
          : 'Option recommandée (compensée localement, donc non requise): ajouter .github/workflows/lint-typecheck-test.yml + branch protection dès que le projet passe en collaboration multi-dev. Utiliser skill-creator pour la skill release-notes.',
      });
    } else if (p === 5) {
      // Palier 5 (v1.15.0): la parité runtime .claude/ ↔ .agents/ devient OUTILLÉE,
      // et non plus une simple note manuelle. On pose le garde (check-runtime-parity.mjs)
      // + son manifest à `pairs` vide (runtime-parity.json), son test co-localisé
      // quand vitest est présent (L3), et on câble .husky/pre-commit. L'inventaire
      // des paires reste la moitié humaine: le miroir .agents/ n'existe pas encore
      // avant ce palier, donc `diff -rq .claude .agents` se peuple juste après.
      plan.push({
        action: 'render-file',
        title: 'Palier 5: installer le garde de parité runtime (check-runtime-parity.mjs)',
        template: 'templates/scripts/check-runtime-parity.mjs.tpl',
        outputPath: '.claude/scripts/check-runtime-parity.mjs',
        variables,
        flags,
      });
      plan.push({
        action: 'render-file',
        title: 'Palier 5: installer le manifest de parité (runtime-parity.json, pairs vide)',
        template: 'templates/runtime-parity.json.tpl',
        outputPath: '.claude/runtime-parity.json',
        variables,
        flags,
      });
      if (hasVitest) {
        plan.push({
          action: 'render-file',
          title: 'Palier 5: installer le test co-localisé du garde de parité',
          template: 'templates/scripts/check-runtime-parity.test.mjs.tpl',
          outputPath: '.claude/scripts/check-runtime-parity.test.mjs',
          variables,
          flags,
        });
      }
      plan.push({
        action: 'wire-husky-parity',
        title: 'Palier 5: câbler .husky/pre-commit → check-runtime-parity.mjs',
        bestEffort: true,
      });
      plan.push({
        action: 'manual',
        title: 'Palier 5: miroir dual-runtime (.agents/, AGENTS.md) + inventaire des paires',
        message: "Refléter la structure .claude/ dans .agents/ et ajouter AGENTS.md (équivalent Codex de CLAUDE.md). Puis peupler .claude/runtime-parity.json: `diff -rq .claude .agents` liste les paires à déclarer (sync:\"exact\", ou \"documented-divergence\" avec `reason`). Relancer node .claude/scripts/check-runtime-parity.mjs jusqu'au vert.",
      });
    } else if (p === 6) {
      plan.push({
        action: 'manual',
        title: 'Palier 6: backlog automation',
        message: 'Add next-deferred-id.mjs script + backlog-cleanup skill or scheduled task.',
      });
    }
  }

  return plan;
}

// Payload toolkit docs-html — mêmes mappings que buildDefaultPlan de bootstrap-project.mjs.
// (Pas les 6 docs .html.tpl: la migration convertit les docs existants au lieu d'en scaffolder.)
function docsHtmlToolkitFiles() {
  return [
    { from: 'templates/scripts/docs-html/lib/docs-config.mjs.tpl', to: '.claude/scripts/docs-html/lib/docs-config.mjs' },
    { from: 'templates/scripts/docs-html/lib/template.mjs.tpl', to: '.claude/scripts/docs-html/lib/template.mjs' },
    { from: 'templates/scripts/docs-html/lib/doc-types.mjs.tpl', to: '.claude/scripts/docs-html/lib/doc-types.mjs' },
    { from: 'templates/scripts/docs-html/lib/starters.mjs.tpl', to: '.claude/scripts/docs-html/lib/starters.mjs' },
    { from: 'templates/scripts/docs-html/lib/walk.mjs.tpl', to: '.claude/scripts/docs-html/lib/walk.mjs' },
    { from: 'templates/scripts/docs-html/lib/render-md.mjs.tpl', to: '.claude/scripts/docs-html/lib/render-md.mjs' },
    { from: 'templates/scripts/docs-html/scaffold.mjs.tpl', to: '.claude/scripts/docs-html/scaffold.mjs' },
    { from: 'templates/scripts/docs-html/make-index.mjs.tpl', to: '.claude/scripts/docs-html/make-index.mjs' },
    { from: 'templates/scripts/docs-html/no-markdown-guard.mjs.tpl', to: '.claude/scripts/docs-html/no-markdown-guard.mjs' },
    { from: 'templates/scripts/docs-html/inventory.mjs.tpl', to: '.claude/scripts/docs-html/inventory.mjs' },
    { from: 'templates/scripts/docs-html/convert.mjs.tpl', to: '.claude/scripts/docs-html/convert.mjs' },
    { from: 'templates/scripts/docs-html/verify.mjs.tpl', to: '.claude/scripts/docs-html/verify.mjs' },
    { from: 'templates/scripts/docs-html/rewrite-refs.mjs.tpl', to: '.claude/scripts/docs-html/rewrite-refs.mjs' },
    { from: 'templates/scripts/check-docs-map.mjs.tpl', to: '.claude/scripts/check-docs-map.mjs' },
    { from: 'templates/hooks/block-docs-markdown.mjs.tpl', to: '.claude/hooks/block-docs-markdown.mjs' },
    { from: 'templates/hooks/docs-index-refresh.mjs.tpl', to: '.claude/hooks/docs-index-refresh.mjs' },
    { from: 'templates/docs/assets/css/docs-theme.css.tpl', to: 'docs/assets/css/docs-theme.css' },
    { from: 'templates/docs/assets/css/docs-hub.css.tpl', to: 'docs/assets/css/docs-hub.css' },
    { from: 'templates/docs/assets/css/docs-plan.css.tpl', to: 'docs/assets/css/docs-plan.css' },
    { from: 'templates/docs/assets/js/docs-toc.js.tpl', to: 'docs/assets/js/docs-toc.js' },
    { from: 'templates/docs/assets/js/docs-hub.js.tpl', to: 'docs/assets/js/docs-hub.js' },
    { from: 'templates/docs/assets/js/docs-plan.js.tpl', to: 'docs/assets/js/docs-plan.js' },
    { from: 'templates/docs/docs-map.json.tpl', to: 'docs/docs-map.json' },
  ];
}

// Plan séquencé html-docs: (1) toolkit, (2) inventaire, (3) kit markdown-it,
// (4) conversion, (5) gate fidélité, (6) réécriture des refs, (7) garde anti-md,
// (8) hub, (9) vérification manuelle + commit.
function buildHtmlDocsPlan(detection, latestVersion) {
  const projectName = detection.projectName;
  const sot = detection.artifacts.sourceOfTruth;
  const toHtml = (p) => (p ? p.replace(/\.md$/, '.html') : null);
  const variables = {
    PROJECT_NAME: projectName,
    PROJECT_SLUG: projectName,
    LANG: 'fr',
    BRAND_PRIMARY: '#041E3D',
    BRAND_ACCENT: '#E31937',
    THEME_STORAGE_KEY: `${projectName}-docs-theme`,
    DOCS_ROOT: 'docs',
    HUB_TITLE: `Documentation ${projectName}`,
    // Sources de vérité: chemins POST-conversion (.md → .html) pour docs-map.json.
    SPEC_DOC: toHtml(sot.spec) || `docs/${projectName}-spec.html`,
    DATA_MODEL_DOC: toHtml(sot.dataModel) || 'docs/data-model.html',
    CATALOG_DOC: toHtml(sot.catalog) || 'docs/composants/catalogue-composants.html',
    META_GOVERN_VERSION: latestVersion,
    SCAFFOLD_DATE: new Date().toISOString().slice(0, 10),
    PACKAGE_MANAGER: detection.stack.packageManager,
  };

  const plan = [];
  for (const file of docsHtmlToolkitFiles()) {
    plan.push({
      action: 'render-file',
      title: `Installer ${file.to}`,
      template: file.from,
      outputPath: file.to,
      variables,
      flags: {},
    });
  }
  plan.push({
    action: 'merge-settings-hooks',
    title: 'Câbler les hooks docs (block-docs-markdown, docs-index-refresh) dans .claude/settings.json',
  });
  plan.push({
    action: 'merge-npm-scripts',
    title: 'Ajouter les scripts npm docs à package.json (docs-map:check, docs:index, docs:check)',
    bestEffort: true,
  });
  plan.push({
    action: 'command',
    title: 'Inventorier les .md sous docs/',
    script: '.claude/scripts/docs-html/inventory.mjs',
  });
  plan.push({
    action: 'note',
    title: 'Kit de migration markdown-it (temporaire)',
    message: 'Prérequis vérifié au préflight AVANT toute mutation: le kit de conversion doit être installé dans le projet avant le run réel (jamais en dépendance permanente): npm i --no-save markdown-it markdown-it-anchor markdown-it-task-lists markdown-it-footnote',
  });
  plan.push({
    action: 'command',
    title: 'Convertir docs/*.md en HTML',
    script: '.claude/scripts/docs-html/convert.mjs',
  });
  plan.push({
    action: 'command',
    title: 'Gate de fidélité (multiset de mots md ⊆ html)',
    script: '.claude/scripts/docs-html/verify.mjs',
  });
  plan.push({
    action: 'command',
    title: 'Réécrire les références .md → .html (CLAUDE.md, .claude/**)',
    script: '.claude/scripts/docs-html/rewrite-refs.mjs',
  });
  plan.push({
    action: 'command',
    title: 'Garde anti-Markdown (non bloquante ici: échoue tant que les .md sources ne sont pas supprimés — étape suivante)',
    script: '.claude/scripts/docs-html/no-markdown-guard.mjs',
    bestEffort: true,
  });
  plan.push({
    action: 'manual',
    title: 'Supprimer les .md migrés',
    message: "La conversion NE supprime PAS les sources .md (filet de sécurité). Une fois le gate de fidélité 100% PASS: supprimer chaque `source` listée dans .claude/scripts/docs-html/docs-html-manifest.json (ex. git rm docs/...md), puis relancer node .claude/scripts/docs-html/no-markdown-guard.mjs — il doit passer (exit 0).",
  });
  plan.push({
    action: 'command',
    title: 'Générer le hub docs/index.html',
    script: '.claude/scripts/docs-html/make-index.mjs',
  });
  plan.push({
    action: 'sync-docs-map',
    title: "Aligner docs-map.json sur le projet migré (dossiers d'artefacts + sources réelles)",
    docsMapPath: `${variables.DOCS_ROOT}/docs-map.json`,
  });
  plan.push({
    action: 'manual',
    title: 'Vérification finale + commit',
    message: 'Relire docs/docs-map.json (sourcesOfTruth, artifactDirs, conventions — re-déclarer plus tard toute source retirée sous `_absents` après l\'avoir scaffoldée), lancer node .claude/scripts/check-docs-map.mjs (doit passer), puis committer la migration.',
  });
  return plan;
}

// Préflight html-docs: vérifie que le kit markdown-it est résolvable DEPUIS le
// projet cible (résolution Node depuis l'emplacement futur de render-md.mjs —
// couvre node_modules local ET hoisting monorepo). Retourne les paquets manquants.
function checkMarkdownKit(projectDir) {
  const resolveFrom = createRequire(
    path.join(projectDir, '.claude', 'scripts', 'docs-html', 'lib', 'render-md.mjs')
  );
  const missing = [];
  for (const dep of ['markdown-it', 'markdown-it-anchor', 'markdown-it-task-lists', 'markdown-it-footnote']) {
    try {
      resolveFrom.resolve(dep);
    } catch {
      missing.push(dep);
    }
  }
  return missing;
}

// Read-only scan of the project's standing-context files for hardcoded state
// literals that a metaGovernVersion/palier bump will falsify. Reuses the exact
// value-bearing patterns of audit-project.mjs's stale-state detector (v1.9.0), so a
// MIGRATE run warns pre-bump about what an AUDIT would otherwise flag only post-hoc.
// Never edits; fail-soft (missing/unreadable file skipped). A pointer sentence with
// no value (« … lives in .meta-govern.json ») does not match — the patterns require a
// version number / digit.
function scanStaleStateLiterals(projectDir) {
  const patterns = [
    /meta-govern version:\s*([0-9]+\.[0-9]+\.[0-9]+)/i,
    /Current palier:\s*(\d+)/i,
  ];
  const warnings = [];
  for (const rel of ['CLAUDE.md', 'AGENTS.md']) {
    const abs = path.join(projectDir, rel);
    if (!fs.existsSync(abs)) continue;
    let lines;
    try {
      lines = fs.readFileSync(abs, 'utf8').split('\n');
    } catch {
      continue;
    }
    lines.forEach((text, i) => {
      for (const re of patterns) {
        const m = text.match(re);
        if (m) warnings.push({ file: rel, line: i + 1, match: m[0].trim() });
      }
    });
  }
  return warnings;
}

// Câble les 2 hooks docs dans .claude/settings.json du projet — MERGE ADDITIF
// strict: ne touche à AUCUNE entrée existante, ajoute seulement les entrées
// manquantes (même forme canonique que templates/settings.json.tpl). Sans ce
// câblage, les fichiers hooks installés sont inertes (la doctrine exige que les
// .md sous docs/ soient bloqués). Idempotent: détection par basename de commande.
// Parité avec runPostInstall de bootstrap-project.mjs: merge non destructif des
// scripts npm docs dans package.json (clé existante = jamais écrasée).
function mergeNpmScripts(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { ok: true, ajoutes: [], conserves: [], raison: 'package.json absent' };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    const voulus = {
      'docs-map:check': 'node .claude/scripts/check-docs-map.mjs',
      'docs:index': 'node .claude/scripts/docs-html/make-index.mjs',
      'docs:check': 'node .claude/scripts/docs-html/no-markdown-guard.mjs',
    };
    const ajoutes = [];
    const conserves = [];
    for (const [name, cmd] of Object.entries(voulus)) {
      if (Object.prototype.hasOwnProperty.call(pkg.scripts, name)) {
        conserves.push(name);
      } else {
        pkg.scripts[name] = cmd;
        ajoutes.push(name);
      }
    }
    if (ajoutes.length > 0) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
    return { ok: true, ajoutes, conserves };
  } catch (err) {
    return { ok: false, error: `package.json illisible: ${err.message}` };
  }
}

function mergeSettingsHooks(projectDir) {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (err) {
      return { ok: false, error: `.claude/settings.json illisible (JSON invalide): ${err.message} — corriger puis relancer` };
    }
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    return { ok: false, error: '.claude/settings.json inattendu (pas un objet JSON) — câbler les hooks manuellement' };
  }
  if (typeof settings.hooks !== 'object' || settings.hooks === null || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  const wanted = [
    {
      event: 'PreToolUse',
      entry: {
        matcher: 'Write|Edit|MultiEdit',
        hooks: [{ type: 'command', command: 'node .claude/hooks/block-docs-markdown.mjs', timeout: 5 }],
      },
      basename: 'block-docs-markdown.mjs',
    },
    {
      event: 'Stop',
      entry: {
        hooks: [{ type: 'command', command: 'node .claude/hooks/docs-index-refresh.mjs', timeout: 10 }],
      },
      basename: 'docs-index-refresh.mjs',
    },
  ];
  const added = [];
  for (const w of wanted) {
    if (!Array.isArray(settings.hooks[w.event])) settings.hooks[w.event] = [];
    const already = settings.hooks[w.event].some((entry) =>
      (entry?.hooks || []).some((h) => typeof h?.command === 'string' && h.command.includes(w.basename))
    );
    if (already) continue;
    settings.hooks[w.event].push(w.entry);
    added.push(`${w.event} → ${w.basename}`);
  }
  if (added.length > 0) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  }
  return { ok: true, added };
}

// Aligne docs-map.json sur la réalité du projet MIGRÉ (≠ bootstrap, qui scaffolde
// les docs canoniques): (a) crée les artifactDirs déclarés (+ .gitkeep — un dossier
// vide ne survit pas au commit git), (b) retire les sourcesOfTruth dont le fichier
// n'existe pas (la migration convertit l'existant, elle n'invente pas de catalogue) —
// tracées sous la clé `_absents` (ignorée par check-docs-map) pour re-déclaration
// future après scaffold. Sans cet alignement, check-docs-map échoue à coup sûr.
function syncDocsMap(projectDir, step) {
  const mapAbs = path.resolve(projectDir, step.docsMapPath);
  if (!fs.existsSync(mapAbs)) {
    return { ok: false, error: `registre introuvable: ${step.docsMapPath}` };
  }
  let map;
  try {
    map = JSON.parse(fs.readFileSync(mapAbs, 'utf8'));
  } catch (err) {
    return { ok: false, error: `${step.docsMapPath} illisible (JSON invalide): ${err.message}` };
  }
  const created = [];
  for (const [key, rel] of Object.entries(map.artifactDirs || {})) {
    if (key.startsWith('_') || typeof rel !== 'string') continue;
    const abs = path.resolve(projectDir, rel);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
      fs.writeFileSync(path.join(abs, '.gitkeep'), '');
      created.push(rel);
    }
  }
  const dropped = [];
  for (const [key, rel] of Object.entries(map.sourcesOfTruth || {})) {
    if (key.startsWith('_') || typeof rel !== 'string') continue;
    if (!fs.existsSync(path.resolve(projectDir, rel))) {
      delete map.sourcesOfTruth[key];
      dropped.push(`${key} (${rel})`);
    }
  }
  if (dropped.length > 0) {
    map.sourcesOfTruth._absents =
      `Retirés à la migration html-docs (fichiers inexistants): ${dropped.join(', ')}. ` +
      'Scaffolder le doc via node .claude/scripts/docs-html/scaffold.mjs puis le re-déclarer ici.';
  }
  fs.writeFileSync(mapAbs, JSON.stringify(map, null, 2) + '\n', 'utf8');
  return { ok: true, created, dropped };
}

// Câble le garde de parité runtime dans .husky/pre-commit (palier 5) — APPEND
// idempotent d'une ligne, sans jamais réécrire le hook existant ni inventer une
// config husky que le projet n'a pas. Best-effort: l'absence de .husky/pre-commit
// n'est pas une erreur bloquante (le step est marqué bestEffort), on renvoie une
// consigne manuelle. Détection par sous-chaîne du basename (idempotent).
function wireHuskyParity(projectDir) {
  const hookPath = path.join(projectDir, '.husky', 'pre-commit');
  const line = 'node .claude/scripts/check-runtime-parity.mjs';
  try {
    if (!fs.existsSync(hookPath)) {
      return {
        ok: false,
        error: '.husky/pre-commit absent — installer husky puis ajouter `' + line + '` au hook',
      };
    }
    const content = fs.readFileSync(hookPath, 'utf8');
    if (content.includes('check-runtime-parity.mjs')) {
      return { ok: true, added: false };
    }
    const sep = content.length === 0 || content.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(hookPath, content + sep + line + '\n', 'utf8');
    return { ok: true, added: true };
  } catch (err) {
    return { ok: false, error: `.husky/pre-commit non modifiable: ${err.message}` };
  }
}

// Sécurité: n'exécute QUE des scripts du projet cible sous .claude/scripts/
// (allowlist par préfixe de chemin résolu — bloque les traversées ../ et les chemins absolus externes).
function runProjectCommand(projectDir, step) {
  const scriptAbs = path.resolve(projectDir, step.script);
  const allowedPrefix = path.resolve(projectDir, '.claude', 'scripts') + path.sep;
  if (!scriptAbs.startsWith(allowedPrefix)) {
    return { ok: false, error: `commande refusée — ${step.script} n'est pas sous .claude/scripts/ (allowlist)` };
  }
  if (!fs.existsSync(scriptAbs)) {
    return { ok: false, error: `script introuvable: ${scriptAbs}` };
  }
  try {
    const out = execFileSync(process.execPath, [scriptAbs, ...(step.args || [])], {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, output: out };
  } catch (err) {
    const output = [err.stdout, err.stderr].filter(Boolean).join('');
    return { ok: false, error: err.message, output };
  }
}
