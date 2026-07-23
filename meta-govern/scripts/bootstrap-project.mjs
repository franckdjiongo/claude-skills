#!/usr/bin/env node
// scripts/bootstrap-project.mjs
// Materializes meta-govern templates into a target project.
//
// Usage:
//   node bootstrap-project.mjs <project-path> --plan=<plan-file> [--dry-run] [--overwrite]
//
// The plan file is a JSON document describing what to install:
//   {
//     "variables": { "PROJECT_NAME": "...", ... },
//     "flags": { "IF_STACK_REACT": true, ... },
//     "files": [
//       { "from": "templates/CLAUDE.md.tpl", "to": "CLAUDE.md" },
//       ...
//     ]
//   }
//
// Outputs a structured report of what was written / skipped / would-have-been-written.

import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { renderToFile, renderTemplateFile, detectRenderLeaks } from './lib/template-renderer.mjs';
import { detectProject, writeMetaGovernState } from './lib/project-detection.mjs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const SKILL_DIR = path.dirname(path.dirname(new URL(import.meta.url).pathname));

const args = process.argv.slice(2);
let target = null;
let planFile = null;
let dryRun = false;
let overwrite = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') dryRun = true;
  else if (a === '--overwrite') overwrite = true;
  else if (a.startsWith('--plan=')) planFile = a.slice('--plan='.length);
  else if (a === '--plan' && args[i + 1]) planFile = args[++i];
  else if (!a.startsWith('--')) target = a;
}

if (!target) {
  process.stderr.write(`Usage: bootstrap-project.mjs <project-path> --plan=<plan-file> [--dry-run] [--overwrite]\n`);
  process.exit(2);
}

const projectDir = path.resolve(target);
if (!fs.existsSync(projectDir)) {
  process.stderr.write(`Error: ${projectDir} does not exist.\n`);
  process.exit(2);
}

let plan;
if (planFile) {
  plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
} else {
  // No plan: build a default plan based on detected stack.
  plan = buildDefaultPlan(projectDir);
}

const variables = plan.variables || {};
const flags = plan.flags || {};
const files = plan.files || [];

variables.META_GOVERN_VERSION = readMetaGovernVersion();
variables.SCAFFOLD_DATE = new Date().toISOString().slice(0, 10);
variables.TIMESTAMP = new Date().toISOString();

const report = {
  projectDir,
  dryRun,
  written: [],
  skipped: [],
  errors: [],
  leaks: [],
};

for (const file of files) {
  const from = path.resolve(SKILL_DIR, file.from);
  const to = path.resolve(projectDir, file.to);

  if (!fs.existsSync(from)) {
    report.errors.push({ from: file.from, to: file.to, error: 'template not found' });
    continue;
  }

  try {
    const fileVariables = { ...variables, ...(file.variables || {}) };
    const fileFlags = { ...flags, ...(file.flags || {}) };
    const result = renderToFile(from, to, fileVariables, fileFlags, { overwrite, dryRun });
    if (result.written) {
      report.written.push({ from: file.from, to: file.to, bytes: result.content.length });
    } else {
      report.skipped.push({ from: file.from, to: file.to, reason: result.reason });
    }
    // Post-render leak detection — surface template-variable leaks, unstripped
    // conditionals, missing variables, and frontmatter-not-at-line-1 issues at
    // scaffold time so the architect's intent is honored end-to-end.
    if (result.content) {
      const findings = detectRenderLeaks(result.content, { targetPath: to });
      if (findings.length > 0) {
        report.leaks.push({ to: file.to, findings });
      }
    }
  } catch (err) {
    report.errors.push({ from: file.from, to: file.to, error: err.message });
  }
}

// Update or create .claude/.meta-govern.json state file.
// Forward-compat: spread any existing state first to preserve unknown keys
// written by a newer meta-govern version. Only override known keys.
if (!dryRun) {
  const detection = detectProject(projectDir);
  const state = {
    ...(detection.metaGovernState || {}),
    metaGovernVersion: variables.META_GOVERN_VERSION,
    palier: detection.palier === 0 ? 1 : detection.palier,
    lastAudit: variables.SCAFFOLD_DATE,
    lastBootstrap: variables.SCAFFOLD_DATE,
    stack: detection.stack.framework || 'unknown',
    archetype: variables.ARCHETYPE ?? detection.metaGovernState?.archetype ?? null,
    architecturePattern: variables.ARCHITECTURE_PATTERN ?? detection.metaGovernState?.architecturePattern ?? null,
    dddScore: variables.DDD_SCORE ?? null,
    dddDecision: variables.DDD_DECISION ?? null,
    indicators: detection.indicators,
  };
  writeMetaGovernState(projectDir, state);

  // Post-install (best-effort, jamais en dry-run, jamais sur rendu en erreur):
  //   1. additionalSteps du plan (package-json-script + gitignore-add) — appliqués
  //      ICI de façon déterministe (l'agent scaffolder n'a plus à s'en souvenir).
  //   2. docs-html: scripts npm gouvernance + docs + dossiers d'artefacts + hub.
  //   3. payload lint-ignore JS/TS (.prettierignore + global-ignores eslint).
  // Ordre: additionalSteps AVANT runPostInstall pour que les valeurs explicites
  // de l'architect (ex. validate stack-spécifique) priment sur les défauts génériques.
  if (report.errors.length === 0) {
    report.additionalSteps = applyAdditionalSteps(projectDir, plan);
    report.postInstall = runPostInstall(projectDir, variables, detection);
    report.lintIgnores = applyLintIgnorePayload(projectDir, detection);
  } else {
    report.additionalSteps = { skipped: true, raison: 'erreurs de rendu' };
    report.postInstall = { skipped: true, raison: 'erreurs de rendu — post-install non exécuté' };
    report.lintIgnores = { skipped: true, raison: 'erreurs de rendu' };
  }
}

