#!/usr/bin/env node
// scripts/migrate-project.mjs
// Incremental migration from one meta-govern version to another, OR palier promotion.
//
// Usage:
//   node migrate-project.mjs <project-path> --target=palier-N [--dry-run]
//   node migrate-project.mjs <project-path> --target=v1.1.0 [--dry-run]
//   node migrate-project.mjs <project-path> --target=v1.2.0 --archetype=B --architecture-pattern=framework-native-feature-first
//   node migrate-project.mjs <project-path> --target=html-docs [--dry-run]
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
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') dryRun = true;
  else if (a.startsWith('--target=')) migrateTarget = a.slice('--target='.length);
  else if (a === '--target' && args[i + 1]) migrateTarget = args[++i];
  else if (a.startsWith('--archetype=')) archetype = a.slice('--archetype='.length);
  else if (a === '--archetype' && args[i + 1]) archetype = args[++i];
  else if (a.startsWith('--architecture-pattern=')) architecturePattern = a.slice('--architecture-pattern='.length);
  else if (a === '--architecture-pattern' && args[i + 1]) architecturePattern = args[++i];
  else if (!a.startsWith('--')) target = a;
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
  const variables = {
    PROJECT_NAME: detection.projectName,
    PROJECT_SLUG: detection.projectName,
    PACKAGE_MANAGER: detection.stack.packageManager,
    META_GOVERN_VERSION: '1.0.0',
  };
  const flags = {
    IF_STACK_REACT: detection.stack.isReact,
    IF_STACK_HAS_UI: detection.stack.hasUI,
    IF_STACK_HAS_I18N: detection.stack.hasI18n,
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
      plan.push({
        action: 'manual',
        title: 'Palier 4: add CI workflows + release-notes skill',
        message: 'Add .github/workflows/lint-typecheck-test.yml. Use skill-creator to add release-notes skill.',
      });
    } else if (p === 5) {
      plan.push({
        action: 'manual',
        title: 'Palier 5: dual-runtime adapter (.codex/, AGENTS.md)',
        message: 'Mirror .claude/ structure into .codex/. Add AGENTS.md (Codex equivalent of CLAUDE.md). Add sync-claude-mirrors.mjs script.',
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