process.stdout.write(JSON.stringify(report, null, 2) + '\n');

// Surface render leaks loudly on stderr so they're visible even when stdout is
// captured. CRITICAL/HIGH leaks fail the run; MEDIUM leaks warn but pass.
const allFindings = report.leaks.flatMap(l => l.findings.map(f => ({ ...f, to: l.to })));
const blockingLeaks = allFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
const warningLeaks = allFindings.filter(f => f.severity === 'MEDIUM');
if (blockingLeaks.length > 0) {
  process.stderr.write(`\n⚠ ${blockingLeaks.length} blocking render leak(s) detected:\n`);
  for (const f of blockingLeaks) {
    process.stderr.write(`  [${f.severity}] ${f.to}${f.line ? ':' + f.line : ''} — ${f.message}\n`);
  }
}
if (warningLeaks.length > 0) {
  process.stderr.write(`\n⚠ ${warningLeaks.length} render warning(s) (non-blocking):\n`);
  for (const f of warningLeaks) {
    process.stderr.write(`  [${f.severity}] ${f.to}${f.line ? ':' + f.line : ''} — ${f.message}\n`);
  }
}

const hasBlockingIssues = report.errors.length > 0 || blockingLeaks.length > 0;
process.exit(hasBlockingIssues ? 1 : 0);

function readMetaGovernVersion() {
  try {
    const ver = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'version.json'), 'utf8'));
    return ver.version;
  } catch {
    return '0.0.0';
  }
}

function buildDefaultPlan(projectDir) {
  // Default palier-1 plan: full BOOTSTRAP scaffold.
  // Caller (architect agent) provides a richer plan with stack-specific variables.
  // This default is what runs when invoked without --plan; produces a working baseline.
  const projectName = path.basename(projectDir);
  // Détection légère pour les choix conditionnels (ex. la règle ui-components Svelte).
  const detection = detectProject(projectDir);
  const isSvelteKit = !!detection.stack.isSvelteKit;
  // Le harnais de test des hooks + les tests co-localisés (et l'extension du glob
  // vitest en post-install) ne sont posés que si le projet a déjà vitest — sur un
  // projet sans runner JS ils seraient des fichiers morts.
  const hasVitest = detection.stack.testFramework === 'vitest';
  // ui-components: variante Svelte (paths *.svelte, Paraglide, runes) pour SvelteKit ;
  // sinon la variante React-shaped par défaut.
  const uiComponentsTpl = isSvelteKit
    ? 'templates/rules/ui-components.svelte.md.tpl'
    : 'templates/rules/ui-components.md.tpl';
  return {
    variables: {
      PROJECT_NAME: projectName,
      PROJECT_SLUG: projectName,
      PROJECT_DESCRIPTION: '(fill me — one paragraph)',
      PROJECT_SUMMARY: '(fill me — one paragraph)',
      STACK_NAME: detection.stack.framework || 'unknown',
      STACK_SUMMARY: '(fill me — one sentence: framework + runtime + package manager)',
      PACKAGE_MANAGER: detection.stack.packageManager || 'npm',
      TEST_FRAMEWORK: 'Vitest',
      COMMAND_DEV: `${pmRun(detection.stack.packageManager)} dev`,
      COMMAND_VALIDATE: `${pmRun(detection.stack.packageManager)} validate`,
      COMMAND_QUALITY: `${pmRun(detection.stack.packageManager)} quality:check`,
      VALIDATE_COMMAND: `${pmRun(detection.stack.packageManager)} validate`,
      SPEC_DOC: `docs/${projectName}-spec.html`,
      DATA_MODEL_DOC: 'docs/data-model.html',
      CATALOG_DOC: 'docs/composants/catalogue-composants.html',
      // Doctrine docs HTML — paramètres du toolkit docs-html (surchargeables à l'interview)
      LANG: 'fr',
      BRAND_PRIMARY: '#041E3D',
      BRAND_ACCENT: '#E31937',
      THEME_STORAGE_KEY: `${projectName}-docs-theme`,
      DOCS_ROOT: 'docs',
      HUB_TITLE: `Documentation ${projectName}`,
      NON_NEGOTIABLE_RULES: '(fill me — 5-10 bullets)',
      ROUTING_RULES: '(fill me — path-scoped routing entries)',
      POST_COMPACT_INSTRUCTIONS: '',
      CURRENT_PALIER: '1',
      CURRENT_PALIER_PLUS_1: '2',
      NEXT_PALIER_TRIGGER: '≥30 FUNC IDs OR ≥10 components',
      NEXT_PALIER_TRIGGERS: '- ≥30 FUNC IDs in spec\n- OR ≥10 C-XX components\n- OR live users in production',
      DDD_SCORE: 0,
      DDD_DECISION: 'TRANSACTION_SCRIPT',
      ERROR_CLASS: 'AppError',
      FILE_SIZE_CAP: '300',
      SIZE_ALLOWLIST: '[]',
      SOURCE_GLOB: 'src/**/*.{ts,tsx,js,jsx}',
      DATA_LAYER_GLOB: 'src/**/data-layer/**',
      DATA_LAYER_DIR: 'src/data-layer',
      COMPONENT_DIR: 'src/components',
      LANGUAGE_PRIMARY: 'EN',
      LANGUAGE_SECONDARY: '',
      // HANDOFF.md placeholders (filled at runtime by precompact-handoff hook)
      BRANCH: '(filled by precompact hook)',
      MODIFIED_FILES: '(filled by precompact hook)',
      ACTIVE_PLANS: '(filled by precompact hook)',
      LATEST_DESIGN: '(filled by precompact hook)',
      TRIGGER_REASON: '(filled by precompact hook)',
      // Governance-baseline placeholders for additional sections
      ADDITIONAL_SKILLS: '',
      ADDITIONAL_AGENTS: '',
      ADDITIONAL_HOOKS: '',
      ADDITIONAL_RULES: '',
      ADDITIONAL_SCRIPTS: '',
      ADDITIONAL_DOCS: '',
      IF_HAS_UI: '',
      IF_HAS_BACKEND: '',
    },
    flags: {
      // Full computed stack flag set (IF_STACK_REACT / _POWER_PLATFORM / _CONVEX /
      // _CLOUDFLARE / _HAS_DATA_LAYER / _HAS_BACKEND / …). Without this spread the
      // stack-conditionals that templates already reference resolved silently false.
      ...detection.flags,
      IF_STACK_HAS_UI: !!detection.stack.hasUI,
      IF_STACK_SVELTEKIT: isSvelteKit,
      IF_STACK_HAS_I18N: !!detection.stack.hasI18n,
      // Explicit negation so a no-i18n project gets the affirmative "plain JSX
      // strings" guidance instead of a silent hole (the renderer has no {{ELSE}}).
      IF_STACK_NO_I18N: !detection.stack.hasI18n,
      IF_BILINGUAL: false,
      IF_PALIER_GTE_2: false,
      IF_PALIER_GTE_3: false,
    },
    files: [
      // Top-level
      { from: 'templates/CLAUDE.md.tpl', to: 'CLAUDE.md' },
      { from: 'templates/settings.json.tpl', to: '.claude/settings.json' },
      { from: 'templates/HANDOFF.md.tpl', to: 'HANDOFF.md' },

      // Source-of-truth docs HTML (squelettes; remplis via source-of-truth-scaffolder agent)
      { from: 'templates/docs/spec.html.tpl', to: `docs/${projectName}-spec.html` },
      { from: 'templates/docs/data-model.html.tpl', to: 'docs/data-model.html' },
      { from: 'templates/docs/catalogue-composants.html.tpl', to: 'docs/composants/catalogue-composants.html' },
      // Variables file-level (et non plan.variables) : ARCHETYPE/ARCHITECTURE_PATTERN
      // sont aussi lues par l'écriture de .meta-govern.json — des défauts globaux
      // écraseraient l'état détecté lors d'un re-bootstrap.
      {
        from: 'templates/docs/architecture.html.tpl',
        to: 'docs/architecture.html',
        variables: {
          RUNTIME: '(à compléter — ex. Node.js 22)',
          ARCHETYPE: '(à déterminer — interview bootstrap)',
          ARCHITECTURE_PATTERN: '(à déterminer — interview bootstrap)',
        },
      },
      { from: 'templates/docs/agent-playbook.html.tpl', to: 'docs/agent-playbook.html' },
      // Le gabarit ADR installé est un modèle à copier : placeholders lisibles,
      // un agent rend le .tpl avec les vraies valeurs au moment de créer un ADR.
      {
        from: 'templates/docs/decisions/ADR-template.html.tpl',
        to: 'docs/decisions/ADR-template.html',
        variables: {
          ADR_NUMBER: 'NNNN',
          ADR_TITLE: '(titre de la décision)',
          STATUS: 'proposed',
          DATE: 'AAAA-MM-JJ',
        },
      },

      // 8 path-scoped rules
      { from: 'templates/rules/clean-code.md.tpl', to: '.claude/rules/clean-code.md' },
      { from: 'templates/rules/file-size-budget.md.tpl', to: '.claude/rules/file-size-budget.md' },
      { from: uiComponentsTpl, to: '.claude/rules/ui-components.md' },
      { from: 'templates/rules/data-layer.md.tpl', to: '.claude/rules/data-layer.md' },
      { from: 'templates/rules/testing.md.tpl', to: '.claude/rules/testing.md' },
      { from: 'templates/rules/spec-protocol.md.tpl', to: '.claude/rules/spec-protocol.md' },
      { from: 'templates/rules/parallel-dispatch.md.tpl', to: '.claude/rules/parallel-dispatch.md' },
      { from: 'templates/rules/claude-config-style.md.tpl', to: '.claude/rules/claude-config-style.md' },

      // 6 core skills (each with SKILL.md inside its folder)
      { from: 'templates/skills/brainstorm.SKILL.md.tpl', to: '.claude/skills/brainstorm/SKILL.md' },
      { from: 'templates/skills/write-plan.SKILL.md.tpl', to: '.claude/skills/write-plan/SKILL.md' },
      { from: 'templates/skills/execute-plan.SKILL.md.tpl', to: '.claude/skills/execute-plan/SKILL.md' },
      { from: 'templates/skills/quality-gate.SKILL.md.tpl', to: '.claude/skills/quality-gate/SKILL.md' },
      { from: 'templates/skills/govern-claude.SKILL.md.tpl', to: '.claude/skills/govern-claude/SKILL.md' },
      { from: 'templates/skills/test-driven-development.SKILL.md.tpl', to: '.claude/skills/test-driven-development/SKILL.md' },

      // 6 project-level agents
      { from: 'templates/agents/implementer.md.tpl', to: '.claude/agents/implementer.md' },
      { from: 'templates/agents/ui-implementer.md.tpl', to: '.claude/agents/ui-implementer.md' },
      { from: 'templates/agents/spec-reviewer.md.tpl', to: '.claude/agents/spec-reviewer.md' },
      { from: 'templates/agents/code-quality-reviewer.md.tpl', to: '.claude/agents/code-quality-reviewer.md' },
      { from: 'templates/agents/persona-simulator.md.tpl', to: '.claude/agents/persona-simulator.md' },
      { from: 'templates/agents/codebase-reality-check.md.tpl', to: '.claude/agents/codebase-reality-check.md' },

      // 5 hooks + lib
      { from: 'templates/hooks/lib/hook-utils.mjs.tpl', to: '.claude/hooks/lib/hook-utils.mjs' },
      { from: 'templates/hooks/track-workflow.mjs.tpl', to: '.claude/hooks/track-workflow.mjs' },
      { from: 'templates/hooks/enforce-workflow.mjs.tpl', to: '.claude/hooks/enforce-workflow.mjs' },
      { from: 'templates/hooks/precompact-handoff.mjs.tpl', to: '.claude/hooks/precompact-handoff.mjs' },
      { from: 'templates/hooks/postcompact-reinject.mjs.tpl', to: '.claude/hooks/postcompact-reinject.mjs' },
      { from: 'templates/hooks/session-start-env-check.mjs.tpl', to: '.claude/hooks/session-start-env-check.mjs' },

      // bash-write-guard : couvre l'angle mort des écritures par le shell
      // (`cat > docs/x.md`, `sed -i … src/app.ts`, `git add -A`) que block-docs-markdown
      // ne voit pas. Câblé en PreToolUse Bash dans settings.json.tpl — TOUJOURS posé.
      { from: 'templates/hooks/bash-write-guard.mjs.tpl', to: '.claude/hooks/bash-write-guard.mjs' },
      { from: 'templates/hooks/lib/bash-write-detect.mjs.tpl', to: '.claude/hooks/lib/bash-write-detect.mjs' },

      // Harnais + tests de hooks : l'infra de vérification est du code de production,
      // donc elle se teste. Posés seulement si le projet a vitest (sinon fichiers morts).
      ...(hasVitest
        ? [
            { from: 'templates/hooks/lib/hook-test-util.mjs.tpl', to: '.claude/hooks/lib/hook-test-util.mjs' },
            { from: 'templates/hooks/hooks-inventory.test.mjs.tpl', to: '.claude/hooks/hooks-inventory.test.mjs' },
            { from: 'templates/hooks/block-docs-markdown.test.mjs.tpl', to: '.claude/hooks/block-docs-markdown.test.mjs' },
            { from: 'templates/hooks/enforce-workflow.test.mjs.tpl', to: '.claude/hooks/enforce-workflow.test.mjs' },
            { from: 'templates/hooks/bash-write-guard.test.mjs.tpl', to: '.claude/hooks/bash-write-guard.test.mjs' },
          ]
        : []),

      // Scripts
      { from: 'templates/scripts/file-size-growth-guard.mjs.tpl', to: '.claude/scripts/file-size-growth-guard.mjs' },
      { from: 'templates/scripts/mark-validate-pass.mjs.tpl', to: '.claude/scripts/mark-validate-pass.mjs' },
      { from: 'templates/scripts/setup-worktree.mjs.tpl', to: '.claude/scripts/setup-worktree.mjs' },
      // diff-coverage : mesure le % de lignes AJOUTÉES/MODIFIÉES couvertes par les
      // tests (câblé dans la chaîne validate, avant mark-validate-pass ; fail-soft
      // sans coverage). sample-review + loop-sla + predeploy-check = outillage humain
      // (revue pondérée par risque, signaux SLA de loop, barrière pré-déploiement).
      { from: 'templates/scripts/diff-coverage.mjs.tpl', to: '.claude/scripts/diff-coverage.mjs' },
      { from: 'templates/scripts/sample-review.mjs.tpl', to: '.claude/scripts/sample-review.mjs' },
      { from: 'templates/scripts/loop-sla.mjs.tpl', to: '.claude/scripts/loop-sla.mjs' },
      { from: 'templates/scripts/predeploy-check.mjs.tpl', to: '.claude/scripts/predeploy-check.mjs' },
      // Tiers de risque (racine .claude/) : consommés par sample-review et par
      // write-plan/execute-plan (plancher de tier déterministe).
      { from: 'templates/risk-tiers.json.tpl', to: '.claude/risk-tiers.json' },
      { from: 'templates/scripts/quality-checks/index.mjs.tpl', to: '.claude/scripts/quality-checks/index.mjs' },
      { from: 'templates/scripts/quality-checks/lib.mjs.tpl', to: '.claude/scripts/quality-checks/lib.mjs' },
      { from: 'templates/scripts/quality-checks/format.mjs.tpl', to: '.claude/scripts/quality-checks/format.mjs' },
      { from: 'templates/scripts/quality-checks/checks.mjs.tpl', to: '.claude/scripts/quality-checks/checks.mjs' },
      { from: 'templates/scripts/quality-checks/checks/style.mjs.tpl', to: '.claude/scripts/quality-checks/checks/style.mjs' },
      { from: 'templates/scripts/quality-checks/checks/code.mjs.tpl', to: '.claude/scripts/quality-checks/checks/code.mjs' },
      { from: 'templates/scripts/quality-checks/checks/quality.mjs.tpl', to: '.claude/scripts/quality-checks/checks/quality.mjs' },

      // Payload docs-html (toolkit + registry + hooks + assets) — doctrine docs humains = HTML
      ...docsHtmlToolkitFiles(),

      // Project-level govern-claude baseline (the diff target)
      { from: 'templates/governance-baseline.md.tpl', to: '.claude/skills/govern-claude/references/baseline.md' },
    ],
    additionalSteps: [
      {
        type: 'gitignore-add',
        lines: [
          '.claude/settings.local.json',
          '.claude/tmp/',
          '.claude/.worktrees/',
          'HANDOFF.md',
        ],
      },
    ],
  };
}

// Payload docs-html complet: toolkit + lib (rendus depuis templates/scripts/docs-html/**),
// check-docs-map, 2 hooks, assets css/js, registre docs-map.json.
// Mappings partagés par contrat avec migrate-project.mjs --target=html-docs.
function docsHtmlToolkitFiles() {
  return [
    // Toolkit .claude/scripts/docs-html/ (+ lib/)
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
    // Validateur du registre
    { from: 'templates/scripts/check-docs-map.mjs.tpl', to: '.claude/scripts/check-docs-map.mjs' },
    // 2 hooks docs
    { from: 'templates/hooks/block-docs-markdown.mjs.tpl', to: '.claude/hooks/block-docs-markdown.mjs' },
    { from: 'templates/hooks/docs-index-refresh.mjs.tpl', to: '.claude/hooks/docs-index-refresh.mjs' },
    // Assets premium (css/js)
    { from: 'templates/docs/assets/css/docs-theme.css.tpl', to: 'docs/assets/css/docs-theme.css' },
    { from: 'templates/docs/assets/css/docs-hub.css.tpl', to: 'docs/assets/css/docs-hub.css' },
    { from: 'templates/docs/assets/css/docs-plan.css.tpl', to: 'docs/assets/css/docs-plan.css' },
    { from: 'templates/docs/assets/js/docs-toc.js.tpl', to: 'docs/assets/js/docs-toc.js' },
    { from: 'templates/docs/assets/js/docs-hub.js.tpl', to: 'docs/assets/js/docs-hub.js' },
    { from: 'templates/docs/assets/js/docs-plan.js.tpl', to: 'docs/assets/js/docs-plan.js' },
    // Registre canonique des docs
    { from: 'templates/docs/docs-map.json.tpl', to: 'docs/docs-map.json' },
  ];
}

// Post-install docs-html, exécuté après un rendu réussi (jamais en dry-run):
// (a) merge non destructif des scripts npm dans package.json du projet
//     (dont test:coverage + diff-coverage, et diff-coverage câblé dans validate),
// (b) création des dossiers d'artefacts déclarés dans docs-map.json
//     (check-docs-map exige leur existence — exit 1 sinon),
// (c) génération du hub docs/index.html (best-effort),
// (d) extension add-if-vitest du glob include de la config vitest vers les tests
//     de hooks/scripts co-localisés sous .claude/ (idempotent),
// (e) résultat consigné dans le rapport.
function runPostInstall(projectDir, variables = {}, detection = null) {
  const post = { npmScripts: null, artifactDirs: null, makeIndex: null, vitestInclude: null };

  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    post.npmScripts = { merged: false, raison: 'package.json absent — scripts npm non ajoutés' };
  } else {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.scripts = pkg.scripts || {};
      const pm = variables.PACKAGE_MANAGER || detection?.stack?.packageManager || 'npm';
      const run = pmRun(pm);
      const testFw = detection?.stack?.testFramework;
      const testCmd = testFw === 'vitest' ? 'vitest run'
        : testFw === 'jest' ? 'jest'
        : testFw === 'mocha' ? 'mocha'
        : 'echo "(no unit tests yet)" && exit 0';
      // Variante coverage: alimente coverage/coverage-final.json (istanbul JSON) que
      // diff-coverage lit. Mocha n'émet pas ce format sans nyc → on retombe sur un
      // no-op explicite plutôt que d'inventer une commande qui échouerait.
      const testCovCmd = testFw === 'vitest' ? 'vitest run --coverage'
        : testFw === 'jest' ? 'jest --coverage'
        : 'echo "(no coverage configured)" && exit 0';
      // TS projects get a standalone `typecheck` script (`tsc --noEmit`) so the
      // governance docs that tell agents to run `<pm> run typecheck` resolve, and
      // so `validate` type-checks. Folded into the validate chain below for TS.
      const hasTs = !!detection?.stack?.languages?.includes?.('typescript');
      // Tous ajoutés en « add-if-missing » (jamais d'écrasement). Les scripts de
      // gouvernance sont référencés par CLAUDE.md (COMMAND_VALIDATE/QUALITY) et par
      // les hooks ; quality:check + size-guard pointent vers des scripts que le
      // bootstrap installe toujours. validate/validate:fast/test ne sont posés que
      // si l'architect ne les a pas déjà fournis via additionalSteps (appliqués avant).
      const voulus = {
        'quality:check': 'node .claude/scripts/quality-checks/index.mjs',
        'quality:check:staged': 'node .claude/scripts/quality-checks/index.mjs --scope staged --fail-level high',
        'size-guard': 'node .claude/scripts/file-size-growth-guard.mjs',
        ...(hasTs ? { 'typecheck': 'tsc --noEmit' } : {}),
        'test': testCmd,
        'test:coverage': testCovCmd,
        // diff-coverage seul lit le coverage déjà produit ; le script `diff-coverage`
        // enchaîne coverage + mesure pour un run humain/agent à la demande.
        'diff-coverage': `${run} test:coverage && node .claude/scripts/diff-coverage.mjs`,
        // mark-validate-pass.mjs is the FINAL `&&` step: it writes the success
        // sentinel (.claude/tmp/last-validate-ok) only when every prior gate
        // passed. track-workflow keys the Stop-gate off that sentinel's mtime, so
        // a failed/masked validate never advances the gate (PostToolUse exposes no
        // exit code — command text alone cannot prove the gate passed).
        // diff-coverage tourne juste avant le sceau : sur un nouveau bootstrap sans
        // coverage il fait fail-soft (exit 0, « skipped »), donc validate reste vert
        // tant que la couverture n'est pas branchée ; il mord dès qu'elle l'est.
        'validate': `${run} quality:check && ${run} size-guard${hasTs ? ` && ${run} typecheck` : ''} && ${run} test && node .claude/scripts/diff-coverage.mjs && node .claude/scripts/mark-validate-pass.mjs`,
        'validate:fast': `${run} quality:check${hasTs ? ` && ${run} typecheck` : ''}`,
        'docs-map:check': 'node .claude/scripts/check-docs-map.mjs',
        'docs:index': 'node .claude/scripts/docs-html/make-index.mjs',
        'docs:check': 'node .claude/scripts/docs-html/no-markdown-guard.mjs',
      };
      const ajoutes = [];
      const conserves = [];
      for (const [name, cmd] of Object.entries(voulus)) {
        if (Object.prototype.hasOwnProperty.call(pkg.scripts, name)) {
          conserves.push(name); // clé existante — jamais écrasée
        } else {
          pkg.scripts[name] = cmd;
          ajoutes.push(name);
        }
      }
      if (ajoutes.length > 0) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      }
      post.npmScripts = { merged: true, ajoutes, conserves };
    } catch (err) {
      post.npmScripts = { merged: false, raison: `package.json illisible: ${err.message}` };
    }
  }

  // Dossiers d'artefacts (docs-map.json artifactDirs) — check-docs-map (règle 2)
  // exige des dossiers existants; on les crée avec un .gitkeep pour qu'ils
  // survivent au commit. Best-effort: jamais bloquant.
  const docsRoot = variables.DOCS_ROOT || 'docs';
  const mapPath = path.join(projectDir, docsRoot, 'docs-map.json');
  if (!fs.existsSync(mapPath)) {
    post.artifactDirs = { ok: false, raison: `${docsRoot}/docs-map.json absent — dossiers d'artefacts non créés` };
  } else {
    try {
      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      const crees = [];
      for (const [key, rel] of Object.entries(map.artifactDirs || {})) {
        if (key.startsWith('_')) continue;
        const abs = path.join(projectDir, rel);
        if (!fs.existsSync(abs)) {
          fs.mkdirSync(abs, { recursive: true });
          fs.writeFileSync(path.join(abs, '.gitkeep'), '');
          crees.push(rel);
        }
      }
      post.artifactDirs = { ok: true, crees };
    } catch (err) {
      post.artifactDirs = { ok: false, raison: `docs-map.json illisible: ${err.message}` };
    }
  }

  const makeIndex = path.join(projectDir, '.claude/scripts/docs-html/make-index.mjs');
  if (!fs.existsSync(makeIndex)) {
    post.makeIndex = { ok: false, raison: 'make-index.mjs absent du projet — hub non généré' };
  } else {
    try {
      execFileSync(process.execPath, [makeIndex], { cwd: projectDir, stdio: 'pipe' });
      post.makeIndex = { ok: true, message: 'docs/index.html généré' };
    } catch (err) {
      post.makeIndex = { ok: false, raison: `make-index a échoué (best-effort): ${err.message}` };
    }
  }

  // Glob vitest : les tests de hooks/scripts vivent sous .claude/, hors du glob
  // include restreint que certains projets posent (ex. include: ['src/**']). On y
  // ajoute les deux patterns .claude/**/*.test.mjs quand — et seulement quand — un
  // include explicite existe (sans include, le défaut vitest les capte déjà).
  post.vitestInclude = augmentVitestInclude(projectDir, detection);

  return post;
}

// Étend l'`include` de la config vitest/vite vers les tests co-localisés sous
// .claude/ (hooks + scripts). add-if-vitest + idempotent + best-effort : sans
// vitest, sans config, ou sans include explicite → no-op documenté (le motif par
// défaut de vitest, **/*.test.mjs, couvre déjà nos tests). N'écrit que pour
// combler un include restreint, jamais pour créer de config.
function augmentVitestInclude(projectDir, detection) {
  if (detection?.stack?.testFramework !== 'vitest') {
    return { applied: false, raison: 'vitest non détecté — tests de hooks non posés' };
  }
  const cfgPath = findVitestConfig(projectDir);
  if (!cfgPath) {
    return { applied: false, raison: 'aucune config vitest/vite — include par défaut couvre déjà .claude/**/*.test.mjs' };
  }
  let src;
  try {
    src = fs.readFileSync(cfgPath, 'utf8');
  } catch (err) {
    return { applied: false, raison: `config illisible: ${err.message}`, file: path.basename(cfgPath) };
  }
  const globs = ['.claude/hooks/**/*.test.mjs', '.claude/scripts/**/*.test.mjs'];
  const missing = globs.filter((g) => !src.includes(g));
  if (missing.length === 0) {
    return { applied: false, raison: 'déjà présent', file: path.basename(cfgPath) };
  }
  // On n'augmente qu'un `include: [...]` EXPLICITE situé dans un bloc `test: {`
  // (évite de toucher un include de build dans un vite.config). Sans bloc/include,
  // le défaut vitest suffit → on ne crée rien.
  const testBlock = /\btest\s*:\s*\{/.exec(src);
  if (!testBlock) {
    return { applied: false, raison: 'pas de bloc test: — défaut vitest couvre déjà .claude/**/*.test.mjs', file: path.basename(cfgPath) };
  }
  const after = src.slice(testBlock.index);
  const inc = /include\s*:\s*\[/.exec(after);
  if (!inc) {
    return { applied: false, raison: "pas d'include explicite dans test: — défaut vitest suffit", file: path.basename(cfgPath) };
  }
  const q = detectQuote(src);
  const insertAt = testBlock.index + inc.index + inc[0].length;
  const addition = missing.map((g) => `${q}${g}${q}, `).join('');
  const out = src.slice(0, insertAt) + addition + src.slice(insertAt);
  try {
    fs.writeFileSync(cfgPath, out);
  } catch (err) {
    return { applied: false, raison: `écriture impossible: ${err.message}`, file: path.basename(cfgPath) };
  }
  return { applied: true, added: missing, file: path.basename(cfgPath) };
}

// Premier fichier de config vitest/vite trouvé (vitest.config prioritaire).
function findVitestConfig(projectDir) {
  const names = [
    'vitest.config.ts', 'vitest.config.mts', 'vitest.config.cts',
    'vitest.config.js', 'vitest.config.mjs', 'vitest.config.cjs',
    'vite.config.ts', 'vite.config.mts', 'vite.config.cts',
    'vite.config.js', 'vite.config.mjs', 'vite.config.cjs',
  ];
  for (const n of names) {
    const p = path.join(projectDir, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Préfixe d'exécution de script npm selon le gestionnaire de paquets détecté.
function pmRun(pm) {
  if (pm === 'bun') return 'bun run';
  if (pm === 'pnpm') return 'pnpm';
  if (pm === 'yarn') return 'yarn';
  return 'npm run';
}

// Applique les additionalSteps du plan que bootstrap-project.mjs sait exécuter
// de façon déterministe: package-json-script (clé ajoutée si absente) et
// gitignore-add (lignes appendées si absentes). Les autres types (husky-pre-commit,
// manual-merge…) restent à la charge de l'agent scaffolder.
function applyAdditionalSteps(projectDir, plan) {
  const steps = Array.isArray(plan.additionalSteps) ? plan.additionalSteps : [];
  const result = { packageJsonScripts: [], gitignore: [], skipped: [] };
  if (steps.length === 0) return result;

  const scriptSteps = steps.filter(s => s && s.type === 'package-json-script' && s.key);
  if (scriptSteps.length > 0) {
    const pkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      result.skipped.push({ type: 'package-json-script', raison: 'package.json absent' });
    } else {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.scripts = pkg.scripts || {};
        let changed = false;
        for (const s of scriptSteps) {
          if (Object.prototype.hasOwnProperty.call(pkg.scripts, s.key)) {
            result.skipped.push({ type: 'package-json-script', key: s.key, raison: 'clé existante' });
          } else {
            pkg.scripts[s.key] = String(s.value ?? '');
            result.packageJsonScripts.push(s.key);
            changed = true;
          }
        }
        if (changed) fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      } catch (err) {
        result.skipped.push({ type: 'package-json-script', raison: `package.json illisible: ${err.message}` });
      }
    }
  }

  const gitignoreSteps = steps.filter(s => s && s.type === 'gitignore-add' && Array.isArray(s.lines));
  if (gitignoreSteps.length > 0) {
    const lines = gitignoreSteps.flatMap(s => s.lines).filter(Boolean);
    result.gitignore = ensureGitignoreLines(projectDir, lines, '# meta-govern');
  }
  return result;
}

// Append des lignes manquantes à .gitignore (créé si absent). Idempotent.
function ensureGitignoreLines(projectDir, lines, header) {
  const giPath = path.join(projectDir, '.gitignore');
  let existing = '';
  try { existing = fs.readFileSync(giPath, 'utf8'); } catch { /* absent → créé */ }
  const present = new Set(existing.split(/\r?\n/).map(l => l.trim()));
  const toAdd = lines.filter(l => !present.has(l.trim()));
  if (toAdd.length === 0) return [];
  let block = '';
  if (existing && !existing.endsWith('\n')) block += '\n';
  if (header && !present.has(header.trim())) block += `\n${header}\n`;
  block += toAdd.join('\n') + '\n';
  fs.writeFileSync(giPath, existing + block);
  return toAdd;
}

// Payload lint-ignore pour les stacks JS/TS (React/SvelteKit/Next + tout projet
// avec eslint/prettier): les artefacts vendus par le scaffold (.claude/**, docs/**,
// archive/**, src/lib/paraglide/**) ne sont PAS du code applicatif et ne doivent
// pas faire échouer le `validate`/`lint` du projet (echo de la leçon 2026-06-16
// file-size-guard: tout artefact installé doit passer les gates du même scaffold).
function applyLintIgnorePayload(projectDir, detection) {
  const pkg = detection && detection.packageJson;
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const eslintCfg = findEslintFlatConfig(projectDir);
  const hasPrettier = !!allDeps.prettier
    || hasAnyFile(projectDir, ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.yaml', '.prettierrc.yml', 'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs'])
    || fs.existsSync(path.join(projectDir, '.prettierignore'));
  const hasEslint = !!allDeps.eslint || !!eslintCfg;

  if (!hasPrettier && !hasEslint) {
    return { applied: false, raison: 'aucun gate eslint/prettier détecté (stack non JS/TS)' };
  }

  const IGNORE_DIRS = ['.claude', 'docs', 'archive', 'src/lib/paraglide'];
  const result = {};
  result.prettier = hasPrettier
    ? augmentPrettierIgnore(projectDir, IGNORE_DIRS)
    : { applied: false, raison: 'prettier non détecté' };
  if (eslintCfg) {
    result.eslint = insertEslintIgnores(eslintCfg, IGNORE_DIRS.map(d => `${d}/**`));
  } else if (hasEslint) {
    result.eslint = { applied: false, raison: "eslint présent mais aucun eslint.config.{js,mjs,cjs,ts} — ajouter { ignores: [...] } manuellement" };
  } else {
    result.eslint = { applied: false, raison: 'eslint non détecté' };
  }
  return result;
}

function hasAnyFile(projectDir, names) {
  return names.some(n => fs.existsSync(path.join(projectDir, n)));
}

function findEslintFlatConfig(projectDir) {
  for (const name of ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']) {
    const p = path.join(projectDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Append d'un bloc d'ignores (style gitignore) à .prettierignore (créé si absent).
// Idempotent: on n'ajoute que les dossiers pas déjà ignorés.
function augmentPrettierIgnore(projectDir, dirs) {
  const p = path.join(projectDir, '.prettierignore');
  let existing = '';
  let created = true;
  try { existing = fs.readFileSync(p, 'utf8'); created = false; } catch { /* absent → créé */ }
  const present = new Set(existing.split(/\r?\n/).map(l => l.trim()));
  const wanted = dirs.map(d => `/${d}/`);
  const toAdd = wanted.filter(w => {
    const bare = w.replace(/^\/|\/$/g, '');
    return !present.has(w) && !present.has(`${bare}/`) && !present.has(bare) && !present.has(`/${bare}`);
  });
  if (toAdd.length === 0) return { applied: false, raison: 'déjà présent', file: '.prettierignore' };
  let block = '';
  if (existing && !existing.endsWith('\n')) block += '\n';
  block += '\n# Governance & docs (vendored by meta-govern — own conventions / generated assets)\n';
  block += toAdd.join('\n') + '\n';
  fs.writeFileSync(p, existing + block);
  return { applied: true, added: toAdd, created, file: '.prettierignore' };
}

// Insère une entrée global-ignores dans une config eslint « flat » existante.
// L'indentation + le style de guillemets sont détectés depuis le fichier pour
// que l'insertion reste conforme à prettier (sinon `prettier --check` planterait
// sur la config eslint elle-même). Idempotent + best-effort: si le point
// d'insertion n'est pas reconnu, on renvoie un raison sans rien casser.
function insertEslintIgnores(cfgPath, globs) {
  let src;
  try { src = fs.readFileSync(cfgPath, 'utf8'); } catch (err) {
    return { applied: false, raison: `illisible: ${err.message}`, file: path.basename(cfgPath) };
  }
  if (src.includes(globs[0])) {
    return { applied: false, raison: 'déjà présent', file: path.basename(cfgPath) };
  }
  const indent = detectIndent(src);
  const q = detectQuote(src);
  const list = globs.map(g => `${q}${g}${q}`).join(', ');
  const snippet =
    `${indent}// meta-govern: governance + docs toolkit are vendored with their own conventions — not app source to lint.\n` +
    `${indent}{ ignores: [${list}] },`;

  const anchors = [
    /export\s+default\s+defineConfig\s*\(\s*\r?\n/,
    /export\s+default\s+tseslint\.config\s*\(\s*\r?\n/,
    /export\s+default\s+ts\.config\s*\(\s*\r?\n/,
    /export\s+default\s+\[\s*\r?\n/,
  ];
  for (const re of anchors) {
    const m = src.match(re);
    if (m) {
      const idx = m.index + m[0].length;
      const out = src.slice(0, idx) + snippet + '\n' + src.slice(idx);
      fs.writeFileSync(cfgPath, out);
      return { applied: true, added: globs, file: path.basename(cfgPath) };
    }
  }
  return { applied: false, raison: "point d'insertion non reconnu — ajouter { ignores: [...] } manuellement", file: path.basename(cfgPath) };
}

// Détecte l'unité d'indentation dominante: tab → '\t', sinon 2 espaces.
function detectIndent(src) {
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^(\t+|\x20+)\S/);
    if (m) return m[1].startsWith('\t') ? '\t' : '  ';
  }
  return '\t';
}

// Détecte le style de guillemets dominant (simple vs double) du fichier.
function detectQuote(src) {
  const single = (src.match(/'/g) || []).length;
  const dbl = (src.match(/"/g) || []).length;
  return dbl > single ? '"' : "'";
}
